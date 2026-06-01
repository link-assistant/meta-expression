/**
 * Pluggable source registry for `formalizeTextWith()`.
 *
 * Each source exposes:
 *   - `searchPhrase(text, ctx)` -> Promise<Candidate[]>
 *   - `getEntity(id, ctx)`      -> Promise<Entity | null> (optional)
 *
 * Candidates carry a `source` tag so downstream code can dedupe and
 * surface provenance. The default source is Wikidata (`wbsearchentities`
 * + `wbgetentities`), matching the original prototype. WordNet and
 * Fandom (Wikia) are layered in on top so a single text pass can
 * draw on multiple knowledge graphs without changing call sites.
 */

import {
  createVirtualSourceOverrideSource,
  VIRTUAL_SOURCE_KIND,
} from './virtual-source-overrides.js';

const wikidataApiUrl = 'https://www.wikidata.org/w/api.php';
const wikidataEntityBaseUrl = 'https://www.wikidata.org/wiki/';
const wikidataPropertyBaseUrl = 'https://www.wikidata.org/wiki/Property:';
const wikipediaArticleBaseUrl = 'https://en.wikipedia.org/wiki/';

const wordnetApiUrl = 'https://en.wiktionary.org/w/api.php';
const wiktionaryDefinitionApiUrl =
  'https://en.wiktionary.org/api/rest_v1/page/definition/';
const wiktionaryArticleBaseUrl = 'https://en.wiktionary.org/wiki/';
const wiktionaryCompoundPageTitles = new Map([['is a', 'is-a']]);

export const SOURCE_KIND = Object.freeze({
  WIKIPEDIA: 'wikipedia',
  WIKIDATA: 'wikidata',
  WORDNET: 'wordnet',
  WIKTIONARY: 'wiktionary',
  FANDOM: 'fandom',
  LEXICAL: 'lexical',
  VIRTUAL: VIRTUAL_SOURCE_KIND,
});

/**
 * @typedef {Object} SourceCandidate
 * @property {string} id            - Source-scoped id (e.g. `Q42`, `wn:dog#1`).
 * @property {string} label
 * @property {string} description
 * @property {'entity'|'property'} kind
 * @property {string} source        - One of `SOURCE_KIND` values.
 * @property {string} sourceUrl     - Direct human-readable URL.
 * @property {string} matchText
 */

/**
 * Build a Wikidata source resolver.
 *
 * @param {object} options
 * @param {string} [options.language]
 * @param {number} [options.searchLimit]
 * @returns {object} Source resolver
 */
export function createWikidataSource({
  language = 'en',
  searchLimit = 5,
} = {}) {
  const loadEntity = createWikidataEntityBatchLoader(language);
  return {
    name: SOURCE_KIND.WIKIDATA,
    /** @type {(text: string, ctx: object) => Promise<SourceCandidate[]>} */
    async searchPhrase(text, ctx) {
      const propertyBias = ctx.isPropertyIndicator?.(text) ?? false;
      const types = propertyBias ? ['property', 'item'] : ['item', 'property'];
      // For single-token candidates that look like English verbs we ALSO
      // search the bare-infinitive form ("to <word>"). Without this the
      // Wikidata search ranks `formalize` against pages that contain the
      // word in their label (Formalized Mathematics, Formalized Music…)
      // and never surfaces Q115492965 whose canonical label is the
      // gerund ("formalizing") and whose alias is "to formalize" — see
      // issue #21.
      const variants = collectQueryVariants(text);
      const settled = await Promise.all(
        types.flatMap((type) =>
          variants.map((variant) =>
            searchWikidataEntities(variant, type, ctx, language, searchLimit)
          )
        )
      );
      return settled.flat();
    },
    getEntity(id, ctx) {
      return loadEntity(id, ctx);
    },
    resolveUrl(entity) {
      if (entity?.kind === 'property') {
        return `${wikidataPropertyBaseUrl}${entity.id}`;
      }
      return `${wikidataEntityBaseUrl}${entity.id}`;
    },
    wikipediaArticleUrl(title) {
      return `${wikipediaArticleBaseUrl}${encodeURIComponent(
        String(title).replace(/ /g, '_')
      )}`;
    },
  };
}

