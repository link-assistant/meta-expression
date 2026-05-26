import { encodeAsDoublets } from './doublets.js';
import { parseLino, serializeLino } from './lino.js';
import { fetchWikimediaJson } from './wikimedia-fetch.js';

const defaultLanguage = 'en';
const defaultCacheTtlMs = 7 * 24 * 60 * 60 * 1000;
const defaultTermDataCache = new Map();
const wikidataApiUrl = 'https://www.wikidata.org/w/api.php';
const wikidataEntityBaseUrl = 'https://www.wikidata.org/wiki/';

export function createTermDataSource(options = {}) {
  const cache = options.cache ?? new Map();
  const config = createConfig({ ...options, cache });
  return {
    cache,
    async getTerm(term, overrideOptions = {}) {
      const overrideFetchImpl =
        overrideOptions.fetchImpl ?? overrideOptions.fetch;
      return await getTermFromConfig(term, {
        ...config,
        ...overrideOptions,
        cache,
        fetchImpl: overrideFetchImpl ?? config.fetchImpl,
      });
    },
  };
}

export async function getTerm(term, options = {}) {
  const source = createTermDataSource({
    ...options,
    cache: options.cache ?? defaultTermDataCache,
  });
  return await source.getTerm(term);
}

export function parseTermDataLinksNotation(text) {
  const parsed = parseLino(text);
  if (parsed?.record && typeof parsed.record === 'object') {
    return parsed.record;
  }
  if (parsed?.['term-data']?.record) {
    return parsed['term-data'].record;
  }
  return parsed;
}

async function getTermFromConfig(input, config) {
  const term = normalizeTerm(input);
  const language = normalizeLanguage(config.language);
  const key = termCacheKey(term, language);
  const cached = readMergedCacheEntry(config.cache, key, config);
  if (cached) {
    return cached;
  }

  const retrievedAt = retrievalTimestamp(config);
  const [wikidata, wiktionary] = await Promise.all([
    resolveWikidataTerm(term, language, config),
    resolveWiktionaryTerm(term, language, config),
  ]);
  const wikipedia = await resolveWikipediaTerm(
    term,
    language,
    wikidata,
    config
  );
  const record = buildMergedRecord({
    term,
    language,
    retrievedAt,
    wikidata,
    wikipedia,
    wiktionary,
  });
  const artifacts = createMergedArtifacts(record);
  config.cache.set(key, {
    expiresAt: Number(config.now()) + cacheTtlMs(config),
    value: record,
    artifacts,
  });
  return withArtifacts(record, artifacts);
}

function createConfig(options) {
  const fetchImpl = options.fetchImpl ?? options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('Term data resolution requires a fetch implementation.');
  }
  return {
    cache: options.cache ?? new Map(),
    cacheTtlMs: options.cacheTtlMs ?? defaultCacheTtlMs,
    cacheJitterMs: options.cacheJitterMs,
    cacheJitterMinMs: options.cacheJitterMinMs,
    language: options.language ?? defaultLanguage,
    now: options.now ?? Date.now,
    fetchImpl: fetchImpl.bind?.(globalThis) ?? fetchImpl,
  };
}

// eslint-disable-next-line complexity
async function resolveWikidataTerm(term, language, config) {
  const search = await fetchWikidataSearch(term, language, config);
  const selected = chooseWikidataSearchResult(term, search?.search ?? []);
  if (!selected?.id) {
    return null;
  }
  const entity = await fetchWikidataEntity(selected.id, language, config);
  if (!entity) {
    return null;
  }
  return {
    source: 'wikidata',
    id: entity.id,
    label: entity.labels?.[language]?.value ?? selected.label ?? term,
    description:
      entity.descriptions?.[language]?.value ?? selected.description ?? '',
    aliases: (entity.aliases?.[language] ?? [])
      .map((entry) => entry?.value)
      .filter((value) => typeof value === 'string' && value),
    claims: compactClaims(entity.claims ?? {}),
    sitelinks: compactSitelinks(entity.sitelinks ?? {}),
    sourceUrl: wikidataEntityUrl(entity.id),
  };
}

