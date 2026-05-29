/**
 * HTTP-level snapshot store for Wikimedia API responses.
 *
 * Issue #21 asks for "multi-layer API caching with snapshot recording so
 * unit tests can replay real Wikipedia/Wikidata/Wiktionary responses
 * without hitting the network". This module gives the formalize pipeline
 * three lookup tiers in priority order:
 *
 *   1. Repository overrides (Links Notation pins) — already handled at
 *      the candidate level in src/formalize-overrides.js.
 *   2. Snapshot store (this file) — replays previously recorded JSON.
 *   3. Live fetch — only used when the snapshot is missing AND the
 *      caller opted into recording or overlay mode.
 *
 * Snapshots live as one JSON file per URL keyed by a SHA-1 hash of the
 * URL: `<root>/<sha1>.json` containing `{url, recordedAt, value}`. A
 * sibling `manifest.lino` keeps the URL list in human-readable form so
 * reviewers can audit which endpoints a test pinned without unzipping
 * every blob.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseLinoCacheEntries, serializeLino } from './lino.js';

const manifestFileName = 'manifest.lino';
const snapshotFileExtension = '.json';
const linoCacheExtension = '.lino';

export const SNAPSHOT_MODES = Object.freeze({
  REPLAY: 'replay',
  RECORD: 'record',
  OVERLAY: 'overlay',
});

/**
 * Hash a URL into the on-disk snapshot key.
 *
 * @param {string|URL} url
 * @returns {string}
 */
export function snapshotKey(url) {
  return createHash('sha1').update(String(url)).digest('hex');
}

/**
 * Load every snapshot from `dir` into a Map<url, value>.
 *
 * @param {string} dir
 * @returns {Promise<Map<string, unknown>>}
 */
export async function loadSnapshotMap(dir) {
  const snapshots = new Map();
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return snapshots;
  }
  await Promise.all(
    entries.map(async (name) => {
      if (name.endsWith(snapshotFileExtension)) {
        await loadJsonSnapshotInto(snapshots, join(dir, name));
      } else if (
        name.endsWith(linoCacheExtension) &&
        name !== manifestFileName
      ) {
        await loadLinoCacheInto(snapshots, join(dir, name));
      }
    })
  );
  return snapshots;
}

async function loadJsonSnapshotInto(snapshots, filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8'));
    if (parsed?.url) {
      snapshots.set(String(parsed.url), parsed.value);
    }
  } catch {
    // ignore malformed snapshot files
  }
}

async function loadLinoCacheInto(snapshots, filePath) {
  try {
    const cache = parseSnapshotLino(await readFile(filePath, 'utf8'));
    for (const [url, value] of cache) {
      snapshots.set(url, value);
    }
  } catch {
    // ignore malformed or non-cache .lino files (e.g. a stray manifest)
  }
}

/**
 * Serialize a snapshot map into a single `.lino` cache document.
 *
 * Issue #128 asks for the API request/response cache to live "in data folder
 * and in .lino format, as we usually do". Each entry pins one request URL to
 * its recorded JSON response. The response is stored as a verbatim JSON string
 * so deeply nested Wikidata/Wikipedia/Wiktionary payloads round-trip losslessly
 * through the generic `.lino` codec, while the URL stays human-auditable.
 *
 * Entries are sorted by URL and carry no wall-clock timestamp so regenerating
 * the cache from the same inputs is byte-for-byte deterministic — a committed
 * cache file can therefore be kept fresh with a `git diff` check in CI.
 *
 * @param {Map<string, unknown>|Array<[string, unknown]>} snapshots
 * @returns {string}
 */
export function serializeSnapshotLino(snapshots) {
  const pairs = snapshots instanceof Map ? [...snapshots] : snapshots;
  const entries = pairs
    .map(([url, value]) => ({ url: String(url), value }))
    .sort((left, right) => left.url.localeCompare(right.url))
    .map((entry) => ({
      key: snapshotKey(entry.url),
      url: entry.url,
      response: JSON.stringify(entry.value),
    }));
  return serializeLino({ entries }, { rootIdentifier: 'cache' });
}

/**
 * Parse a `.lino` cache document back into a Map<url, value>.
 *
 * @param {string} text
 * @returns {Map<string, unknown>}
 */
export function parseSnapshotLino(text) {
  return parseLinoCacheEntries(text);
}

/**
 * Persist a snapshot map as a single `.lino` cache file, creating parent
 * directories as needed. Returns the absolute path that was written.
 *
 * @param {string} filePath
 * @param {Map<string, unknown>|Array<[string, unknown]>} snapshots
 * @returns {Promise<string>}
 */
export async function writeSnapshotLino(filePath, snapshots) {
  await mkdir(dirOf(filePath), { recursive: true });
  await writeFile(filePath, serializeSnapshotLino(snapshots));
  return filePath;
}

/**
 * Load a single `.lino` cache file into a Map<url, value>.
 *
 * @param {string} filePath
 * @returns {Promise<Map<string, unknown>>}
 */
export async function loadSnapshotLino(filePath) {
  try {
    return parseSnapshotLino(await readFile(filePath, 'utf8'));
  } catch {
    return new Map();
  }
}