/**
 * Build a Wikipedia source resolver.
 *
 * The issue mandates Wikipedia as the FIRST disambiguation tier — it
 * carries the richest article context per phrase and (via
 * `pageprops.wikibase_item`) tells us which Wikidata Q-id each title
 * actually points at, so downstream context-walking still works.
 *
 * Implementation:
 *   - `action=query&list=search` for a candidate list (one MediaWiki
 *     round-trip per phrase).
 *   - `action=query&prop=pageprops` to backfill the wikibase_item for
 *     every returned title (one batch round-trip).
 *
 * Each candidate carries the canonical Wikidata id as its `.id` so the
 * existing entity-hydration path (wbgetentities -> claims/sitelinks)
 * still applies. When a Wikipedia hit has no wikibase_item we fall back
 * to a `wp:<title>` id so the candidate is at least linkable in the UI.
 *
 * @param {object} options
 * @param {string} [options.language]
 * @param {number} [options.searchLimit]
 * @returns {object}
 */
export function createWikipediaSource({
  language = 'en',
  searchLimit = 5,
} = {}) {
  const apiBase = `https://${language}.wikipedia.org/w/api.php`;
  const articleBase = `https://${language}.wikipedia.org/wiki/`;
  return {
    name: SOURCE_KIND.WIKIPEDIA,
    async searchPhrase(text, ctx) {
      if (!ctx.fetchImpl) {
        return [];
      }
      const titles = await searchWikipediaTitles(
        apiBase,
        text,
        ctx,
        searchLimit
      );
      if (titles.length === 0) {
        return [];
      }
      const wikibaseIds = await fetchWikipediaWikibaseIds(
        apiBase,
        titles.map((entry) => entry.title),
        ctx
      );
      return titles.map((entry) => {
        const wikibaseId = wikibaseIds.get(entry.title) ?? null;
        return {
          id: wikibaseId ?? `wp:${language}:${slugifyTitle(entry.title)}`,
          label: entry.title,
          description: entry.snippet ?? '',
          kind: 'entity',
          source: SOURCE_KIND.WIKIPEDIA,
          sourceUrl: `${articleBase}${encodeURIComponent(
            entry.title.replace(/ /g, '_')
          )}`,
          matchText: entry.title,
          matchType: wikibaseId ? 'label' : null,
          wikipediaTitle: entry.title,
          wikipediaUrl: `${articleBase}${encodeURIComponent(
            entry.title.replace(/ /g, '_')
          )}`,
          wikibaseId,
        };
      });
    },
    getEntity() {
      return null;
    },
    resolveUrl(entity) {
      return entity?.wikipediaUrl ?? entity?.sourceUrl ?? null;
    },
  };
}

async function searchWikipediaTitles(apiBase, text, ctx, limit) {
  const url = new URL(apiBase);
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: text,
    srlimit: String(limit),
    origin: '*',
  }).toString();
  let payload;
  try {
    payload = await ctx.fetchJson(url);
  } catch {
    return [];
  }
  const search = payload?.query?.search;
  if (!Array.isArray(search)) {
    return [];
  }
  return search
    .filter((entry) => typeof entry?.title === 'string')
    .map((entry) => ({
      title: entry.title,
      snippet: stripHtml(entry.snippet ?? ''),
    }));
}

async function fetchWikipediaWikibaseIds(apiBase, titles, ctx) {
  const result = new Map();
  if (titles.length === 0) {
    return result;
  }
  const url = new URL(apiBase);
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'pageprops',
    titles: titles.join('|'),
    ppprop: 'wikibase_item',
    origin: '*',
  }).toString();
  let payload;
  try {
    payload = await ctx.fetchJson(url);
  } catch {
    return result;
  }
  const pages = payload?.query?.pages;
  if (!pages || typeof pages !== 'object') {
    return result;
  }
  for (const page of Object.values(pages)) {
    const wikibaseId = page?.pageprops?.wikibase_item;
    if (typeof page?.title === 'string' && typeof wikibaseId === 'string') {
      result.set(page.title, wikibaseId);
    }
  }
  return result;
}

