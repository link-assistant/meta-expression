// Formalize text into a sequence of Wikidata Q/P-anchored phrases.
//
// Pipeline (per docs/case-studies/issue-15/analysis.md):
//   input -> tokenize -> n-grams (size 1..maxNgramSize, stop-only n-grams skipped)
//   n-grams -> [parallel] wbsearchentities -> top-K candidates per n-gram
//   n-grams -> longest-first non-overlapping cover -> phrases[]
//   phrases -> wbgetentities (props=sitelinks|claims, sitefilter=enwiki)
//              -> wikipedia URL when enwiki sitelink exists, else Wikidata URL
//   phrases -> contexts via P31 / P279 / P106, weighted by frequency
//   phrases -> bounded cartesian product -> top-N interpretations
//   render: HTML <a title="Q…">, Markdown [phrase](url "Q…"), Lino payload.
//
// Every link target must carry the Q/P id in the title attribute (issue F6).
// Network calls are cache-injectable and fetch-injectable so unit tests don't
// hit the network.

const wikidataApiUrl = 'https://www.wikidata.org/w/api.php';
const wikidataEntityBaseUrl = 'https://www.wikidata.org/wiki/';
const wikidataPropertyBaseUrl = 'https://www.wikidata.org/wiki/Property:';
const wikipediaArticleBaseUrl = 'https://en.wikipedia.org/wiki/';
const localEntityViewerBaseUrl =
  'https://link-assistant.github.io/human-language/entities.html';
const localPropertyViewerBaseUrl =
  'https://link-assistant.github.io/human-language/properties.html';
const defaultCacheTtlMs = 60 * 60 * 1000;
const defaultMaxNgramSize = 3;
const defaultSearchLimit = 5;
const defaultTopKCandidates = 3;
const defaultInterpretationsCount = 10;

// English glue words that must not anchor an n-gram on their own. They still
// appear in the rendered output, just without a hyperlink.
const stopWords = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'into',
  'onto',
  'than',
  'that',
  'this',
  'these',
  'those',
  'it',
  'its',
  'be',
  'so',
]);

// English verbs / relation phrases that bias an n-gram toward properties.
const propertyIndicators = new Set([
  'is',
  'was',
  'are',
  'were',
  'has',
  'have',
  'had',
  'born',
  'died',
  'located',
  'created',
  'founded',
  'married',
  'wrote',
  'directed',
  'invented',
  'discovered',
  'contains',
  'belongs',
  'relates',
  'connects',
  'instance of',
  'subclass of',
  'part of',
  'member of',
  'capital of',
  'owned by',
  'child of',
  'parent of',
  'spouse of',
  'sibling of',
  'place of birth',
  'date of birth',
  'date of death',
  'was born in',
  'is located in',
]);

// Wikidata properties used to derive a context bag from each entity.
const contextProperties = Object.freeze({
  P31: 'instance of',
  P279: 'subclass of',
  P106: 'occupation',
});

const linkTargetModes = Object.freeze({
  WIKIPEDIA: 'wikipedia',
  WIKIDATA: 'wikidata',
  LOCAL: 'local-viewer',
});

export const FORMALIZE_LINK_TARGETS = linkTargetModes;

export function formalizeText(input, options = {}) {
  return formalizeTextWith(input, {
    fetch: null,
    cache: null,
    now: () => 0,
    ...options,
  });
}

export async function formalizeTextWith(input, options = {}) {
  const text = normalizeInput(input);
  const config = createConfig(options);
  const tokens = tokenize(text);
  const ngrams = generateNgrams(tokens, config.maxNgramSize);
  const ngramCandidates = await Promise.all(
    ngrams.map((ngram) => searchNgramCandidates(ngram, config))
  );
  const ngramsWithCandidates = ngrams
    .map((ngram, index) => ({
      ...ngram,
      candidates: ngramCandidates[index] ?? [],
    }))
    .filter((ngram) => ngram.candidates.length > 0);
  const phrases = coverTokensWithLongestMatch(tokens, ngramsWithCandidates);
  await Promise.all(
    phrases.map((phrase) => attachEntityDetails(phrase, config))
  );
  const contexts = aggregateContexts(phrases);
  const reranked = applyContextLens(phrases, config.contextLens, contexts);
  const interpretations = generateFormalizeInterpretations(
    reranked,
    contexts,
    config
  );
  const linksNetwork = buildLinksNetwork(text, reranked, contexts);
  const markdown = renderMarkdown(reranked, config);
  const html = renderHtml(reranked, config);
  const linksNotation = renderLinksNotation(text, reranked, contexts);

  return {
    text,
    tokens,
    phrases: reranked,
    contexts: contexts.all,
    mainContext: contexts.main,
    additionalContexts: contexts.additional,
    interpretations,
    markdown,
    html,
    linksNotation,
    linksNetwork,
    linkTargetMode: config.linkTargetMode,
  };
}

