import {
  formalizeTextWith,
  parseSourceSpec,
  createWikidataSource,
} from '../src/index.js';

const wikimediaCacheStorageKey = 'meta-expression.wikimedia-cache.v1';
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