function stripHtml(text) {
  return String(text).replace(/<[^>]+>/g, '');
}

function slugifyTitle(text) {
  return String(text).toLowerCase().replace(/\s+/g, '_');
}

/**
 * Build a Wiktionary fallback resolver.
 *
 * Wiktionary's REST-v1 definition endpoint returns clean per-PoS
 * definitions for a single token. This is the LAST disambiguation
 * tier per issue #21 — it ensures even glue words (`the`, `of`,
 * `and`) get a tooltip-worthy hit when Wikipedia and Wikidata return
 * nothing.
 *
 * @param {object} options
 * @param {string} [options.language]
 * @param {number} [options.maxDefinitions]
 * @returns {object}
 */
export function createWiktionarySource({
  language = 'en',
  maxDefinitions = 3,
} = {}) {
  return {
    name: SOURCE_KIND.WIKTIONARY,
    async searchPhrase(text, ctx) {
      const trimmed = normalizeWiktionaryQuery(text);
      if (!trimmed || !ctx.fetchImpl) {
        return [];
      }
      const payload = await fetchWiktionaryDefinitions(trimmed, ctx);
      return buildWiktionaryCandidates(
        payload?.[language],
        trimmed,
        language,
        maxDefinitions
      );
    },
    getEntity() {
      return null;
    },
    resolveUrl(entity) {
      return entity?.sourceUrl ?? null;
    },
  };
}

export function normalizeWiktionaryLookupText(text) {
  const phrase = normalizeWiktionaryLookupSurface(text);
  if (!phrase) {
    return null;
  }
  const lower = phrase.toLowerCase();
  if (phrase.includes(' ')) {
    const pageTitle = wiktionaryCompoundPageTitles.get(lower);
    if (!pageTitle) {
      return null;
    }
    return {
      phrase,
      pageTitle,
    };
  }
  return {
    phrase,
    pageTitle: lower,
  };
}

function normalizeWiktionaryQuery(text) {
  return normalizeWiktionaryLookupText(text);
}