async function fetchWikidataSearch(term, language, config) {
  const url = new URL(wikidataApiUrl);
  url.search = new URLSearchParams({
    action: 'wbsearchentities',
    format: 'json',
    language,
    limit: '5',
    origin: '*',
    search: term,
    type: 'item',
  }).toString();
  return await fetchSourceJson(url, config, {
    requestKind: 'wikidata-search',
    source: 'wikidata',
    term,
    language,
  });
}

async function fetchWikidataEntity(id, language, config) {
  const url = new URL(wikidataApiUrl);
  url.search = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    ids: id,
    languages: language,
    origin: '*',
    props: 'labels|aliases|descriptions|claims|sitelinks',
    sitefilter: `${language}wiki`,
  }).toString();
  const payload = await fetchSourceJson(url, config, {
    requestKind: 'wikidata-entity',
    source: 'wikidata',
    term: id,
    language,
  });
  const entity = payload?.entities?.[id];
  return entity && !entity.missing ? entity : null;
}

// eslint-disable-next-line complexity
async function resolveWikipediaTerm(term, language, wikidata, config) {
  const title =
    wikidata?.sitelinks?.[`${language}wiki`]?.title ??
    (await searchWikipediaTitle(term, language, config));
  if (!title) {
    return null;
  }
  const summary = await fetchWikipediaSummary(title, language, config);
  if (!summary) {
    return null;
  }
  return {
    source: 'wikipedia',
    title: summary.title ?? title,
    description: summary.description ?? '',
    extract: summary.extract ?? '',
    url:
      summary.content_urls?.desktop?.page ??
      wikipediaArticleUrl(language, summary.title ?? title),
    sourceUrl:
      summary.content_urls?.desktop?.page ??
      wikipediaArticleUrl(language, summary.title ?? title),
    wikibaseId: wikidata?.id ?? null,
  };
}

async function searchWikipediaTitle(term, language, config) {
  const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    origin: '*',
    srlimit: '1',
    srsearch: term,
  }).toString();
  try {
    const payload = await fetchSourceJson(url, config, {
      requestKind: 'wikipedia-search',
      source: 'wikipedia',
      term,
      language,
    });
    return payload?.query?.search?.[0]?.title ?? null;
  } catch {
    return null;
  }
}

async function fetchWikipediaSummary(title, language, config) {
  const url = new URL(
    encodeURIComponent(title),
    `https://${language}.wikipedia.org/api/rest_v1/page/summary/`
  );
  try {
    return await fetchSourceJson(url, config, {
      requestKind: 'wikipedia-summary',
      source: 'wikipedia',
      term: title,
      language,
    });
  } catch {
    return null;
  }
}

async function resolveWiktionaryTerm(term, language, config) {
  const pageTitle = wiktionaryPageTitle(term);
  if (!pageTitle) {
    return null;
  }
  const url = new URL(
    `https://${language}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(
      pageTitle
    )}`
  );
  let payload;
  try {
    payload = await fetchSourceJson(url, config, {
      requestKind: 'wiktionary-definition',
      source: 'wiktionary',
      term: pageTitle,
      language,
    });
  } catch {
    return null;
  }
  const entries = wiktionaryEntries(payload?.[language]);
  if (entries.length === 0) {
    return null;
  }
  return {
    source: 'wiktionary',
    pageTitle,
    entries,
    sourceUrl: wiktionaryArticleUrl(language, pageTitle),
  };
}

async function fetchSourceJson(url, config, metadata) {
  const key = String(url);
  try {
    const value = await fetchWikimediaJson(url, config);
    enrichRequestCacheEntry(config.cache, key, value, config, metadata);
    return value;
  } catch (error) {
    enrichRequestCacheEntry(config.cache, key, null, config, metadata, error);
    throw error;
  }
}

