/**
 * Big-context aggregator.
 *
 * "Contexts" in the issue mean broad worlds / categories / domains
 * (Math, Geography, Politics, Star Wars universe, …) — not raw
 * `instance of` Q-ids. We treat the per-entity claims (P31, P279,
 * P361, P361, P136, P137, P462, P425) as edges in a small graph,
 * walk the graph up to `maxDepth` from each phrase, and accumulate
 * weight on every node reached. Frequent ancestors (i.e. the
 * shared "world" each phrase belongs to) bubble to the top.
 *
 * This deliberately uses bounded BFS with caching so we never
 * hammer the public Wikidata endpoints — every traversal step
 * goes through `ctx.fetchJson` which respects the existing TTL
 * cache. A trickle of additional API calls per phrase is the
 * cost of richer context grouping.
 */

const wikidataApiUrl = 'https://www.wikidata.org/w/api.php';

const traversalProperties = Object.freeze({
  P31: 'instance of',
  P279: 'subclass of',
  P361: 'part of',
  P137: 'operator/owner',
  P136: 'genre',
  P425: 'field of work',
  P462: 'color', // intentionally low signal but keeps domain breadth
  P106: 'occupation',
});

const defaultMaxDepth = 2;
const defaultPerStepBranching = 4;
const defaultTopCategories = 12;

/**
 * Aggregate big-context categories from a list of resolved phrases.
 *
 * @param {object[]} phrases   - Phrase objects with `entity.contextLabels`.
 * @param {object}   options
 * @param {number}   [options.maxDepth]
 * @param {number}   [options.perStepBranching]
 * @param {number}   [options.topCategories]
 * @param {Function} [options.fetchJson]   - injected fetcher (cached)
 * @param {Function} [options.now]
 * @param {string}   [options.language]
 * @returns {Promise<{
 *   all: Array<{id:string, label:string, weight:number, probability:number,
 *               depth:number, paths:Array<string[]>, propertyTrail:string[]}>,
 *   main: object|null,
 *   additional: object[]
 * }>}
 */
export async function aggregateBigContexts(phrases, options = {}) {
  const config = {
    maxDepth: options.maxDepth ?? defaultMaxDepth,
    perStepBranching: options.perStepBranching ?? defaultPerStepBranching,
    topCategories: options.topCategories ?? defaultTopCategories,
    fetchJson: options.fetchJson ?? null,
    now: options.now ?? Date.now,
    language: options.language ?? 'en',
  };

  const counts = new Map();
  for (const phrase of phrases) {
    if (!phrase?.entity) {
      continue;
    }
    const seeds = collectSeedTargets(phrase);
    if (seeds.length === 0) {
      continue;
    }
    await traverseFromPhrase(phrase, seeds, counts, config);
  }

  const total = [...counts.values()].reduce(
    (sum, entry) => sum + entry.weight,
    0
  );
  const all = [...counts.values()]
    .map((entry) => ({
      ...entry,
      probability: total > 0 ? entry.weight / total : 0,
    }))
    .sort(
      (left, right) =>
        right.weight - left.weight || left.id.localeCompare(right.id)
    )
    .slice(0, config.topCategories);

  return {
    all,
    main: all[0] ?? null,
    additional: all.slice(1),
  };
}

function collectSeedTargets(phrase) {
  const labels = phrase.entity.contextLabels ?? [];
  return labels
    .filter((label) => /^[QP]\d+$/.test(label.targetId))
    .map((label) => ({
      id: label.targetId,
      property: label.property,
      propertyLabel: label.propertyLabel,
    }));
}

async function traverseFromPhrase(phrase, seeds, counts, config) {
  const visited = new Set();
  const queue = seeds.map((seed) => ({
    id: seed.id,
    depth: 1,
    path: [seed.id],
    propertyTrail: [seed.property],
    rootPhrase: phrase.entity?.id,
  }));
  while (queue.length > 0) {
    const node = queue.shift();
    if (visited.has(node.id)) {
      continue;
    }
    visited.add(node.id);
    addCount(counts, node, phrase);
    if (node.depth >= config.maxDepth) {
      continue;
    }
    const ancestors = await fetchAncestors(node.id, config);
    for (const ancestor of ancestors.slice(0, config.perStepBranching)) {
      if (visited.has(ancestor.id)) {
        continue;
      }
      queue.push({
        id: ancestor.id,
        depth: node.depth + 1,
        path: [...node.path, ancestor.id],
        propertyTrail: [...node.propertyTrail, ancestor.property],
        rootPhrase: node.rootPhrase,
      });
    }
  }
}

