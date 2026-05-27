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

// Wikidata stores millions of scholarly papers, journals, and books whose
// long titles happen to contain everyday words. `wbsearchentities` surfaces
// them eagerly, so a phrase like "developing systems" used to resolve to the
// 1997 clinical-trials article "Developing systems for cost-effective
// auditing of clinical trials" (Q41668433) — issue #126. These works are
// almost never the intended sense of a common phrase, so we detect them and
// keep them from hijacking phrases unless the user typed the title verbatim.
const publicationDescriptionPattern =
  /\b(?:scientific|scholarly|research|review|academic|peer[-\s]?reviewed)\s+(?:article|paper|publication|journal)\b|\barticle published\b|\bpaper published\b|\bjournal article\b|\bconference paper\b|\bproceedings article\b|\bdoctoral thesis\b|\bmaster'?s thesis\b|\bpreprint\b|\bscientific journal\b|\bacademic journal\b/i;

// P31 (instance of) targets that mark an entity as a publication. Only
// consulted after hydration, when claims are available.
const scholarlyInstanceIds = new Set([
  'Q13442814', // scholarly article
  'Q18918145', // academic journal article
  'Q5633421', // scientific journal
  'Q737498', // academic journal
  'Q1002697', // periodical
  'Q571', // book
  'Q3331189', // version, edition, or translation
  'Q191067', // article
  'Q1980247', // chapter
]);

/**
 * Detect whether a candidate is a scholarly publication (article, journal,
 * book, …) rather than the everyday sense of the searched words. Uses the
 * Wikidata description first, falling back to hydrated P31 claims.
 *
 * @param {object} candidate
 * @returns {boolean}
 */
export function isScholarlyPublicationCandidate(candidate) {
  if (!candidate) {
    return false;
  }
  if (publicationDescriptionPattern.test(String(candidate.description ?? ''))) {
    return true;
  }
  const labels = candidate.contextLabels;
  if (Array.isArray(labels)) {
    return labels.some(
      (label) =>
        label.property === 'P31' && scholarlyInstanceIds.has(label.targetId)
    );
  }
  return false;
}

/**
 * Expose, per word, the contexts that were detected for each candidate sense
 * and which sense was finally selected. This is what the UI and debug log
 * render so users can SEE how the formalizer decided a word's context (and
 * report it when the decision is wrong) — issue #126.
 *
 * @param {object[]} phrases - resolved phrase objects with candidates
 * @returns {Array<object>}
 */
export function buildWordContexts(phrases) {
  return phrases
    .filter((phrase) => phrase.entity)
    .map((phrase) => {
      const selectedId = phrase.entity?.id ?? null;
      const candidates = (
        phrase.candidates?.length ? phrase.candidates : [phrase.entity]
      ).map((candidate) => ({
        id: candidate.id ?? null,
        label: candidate.label ?? null,
        description: candidate.description ?? null,
        score: candidate.score ?? null,
        selected: candidate.id === selectedId,
        isPublication: isScholarlyPublicationCandidate(candidate),
        contexts: (candidate.contextLabels ?? []).map((label) => ({
          property: label.property,
          propertyLabel: label.propertyLabel,
          targetId: label.targetId,
        })),
      }));
      return {
        text: phrase.text,
        start: phrase.start ?? null,
        end: phrase.end ?? null,
        selectedId,
        candidates,
      };
    });
}

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
    await aggregatePhraseAsync(phrase, counts, config);
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

async function aggregatePhraseAsync(phrase, counts, config) {
  for (const slice of iteratePhraseCandidates(phrase)) {
    await traverseFromPhrase(
      phrase,
      slice.seeds,
      counts,
      config,
      slice.weight,
      slice.candidate
    );
  }
}

// Walk seeds from every Wikidata-shaped candidate, not just the chosen
// entity. Each candidate's seeds receive a weight share proportional
// to their score so the chosen sense still dominates while alternative
// senses still nudge the world graph.
function* iteratePhraseCandidates(phrase) {
  if (!phrase?.entity) {
    return;
  }
  const candidates = phrase.candidates?.length
    ? phrase.candidates
    : [phrase.entity];
  const totalScore = candidates.reduce(
    (sum, candidate) => sum + Math.max(candidate?.score ?? 0, 1),
    0
  );
  for (const candidate of candidates) {
    const seeds = collectSeedTargets({ entity: candidate });
    if (seeds.length === 0) {
      continue;
    }
    const weight =
      totalScore > 0
        ? Math.max(candidate?.score ?? 0, 1) / totalScore
        : 1 / candidates.length;
    yield { candidate, seeds, weight };
  }
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

async function traverseFromPhrase(
  phrase,
  seeds,
  counts,
  config,
  candidateWeight = 1,
  candidate = null
) {
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
    addCount(counts, node, phrase, candidateWeight, candidate);
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

function addCount(counts, node, phrase, candidateWeight = 1, candidate = null) {
  const entry = counts.get(node.id) ?? {
    id: node.id,
    label: null,
    weight: 0,
    depth: node.depth,
    paths: [],
    propertyTrail: node.propertyTrail,
    sourcePhrases: [],
    sourceCandidates: [],
  };
  // Closer ancestors weigh more — depth 1 = 1.0, depth 2 = 0.5, depth 3 = 0.33.
  // Multi-candidate input also scales the weight by `candidateWeight`
  // (the candidate's share of its phrase's total score), so a strong
  // winner still dominates while weaker alternatives keep a voice.
  entry.weight += (1 / node.depth) * candidateWeight;
  entry.depth = Math.min(entry.depth, node.depth);
  entry.paths.push(node.path);
  if (
    !entry.sourcePhrases.some(
      (existing) => existing.entityId === phrase.entity?.id
    )
  ) {
    entry.sourcePhrases.push({
      text: phrase.text,
      entityId: phrase.entity?.id,
    });
  }
  if (candidate?.id) {
    entry.sourceCandidates.push({
      phrase: phrase.text,
      candidateId: candidate.id,
      candidateLabel: candidate.label,
      weight: candidateWeight,
    });
  }
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
    aggregatePhraseSync(phrase, counts, edges, maxDepth);
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

function aggregatePhraseSync(phrase, counts, edges, maxDepth) {
  for (const slice of iteratePhraseCandidates(phrase)) {
    traverseFromGraph(phrase, slice, counts, edges, maxDepth);
  }
}

function traverseFromGraph(phrase, slice, counts, edges, maxDepth) {
  const { seeds, weight: candidateWeight, candidate } = slice;
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
    addCount(counts, node, phrase, candidateWeight, candidate);
    if (node.depth >= maxDepth) {
      continue;
    }
    for (const ancestor of edges.get(node.id) ?? []) {
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
