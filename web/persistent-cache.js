import {
  decodeBase64ToBytes,
  encodeBytesToBase64,
} from './meta-language-store.js';
import {
  decodeFromDoubletsWeb,
  encodeAsDoubletsWeb,
} from '../js/src/browser-doublets-web.js';
import { parseLinoCacheEntries } from '../js/src/lino.js';

// Issue #128 (R6): the quality gate records Wikimedia API responses into a
// `.lino` cache that ships with the site (`js/data/wikimedia-cache.lino`). When
// a visitor has no cached responses yet we seed the in-memory cache from that
// file so the first formalization replays offline instead of hitting the live
// APIs — "executing the same test in web app ... will be faster".
const dataCacheUrl = new URL(
  '../js/data/wikimedia-cache.lino',
  import.meta.url
);
const seededEntryTtlMs = 7 * 24 * 60 * 60 * 1000;

export function createPersistentWikimediaCache(storageKey) {
  const map = new Map();
  const legacyStorageKey = storageKey.replace(/\.v2$/u, '.v1');
  const writeEntry = Map.prototype.set.bind(map);
  const ready = hydrateWikimediaCache(writeEntry, storageKey, legacyStorageKey);
  let pendingPersist = ready;
  Object.defineProperty(map, 'ready', {
    value: ready,
    enumerable: false,
  });
  const originalSet = map.set.bind(map);
  map.set = (key, value) => {
    const result = originalSet(key, value);
    pendingPersist = schedulePersist(pendingPersist, map, storageKey);
    return result;
  };
  const originalDelete = map.delete.bind(map);
  map.delete = (key) => {
    const result = originalDelete(key);
    pendingPersist = schedulePersist(pendingPersist, map, storageKey);
    return result;
  };
  const originalClear = map.clear.bind(map);
  map.clear = () => {
    originalClear();
    pendingPersist = schedulePersist(pendingPersist, map, storageKey);
  };
  return map;
}

async function hydrateWikimediaCache(writeEntry, storageKey, legacyStorageKey) {
  let restored = 0;
  const write = (key, value) => {
    writeEntry(key, value);
    restored += 1;
  };
  try {
    const raw = globalThis.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const entries = await decodeFromDoubletsWeb(decodeCacheBytes(raw));
        if (Array.isArray(entries)) {
          for (const [key, value] of entries) {
            write(key, value);
          }
          return;
        }
      } catch {
        // Try the previous JSON cache below if the new binary cache is stale.
      }
    }
    const legacy = globalThis.localStorage.getItem(legacyStorageKey);
    if (legacy) {
      const entries = JSON.parse(legacy);
      if (Array.isArray(entries)) {
        for (const [key, value] of entries) {
          write(key, value);
        }
      }
    }
  } catch {
    // Cache is best-effort and survives storage problems silently.
  }
  if (restored === 0) {
    await seedFromDataCache(write);
  }
}

// Seed the in-memory cache from the site's committed `.lino` cache. Stored
// values are bare API responses, so we wrap each one in the `{expiresAt, value}`
// envelope the evidence client expects. Best-effort: a missing or malformed
// cache just leaves the live fetch path in place.
async function seedFromDataCache(write) {
  const fetchImpl = globalThis.fetch?.bind(globalThis);
  if (!fetchImpl) {
    return;
  }
  try {
    const response = await fetchImpl(dataCacheUrl, { cache: 'force-cache' });
    if (!response?.ok) {
      return;
    }
    const expiresAt = Date.now() + seededEntryTtlMs;
    for (const [url, value] of parseLinoCacheEntries(await response.text())) {
      write(url, { expiresAt, value });
    }
  } catch {
    // No seed cache available (offline, 404, parse error) — ignore.
  }
}

function schedulePersist(pendingPersist, map, storageKey) {
  return pendingPersist
    .catch(() => {})
    .then(() => persistWikimediaCache(map, storageKey));
}

async function persistWikimediaCache(map, storageKey) {
  try {
    const entries = [...map.entries()].slice(-200);
    const { binary } = await encodeAsDoubletsWeb(entries);
    globalThis.localStorage.setItem(storageKey, encodeBytesToBase64(binary));
  } catch {
    // Storage may be unavailable; the in-memory cache still works for this page.
  }
}

function decodeCacheBytes(raw) {
  const text = String(raw).trim();
  if (text.startsWith('{')) {
    const record = JSON.parse(text);
    return decodeBase64ToBytes(record.binary);
  }
  return decodeBase64ToBytes(text);
}