function normalizeWiktionaryLookupSurface(text) {
  return String(text)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{Letter}\p{Number}+#]+/u, '')
    .replace(/[^\p{Letter}\p{Number}+#]+$/u, '');
}

async function fetchWiktionaryDefinitions(query, ctx) {
  const url = new URL(
    `${wiktionaryDefinitionApiUrl}${encodeURIComponent(query.pageTitle)}`
  );
  try {
    return await ctx.fetchJson(url);
  } catch {
    return null;
  }
}

function buildWiktionaryCandidates(entries, query, language, maxDefinitions) {
  if (!Array.isArray(entries)) {
    return [];
  }
  const candidates = [];
  for (const entry of entries) {
    const definitions = Array.isArray(entry?.definitions)
      ? entry.definitions.slice(0, maxDefinitions)
      : [];
    for (const definition of definitions) {
      const definitionText = stripHtml(definition?.definition ?? '');
      if (!definitionText) {
        continue;
      }
      candidates.push(
        makeWiktionaryCandidate(
          entry,
          definitionText,
          query,
          language,
          candidates.length
        )
      );
    }
  }
  return candidates;
}

function makeWiktionaryCandidate(
  entry,
  definitionText,
  query,
  language,
  index
) {
  const partOfSpeech = entry.partOfSpeech ?? 'definition';
  return {
    id: `wikt:${language}:${slugifyTitle(query.pageTitle)}#${partOfSpeech}:${index}`,
    label: query.phrase,
    description: definitionText,
    kind: 'entity',
    source: SOURCE_KIND.WIKTIONARY,
    sourceUrl: `${wiktionaryArticleBaseUrl}${encodeURIComponent(
      query.pageTitle
    )}`,
    matchText: query.phrase,
    matchType: 'definition',
    partOfSpeech: entry.partOfSpeech ?? null,
    definition: definitionText,
  };
}

/**
 * Build a WordNet source resolver via en.wiktionary's `wbgetentities`-free
 * search API. WordNet itself ships no CORS endpoint we can call from the
 * browser, but Wiktionary mirrors WordNet senses inside its own search API
 * (`action=opensearch`) which IS CORS-permitting and works as a layered
 * lexical source. Each candidate carries a `wn:` prefix so it never
 * collides with a Wikidata Q/P id.
 *
 * @param {object} options
 * @param {string} [options.language]
 * @param {number} [options.searchLimit]
 * @returns {object}
 */
export function createWordNetSource({ language = 'en', searchLimit = 3 } = {}) {
  return {
    name: SOURCE_KIND.WORDNET,
    async searchPhrase(text, ctx) {
      if (!ctx.fetchImpl) {
        return [];
      }
      const url = new URL(wordnetApiUrl);
      url.search = new URLSearchParams({
        action: 'opensearch',
        format: 'json',
        origin: '*',
        limit: String(searchLimit),
        namespace: '0',
        search: text,
      }).toString();
      let payload;
      try {
        payload = await ctx.fetchJson(url);
      } catch {
        return [];
      }
      const titles = Array.isArray(payload?.[1]) ? payload[1] : [];
      const descriptions = Array.isArray(payload?.[2]) ? payload[2] : [];
      const urls = Array.isArray(payload?.[3]) ? payload[3] : [];
      return titles.map((title, index) => ({
        id: `wn:${language}:${title.toLowerCase().replace(/\s+/g, '_')}`,
        label: title,
        description: descriptions[index] ?? '',
        kind: 'entity',
        source: SOURCE_KIND.WORDNET,
        sourceUrl: urls[index] ?? `https://en.wiktionary.org/wiki/${title}`,
        matchText: title,
      }));
    },
    getEntity() {
      return null;
    },
    resolveUrl(entity) {
      return entity?.sourceUrl ?? null;
    },
  };
}

/**
 * Build a Fandom (Wikia) source resolver.
 *
 * Each Fandom wiki exposes the standard MediaWiki API at
 * `https://<wiki>.fandom.com/api.php`. We use `action=opensearch` for the
 * candidate list and prefix the id with `fandom:<wiki>:` so cross-source
 * ids stay unique. The wiki slug becomes part of the source name so
 * users can register multiple Fandom wikis in parallel
 * (e.g. `fandom:genshin-impact`, `fandom:harrypotter`).
 *
 * @param {object} options
 * @param {string} options.wiki    - e.g. `genshin-impact`
 * @param {string} [options.host]  - override host for self-hosted MediaWiki
 * @param {string} [options.language]
 * @param {number} [options.searchLimit]
 * @returns {object}
 */
export function createFandomSource({
  wiki,
  host,
  language = 'en',
  searchLimit = 3,
} = {}) {
  if (!wiki && !host) {
    throw new Error('createFandomSource: `wiki` (slug) is required.');
  }
  const apiBase = host
    ? `https://${host}/api.php`
    : `https://${wiki}.fandom.com/api.php`;
  const pageBase = host
    ? `https://${host}/wiki/`
    : `https://${wiki}.fandom.com/wiki/`;
  const sourceName = `${SOURCE_KIND.FANDOM}:${wiki ?? host}`;
  return {
    name: sourceName,
    async searchPhrase(text, ctx) {
      if (!ctx.fetchImpl) {
        return [];
      }
      const url = new URL(apiBase);
      url.search = new URLSearchParams({
        action: 'opensearch',
        format: 'json',
        origin: '*',
        limit: String(searchLimit),
        namespace: '0',
        search: text,
      }).toString();
      let payload;
      try {
        payload = await ctx.fetchJson(url);
      } catch {
        return [];
      }
      const titles = Array.isArray(payload?.[1]) ? payload[1] : [];
      const descriptions = Array.isArray(payload?.[2]) ? payload[2] : [];
      const urls = Array.isArray(payload?.[3]) ? payload[3] : [];
      return titles.map((title, index) => ({
        id: `${sourceName}:${title.replace(/\s+/g, '_')}`,
        label: title,
        description: descriptions[index] ?? '',
        kind: 'entity',
        source: sourceName,
        sourceUrl: urls[index] ?? `${pageBase}${encodeURIComponent(title)}`,
        matchText: title,
        language,
      }));
    },
    getEntity() {
      return null;
    },
    resolveUrl(entity) {
      return entity?.sourceUrl ?? null;
    },
  };
}

// English verbs whose Wikidata gerund is the canonical label can only be
// reached by also searching for the bare-infinitive form. We prepend
// "to " for single-token queries that look verb-like (end in -ize, -ise,
// -ate, -ify, -en, -ed, or are short enough to plausibly be an
// infinitive). Multi-token phrases skip the expansion.
const verbLikeSuffixes = ['ize', 'ise', 'ate', 'ify', 'en', 'ed'];

function collectQueryVariants(text) {
  const trimmed = String(text).trim();
  if (!trimmed) {
    return [trimmed];
  }
  const variants = [trimmed];
  const lower = trimmed.toLowerCase();
  if (
    !lower.includes(' ') &&
    !lower.startsWith('to ') &&
    looksLikeVerb(lower)
  ) {
    variants.push(`to ${lower}`);
  }
  return variants;
}

function looksLikeVerb(token) {
  if (token.length < 3) {
    return false;
  }
  return verbLikeSuffixes.some((suffix) => token.endsWith(suffix));
}

async function searchWikidataEntities(query, type, ctx, language, searchLimit) {
  if (!ctx.fetchImpl) {
    return [];
  }
  const url = new URL(wikidataApiUrl);
  url.search = new URLSearchParams({
    action: 'wbsearchentities',
    format: 'json',
    language,
    origin: '*',
    type,
    limit: String(searchLimit),
    search: query,
  }).toString();
  let payload;
  try {
    payload = await ctx.fetchJson(url);
  } catch {
    return [];
  }
  return (payload.search ?? []).map((entry) => ({
    id: entry.id,
    label: entry.label ?? query,
    description: entry.description ?? '',
    kind: type === 'property' ? 'property' : 'entity',
    source: SOURCE_KIND.WIKIDATA,
    sourceUrl:
      type === 'property'
        ? `${wikidataPropertyBaseUrl}${entry.id}`
        : `${wikidataEntityBaseUrl}${entry.id}`,
    matchText: entry.match?.text ?? '',
    matchType: entry.match?.type ?? null,
    aliases: Array.isArray(entry.aliases)
      ? entry.aliases.filter((value) => typeof value === 'string')
      : [],
  }));
}

async function fetchWikidataEntity(id, ctx, language) {
  const entities = await fetchWikidataEntities([id], ctx, language);
  return entities.get(id) ?? null;
}

async function fetchWikidataEntities(ids, ctx, language) {
  if (!ctx?.fetchImpl) {
    return new Map();
  }
  const url = new URL(wikidataApiUrl);
  url.search = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    ids: ids.join('|'),
    languages: language,
    origin: '*',
    props: 'labels|aliases|descriptions|claims|sitelinks',
    sitefilter: 'enwiki',
  }).toString();
  let payload;
  try {
    payload = await ctx.fetchJson(url);
  } catch {
    return new Map();
  }
  return new Map(
    ids
      .map((id) => [id, payload.entities?.[id]])
      .filter(([, entity]) => entity && !entity.missing)
  );
}

