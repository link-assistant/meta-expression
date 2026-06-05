// The semantic interlingua lexicon. Every entry is a concept with a unique id
// (Wikidata Q, Wiktionary or Wikipedia URL) and per-language surface forms.
// Directional translation is never stored as a direct language pair; instead it
// is derived at runtime by routing source forms through concept ids to the
// licensed target form. This keeps `js/src` free of hardcoded en<->ru style
// dictionaries while still providing a deterministic, source-backed fallback
// for offline use and CI.
import {
  listVirtualSourceOverrides,
  virtualEntryToConcept,
} from './virtual-source-overrides.js';

const lexiconUrl = new URL('../data/semantic-lexicon.json', import.meta.url);
const networkLexicon = await loadNetworkLexicon(lexiconUrl);
const fileReaders = networkLexicon === null ? await loadFileReaders() : null;

let cachedLexicon = null;
const directionalCache = new Map();

async function loadNetworkLexicon(url) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to load semantic lexicon ${url.href}: HTTP ${response.status}`
    );
  }
  return response.json();
}

async function loadFileReaders() {
  const [{ readFileSync }, { fileURLToPath }] = await Promise.all([
    import('node:fs'),
    import('node:url'),
  ]);
  return { readFileSync, fileURLToPath };
}

function readLexicon() {
  if (networkLexicon !== null) {
    return networkLexicon;
  }
  const raw = fileReaders.readFileSync(
    fileReaders.fileURLToPath(lexiconUrl),
    'utf8'
  );
  return JSON.parse(raw);
}

function loadLexicon() {
  if (cachedLexicon) {
    return cachedLexicon;
  }
  const parsed = readLexicon();
  const concepts = mergeVirtualConcepts(
    Array.isArray(parsed.concepts) ? parsed.concepts : [],
    listVirtualSourceOverrides()
  );
  cachedLexicon = {
    version: parsed.version ?? 1,
    languages: Array.isArray(parsed.languages) ? parsed.languages : [],
    concepts,
  };
  return cachedLexicon;
}

export function listLexiconConcepts() {
  return loadLexicon().concepts.map((concept) => ({ ...concept }));
}

export function listLexiconLanguages() {
  return [...loadLexicon().languages];
}

/**
 * Derive a directional `source -> target` lookup table from the interlingua.
 * A concept contributes the pair `form -> primary[target]` for every source
 * surface form only when it explicitly licenses that direction via
 * `primary[target]`. The reverse direction is independent, so the asymmetry of
 * natural language inflection is preserved exactly.
 */
export function buildDirectionalGlossary(sourceLanguage, targetLanguage) {
  const key = `${sourceLanguage}:${targetLanguage}`;
  const cached = directionalCache.get(key);
  if (cached) {
    return cached;
  }
  const map = Object.create(null);
  for (const concept of loadLexicon().concepts) {
    const targetForm = concept.primary?.[targetLanguage];
    if (!targetForm) {
      continue;
    }
    for (const form of concept.labels?.[sourceLanguage] ?? []) {
      for (const key of directionalGlossaryKeys(form)) {
        if (!(key in map)) {
          map[key] = targetForm;
        }
      }
    }
  }
  const frozen = Object.freeze(map);
  directionalCache.set(key, frozen);
  return frozen;
}

/**
 * Resolve a single concept id to its licensed surface form in `language`,
 * together with the source-backed metadata (`entityId`, `url`, `description`)
 * the renderer needs to build a citation link. This is how grammatical
 * naturalization rules obtain a target lexeme without embedding the foreign
 * word in `js/src`: the code only ever names a language-neutral concept id and
 * the surface form is derived from the interlingua data at runtime.
 *
 * Returns `null` when the concept is unknown or does not license `language`.
 */
export function resolveConceptForm(conceptId, language) {
  if (!conceptId || !language) {
    return null;
  }
  for (const concept of loadLexicon().concepts) {
    if (concept.id !== conceptId) {
      continue;
    }
    const text = concept.primary?.[language] ?? concept.labels?.[language]?.[0];
    if (!text) {
      return null;
    }
    return {
      text,
      entityId: concept.entityId ?? null,
      url: concept.url ?? null,
      description: concept.description ?? null,
    };
  }
  return null;
}

export function resolveConceptGrammarForm(conceptId, language, formKey) {
  if (!conceptId || !language || !formKey) {
    return null;
  }
  const concept = findConceptById(conceptId);
  if (!concept) {
    return null;
  }
  return normalizeGrammarForm(concept.forms?.[language]?.[formKey], concept);
}

export function resolveSourcePhraseGrammarValue(
  sourceText,
  sourceLanguage,
  targetLanguage,
  formKey
) {
  const normalized = normalizeLabel(sourceText);
  if (!normalized || !sourceLanguage || !targetLanguage || !formKey) {
    return null;
  }
  for (const concept of loadLexicon().concepts) {
    if (!concept.primary?.[targetLanguage]) {
      continue;
    }
    if (!conceptHasSourceLabel(concept, sourceLanguage, normalized)) {
      continue;
    }
    const value = grammarValue(concept.forms?.[targetLanguage]?.[formKey]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

/**
 * The set of directional language pairs the interlingua can currently serve.
 * Pairs are discovered from the concept data, never hardcoded.
 */
export function listDirectionalPairs() {
  const pairs = new Set();
  for (const concept of loadLexicon().concepts) {
    const sources = Object.keys(concept.labels ?? {});
    const targets = Object.keys(concept.primary ?? {});
    for (const source of sources) {
      for (const target of targets) {
        if (source !== target) {
          pairs.add(`${source}:${target}`);
        }
      }
    }
  }
  return [...pairs].sort();
}

// Exposed for tests that need to reset the in-memory caches after rebuilding
// the lexicon fixture.
export function __resetLexiconCache() {
  cachedLexicon = null;
  directionalCache.clear();
}

function mergeVirtualConcepts(baseConcepts, virtualEntries) {
  const byId = new Map(baseConcepts.map((concept) => [concept.id, concept]));
  for (const entry of virtualEntries) {
    const incoming = virtualEntryToConcept(entry);
    const previous = byId.get(incoming.id);
    byId.set(
      incoming.id,
      previous ? mergeConcept(previous, incoming) : incoming
    );
  }
  return [...byId.values()];
}

function mergeConcept(previous, incoming) {
  return {
    ...previous,
    ...withoutEmpty(incoming),
    url: previous.url ?? incoming.url ?? null,
    labels: mergeLanguageLists(previous.labels, incoming.labels),
    primary: { ...(previous.primary ?? {}), ...(incoming.primary ?? {}) },
    forms: mergeNestedObjects(previous.forms, incoming.forms),
  };
}

function withoutEmpty(value) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => entry !== null && entry !== undefined && entry !== ''
    )
  );
}

function mergeLanguageLists(left = {}, right = {}) {
  const result = { ...left };
  for (const [language, labels] of Object.entries(right)) {
    result[language] = [
      ...new Set([...(result[language] ?? []), ...(labels ?? [])]),
    ];
  }
  return result;
}

function mergeNestedObjects(left = {}, right = {}) {
  const result = { ...left };
  for (const [key, value] of Object.entries(right ?? {})) {
    result[key] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? mergeNestedObjects(result[key], value)
        : value;
  }
  return result;
}

function findConceptById(conceptId) {
  return (
    loadLexicon().concepts.find(
      (concept) => concept.id === conceptId || concept.entityId === conceptId
    ) ?? null
  );
}

function conceptHasSourceLabel(concept, sourceLanguage, normalized) {
  return (concept.labels?.[sourceLanguage] ?? []).some(
    (label) => normalizeLabel(label) === normalized
  );
}

function grammarValue(raw) {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'object') {
    return raw.value ?? raw.text ?? null;
  }
  return String(raw);
}

function normalizeGrammarForm(raw, concept) {
  if (raw === null || raw === undefined) {
    return null;
  }
  const form = typeof raw === 'object' ? raw : { text: String(raw) };
  if (!form.text) {
    return null;
  }
  const linked = form.linked !== false;
  return {
    text: form.text,
    entityId:
      form.entityId ?? (linked ? (concept.entityId ?? concept.id) : null),
    url: form.url ?? (linked ? concept.url : null),
    description: form.description ?? concept.description ?? null,
  };
}

function normalizeLabel(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function directionalGlossaryKeys(value) {
  const compact = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return [...new Set([String(value ?? ''), compact, normalizeLabel(value)])];
}