function enrichRequestCacheEntry(cache, key, value, config, metadata, error) {
  const entry = cache.get(key);
  if (!entry || entry.artifacts) {
    return;
  }
  const retrievedAt = entry.retrievedAt ?? retrievalTimestamp(config);
  entry.retrievedAt = retrievedAt;
  const payload = {
    kind: 'term-data-request',
    source: metadata.source,
    requestKind: metadata.requestKind,
    term: metadata.term,
    language: metadata.language,
    retrievedAt,
    request: { url: key },
    response: value ?? null,
    error: error
      ? {
          message: error.message,
          status: error.status ?? null,
        }
      : null,
  };
  entry.artifacts = createRequestArtifacts(payload);
}

// eslint-disable-next-line complexity
function buildMergedRecord({
  term,
  language,
  retrievedAt,
  wikidata,
  wikipedia,
  wiktionary,
}) {
  const provenance = {
    fields: {},
    requests: sourceRequests({ wikidata, wikipedia, wiktionary }),
  };
  const fields = {};

  addField(fields, provenance, 'id', wikidata?.id, [
    fieldProvenance('wikidata', 'id', 'fields.id', {
      mergeStrategy: 'prefer-wikidata-id',
      sourceUrl: wikidata?.sourceUrl,
      retrievedAt,
    }),
  ]);
  addField(fields, provenance, 'label', wikidata?.label ?? wikipedia?.title, [
    fieldProvenance(
      wikidata?.label ? 'wikidata' : 'wikipedia',
      wikidata?.label ? 'label' : 'title',
      'fields.label',
      {
        mergeStrategy: wikidata?.label
          ? 'prefer-wikidata-label'
          : 'fallback-wikipedia-title',
        sourceUrl: wikidata?.sourceUrl ?? wikipedia?.sourceUrl,
        retrievedAt,
      }
    ),
  ]);
  addField(
    fields,
    provenance,
    'description',
    wikidata?.description ||
      wikipedia?.description ||
      firstDefinition(wiktionary),
    [
      descriptionProvenance({
        wikidata,
        wikipedia,
        wiktionary,
        retrievedAt,
      }),
    ]
  );
  addField(fields, provenance, 'aliases', wikidata?.aliases ?? [], [
    fieldProvenance('wikidata', 'aliases', 'fields.aliases', {
      mergeStrategy: 'copy-wikidata-aliases',
      sourceUrl: wikidata?.sourceUrl,
      retrievedAt,
    }),
  ]);
  addField(fields, provenance, 'claims', wikidata?.claims ?? {}, [
    fieldProvenance('wikidata', 'claims', 'fields.claims', {
      mergeStrategy: 'compact-wikidata-claims',
      sourceUrl: wikidata?.sourceUrl,
      retrievedAt,
    }),
  ]);
  addField(fields, provenance, 'wikipediaTitle', wikipedia?.title, [
    fieldProvenance('wikipedia', 'title', 'fields.wikipediaTitle', {
      mergeStrategy: 'copy-wikipedia-summary-title',
      sourceUrl: wikipedia?.sourceUrl,
      retrievedAt,
    }),
  ]);
  addField(fields, provenance, 'wikipediaSummary', wikipedia?.extract, [
    fieldProvenance('wikipedia', 'extract', 'fields.wikipediaSummary', {
      mergeStrategy: 'copy-wikipedia-summary-extract',
      sourceUrl: wikipedia?.sourceUrl,
      retrievedAt,
    }),
  ]);
  addField(fields, provenance, 'wiktionaryEntries', wiktionary?.entries ?? [], [
    fieldProvenance('wiktionary', 'definitions', 'fields.wiktionaryEntries', {
      mergeStrategy: 'copy-wiktionary-lexical-entries',
      sourceUrl: wiktionary?.sourceUrl,
      retrievedAt,
    }),
  ]);
  addField(
    fields,
    provenance,
    'sourceUrls',
    sourceUrls(wikidata, wikipedia, wiktionary),
    [
      fieldProvenance('wikimedia', 'sourceUrl', 'fields.sourceUrls', {
        mergeStrategy: 'merge-source-urls-by-source',
        retrievedAt,
      }),
    ]
  );

  return pruneEmpty({
    kind: 'term-data',
    version: 1,
    term,
    normalizedTerm: normalizeKey(term),
    language,
    retrievedAt,
    fields,
    sources: pruneEmpty({
      wikidata,
      wikipedia,
      wiktionary,
    }),
    provenance,
  });
}

