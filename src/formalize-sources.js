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

const wikidataApiUrl = 'https://www.wikidata.org/w/api.php';
const wikidataEntityBaseUrl = 'https://www.wikidata.org/wiki/';
const wikidataPropertyBaseUrl = 'https://www.wikidata.org/wiki/Property:';
const wikipediaArticleBaseUrl = 'https://en.wikipedia.org/wiki/';

const wordnetApiUrl = 'https://en.wiktionary.org/w/api.php';

export const SOURCE_KIND = Object.freeze({
  WIKIDATA: 'wikidata',
  WORDNET: 'wordnet',
  FANDOM: 'fandom',
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
  return {
    name: SOURCE_KIND.WIKIDATA,
    /** @type {(text: string, ctx: object) => Promise<SourceCandidate[]>} */
    async searchPhrase(text, ctx) {
      const propertyBias = ctx.isPropertyIndicator?.(text) ?? false;
      const types = propertyBias ? ['property', 'item'] : ['item', 'property'];
      const settled = await Promise.all(
        types.map((type) =>
          searchWikidataEntities(text, type, ctx, language, searchLimit)
        )
      );
      return settled.flat();
    },
    getEntity(id, ctx) {
      return fetchWikidataEntity(id, ctx, language);
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
  }));
}

async function fetchWikidataEntity(id, ctx, language) {
  if (!ctx.fetchImpl) {
    return null;
  }
  const url = new URL(wikidataApiUrl);
  url.search = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    ids: id,
    languages: language,
    origin: '*',
    props: 'labels|descriptions|claims|sitelinks',
    sitefilter: 'enwiki',
  }).toString();
  let payload;
  try {
    payload = await ctx.fetchJson(url);
  } catch {
    return null;
  }
  const entity = payload.entities?.[id];
  return entity && !entity.missing ? entity : null;
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
 *   wordnet
 *   fandom:<slug>          e.g. `fandom:genshin-impact`
 *   fandom-host:<host>     e.g. `fandom-host:tolkiengateway.net`
 *
 * @param {string|string[]} spec
 * @returns {object[]}
 */
export function parseSourceSpec(spec) {
  const tokens = (Array.isArray(spec) ? spec : String(spec ?? '').split(','))
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) {
    return [createWikidataSource()];
  }
  const sources = [];
  for (const token of tokens) {
    if (token === SOURCE_KIND.WIKIDATA) {
      sources.push(createWikidataSource());
      continue;
    }
    if (token === SOURCE_KIND.WORDNET) {
      sources.push(createWordNetSource());
      continue;
    }
    if (token.startsWith('fandom:')) {
      sources.push(createFandomSource({ wiki: token.slice('fandom:'.length) }));
      continue;
    }
    if (token.startsWith('fandom-host:')) {
      sources.push(
        createFandomSource({ host: token.slice('fandom-host:'.length) })
      );
      continue;
    }
    throw new Error(`Unknown formalize source: ${token}`);
  }
  return sources;
}
