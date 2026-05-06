export function createPersistentWikimediaCache(storageKey) {
  const map = new Map();
  hydrateWikimediaCache(map, storageKey);
  const originalSet = map.set.bind(map);
  map.set = (key, value) => {
    const result = originalSet(key, value);
    persistWikimediaCache(map, storageKey);
    return result;
  };
  const originalDelete = map.delete.bind(map);
  map.delete = (key) => {
    const result = originalDelete(key);
    persistWikimediaCache(map, storageKey);
    return result;
  };
  const originalClear = map.clear.bind(map);
  map.clear = () => {
    originalClear();
    persistWikimediaCache(map, storageKey);
  };
  return map;
}

function hydrateWikimediaCache(map, storageKey) {
  try {
    const raw = globalThis.localStorage.getItem(storageKey);
    if (!raw) {
      return;
    }
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) {
      return;
    }
    for (const [key, value] of entries) {
      map.set(key, value);
    }
  } catch {
    // Cache is best-effort and survives storage problems silently.
  }
}

function persistWikimediaCache(map, storageKey) {
  try {
    const entries = [...map.entries()].slice(-200);
    globalThis.localStorage.setItem(storageKey, JSON.stringify(entries));
  } catch {
    // Storage may be unavailable; the in-memory cache still works for this page.
  }
}
