import {
  loadPortableCaseFromDoubletsWeb,
  savePortableCaseToDoubletsWeb,
} from '../js/src/browser-doublets-web.js';

export function createBrowserMetaLanguageStore(storageKey) {
  return {
    async load() {
      try {
        const raw = globalThis.localStorage?.getItem(storageKey);
        if (!raw) {
          return null;
        }
        const record = JSON.parse(raw);
        const binary = decodeBase64ToBytes(record.binary);
        return await loadPortableCaseFromDoubletsWeb({
          binary,
          rootIndex: record.rootIndex,
        });
      } catch {
        return null;
      }
    },

    async save(input, options = {}) {
      const saved = await savePortableCaseToDoubletsWeb(input, options);
      try {
        globalThis.localStorage?.setItem(
          storageKey,
          JSON.stringify({
            format: saved.format,
            version: saved.version,
            rootIndex: saved.rootIndex,
            binary: encodeBytesToBase64(saved.binary),
            savedAt: options.exportedAt ?? new Date().toISOString(),
          })
        );
      } catch {
        // Browser persistence is best effort; callers still receive the store.
      }
      return saved;
    },
  };
}

export function encodeBytesToBase64(bytes) {
  let binaryString = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binaryString);
}

export function decodeBase64ToBytes(text) {
  const binaryString = globalThis.atob(text);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