function createWikidataEntityBatchLoader(language) {
  const batches = new WeakMap();
  return (id, ctx) => {
    if (!ctx?.fetchImpl || typeof ctx !== 'object') {
      return fetchWikidataEntity(id, ctx, language);
    }
    let batch = batches.get(ctx);
    if (!batch) {
      batch = { ids: new Set(), resolvers: new Map() };
      batches.set(ctx, batch);
      Promise.resolve().then(() => {
        batches.delete(ctx);
        flushWikidataEntityBatch(batch, ctx, language);
      });
    }
    batch.ids.add(id);
    return new Promise((resolve) => {
      const resolvers = batch.resolvers.get(id) ?? [];
      resolvers.push(resolve);
      batch.resolvers.set(id, resolvers);
    });
  };
}

async function flushWikidataEntityBatch(batch, ctx, language) {
  const ids = [...batch.ids];
  const entities = await fetchWikidataEntities(ids, ctx, language);
  for (const id of ids) {
    for (const resolve of batch.resolvers.get(id) ?? []) {
      resolve(entities.get(id) ?? null);
    }
  }
}

/**
 * Build a registry of named sources. The first registered source is
 * treated as the "primary" one (its result drives the default link
 * target and entity hydration).
 *
 * @param {Array<object>} sources
 * @returns {object} Registry with `primary`, `all`, `byName`.
 */