function addCount(counts, node, phrase) {
  const entry = counts.get(node.id) ?? {
    id: node.id,
    label: null,
    weight: 0,
    depth: node.depth,
    paths: [],
    propertyTrail: node.propertyTrail,
    sourcePhrases: [],
  };
  // Closer ancestors weigh more — depth 1 = 1.0, depth 2 = 0.5, depth 3 = 0.33.
  entry.weight += 1 / node.depth;
  entry.depth = Math.min(entry.depth, node.depth);
  entry.paths.push(node.path);
  entry.sourcePhrases.push({
    text: phrase.text,
    entityId: phrase.entity?.id,
  });
  counts.set(node.id, entry);
}

async function fetchAncestors(id, config) {
  if (!config.fetchJson || !/^Q\d+$/.test(id)) {
    return [];
  }
  const url = new URL(wikidataApiUrl);
  url.search = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    ids: id,
    languages: config.language,
    origin: '*',
    props: 'labels|claims',
  }).toString();
  let payload;
  try {
    payload = await config.fetchJson(url);
  } catch {
    return [];
  }
  const entity = payload?.entities?.[id];
  if (!entity || entity.missing) {
    return [];
  }
  return extractAncestorEdges(entity.claims);
}

function extractAncestorEdges(claims) {
  if (!claims) {
    return [];
  }
  const ancestors = [];
  for (const property of Object.keys(traversalProperties)) {
    const propClaims = claims[property];
    if (!Array.isArray(propClaims)) {
      continue;
    }
    for (const claim of propClaims) {
      const ancestorId = claimAncestorId(claim);
      if (ancestorId) {
        ancestors.push({ id: ancestorId, property });
      }
    }
  }
  return ancestors;
}

function claimAncestorId(claim) {
  const value = claim?.mainsnak?.datavalue?.value;
  if (!value) {
    return null;
  }
  if (value.id) {
    return value.id;
  }
  const numericId = value['numeric-id'];
  return numericId ? `Q${numericId}` : null;
}

/**
 * Synchronous helper used by tests / clients that already have a context
 * graph in memory (no network needed). Same shape as the async version.
 *
 * @param {Map<string, Array<{id:string,property:string}>>} edges
 * @param {object[]} phrases
 * @param {object} [options]
 * @returns {{all: object[], main: object|null, additional: object[]}}
 */
export function aggregateBigContextsFromGraph(edges, phrases, options = {}) {
  const maxDepth = options.maxDepth ?? defaultMaxDepth;
  const counts = new Map();
  for (const phrase of phrases) {
    if (!phrase?.entity) {
      continue;
    }
    const seeds = collectSeedTargets(phrase);
    const visited = new Set();
    const queue = seeds.map((seed) => ({
      id: seed.id,
      depth: 1,
      path: [seed.id],
      propertyTrail: [seed.property],
    }));
    while (queue.length > 0) {
      const node = queue.shift();
      if (visited.has(node.id)) {
        continue;
      }
      visited.add(node.id);
      addCount(counts, node, phrase);
      if (node.depth >= maxDepth) {
        continue;
      }
      const ancestors = edges.get(node.id) ?? [];
      for (const ancestor of ancestors) {
        if (visited.has(ancestor.id)) {
          continue;
        }
        queue.push({
          id: ancestor.id,
          depth: node.depth + 1,
          path: [...node.path, ancestor.id],
          propertyTrail: [...node.propertyTrail, ancestor.property],
        });
      }
    }
  }
  const total = [...counts.values()].reduce(
    (sum, entry) => sum + entry.weight,
    0
  );
  const all = [...counts.values()]
    .map((entry) => ({
      ...entry,
      probability: total > 0 ? entry.weight / total : 0,
    }))
    .sort(
      (left, right) =>
        right.weight - left.weight || left.id.localeCompare(right.id)
    );
  return {
    all,
    main: all[0] ?? null,
    additional: all.slice(1),
  };
}