function addField(fields, provenance, name, value, fieldProvenanceEntries) {
  if (value === undefined || value === null) {
    return;
  }
  if (Array.isArray(value) && value.length === 0) {
    return;
  }
  if (isPlainObject(value) && Object.keys(value).length === 0) {
    return;
  }
  fields[name] = value;
  provenance.fields[name] = fieldProvenanceEntries.filter(Boolean);
}

function fieldProvenance(source, sourceField, targetField, options = {}) {
  if (!source || !sourceField || !targetField) {
    return null;
  }
  return {
    source,
    sourceField,
    targetField,
    mergeStrategy: options.mergeStrategy ?? 'copy',
    sourceUrl: options.sourceUrl ?? null,
    retrievedAt: options.retrievedAt ?? null,
  };
}

function descriptionProvenance({
  wikidata,
  wikipedia,
  wiktionary,
  retrievedAt,
}) {
  if (wikidata?.description) {
    return fieldProvenance('wikidata', 'description', 'fields.description', {
      mergeStrategy: 'prefer-wikidata-description',
      sourceUrl: wikidata.sourceUrl,
      retrievedAt,
    });
  }
  if (wikipedia?.description) {
    return fieldProvenance('wikipedia', 'description', 'fields.description', {
      mergeStrategy: 'fallback-wikipedia-description',
      sourceUrl: wikipedia.sourceUrl,
      retrievedAt,
    });
  }
  if (firstDefinition(wiktionary)) {
    return fieldProvenance('wiktionary', 'definitions', 'fields.description', {
      mergeStrategy: 'fallback-first-wiktionary-definition',
      sourceUrl: wiktionary.sourceUrl,
      retrievedAt,
    });
  }
  return null;
}

function firstDefinition(wiktionary) {
  return wiktionary?.entries?.[0]?.definitions?.[0] ?? '';
}

function sourceUrls(wikidata, wikipedia, wiktionary) {
  return pruneEmpty({
    wikidata: wikidata?.sourceUrl,
    wikipedia: wikipedia?.sourceUrl,
    wiktionary: wiktionary?.sourceUrl,
  });
}

function sourceRequests(sources) {
  const requests = [];
  for (const [source, value] of Object.entries(sources)) {
    if (!value?.sourceUrl) {
      continue;
    }
    requests.push({
      source,
      sourceUrl: value.sourceUrl,
    });
  }
  return requests;
}