export function createSourceRegistry(sources = []) {
  if (!Array.isArray(sources) || sources.length === 0) {
    const wikidata = createWikidataSource();
    return {
      primary: wikidata,
      all: [wikidata],
      byName: new Map([[wikidata.name, wikidata]]),
    };
  }
  const byName = new Map();
  for (const source of sources) {
    if (!source?.name || typeof source.searchPhrase !== 'function') {
      throw new TypeError(
        'Source must expose `name` and `searchPhrase(text, ctx)`.'
      );
    }
    byName.set(source.name, source);
  }
  return {
    primary: sources[0],
    all: [...sources],
    byName,
  };
}

/**
 * Parse a comma-separated source spec (used by CLI / server / web URL
 * params) into a list of source instances. Supported tokens:
 *   wikidata
 *   virtual-source-overrides
 *   wordnet
 *   fandom:<slug>          e.g. `fandom:genshin-impact`
 *   fandom-host:<host>     e.g. `fandom-host:tolkiengateway.net`
 *
 * @param {string|string[]} spec
 * @param {object} [options]
 * @param {string} [options.language]
 * @returns {object[]}
 */
export function parseSourceSpec(spec, options = {}) {
  const language = options.language ?? 'en';
  const tokens = (Array.isArray(spec) ? spec : String(spec ?? '').split(','))
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) {
    return [createWikidataSource({ language })];
  }
  const sources = [];
  for (const token of tokens) {
    if (token === SOURCE_KIND.WIKIPEDIA) {
      sources.push(createWikipediaSource({ language }));
      continue;
    }
    if (token === SOURCE_KIND.WIKIDATA) {
      sources.push(createWikidataSource({ language }));
      continue;
    }
    if (token === SOURCE_KIND.VIRTUAL) {
      sources.push(createVirtualSourceOverrideSource({ language }));
      continue;
    }
    if (token === SOURCE_KIND.WIKTIONARY) {
      sources.push(createWiktionarySource({ language }));
      continue;
    }
    if (token === SOURCE_KIND.WORDNET) {
      sources.push(createWordNetSource({ language }));
      continue;
    }
    if (token.startsWith('fandom:')) {
      sources.push(
        createFandomSource({
          wiki: token.slice('fandom:'.length),
          language,
        })
      );
      continue;
    }
    if (token.startsWith('fandom-host:')) {
      sources.push(
        createFandomSource({
          host: token.slice('fandom-host:'.length),
          language,
        })
      );
      continue;
    }
    throw new Error(`Unknown formalize source: ${token}`);
  }
  return sources;
}

/**
 * Default tier order per issue #21:
 *   1. Wikipedia (richest article context, carries wikibase_item)
 *   2. Wikidata  (canonical Q/P graph, holds claims for context BFS)
 *   3. Virtual source overrides (source-backed local missing-data layer)
 *   4. Wiktionary (last-resort lexical fallback for stop words / verbs)
 *
 * @param {string} [language]
 * @returns {object[]}
 */
export function createDefaultSourceTiers(language = 'en') {
  return [
    createWikipediaSource({ language }),
    createWikidataSource({ language }),
    createVirtualSourceOverrideSource({ language }),
    createWiktionarySource({ language }),
  ];
}
