import {
  decodeBase64ToBytes,
  encodeBytesToBase64,
} from './meta-language-store.js';
import {
  decodeFromDoubletsWeb,
  encodeAsDoubletsWeb,
} from '../js/src/browser-doublets-web.js';

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
  try {
    const raw = globalThis.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const entries = await decodeFromDoubletsWeb(decodeCacheBytes(raw));
        if (Array.isArray(entries)) {
          for (const [key, value] of entries) {
            writeEntry(key, value);
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
          writeEntry(key, value);
        }
      }
    }
  } catch {
    // Cache is best-effort and survives storage problems silently.
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
