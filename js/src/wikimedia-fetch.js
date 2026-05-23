const wikimediaApiUserAgent =
  'meta-expression/0.9.0 (https://github.com/link-assistant/meta-expression)';
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
const oneDayMs = 24 * 60 * 60 * 1000;
const threeDaysMs = 3 * oneDayMs;
const inflightByCache = new WeakMap();
const fallbackInflight = new Map();

class WikimediaRequestError extends Error {
  constructor(status) {
    super(`Wikimedia request failed with status ${status}.`);
    this.name = 'WikimediaRequestError';
    this.status = status;
  }
}

export async function fetchWikimediaJson(url, config, options = {}) {
  const key = String(url);
  const now = Number(config.now());
  const cached = config.cache.get(key);
  if (cached && cached.expiresAt > now) {
    options.onCacheHit?.(key);
    return await Promise.resolve(readCachedValue(cached));
  }
  if (cached) {
    config.cache.delete(key);
  }
  const inflight = inflightMap(config.cache);
  if (inflight.has(key)) {
    return inflight.get(key);
  }
  const request = fetchAndCacheWikimediaJson(key, config, now).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, request);
  return await request;
}

async function fetchAndCacheWikimediaJson(key, config, now) {
  try {
    const response = await fetchWithRetry(key, config);
    const value = await response.json();
    config.cache.set(key, {
      expiresAt: cacheExpiresAt(key, config, now),
      value,
    });
    return value;
  } catch (error) {
    if (shouldCacheError(error)) {
      config.cache.set(key, {
        expiresAt: cacheExpiresAt(key, config, now),
        error: {
          message: error.message,
          status: error.status,
        },
      });
    }
    throw error;
  }
}

async function fetchWithRetry(key, config) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await config.fetchImpl(key, {
      headers: wikimediaRequestHeaders(),
    });
    if (response.ok) {
      return response;
    }
    if (
      !isRetryableWikimediaStatus(response.status) ||
      attempt === maxAttempts
    ) {
      throw new WikimediaRequestError(response.status);
    }
    await wait(retryDelayMs(response, attempt));
  }
  throw new Error('Wikimedia request failed.');
}

function readCachedValue(cached) {
  if ('error' in cached) {
    throw new WikimediaRequestError(cached.error?.status ?? 'unknown');
  }
  return cached.value;
}

function shouldCacheError(error) {
  return (
    error instanceof WikimediaRequestError && [400, 404].includes(error.status)
  );
}

function cacheExpiresAt(key, config, now) {
  const ttl = cacheTtlMs(config);
  return now + ttl + cacheJitterMs(key, config, ttl);
}

function cacheTtlMs(config) {
  const ttl = Number(config.cacheTtlMs);
  return Number.isFinite(ttl) && ttl >= 0 ? ttl : sevenDaysMs;
}

function cacheJitterMs(key, config, ttl) {
  const configuredMin = config.cacheJitterMinMs;
  const configuredMax = config.cacheJitterMaxMs ?? config.cacheJitterMs;
  const min = configuredMin ?? (ttl >= sevenDaysMs ? oneDayMs : 0);
  const max = configuredMax ?? (ttl >= sevenDaysMs ? threeDaysMs : 0);
  if (!Number.isFinite(Number(max)) || Number(max) <= 0) {
    return 0;
  }
  const floor = Math.max(0, Number(min) || 0);
  const ceiling = Math.max(floor, Number(max));
  const span = Math.round(ceiling - floor);
  if (!span) {
    return floor;
  }
  return floor + (stableHash(key) % (span + 1));
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function inflightMap(cache) {
  if (!cache || typeof cache !== 'object') {
    return fallbackInflight;
  }
  let map = inflightByCache.get(cache);
  if (!map) {
    map = new Map();
    inflightByCache.set(cache, map);
  }
  return map;
}

function isRetryableWikimediaStatus(status) {
  return status === 429 || status === 503;
}

function retryDelayMs(response, attempt) {
  const retryAfter = Number(response.headers?.get?.('Retry-After'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 1000);
  }
  return Math.min(250 * attempt, 1000);
}

function wait(milliseconds) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

function wikimediaRequestHeaders() {
  const headers = {
    accept: 'application/json',
    'Api-User-Agent': wikimediaApiUserAgent,
  };
  if (typeof process !== 'undefined' && process.versions?.node) {
    headers['User-Agent'] = wikimediaApiUserAgent;
  }
  return headers;
}
