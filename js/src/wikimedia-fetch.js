const wikimediaApiUserAgent =
  'meta-expression/0.9.0 (https://github.com/link-assistant/meta-expression)';

export async function fetchWikimediaJson(url, config, options = {}) {
  const key = String(url);
  const now = Number(config.now());
  const cached = config.cache.get(key);
  if (cached && cached.expiresAt > now) {
    options.onCacheHit?.(key);
    return cached.value;
  }
  const response = await fetchWithRetry(key, config);
  const value = await response.json();
  config.cache.set(key, {
    expiresAt: now + config.cacheTtlMs,
    value,
  });
  return value;
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
      throw new Error(
        `Wikimedia request failed with status ${response.status}.`
      );
    }
    await wait(retryDelayMs(response, attempt));
  }
  throw new Error('Wikimedia request failed.');
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