export function tokenize(text) {
  return String(text)
    .replace(/[.,!?;:"“”]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

export function generateNgrams(tokens, maxSize = defaultMaxNgramSize) {
  const ngrams = [];
  const max = Math.max(1, Math.min(maxSize, tokens.length));
  for (let size = 1; size <= max; size += 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      const slice = tokens.slice(start, start + size);
      if (isStopOnly(slice)) {
        continue;
      }
      ngrams.push({
        text: slice.join(' '),
        tokens: slice,
        start,
        end: start + size - 1,
        size,
      });
    }
  }
  return ngrams;
}

export function buildMarkdownLink(phrase, options = {}) {
  if (!phrase.entity) {
    return phrase.text;
  }
  const url = resolveLinkTarget(phrase, options);
  return `[${escapeMarkdown(phrase.text)}](${url} "${phrase.entity.id}")`;
}

export function buildHtmlLink(phrase, options = {}) {
  if (!phrase.entity) {
    return escapeHtml(phrase.text);
  }
  const url = resolveLinkTarget(phrase, options);
  return `<a href="${escapeAttribute(url)}" title="${escapeAttribute(
    phrase.entity.id
  )}">${escapeHtml(phrase.text)}</a>`;
}

export function resolveLinkTarget(phrase, options = {}) {
  const mode = options.linkTargetMode ?? linkTargetModes.WIKIPEDIA;
  const entity = phrase.entity;
  if (!entity) {
    return null;
  }

  if (mode === linkTargetModes.LOCAL) {
    return entity.kind === 'property'
      ? `${localPropertyViewerBaseUrl}#${entity.id}`
      : `${localEntityViewerBaseUrl}#${entity.id}`;
  }

  if (mode === linkTargetModes.WIKIDATA) {
    return wikidataPageUrl(entity);
  }

  if (entity.wikipediaUrl) {
    return entity.wikipediaUrl;
  }
  return wikidataPageUrl(entity);
}

function wikidataPageUrl(entity) {
  return entity.kind === 'property'
    ? `${wikidataPropertyBaseUrl}${entity.id}`
    : `${wikidataEntityBaseUrl}${entity.id}`;
}

function createConfig(options) {
  const cache = options.cache ?? new Map();
  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis) ?? null;
  return {
    fetchImpl,
    cache,
    cacheTtlMs: options.cacheTtlMs ?? defaultCacheTtlMs,
    now: options.now ?? Date.now,
    maxNgramSize: options.maxNgramSize ?? defaultMaxNgramSize,
    searchLimit: options.searchLimit ?? defaultSearchLimit,
    topKCandidates: options.topKCandidates ?? defaultTopKCandidates,
    maxInterpretations:
      options.maxInterpretations ?? defaultInterpretationsCount,
    linkTargetMode: options.linkTargetMode ?? linkTargetModes.WIKIPEDIA,
    contextLens: options.contextLens ?? null,
    language: options.language ?? 'en',
  };
}

function isStopOnly(tokens) {
  return tokens.every((token) => stopWords.has(token.toLowerCase()));
}

async function searchNgramCandidates(ngram, config) {
  const propertyBias = isPropertyIndicator(ngram.text);
  const types = propertyBias ? ['property', 'item'] : ['item', 'property'];
  const searches = await Promise.all(
    types.map((type) => searchWikidata(ngram.text, type, config))
  );
  const merged = mergeSearchResults(searches.flat(), propertyBias);
  return merged
    .map((candidate) => scoreCandidate(ngram, candidate, propertyBias))
    .sort((left, right) => right.score - left.score)
    .slice(0, config.topKCandidates);
}

function isPropertyIndicator(text) {
  const lowered = text.toLowerCase();
  if (propertyIndicators.has(lowered)) {
    return true;
  }
  for (const indicator of propertyIndicators) {
    if (lowered === indicator || lowered.startsWith(`${indicator} `)) {
      return true;
    }
  }
  return false;
}

async function searchWikidata(query, type, config) {
  if (!config.fetchImpl) {
    return [];
  }
  const url = new URL(wikidataApiUrl);
  url.search = new URLSearchParams({
    action: 'wbsearchentities',
    format: 'json',
    language: config.language,
    origin: '*',
    type,
    limit: String(config.searchLimit),
    search: query,
  }).toString();
  let payload;
  try {
    payload = await fetchJson(url, config);
  } catch {
    return [];
  }
  return (payload.search ?? []).map((entry) => ({
    id: entry.id,
    label: entry.label ?? query,
    description: entry.description ?? '',
    kind: type === 'property' ? 'property' : 'entity',
    matchText: entry.match?.text ?? '',
  }));
}

function mergeSearchResults(results, propertyBias) {
  const seen = new Map();
  for (const result of results) {
    if (!result?.id) {
      continue;
    }
    if (!seen.has(result.id)) {
      seen.set(result.id, result);
    }
  }
  const merged = [...seen.values()];
  if (propertyBias) {
    return merged.sort((left, right) => {
      if (left.kind === right.kind) {
        return 0;
      }
      return left.kind === 'property' ? -1 : 1;
    });
  }
  return merged;
}

function scoreCandidate(ngram, candidate, propertyBias) {
  const labelMatch =
    normalizeLabel(candidate.label) === normalizeLabel(ngram.text);
  const matchTextMatch =
    candidate.matchText &&
    normalizeLabel(candidate.matchText) === normalizeLabel(ngram.text);
  let score = 0;
  if (labelMatch) {
    score += 20;
  } else if (
    candidate.label &&
    normalizeLabel(candidate.label).includes(normalizeLabel(ngram.text))
  ) {
    score += 5;
  }
  if (matchTextMatch) {
    score += 6;
  }
  if (propertyBias && candidate.kind === 'property') {
    score += 8;
  }
  if (!propertyBias && candidate.kind === 'entity') {
    score += 2;
  }
  // Prefer longer phrases (n-gram size folded into the candidate score so
  // the cartesian-product interpretation ranking stays consistent).
  score += ngram.size * 3;
  return { ...candidate, score, ngramSize: ngram.size };
}

function normalizeLabel(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function coverTokensWithLongestMatch(tokens, ngramsWithCandidates) {
  const sorted = [...ngramsWithCandidates].sort(
    (left, right) => right.size - left.size || left.start - right.start
  );
  const used = new Array(tokens.length).fill(false);
  const claimed = [];

  for (const ngram of sorted) {
    let overlap = false;
    for (let index = ngram.start; index <= ngram.end; index += 1) {
      if (used[index]) {
        overlap = true;
        break;
      }
    }
    if (overlap) {
      continue;
    }
    for (let index = ngram.start; index <= ngram.end; index += 1) {
      used[index] = true;
    }
    claimed.push(ngram);
  }

  // Build phrase list in sentence order. Tokens that no n-gram covered are
  // emitted as link-less "raw" phrases so every word still appears.
  const claimedByStart = new Map();
  for (const ngram of claimed) {
    claimedByStart.set(ngram.start, ngram);
  }
  const phrases = [];
  let cursor = 0;
  while (cursor < tokens.length) {
    const ngram = claimedByStart.get(cursor);
    if (ngram) {
      const best = ngram.candidates[0];
      phrases.push({
        text: ngram.text,
        tokens: ngram.tokens,
        start: ngram.start,
        end: ngram.end,
        size: ngram.size,
        candidates: ngram.candidates,
        entity: best
          ? {
              id: best.id,
              label: best.label,
              description: best.description,
              kind: best.kind,
              score: best.score,
              wikipediaUrl: null,
              wikipediaTitle: null,
              contextLabels: [],
            }
          : null,
      });
      cursor = ngram.end + 1;
      continue;
    }
    phrases.push({
      text: tokens[cursor],
      tokens: [tokens[cursor]],
      start: cursor,
      end: cursor,
      size: 1,
      candidates: [],
      entity: null,
    });
    cursor += 1;
  }
  return phrases;
}

async function attachEntityDetails(phrase, config) {
  if (!phrase.entity || !config.fetchImpl) {
    return;
  }
  const id = phrase.entity.id;
  const entity = await fetchEntity(id, config);
  if (!entity) {
    return;
  }
  const sitelink = entity.sitelinks?.enwiki?.title;
  if (sitelink) {
    phrase.entity.wikipediaTitle = sitelink;
    phrase.entity.wikipediaUrl = `${wikipediaArticleBaseUrl}${encodeURIComponent(
      sitelink.replace(/ /g, '_')
    )}`;
  }
  phrase.entity.contextLabels = extractContextLabels(entity);
}

async function fetchEntity(id, config) {
  if (!config.fetchImpl) {
    return null;
  }
  const url = new URL(wikidataApiUrl);
  url.search = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    ids: id,
    languages: config.language,
    origin: '*',
    props: 'labels|descriptions|claims|sitelinks',
    sitefilter: 'enwiki',
  }).toString();
  let payload;
  try {
    payload = await fetchJson(url, config);
  } catch {
    return null;
  }
  const entity = payload.entities?.[id];
  return entity && !entity.missing ? entity : null;
}