function dirOf(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index === -1 ? '.' : normalized.slice(0, index);
}

/**
 * Wrap a snapshot Map so the formalize pipeline can use it as `cache`.
 * The Map signature exposes `get(url)` returning `{expiresAt, value}` and
 * a no-op `set` so live writes never erase the recorded baseline.
 *
 * @param {Map<string, unknown>} snapshots
 * @param {object} [options]
 * @param {number} [options.ttlMs] - effective TTL stamped on each entry.
 * @returns {{ get: Function, set: Function, has: Function, size: number }}
 */
export function createSnapshotCache(snapshots, options = {}) {
  const ttlMs = options.ttlMs ?? Number.MAX_SAFE_INTEGER;
  return {
    get(url) {
      if (!snapshots.has(String(url))) {
        return undefined;
      }
      return {
        expiresAt: Date.now() + ttlMs,
        value: snapshots.get(String(url)),
      };
    },
    set() {
      // Replay caches are read-only. A separate recorder writes to disk.
    },
    has(url) {
      return snapshots.has(String(url));
    },
    get size() {
      return snapshots.size;
    },
  };
}

/**
 * Build a fetch implementation that records every JSON response under
 * `dir`. Existing snapshots are reused unless `mode` is `'record'`, in
 * which case the live fetch always runs and overwrites.
 *
 * @param {object} options
 * @param {Function} options.fetchImpl
 * @param {string}   options.dir
 * @param {string}   [options.mode]    - one of SNAPSHOT_MODES.
 * @param {Map<string, unknown>} [options.snapshots]
 * @returns {Function} fetch-compatible implementation
 */
export function createSnapshotFetch(options) {
  const mode = options.mode ?? SNAPSHOT_MODES.OVERLAY;
  const snapshots = options.snapshots ?? new Map();
  const dir = options.dir;
  const fetchImpl = options.fetchImpl;
  return async function snapshotFetch(url, init) {
    const urlString = String(url);
    if (mode !== SNAPSHOT_MODES.RECORD && snapshots.has(urlString)) {
      return makeJsonResponse(snapshots.get(urlString));
    }
    if (mode === SNAPSHOT_MODES.REPLAY) {
      throw new Error(`No snapshot recorded for ${urlString}.`);
    }
    if (typeof fetchImpl !== 'function') {
      throw new Error('createSnapshotFetch requires a live fetch impl.');
    }
    const response = await fetchImpl(urlString, init);
    if (!response.ok) {
      return response;
    }
    const value = await response.clone().json();
    snapshots.set(urlString, value);
    if (dir) {
      await writeSnapshot(dir, urlString, value);
    }
    return makeJsonResponse(value);
  };
}

/**
 * Persist a single snapshot to disk and append it to the manifest.
 *
 * @param {string} dir
 * @param {string} url
 * @param {unknown} value
 * @returns {Promise<string>} absolute path of the JSON file
 */
export async function writeSnapshot(dir, url, value) {
  await mkdir(dir, { recursive: true });
  const key = snapshotKey(url);
  const filePath = join(dir, `${key}${snapshotFileExtension}`);
  const payload = {
    url,
    recordedAt: new Date().toISOString(),
    value,
  };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  await appendManifestEntry(dir, key, url);
  return filePath;
}

async function appendManifestEntry(dir, key, url) {
  const manifestPath = join(dir, manifestFileName);
  let existing = '';
  try {
    existing = await readFile(manifestPath, 'utf8');
  } catch {
    // first run — manifest does not exist yet
  }
  const linePrefix = `${key} `;
  if (existing.split('\n').some((line) => line.startsWith(linePrefix))) {
    return;
  }
  const line = `${key} (${escapeLino(url)})\n`;
  await writeFile(manifestPath, `${existing}${line}`);
}

function escapeLino(value) {
  // Manifests use a 1-line `<key> (<url>)` shape so the URL only needs
  // its closing paren escaped; everything else is allowed verbatim.
  return String(value).replace(/\)/g, '\\)');
}

function makeJsonResponse(value) {
  const body = JSON.stringify(value);
  return {
    ok: true,
    status: 200,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type'
          ? 'application/json'
          : null;
      },
    },
    json() {
      return Promise.resolve(value);
    },
    text() {
      return Promise.resolve(body);
    },
    clone() {
      return makeJsonResponse(value);
    },
  };
}

/**
 * Convenience helper: load snapshots from `dir`, build a cache and a
 * snapshot-aware fetch in one call. Pass the returned `{cache, fetch}`
 * straight to `formalizeTextWith`.
 *
 * @param {object} options
 * @param {string} options.dir
 * @param {Function} [options.fetchImpl]
 * @param {string} [options.mode]
 * @returns {Promise<{cache: object, fetch: Function, snapshots: Map}>}
 */
export async function createSnapshotLayer(options) {
  const snapshots = await loadSnapshotMap(options.dir);
  const cache = createSnapshotCache(snapshots);
  const fetch = createSnapshotFetch({
    fetchImpl: options.fetchImpl,
    dir: options.dir,
    mode: options.mode,
    snapshots,
  });
  return { cache, fetch, snapshots };
}