function chooseWikidataSearchResult(term, results) {
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }
  const normalized = normalizeKey(term);
  return results
    .map((result, index) => ({
      result,
      index,
      score: wikidataSearchScore(normalized, result),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .at(0).result;
}

function wikidataSearchScore(normalizedTerm, result) {
  const label = normalizeKey(result.label ?? '');
  const match = normalizeKey(result.match?.text ?? '');
  let score = 0;
  if (label === normalizedTerm) {
    score += 20;
  } else if (label.includes(normalizedTerm)) {
    score += 5;
  }
  if (match === normalizedTerm) {
    score += 5;
  }
  return score;
}

function compactClaims(claims) {
  const compact = {};
  for (const [property, entries] of Object.entries(claims)) {
    const values = (Array.isArray(entries) ? entries : [])
      .map(compactClaimValue)
      .filter(Boolean);
    if (values.length > 0) {
      compact[property] = values;
    }
  }
  return compact;
}

function compactClaimValue(claim) {
  const datavalue = claim?.mainsnak?.datavalue;
  const value = datavalue?.value;
  if (!value) {
    return null;
  }
  if (typeof value === 'object' && value.id) {
    return {
      type: datavalue.type ?? 'wikibase-entityid',
      id: value.id,
    };
  }
  if (typeof value === 'object' && value.time) {
    return {
      type: datavalue.type ?? 'time',
      time: value.time,
    };
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return {
      type: datavalue.type ?? typeof value,
      value,
    };
  }
  return {
    type: datavalue.type ?? 'value',
    value: JSON.stringify(value),
  };
}

function compactSitelinks(sitelinks) {
  const compact = {};
  for (const [site, value] of Object.entries(sitelinks)) {
    if (typeof value?.title === 'string') {
      compact[site] = {
        title: value.title,
      };
    }
  }
  return compact;
}

function wiktionaryEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .map((entry) => ({
      partOfSpeech: entry?.partOfSpeech ?? null,
      definitions: (Array.isArray(entry?.definitions) ? entry.definitions : [])
        .map((definition) => stripHtml(definition?.definition ?? ''))
        .filter(Boolean),
    }))
    .filter((entry) => entry.definitions.length > 0);
}

function stripHtml(text) {
  return String(text ?? '').replace(/<[^>]+>/g, '');
}

function createMergedArtifacts(record) {
  return {
    linksNotation: serializeLino(
      { record },
      {
        rootIdentifier: 'term-data',
      }
    ),
    binary: encodeAsDoublets(record).binary,
  };
}

function createRequestArtifacts(payload) {
  return {
    linksNotation: serializeLino(
      { request: payload },
      {
        rootIdentifier: 'term-data-request',
      }
    ),
    binary: encodeAsDoublets(payload).binary,
  };
}

function readMergedCacheEntry(cache, key, config) {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Number(config.now())) {
    cache.delete(key);
    return null;
  }
  const artifacts = entry.artifacts ?? createMergedArtifacts(entry.value);
  entry.artifacts = artifacts;
  return withArtifacts(entry.value, artifacts);
}

function withArtifacts(record, artifacts) {
  return {
    ...cloneJson(record),
    artifacts,
  };
}

function pruneEmpty(value) {
  if (!isPlainObject(value)) {
    return value;
  }
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined || entry === null) {
      continue;
    }
    if (Array.isArray(entry) && entry.length === 0) {
      continue;
    }
    if (isPlainObject(entry) && Object.keys(entry).length === 0) {
      continue;
    }
    out[key] = entry;
  }
  return out;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function normalizeTerm(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Term input must be a string.');
  }
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) {
    throw new Error('Term input cannot be empty.');
  }
  return text;
}

function normalizeLanguage(value) {
  const language = String(value ?? defaultLanguage)
    .trim()
    .toLowerCase();
  return language || defaultLanguage;
}

function normalizeKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function termCacheKey(term, language) {
  return `term-data:${language}:${normalizeKey(term)}`;
}

function wiktionaryPageTitle(term) {
  return normalizeKey(term).replace(/\s+/g, '_');
}

function wikidataEntityUrl(id) {
  return `${wikidataEntityBaseUrl}${encodeURIComponent(id)}`;
}

function wikipediaArticleUrl(language, title) {
  return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(
    String(title ?? '').replace(/\s+/g, '_')
  )}`;
}

function wiktionaryArticleUrl(language, pageTitle) {
  return `https://${language}.wiktionary.org/wiki/${encodeURIComponent(
    pageTitle
  )}`;
}

function retrievalTimestamp(config) {
  return new Date(Number(config.now())).toISOString();
}

function cacheTtlMs(config) {
  const ttl = Number(config.cacheTtlMs);
  return Number.isFinite(ttl) && ttl >= 0 ? ttl : defaultCacheTtlMs;
}
