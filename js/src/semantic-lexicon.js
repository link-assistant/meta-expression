import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The semantic interlingua lexicon. Every entry is a concept with a unique id
// (Wikidata Q, Wiktionary or Wikipedia URL) and per-language surface forms.
// Directional translation is never stored as a direct language pair; instead it
// is derived at runtime by routing source forms through concept ids to the
// licensed target form. This keeps `js/src` free of hardcoded en<->ru style
// dictionaries while still providing a deterministic, source-backed fallback
// for offline use and CI.
const lexiconUrl = new URL('../data/semantic-lexicon.json', import.meta.url);

let cachedLexicon = null;
const directionalCache = new Map();

function loadLexicon() {
  if (cachedLexicon) {
    return cachedLexicon;
  }
  const raw = readFileSync(fileURLToPath(lexiconUrl), 'utf8');
  const parsed = JSON.parse(raw);
  cachedLexicon = {
    version: parsed.version ?? 1,
    languages: Array.isArray(parsed.languages) ? parsed.languages : [],
    concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
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
      if (!(form in map)) {
        map[form] = targetForm;
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
