import {
  decodeFromDoublets,
  encodeAsDoublets,
  formalizeTextWith,
  parseSourceSpec,
  createWikidataSource,
} from '../src/index.js';

// v2: cache entries are stored as base64-encoded doublets blobs. The
// previous v1 key held a JSON snapshot — we leave it for one release so
// existing browsers don't pay a cold-cache penalty when they upgrade.
const wikimediaCacheStorageKey = 'meta-expression.wikimedia-cache.v2';
const legacyCacheStorageKey = 'meta-expression.wikimedia-cache.v1';
const cache = new Map();

hydrateCache();

self.addEventListener('message', async (event) => {
  const { id, text, options } = event.data ?? {};
  if (!id || typeof text !== 'string') {
    return;
  }

  try {
    const finalOptions = resolveOptions(options ?? {});
    const result = await formalizeTextWith(text, {
      ...finalOptions,
      cache,
      fetch: self.fetch?.bind(self),
    });
    persistCache();
    self.postMessage({ id, result: serializeResult(result) });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

function resolveOptions(options) {
  const final = { ...options };
  if (typeof options.sourcesSpec === 'string' && options.sourcesSpec.trim()) {
    try {
      final.sources = parseSourceSpec(options.sourcesSpec);
    } catch {
      final.sources = [createWikidataSource()];
    }
  }
  delete final.sourcesSpec;
  return final;
}

function serializeResult(result) {
  return {
    text: result.text,
    tokens: result.tokens,
    phrases: result.phrases,
    contexts: result.contexts,
    mainContext: result.mainContext,
    additionalContexts: result.additionalContexts,
    bigContexts: result.bigContexts,
    mainBigContext: result.mainBigContext,
    additionalBigContexts: result.additionalBigContexts,
    interpretations: result.interpretations,
    markdown: result.markdown,
    html: result.html,
    linksNotation: result.linksNotation,
    linksNetwork: result.linksNetwork,
    linkTargetMode: result.linkTargetMode,
  };
}

function hydrateCache() {
  if (typeof self.localStorage === 'undefined') {
    return;
  }
  try {
    const raw = self.localStorage.getItem(wikimediaCacheStorageKey);
    if (raw) {
      const decoded = decodeBase64ToBytes(raw);
      const entries = decodeFromDoublets(decoded);
      if (Array.isArray(entries)) {
        for (const [key, value] of entries) {
          cache.set(key, value);
        }
        return;
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

function persistCache() {
  if (typeof self.localStorage === 'undefined') {
    return;
  }
  try {
    const entries = [...cache.entries()].slice(-200);
    const { binary } = encodeAsDoublets(entries);
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