function extractContextLabels(entity) {
  const labels = [];
  for (const property of Object.keys(contextProperties)) {
    const claims = entity.claims?.[property];
    if (!Array.isArray(claims)) {
      continue;
    }
    for (const claim of claims) {
      const value = claim.mainsnak?.datavalue?.value;
      const id = value?.id ?? wikidataIdFromNumericValue(value);
      if (!id) {
        continue;
      }
      labels.push({
        property,
        propertyLabel: contextProperties[property],
        targetId: id,
      });
    }
  }
  return labels;
}

function wikidataIdFromNumericValue(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value['numeric-id'] ? `Q${value['numeric-id']}` : null;
}

async function fetchJson(url, config) {
  const key = String(url);
  const now = Number(config.now());
  const cached = config.cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }
  const response = await config.fetchImpl(key, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Wikimedia request failed with status ${response.status}.`);
  }
  const value = await response.json();
  config.cache.set(key, {
    expiresAt: now + config.cacheTtlMs,
    value,
  });
  return value;
}

function aggregateContexts(phrases) {
  const counts = new Map();
  for (const phrase of phrases) {
    if (!phrase.entity) {
      continue;
    }
    for (const label of phrase.entity.contextLabels ?? []) {
      const key = label.targetId;
      const entry = counts.get(key) ?? {
        id: key,
        property: label.property,
        propertyLabel: label.propertyLabel,
        weight: 0,
        phrases: [],
      };
      entry.weight += 1;
      entry.phrases.push({ text: phrase.text, entityId: phrase.entity.id });
      counts.set(key, entry);
    }
  }
  const total = [...counts.values()].reduce(
    (accumulator, entry) => accumulator + entry.weight,
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

function applyContextLens(phrases, contextLens, contexts) {
  if (!contextLens) {
    return phrases;
  }
  const lensId =
    typeof contextLens === 'string' ? contextLens : (contextLens.id ?? null);
  if (!lensId) {
    return phrases;
  }
  const matchingContext = contexts.all.find((entry) => entry.id === lensId);
  if (!matchingContext) {
    return phrases;
  }
  const phraseIdsInContext = new Set(
    matchingContext.phrases.map((entry) => entry.entityId)
  );
  return phrases.map((phrase) => {
    if (!phrase.entity || phrase.candidates.length <= 1) {
      return phrase;
    }
    const reranked = [...phrase.candidates].sort((left, right) => {
      const leftBonus = phraseIdsInContext.has(left.id) ? 25 : 0;
      const rightBonus = phraseIdsInContext.has(right.id) ? 25 : 0;
      return right.score + rightBonus - (left.score + leftBonus);
    });
    const best = reranked[0];
    if (best.id === phrase.entity.id) {
      return { ...phrase, candidates: reranked };
    }
    return {
      ...phrase,
      candidates: reranked,
      entity: {
        ...phrase.entity,
        id: best.id,
        label: best.label,
        description: best.description,
        kind: best.kind,
        score: best.score,
      },
    };
  });
}

function generateFormalizeInterpretations(phrases, contexts, config) {
  const ambiguous = phrases.filter(
    (phrase) => phrase.entity && phrase.candidates.length > 1
  );
  if (ambiguous.length === 0) {
    return [
      {
        rank: 1,
        score: phrases.reduce(
          (accumulator, phrase) => accumulator + (phrase.entity?.score ?? 0),
          0
        ),
        phrases: phrases.map((phrase) => ({
          text: phrase.text,
          entityId: phrase.entity?.id ?? null,
        })),
      },
    ];
  }

  const baseScore = phrases.reduce(
    (accumulator, phrase) => accumulator + (phrase.entity?.score ?? 0),
    0
  );

  // Bounded cartesian product: for each ambiguous phrase, pick top-K, capped
  // by maxInterpretations to keep the prototype deterministic.
  let combinations = [
    {
      score: baseScore,
      assignments: new Map(
        phrases
          .filter((phrase) => phrase.entity)
          .map((phrase) => [
            phrase.start,
            { phrase, candidate: phrase.candidates[0] },
          ])
      ),
    },
  ];
  for (const phrase of ambiguous) {
    const next = [];
    for (const combo of combinations) {
      for (const candidate of phrase.candidates) {
        const assignments = new Map(combo.assignments);
        assignments.set(phrase.start, { phrase, candidate });
        const delta = candidate.score - phrase.candidates[0].score;
        next.push({
          score: combo.score + delta,
          assignments,
        });
      }
    }
    combinations = next.slice(
      0,
      Math.max(config.maxInterpretations * 5, config.maxInterpretations)
    );
  }

  const mainContextPhraseIds = new Set(
    contexts.main?.phrases.map((entry) => entry.entityId) ?? []
  );

  return combinations
    .map((combo, index) => {
      const ordered = phrases
        .filter((phrase) => phrase.entity)
        .map((phrase) => {
          const choice = combo.assignments.get(phrase.start);
          return {
            text: phrase.text,
            entityId: choice?.candidate.id ?? phrase.entity.id,
            kind: choice?.candidate.kind ?? phrase.entity.kind,
          };
        });
      const contextBonus = ordered.filter((entry) =>
        mainContextPhraseIds.has(entry.entityId)
      ).length;
      return {
        rank: index + 1,
        score: combo.score + contextBonus,
        phrases: ordered,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, config.maxInterpretations)
    .map((interpretation, index) => ({ ...interpretation, rank: index + 1 }));
}

function buildLinksNetwork(text, phrases, contexts) {
  const links = [];
  const inputId = 'formalize-input-1';
  links.push({
    id: inputId,
    role: 'input',
    references: [],
    value: { text },
    provenance: { sourceType: 'algorithm', method: 'formalize' },
  });
  for (let index = 0; index < phrases.length; index += 1) {
    const phrase = phrases[index];
    const phraseId = `formalize-phrase-${index + 1}`;
    links.push({
      id: phraseId,
      role: 'phrase',
      references: [inputId],
      value: {
        text: phrase.text,
        position: phrase.start,
        size: phrase.size,
        wikidataId: phrase.entity?.id ?? null,
        wikidataLabel: phrase.entity?.label ?? null,
        wikidataKind: phrase.entity?.kind ?? null,
        wikipediaUrl: phrase.entity?.wikipediaUrl ?? null,
      },
      provenance: {
        sourceType: phrase.entity ? 'wikidata' : 'algorithm',
        sourceUrl: phrase.entity ? wikidataPageUrl(phrase.entity) : null,
      },
    });
  }
  for (let index = 0; index < contexts.all.length; index += 1) {
    const context = contexts.all[index];
    links.push({
      id: `formalize-context-${index + 1}`,
      role: 'context',
      references: [inputId],
      value: {
        wikidataId: context.id,
        property: context.property,
        propertyLabel: context.propertyLabel,
        weight: context.weight,
        probability: context.probability,
      },
      provenance: {
        sourceType: 'wikidata',
        sourceUrl: `${wikidataEntityBaseUrl}${context.id}`,
      },
    });
  }
  return {
    id: 'formalize-links-network',
    kind: 'links-network',
    version: 1,
    beliefSystem: {
      id: 'formalize-default',
      name: 'Formalize prototype',
      probabilityStrategy: 'frequency-weighted-context',
      sourceWeights: { wikidata: 1, algorithm: 0.6 },
    },
    links,
  };
}

function renderMarkdown(phrases, config) {
  return phrases
    .map((phrase) =>
      buildMarkdownLink(phrase, { linkTargetMode: config.linkTargetMode })
    )
    .join(' ');
}

function renderHtml(phrases, config) {
  return phrases
    .map((phrase) =>
      buildHtmlLink(phrase, { linkTargetMode: config.linkTargetMode })
    )
    .join(' ');
}

function renderLinksNotation(text, phrases, contexts) {
  const safeText = toLino(text);
  const head = `(formalization: ${safeText})`;
  const phraseLines = phrases
    .filter((phrase) => phrase.entity)
    .map((phrase, index) => {
      const id = phrase.entity.id;
      const label = phrase.entity.label ?? phrase.text;
      return `(phrase-${index + 1}: ${toLino(phrase.text)} ${id} ${toLino(label)})`;
    });
  const contextLines = contexts.all.map((context, index) => {
    const probability = (context.probability * 100).toFixed(1);
    return `(context-${index + 1}: ${context.id} weight ${context.weight} probability ${probability})`;
  });
  return [head, ...phraseLines, ...contextLines].join('\n');
}

function toLino(value) {
  return `(${String(value).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()})`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function escapeMarkdown(value) {
  return String(value).replace(/([\\[\]()`*_])/g, '\\$1');
}

function normalizeInput(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Formalize input must be a string.');
  }
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) {
    throw new Error('Formalize input cannot be empty.');
  }
  return text;
}
