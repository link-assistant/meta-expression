import { translateTextWith } from './translate.js';

const wikipediaHostPattern = /^([a-z][a-z0-9-]*)\.wikipedia\.org$/i;
const defaultSection = 'summary';
const defaultMaxCharacters = 1600;
const defaultCacheTtlMs = 7 * 24 * 60 * 60 * 1000;

export function collectLinkedArticleTargets(result, options = {}) {
  const sourceLanguage =
    options.sourceLanguage ?? result?.sourceLanguage ?? 'en';
  const seen = new Set();
  const phrases = result?.formalization?.cst?.phrases ?? [];
  return phrases
    .map((phrase) => articleTargetFromPhrase(phrase, sourceLanguage))
    .filter(Boolean)
    .filter((target) => {
      const key = target.sourceUrl;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export async function translateWikipediaArticleContext(article, options = {}) {
  if (options.experimental !== true) {
    return {
      status: 'disabled',
      reason: 'experimental-article-translation-disabled',
      article: normalizeArticleTarget(article, options.sourceLanguage ?? 'en'),
    };
  }
  const target = normalizeArticleTarget(
    article,
    options.sourceLanguage ?? 'en'
  );
  if (!target) {
    throw new Error('Wikipedia article translation needs a title or URL.');
  }
  const config = createArticleConfig(options, target);
  const summary = await fetchArticleSummary(target, config);
  const sourceText = boundedArticleText(summary.extract, config.maxCharacters);
  if (!sourceText) {
    return {
      status: 'empty',
      article: target,
      sourceUrl: summary.sourceUrl,
      revision: summary.revision,
      section: config.section,
      sourceText,
      translation: null,
    };
  }
  const cacheKey = articleTranslationCacheKey(summary, config);
  const cached = readCache(config.cache, cacheKey, config);
  if (cached) {
    return cached;
  }
  const translation = await translateTextWith(sourceText, {
    ...options.translateOptions,
    fetch: config.fetchImpl,
    cache: config.cache,
    sourceLanguage: target.language,
    targetLanguage: config.targetLanguage,
    linkTargetMode: options.linkTargetMode,
    translationStrategy: options.translationStrategy,
    trace: options.trace,
  });
  const result = {
    status: 'translated',
    article: target,
    title: summary.title,
    sourceUrl: summary.sourceUrl,
    revision: summary.revision,
    section: config.section,
    sourceText,
    truncated: summary.extract.length > sourceText.length,
    cacheKey,
    translation,
  };
  writeCache(config.cache, cacheKey, result, config);
  return result;
}

function createArticleConfig(options, target) {
  return {
    fetchImpl: options.fetch ?? globalThis.fetch?.bind(globalThis) ?? null,
    cache: options.cache ?? new Map(),
    now: options.now ?? Date.now,
    cacheTtlMs: options.cacheTtlMs ?? defaultCacheTtlMs,
    section: options.section ?? defaultSection,
    targetLanguage: normalizeLanguage(
      options.targetLanguage ??
        options.to ??
        defaultTargetLanguage(target.language)
    ),
    maxCharacters: Math.max(1, options.maxCharacters ?? defaultMaxCharacters),
  };
}

async function fetchArticleSummary(target, config) {
  if (config.section !== defaultSection) {
    throw new Error('Only bounded summary article translation is supported.');
  }
  const summaryUrl = `https://${target.language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    target.title
  )}`;
  const cached = readCache(config.cache, summaryUrl, config);
  if (cached) {
    return cached;
  }
  if (!config.fetchImpl) {
    throw new Error('Wikipedia article translation requires fetch.');
  }
  const response = await config.fetchImpl(summaryUrl, {
    headers: { Accept: 'application/json' },
  });
  if (!response?.ok) {
    throw new Error(
      `Wikipedia summary lookup failed: HTTP ${response?.status ?? 'unknown'}`
    );
  }
  const summary = normalizeArticleSummary(await response.json(), target);
  writeCache(config.cache, summaryUrl, summary, config);
  return summary;
}

function normalizeArticleSummary(payload, target) {
  return {
    title: payload.title ?? target.title,
    sourceUrl: articleSummarySourceUrl(payload, target),
    revision: articleSummaryRevision(payload),
    extract: String(payload.extract ?? ''),
  };
}

function articleSummarySourceUrl(payload, target) {
  return (
    payload.content_urls?.desktop?.page ??
    target.sourceUrl ??
    wikipediaArticleUrl(target)
  );
}

function articleSummaryRevision(payload) {
  return (
    payload.revision ??
    payload.timestamp ??
    payload.pageid ??
    'unknown-revision'
  );
}

function articleTargetFromPhrase(phrase, sourceLanguage) {
  const entity = phrase.entity ?? {};
  const sourceUrl = entity.wikipediaUrl ?? entity.sourceUrl ?? entity.url;
  const target = normalizeArticleTarget(sourceUrl, sourceLanguage);
  if (!target) {
    return null;
  }
  return {
    ...target,
    phraseId: phrase.id,
    sourceText: phrase.text,
    entityId: entity.id ?? null,
    label: entity.label ?? phrase.text,
  };
}

function normalizeArticleTarget(article, fallbackLanguage) {
  if (!article) {
    return null;
  }
  if (typeof article === 'object') {
    const fromUrl = normalizeArticleTarget(
      article.sourceUrl ?? article.wikipediaUrl ?? article.url,
      article.language ?? fallbackLanguage
    );
    if (fromUrl) {
      return { ...fromUrl, ...article };
    }
    if (article.title) {
      return {
        title: normalizeTitle(article.title),
        language: normalizeLanguage(article.language ?? fallbackLanguage),
        sourceUrl: article.sourceUrl ?? null,
      };
    }
    return null;
  }
  const text = String(article).trim();
  if (!text) {
    return null;
  }
  try {
    const url = new URL(text);
    const host = url.hostname.match(wikipediaHostPattern);
    if (!host) {
      return null;
    }
    const title = decodeURIComponent(url.pathname.replace(/^\/wiki\//, ''));
    return {
      title: normalizeTitle(title),
      language: normalizeLanguage(host[1]),
      sourceUrl: url.href,
    };
  } catch {
    return {
      title: normalizeTitle(text),
      language: normalizeLanguage(fallbackLanguage),
      sourceUrl: null,
    };
  }
}

function boundedArticleText(text, maxCharacters) {
  const source = String(text ?? '').trim();
  if (source.length <= maxCharacters) {
    return source;
  }
  const sliced = source.slice(0, maxCharacters);
  return sliced.replace(/\s+\S*$/, '').trim() || sliced.trim();
}

function articleTranslationCacheKey(summary, config) {
  return [
    'article-translation',
    summary.sourceUrl,
    config.targetLanguage,
    config.section,
    summary.revision,
  ].join('|');
}

function readCache(cache, key, config) {
  const entry = cache?.get?.(key);
  if (!entry) {
    return null;
  }
  if (
    Number.isFinite(entry.expiresAt) &&
    entry.expiresAt < Number(config.now())
  ) {
    cache.delete?.(key);
    return null;
  }
  return entry.value ?? entry;
}

function writeCache(cache, key, value, config) {
  cache?.set?.(key, {
    value,
    expiresAt: Number(config.now()) + config.cacheTtlMs,
  });
}

function wikipediaArticleUrl(target) {
  return `https://${target.language}.wikipedia.org/wiki/${encodeURIComponent(
    target.title
  )}`;
}

function normalizeTitle(value) {
  return String(value ?? '')
    .trim()
    .replace(/^\/wiki\//, '')
    .replace(/ /g, '_');
}

function normalizeLanguage(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return /^[a-z][a-z0-9-]{0,14}$/.test(normalized) ? normalized : 'en';
}

function defaultTargetLanguage(sourceLanguage) {
  return sourceLanguage === 'en' ? 'ru' : 'en';
}
