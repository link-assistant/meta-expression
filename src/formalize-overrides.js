/**
 * Lazy override layer for formalize.
 *
 * Two override sources are supported:
 *   1. Repository overrides — a JSON file under `config/formalize-overrides.json`
 *      shipped with the repo. Loaded synchronously by Node call sites.
 *   2. User overrides — supplied per-call (browser uses `localStorage`,
 *      Node CLI uses `--override <file>`).
 *
 * An override entry is:
 *   {
 *     "phrase": "Genshin Impact",
 *     "entityId": "Q70626251",          // any source-scoped id
 *     "label": "Genshin Impact",
 *     "kind": "entity",
 *     "source": "wikidata",
 *     "wikipediaUrl": "https://...",
 *     "sourceUrl":   "https://..."
 *   }
 *
 * Phrase keys are normalised (lowercased, whitespace collapsed) so
 * "Genshin Impact" and "genshin  impact" hit the same override.
 */

/**
 * @typedef {Object} OverrideEntry
 * @property {string} phrase
 * @property {string} entityId
 * @property {string} label
 * @property {'entity'|'property'} kind
 * @property {string} [source]
 * @property {string} [description]
 * @property {string} [wikipediaUrl]
 * @property {string} [sourceUrl]
 */

/**
 * Build an override map from one or more lists.
 *
 * @param {Array<OverrideEntry|OverrideEntry[]>} layers
 * @returns {Map<string, OverrideEntry>}
 */
export function buildOverrideMap(...layers) {
  const map = new Map();
  for (const layer of layers) {
    const entries = Array.isArray(layer) ? layer : layer ? [layer] : [];
    for (const entry of entries) {
      if (!entry?.phrase || !entry.entityId) {
        continue;
      }
      const key = normalizePhraseKey(entry.phrase);
      map.set(key, { ...entry, normalizedKey: key });
    }
  }
  return map;
}

/**
 * Look up an override for a phrase text.
 *
 * @param {Map<string, OverrideEntry>} overrides
 * @param {string} phraseText
 * @returns {OverrideEntry|null}
 */
export function lookupOverride(overrides, phraseText) {
  if (!overrides || overrides.size === 0) {
    return null;
  }
  return overrides.get(normalizePhraseKey(phraseText)) ?? null;
}

/**
 * Convert an override entry into the candidate shape the formalize
 * pipeline expects so it can slot in alongside live API results.
 *
 * @param {OverrideEntry} override
 * @returns {object}
 */
export function overrideToCandidate(override) {
  return {
    id: override.entityId,
    label: override.label ?? override.phrase,
    description: override.description ?? '',
    kind: override.kind ?? 'entity',
    source: override.source ?? 'override',
    sourceUrl: override.sourceUrl ?? null,
    matchText: override.label ?? override.phrase,
    score: 1000, // huge bias so overrides always win disambiguation
    ngramSize: 0,
    overrideEntry: override,
  };
}

/**
 * Convert an override entry into the entity shape attached to a phrase.
 *
 * @param {OverrideEntry} override
 * @returns {object}
 */
export function overrideToEntity(override) {
  return {
    id: override.entityId,
    label: override.label ?? override.phrase,
    description: override.description ?? '',
    kind: override.kind ?? 'entity',
    source: override.source ?? 'override',
    score: 1000,
    wikipediaUrl: override.wikipediaUrl ?? null,
    wikipediaTitle: null,
    sourceUrl: override.sourceUrl ?? override.wikipediaUrl ?? null,
    contextLabels: Array.isArray(override.contextLabels)
      ? override.contextLabels
      : [],
    overrideEntry: override,
  };
}

function normalizePhraseKey(phrase) {
  return String(phrase ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Load repository-level overrides from disk (Node-only).
 * Returns an empty array on any IO/parse failure so the caller can keep going.
 *
 * @returns {Promise<OverrideEntry[]>}
 */
export async function loadRepoOverrides() {
  if (typeof process === 'undefined' || !process.versions?.node) {
    return [];
  }
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const repoPath = path.resolve(
      process.cwd(),
      'config/formalize-overrides.json'
    );
    const raw = await fs.readFile(repoPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed?.entries)) {
      return parsed.entries;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Load user overrides from a file path or already-parsed list.
 *
 * @param {string|OverrideEntry[]} source
 * @returns {Promise<OverrideEntry[]>}
 */
export async function loadUserOverrides(source) {
  if (Array.isArray(source)) {
    return source;
  }
  if (!source || typeof process === 'undefined' || !process.versions?.node) {
    return [];
  }
  try {
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(source, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed?.entries)) {
      return parsed.entries;
    }
    return [];
  } catch {
    return [];
  }
}
