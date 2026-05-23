import { fetchWikimediaJson } from './wikimedia-fetch.js';

const wikidataApiUrl = 'https://www.wikidata.org/w/api.php';

export function createTargetEntityBatchLoader({ onCacheHit } = {}) {
  let batch = null;
  return (id, config) => {
    if (!config?.fetchImpl) {
      return Promise.resolve(null);
    }
    if (!batch) {
      batch = { ids: new Set(), resolvers: new Map() };
      Promise.resolve().then(() => {
        const pending = batch;
        batch = null;
        flushTargetEntityBatch(pending, config, onCacheHit);
      });
    }
    batch.ids.add(id);
    return new Promise((resolve, reject) => {
      const resolvers = batch.resolvers.get(id) ?? [];
      resolvers.push({ resolve, reject });
      batch.resolvers.set(id, resolvers);
    });
  };
}

async function flushTargetEntityBatch(batch, config, onCacheHit) {
  const ids = [...batch.ids];
  try {
    const entities = await fetchTargetEntities(ids, config, onCacheHit);
    for (const id of ids) {
      for (const { resolve } of batch.resolvers.get(id) ?? []) {
        resolve(entities.get(id) ?? null);
      }
    }
  } catch (error) {
    for (const resolvers of batch.resolvers.values()) {
      for (const { reject } of resolvers) {
        reject(error);
      }
    }
  }
}

async function fetchTargetEntities(ids, config, onCacheHit) {
  if (!ids.length) {
    return new Map();
  }
  const site = `${config.targetLanguage}wiki`;
  const url = new URL(wikidataApiUrl);
  url.search = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    ids: ids.join('|'),
    languages: config.targetLanguage,
    origin: '*',
    props: 'labels|descriptions|sitelinks',
    sitefilter: site,
  }).toString();
  const payload = await fetchWikimediaJson(url, config, {
    onCacheHit: (cachedUrl) => onCacheHit?.(config, cachedUrl),
  });
  return new Map(
    ids
      .map((id) => [id, payload?.entities?.[id]])
      .filter(([, entity]) => entity && !entity.missing)
  );
}
