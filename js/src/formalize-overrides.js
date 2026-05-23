/**
 * Lazy override layer for formalize.
 *
 * Two override sources are supported:
 *   1. Repository overrides — a Links Notation file under
 *      `docs/formalize/overrides.lino` shipped with the repo. Loaded
 *      asynchronously by Node call sites. JSON is still accepted as a
 *      legacy fallback so existing checkouts keep working.
 *   2. User overrides — supplied per-call (browser uses `localStorage`,
 *      Node CLI uses `--override <file>`). Both `.lino` and `.json`
 *      paths are auto-detected.
 *
 * An override entry is:
 *
 *     entry
 *       phrase "Genshin Impact"
 *       entityId "Q70626251"
 *       label "Genshin Impact"
 *       kind "entity"
 *       source "wikidata"
 *       wikipediaUrl "https://..."
 *       sourceUrl "https://..."
 *
 * Phrase keys are normalised (lowercased, whitespace collapsed) so
 * "Genshin Impact" and "genshin  impact" hit the same override.
 */

import { parseLinoEntries, serializeLinoEntries } from './lino.js';

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
 * Decode an override file's raw text. Detects `.lino` content by the
 * absence of a leading `{` / `[` and falls back to JSON otherwise.
 * Returns an empty array on any parse failure so callers can keep going.
 *
 * @param {string} raw
 * @returns {OverrideEntry[]}
 */
export function decodeOverridesText(raw) {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return [];
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
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
  try {
    return parseLinoEntries(raw);
  } catch {
    return [];
  }
}

/**
 * Encode an array of overrides as Links Notation text.
 *
 * @param {OverrideEntry[]} entries
 * @returns {string}
 */
export function encodeOverridesAsLino(entries) {
  return serializeLinoEntries(entries, { rootIdentifier: 'overrides' });
}

/**
 * Load repository-level overrides from disk (Node-only).
 * Tries `docs/formalize/overrides.lino` first, then falls back to
 * `docs/formalize/overrides.json` for legacy checkouts. Returns an empty
 * array on any IO/parse failure so the caller can keep going.
 *
 * @returns {Promise<OverrideEntry[]>}
 */
export async function loadRepoOverrides() {
  if (typeof process === 'undefined' || !process.versions?.node) {
    return [];
  }
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const candidates = [
    'docs/formalize/overrides.lino',
    'docs/formalize/overrides.json',
  ];
  for (const relative of candidates) {
    try {
      const resolved = path.resolve(process.cwd(), relative);
      const raw = await fs.readFile(resolved, 'utf8');
      const entries = decodeOverridesText(raw);
      if (entries.length > 0) {
        return entries;
      }
    } catch {
      // try next candidate
    }
  }
  return [];
}

/**
 * Load user overrides from a file path or already-parsed list.
 * Auto-detects `.lino` vs `.json` by file content.
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
    return decodeOverridesText(raw);
  } catch {
    return [];
  }
}
