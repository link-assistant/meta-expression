import { createWikimediaEvidenceClient } from '../js/src/index.js';
import {
  decodeFromDoubletsWeb,
  encodeAsDoubletsWeb,
} from '../js/src/browser-doublets-web.js';

const wikimediaCacheStorageKey = 'meta-expression.wikimedia-cache.v2';
const legacyCacheStorageKey = 'meta-expression.wikimedia-cache.v1';
const cache = new Map();

const cacheReady = hydrateCache();

const client = createWikimediaEvidenceClient({ cache });

self.addEventListener('message', async (event) => {
  const { id, statement } = event.data ?? {};
  if (!id || !statement) {
    return;
  }

  try {
    await cacheReady;
    const evidence = await client.resolveEvidence(statement);
    await persistCache();
    self.postMessage({ id, evidence });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

async function hydrateCache() {
  if (typeof self.localStorage === 'undefined') {
    return;
  }
  try {
    const raw = self.localStorage.getItem(wikimediaCacheStorageKey);
    if (raw) {
      try {
        const entries = await decodeFromDoubletsWeb(decodeBase64ToBytes(raw));
        if (Array.isArray(entries)) {
          for (const [key, value] of entries) {
            cache.set(key, value);
          }
          return;
        }
      } catch {
        // Try the previous JSON cache below if the new binary cache is stale.
      }
    }
    const legacy = self.localStorage.getItem(legacyCacheStorageKey);
    if (legacy) {
      const entries = JSON.parse(legacy);
      if (Array.isArray(entries)) {
        for (const [key, value] of entries) {
          cache.set(key, value);
        }
      }
    }
  } catch {
    // Best effort hydration.
  }
}

async function persistCache() {
  if (typeof self.localStorage === 'undefined') {
    return;
  }
  try {
    const entries = [...cache.entries()].slice(-200);
    const { binary } = await encodeAsDoubletsWeb(entries);
    self.localStorage.setItem(
      wikimediaCacheStorageKey,
      encodeBytesToBase64(binary)
    );
  } catch {
    // Best effort persistence.
  }
}

function encodeBytesToBase64(bytes) {
  let binaryString = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return self.btoa(binaryString);
}

function decodeBase64ToBytes(text) {
  const binaryString = self.atob(text);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
