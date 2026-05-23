import { createWikimediaEvidenceClient } from '../js/src/index.js';

const wikimediaCacheStorageKey = 'meta-expression.wikimedia-cache.v1';
const cache = new Map();

hydrateCache();

const client = createWikimediaEvidenceClient({ cache });

self.addEventListener('message', async (event) => {
  const { id, statement } = event.data ?? {};
  if (!id || !statement) {
    return;
  }

  try {
    const evidence = await client.resolveEvidence(statement);
    persistCache();
    self.postMessage({ id, evidence });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

function hydrateCache() {
  if (typeof self.localStorage === 'undefined') {
    return;
  }
  try {
    const raw = self.localStorage.getItem(wikimediaCacheStorageKey);
    if (!raw) {
      return;
    }
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) {
      return;
    }
    for (const [key, value] of entries) {
      cache.set(key, value);
    }
  } catch {
    // Best effort hydration.
  }
}

function persistCache() {
  if (typeof self.localStorage === 'undefined') {
    return;
  }
  try {
    const entries = [...cache.entries()].slice(-200);
    self.localStorage.setItem(
      wikimediaCacheStorageKey,
      JSON.stringify(entries)
    );
  } catch {
    // Best effort persistence.
  }
}
