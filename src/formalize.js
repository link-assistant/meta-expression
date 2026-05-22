// Formalize text into a sequence of Wikidata Q/P-anchored phrases.
//
// Pipeline (per docs/case-studies/issue-15/analysis.md):
//   input -> tokenize -> n-grams (size 1..maxNgramSize, stop-only n-grams skipped)
//   n-grams -> [parallel] every registered source -> top-K candidates per n-gram
//   n-grams -> longest-first non-overlapping cover -> phrases[]
//   phrases -> wbgetentities (props=sitelinks|claims, sitefilter=enwiki)
//              -> wikipedia URL when enwiki sitelink exists, else Wikidata URL
//   phrases -> contexts via P31/P279/P361/P137/P136/P425/P106 transitive
//              walk (bounded depth) — surfaces broad worlds/categories
//   phrases -> bounded cartesian product -> top-N interpretations
//   render: HTML <a title="Q…">, Markdown [phrase](url "Q…"), Lino payload.
//
// Every link target must carry the Q/P id in the title attribute (issue F6).
// All network I/O is cache-injectable and fetch-injectable so unit tests
// don't hit the network. The implementation is split across:
//   - formalize.js          (this file: pipeline orchestration + rendering)
//   - formalize-sources.js  (pluggable knowledge-graph sources)
//   - formalize-contexts.js (big-context aggregation)
//   - formalize-overrides.js (lazy override layer)

import {
  createSourceRegistry,
  createDefaultSourceTiers,
  SOURCE_KIND,
  normalizeWiktionaryLookupText,
} from './formalize-sources.js';
import { aggregateBigContexts } from './formalize-contexts.js';
import {
  buildOverrideMap,
  lookupOverride,
  overrideToCandidate,
  overrideToEntity,
} from './formalize-overrides.js';

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
const wikimediaApiUserAgent =
  'meta-expression/0.9.0 (https://github.com/link-assistant/meta-expression)';

// English glue words that must not anchor an n-gram on their own. They still
// appear in the rendered output, just without a hyperlink.
const stopWords = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'into', 'onto', 'than', 'that', 'this', 'then',
  'these', 'those', 'it', 'its', 'each', 'through', 'am', 'is', 'are', 'was',
  'were', 'be', 'being', 'been', 'so',
  'и', 'или', 'а', 'но', 'в', 'во', 'на', 'с', 'со', 'к', 'ко', 'от', 'по',
  'для', 'из', 'за', 'что', 'это',
]); // prettier-ignore

// English verbs / relation phrases that bias an n-gram toward properties.
const propertyIndicators = new Set([
  'is', 'was', 'are', 'were', 'has', 'have', 'had', 'born', 'died',
  'located', 'created', 'founded', 'married', 'wrote', 'directed',
  'invented', 'discovered', 'contains', 'belongs', 'relates', 'connects',
  'instance of', 'subclass of', 'part of', 'member of', 'capital of',
  'owned by', 'child of', 'parent of', 'spouse of', 'sibling of',
  'place of birth', 'date of birth', 'date of death', 'was born in',
  'is located in',
]); // prettier-ignore

const contextProperties = Object.freeze({
  P31: 'instance of',
  P279: 'subclass of',
  P361: 'part of',
  P137: 'operator',
  P136: 'genre',
  P425: 'field of work',
  P106: 'occupation',
});

const linkTargetModes = Object.freeze({
  WIKIPEDIA: 'wikipedia',
  WIKIDATA: 'wikidata',
  LOCAL: 'local-viewer',
});

export const FORMALIZE_LINK_TARGETS = linkTargetModes;
export { SOURCE_KIND as FORMALIZE_SOURCE_KIND };

const interpretationDisplayModes = Object.freeze({
  ID: 'id',
  NAME: 'name',
  NAME_AND_MEANING: 'name+meaning',
  MEANING: 'meaning',
  REPLACE: 'replace',
});

export const INTERPRETATION_DISPLAY_MODES = interpretationDisplayModes;

const defaultInterpretationDisplayMode = interpretationDisplayModes.NAME;

/**
 * Format a single interpretation phrase for display. Supports five modes
 * documented in docs/case-studies/issue-23/README.md (R3):
 *   - 'id'           → "Hawaii [Q782]"
 *   - 'name'         → "Hawaii (Hawaii)"   (entity full name in parens; default)
 *   - 'name+meaning' → "Hawaii (Hawaii — state of the United States)"
 *   - 'meaning'      → "Hawaii (state of the United States)"
 *   - 'replace'      → "Hawaii"            (replaces source token with entity label)
 *
 * Falls back to the original phrase text when the entity has no label/id.
 *
 * @param {{text: string, entityId?: string|null, entityLabel?: string|null,
 *          entityDescription?: string|null}} phrase
 * @param {string} [mode]
 * @returns {string}
 */
const interpretationFormatters = {
  [interpretationDisplayModes.ID]: ({ text, entityId }) =>
    entityId ? `${text} [${entityId}]` : text,
  [interpretationDisplayModes.MEANING]: ({ text, description }) =>
    description ? `${text} (${description})` : text,
  [interpretationDisplayModes.NAME_AND_MEANING]: ({
    text,
    label,
    description,
  }) => {
    if (label && description) {
      return `${text} (${label} — ${description})`;
    }
    if (label) {
      return `${text} (${label})`;
    }
    return description ? `${text} (${description})` : text;
  },
  [interpretationDisplayModes.REPLACE]: ({ text, label }) => label || text,
  [interpretationDisplayModes.NAME]: ({ text, label }) =>
    label ? `${text} (${label})` : text,
};

export function formatInterpretationPhrase(
  phrase,
  mode = defaultInterpretationDisplayMode
) {
  const parts = {
    text: phrase?.text ?? '',
    entityId: phrase?.entityId ?? null,
    label: phrase?.entityLabel ?? null,
    description: phrase?.entityDescription ?? null,
  };
  if (!parts.entityId && !parts.label) {
    return parts.text;
  }
  const formatter =
    interpretationFormatters[mode] ??
    interpretationFormatters[interpretationDisplayModes.NAME];
  return formatter(parts);
}

/**
 * Build a stable identity key for an interpretation based on its phrase
 * entity ids. Used by the web layer to detect whether the currently
 * selected interpretation is already among the top‑N (R4).
 *
 * @param {{phrases?: Array<{entityId?: string|null}>}} interpretation
 * @returns {string}
 */
export function interpretationKey(interpretation) {
  if (!interpretation || !Array.isArray(interpretation.phrases)) {
    return '';
  }
  return interpretation.phrases
    .map((phrase) => phrase.entityId ?? '∅')
    .join('|');
}

/**
 * Synchronous-friendly entry point used by older call sites. Always returns
 * a Promise — fetch is intentionally null so callers without a resolver get
 * a deterministic (no-network) result.
 *
 * @param {string} input
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export function formalizeText(input, options = {}) {
  return formalizeTextWith(input, {
    fetch: null,
    cache: null,
    now: () => 0,
    ...options,
  });
}

/**
 * Formalize free-form text by tokenising, resolving each n-gram against
 * one or more knowledge graphs, picking the longest non-overlapping
 * cover, and producing renderings (Markdown, HTML, Links Notation) plus
 * aggregated big contexts and ranked interpretations.
 *
 * @param {string} input
 * @param {object} [options]
 * @param {Function|null} [options.fetch]            — fetch implementation
 * @param {Map<string,unknown>|null} [options.cache] — TTL cache
 * @param {number} [options.cacheTtlMs]
 * @param {Function} [options.now]
 * @param {number} [options.maxNgramSize]
 * @param {number} [options.searchLimit]
 * @param {number} [options.topKCandidates]
 * @param {number} [options.maxInterpretations]
 * @param {string} [options.linkTargetMode]
 * @param {string|object|null} [options.contextLens]
 * @param {string} [options.language]
 * @param {object[]} [options.sources]               — pluggable source list
 * @param {object[]} [options.overrides]             — repo+user overrides
 * @param {object} [options.contextOptions]          — passed to aggregator
 * @returns {Promise<object>}
 */
export async function formalizeTextWith(input, options = {}) {
  const text = normalizeInput(input);
  const config = createConfig(options);
  const tokenSpans = tokenizeWithSpans(text);
  const tokens = tokenSpans.map((span) => span.token);
  const ngrams = generateNgrams(tokens, config.maxNgramSize, tokenSpans);
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
  const flatContexts = aggregateContexts(phrases);
  const bigContexts = await aggregateBigContexts(phrases, {
    fetchJson: (url) => fetchJson(url, config),
    now: config.now,
    language: config.language,
    maxDepth: config.bigContextDepth,
    perStepBranching: config.bigContextBranching,
    topCategories: config.bigContextTop,
  });
  const reranked = applyContextLens(phrases, config.contextLens, flatContexts);
  const interpretations = generateFormalizeInterpretations(
    reranked,
    flatContexts,
    config
  );
  const linksNetwork = buildLinksNetwork(text, reranked, flatContexts);
  const cst = buildFormalizationCst(
    text,
    tokens,
    reranked,
    flatContexts,
    config
  );
  const markdown = markdownFromFormalizationCst(cst);
  const html = htmlFromFormalizationCst(cst);
  const linksNotation = renderLinksNotation(cst);

  return {
    text,
    tokens,
    phrases: reranked,
    contexts: flatContexts.all,
    mainContext: flatContexts.main,
    additionalContexts: flatContexts.additional,
    bigContexts: bigContexts.all,
    mainBigContext: bigContexts.main,
    additionalBigContexts: bigContexts.additional,
    interpretations,
    markdown,
    html,
    linksNotation,
    linksNetwork,
    cst,
    linkTargetMode: config.linkTargetMode,
    sources: config.sources.all.map((source) => source.name),
  };
}

/**
 * Recreate Markdown from a formalization CST.
 *
 * The CST stores phrase order, source text, source character ranges, selected
 * entity id, and the exact link URL used by the formalizer. That makes the
 * Links Notation / CST form sufficient for downstream tools such as
 * `/translate` to regenerate the same wikified Markdown, including sentence
 * punctuation, without re-running disambiguation.
 *
 * @param {object} cst
 * @returns {string}
 */
export function markdownFromFormalizationCst(cst) {
  if (!cst || !Array.isArray(cst.phrases)) {
    throw new TypeError('Formalization CST must contain a phrases array.');
  }
  if (canRenderCstWithSourceText(cst)) {
    return markdownFromCstSourceText(cst);
  }
  return cst.phrases.map((phrase) => markdownFromCstPhrase(phrase)).join(' ');
}

/**
 * Tokenize input by stripping punctuation and splitting on whitespace.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  return tokenizeWithSpans(text).map((span) => span.token);
}

/**
 * Build all n-grams up to `maxSize` tokens. Generic multi-token stop-only
 * n-grams are skipped, but single-token stop words and exact Wiktionary
 * grammar compounds are kept with `stopOnly: true` so lexical definitions
 * remain linkable without flooding every source tier with glue words.
 *
 * @param {string[]} tokens
 * @param {number} [maxSize]
 * @param {Array<{sentenceBoundaryAfter?: boolean}>} [tokenSpans]
 * @returns {Array<{text:string,tokens:string[],start:number,end:number,size:number,stopOnly:boolean}>}
 */
export function generateNgrams(
  tokens,
  maxSize = defaultMaxNgramSize,
  tokenSpans = []
) {
  const ngrams = [];
  const max = Math.max(1, Math.min(maxSize, tokens.length));
  for (let size = 1; size <= max; size += 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      const end = start + size - 1;
      if (crossesSentenceBoundary(tokenSpans, start, end)) {
        continue;
      }
      const slice = tokens.slice(start, start + size);
      const stopOnly = isStopOnly(slice);
      if (
        stopOnly &&
        size > 1 &&
        !normalizeWiktionaryLookupText(slice.join(' '))
      ) {
        continue;
      }
      ngrams.push({
        text: slice.join(' '),
        tokens: slice,
        start,
        end,
        size,
        stopOnly,
      });
    }
  }
  return ngrams;
}

/**
 * Render a single phrase as Markdown link `[text](url "Qid")`.
 *
 * @param {object} phrase
 * @param {object} [options]
 * @returns {string}
 */
export function buildMarkdownLink(phrase, options = {}) {
  if (!phrase.entity) {
    return phrase.text;
  }
  const url = resolveLinkTarget(phrase, options);
  return `[${escapeMarkdown(phrase.text)}](${url} "${phrase.entity.id}")`;
}

/**
 * Render a single phrase as HTML `<a title="Qid">text</a>`.
 *
 * @param {object} phrase
 * @param {object} [options]
 * @returns {string}
 */
export function buildHtmlLink(phrase, options = {}) {
  if (!phrase.entity) {
    return escapeHtml(phrase.text);
  }
  const url = resolveLinkTarget(phrase, options);
  return `<a href="${escapeAttribute(url)}" title="${escapeAttribute(
    phrase.entity.id
  )}">${escapeHtml(phrase.text)}</a>`;
}

/**
 * Resolve the URL the rendered link should point at, depending on the
 * configured `linkTargetMode`. Supports any source-tagged entity.
 *
 * @param {object} phrase
 * @param {object} [options]
 * @returns {string|null}
 */
export function resolveLinkTarget(phrase, options = {}) {
  const mode = options.linkTargetMode ?? linkTargetModes.WIKIPEDIA;
  const entity = phrase.entity;
  if (!entity) {
    return null;
  }

  // Non-Wikidata sources route through their own URL regardless of mode
  // (we can't synthesise a Wikipedia article URL for a Fandom page).
  const isWikidataLikeId = /^[QP]\d+$/.test(entity.id);
  if (!isWikidataLikeId && entity.sourceUrl) {
    if (mode === linkTargetModes.LOCAL) {
      return localViewerUrl(entity);
    }
    return entity.sourceUrl;
  }

  if (mode === linkTargetModes.LOCAL) {
    return localViewerUrl(entity);
  }
  if (mode === linkTargetModes.WIKIDATA) {
    return wikidataPageUrl(entity);
  }
  if (entity.wikipediaUrl) {
    return entity.wikipediaUrl;
  }
  return wikidataPageUrl(entity);
}

function localViewerUrl(entity) {
  if (entity.kind === 'property') {
    return `${localPropertyViewerBaseUrl}#${entity.id}`;
  }
  return `${localEntityViewerBaseUrl}#${entity.id}`;
}

function wikidataPageUrl(entity) {
  if (entity.kind === 'property') {
    return `${wikidataPropertyBaseUrl}${entity.id}`;
  }
  return `${wikidataEntityBaseUrl}${entity.id}`;
}

function createConfig(options) {
  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis) ?? null;
  // Issue #21: default tier order is Wikipedia → Wikidata → Wiktionary so
  // every phrase — including stop words like `the` — has at least one
  // resolver willing to answer. Callers can still override `sources`
  // explicitly (legacy callers and unit tests do).
  const sources = createSourceRegistry(
    options.sources ?? createDefaultSourceTiers(options.language ?? 'en')
  );
  return {
    fetchImpl,
    sources,
    cache: options.cache ?? new Map(),
    overrides: buildOverrideMap(options.overrides ?? []),
    ...resolveScalarConfigDefaults(options),
  };
}

function resolveScalarConfigDefaults(options) {
  return {
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
    bigContextDepth: options.bigContextDepth,
    bigContextBranching: options.bigContextBranching,
    bigContextTop: options.bigContextTop,
  };
}

function isStopOnly(tokens) {
  return tokens.every((token) => stopWords.has(token.toLowerCase()));
}

function tokenizeWithSpans(text) {
  const source = String(text);
  const tokenPattern = /[^\s.,!?;:"“”]+/g;
  const spans = [];
  let match;
  while ((match = tokenPattern.exec(source)) !== null) {
    spans.push({
      token: match[0],
      start: match.index,
      end: match.index + match[0].length,
      sentenceBoundaryAfter: false,
    });
  }
  for (let index = 0; index < spans.length - 1; index += 1) {
    const delimiter = source.slice(spans[index].end, spans[index + 1].start);
    spans[index].sentenceBoundaryAfter = /[.!?]/.test(delimiter);
  }
  return spans;
}

function crossesSentenceBoundary(tokenSpans, start, end) {
  if (!Array.isArray(tokenSpans) || tokenSpans.length === 0) {
    return false;
  }
  for (let index = start; index < end; index += 1) {
    if (tokenSpans[index]?.sentenceBoundaryAfter) {
      return true;
    }
  }
  return false;
}

async function searchNgramCandidates(ngram, config) {
  // Overrides short-circuit live search entirely.
  const override = lookupOverride(config.overrides, ngram.text);
  if (override) {
    return [overrideToCandidate(override)];
  }
  if (!shouldSearchNgram(ngram)) {
    return [];
  }
  const sourceCtx = buildSourceContext(config);
  const propertyBias = isPropertyIndicator(ngram.text);
  // Stop-only n-grams go ONLY to Wiktionary so we never burn
  // Wikipedia/Wikidata calls on `the`, `and`, etc. but still have a
  // definition to attach for tooltips when a supported lexical entry exists.
  const eligibleSources = ngram.stopOnly
    ? config.sources.all.filter(
        (source) => source.name === SOURCE_KIND.WIKTIONARY
      )
    : config.sources.all;
  const perSource = await Promise.all(
    eligibleSources.map((source) =>
      source.searchPhrase(ngram.text, sourceCtx).catch(() => [])
    )
  );
  const merged = mergeSearchResults(perSource.flat(), propertyBias);
  return merged
    .filter((candidate) => candidateMatchesNgramShape(ngram, candidate))
    .map((candidate) => scoreCandidate(ngram, candidate, propertyBias))
    .sort((left, right) => right.score - left.score)
    .slice(0, config.topKCandidates);
}

function buildSourceContext(config) {
  return {
    fetchImpl: config.fetchImpl,
    fetchJson: (url) => fetchJson(url, config),
    isPropertyIndicator,
  };
}

function isPropertyIndicator(text) {
  const lowered = String(text).toLowerCase();
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

function shouldSearchNgram(ngram) {
  if (ngram.size <= 1) {
    return true;
  }
  if (ngram.stopOnly) {
    return normalizeWiktionaryLookupText(ngram.text) !== null;
  }
  const lowered = String(ngram.text).toLowerCase();
  if (propertyIndicators.has(lowered)) {
    return true;
  }
  if (ngram.tokens.some((token) => isCopula(token))) {
    return false;
  }
  const first = ngram.tokens[0];
  const last = ngram.tokens[ngram.tokens.length - 1];
  return !isEnglishGrammarGlue(first) && !isEnglishGrammarGlue(last);
}

function candidateMatchesNgramShape(ngram, candidate) {
  if (candidate?.kind === 'property') {
    return true;
  }
  const phrase = normalizeLabel(ngram.text);
  if (candidateHasDirectPhraseEvidence(phrase, candidate)) {
    return true;
  }
  if (ngram.size <= 1) {
    return isLatinText(ngram.text);
  }
  if (!ngram.tokens.some((token) => isEnglishGrammarGlue(token))) {
    return candidateHasPrefixPhraseEvidence(phrase, candidate);
  }
  return false;
}

function candidateHasDirectPhraseEvidence(phrase, candidate) {
  return candidateEvidenceTexts(candidate).some(
    (text) => normalizeLabel(text) === phrase
  );
}

function candidateHasPrefixPhraseEvidence(phrase, candidate) {
  if (!phrase) {
    return false;
  }
  return candidateEvidenceTexts(candidate).some((text) => {
    const normalized = normalizeLabel(text);
    return normalized === phrase || normalized.startsWith(`${phrase} `);
  });
}

function candidateEvidenceTexts(candidate) {
  return [
    candidate?.label,
    candidate?.matchText,
    ...(Array.isArray(candidate?.aliases) ? candidate.aliases : []),
  ].filter(Boolean);
}

function isLatinText(text) {
  return /^[\p{Script=Latin}\p{Number}\s'’._-]+$/u.test(String(text ?? ''));
}

function isEnglishGrammarGlue(value) {
  return (
    stopWords.has(String(value).toLowerCase()) ||
    isEnglishArticle(value) ||
    isCopula(value)
  );
}

function isEnglishArticle(value) {
  return ['a', 'an', 'the'].includes(String(value).toLowerCase());
}

function isEnglishCopula(value) {
  return ['am', 'is', 'are', 'was', 'were', 'be', 'being', 'been'].includes(
    String(value).toLowerCase()
  );
}

function isRussianCopula(value) {
  return ['это'].includes(String(value).toLowerCase());
}

function isCopula(value) {
  return isEnglishCopula(value) || isRussianCopula(value);
}

function mergeSearchResults(results, propertyBias) {
  // When the same Q-id surfaces from Wikipedia AND Wikidata we want a
  // single combined candidate that keeps Wikipedia's article URL +
  // snippet (richer description for tooltips) while preserving the
  // Wikidata graph hooks (sitelink/claims hydrated later via
  // wbgetentities). The merge favours non-empty fields from later
  // results — Wikidata always runs after Wikipedia in the default
  // tier order, so its `kind`/`source` annotations layer on top.
  const seen = new Map();
  for (const result of results) {
    if (!result?.id) {
      continue;
    }
    const previous = seen.get(result.id);
    if (!previous) {
      seen.set(result.id, { ...result });
      continue;
    }
    seen.set(result.id, mergeCandidatePair(previous, result));
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

function mergeCandidatePair(previous, next) {
  const merged = { ...previous };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (key === 'sources') {
      const all = new Set(
        [
          ...(Array.isArray(previous.sources) ? previous.sources : []),
          ...(previous.source ? [previous.source] : []),
          ...(Array.isArray(value) ? value : []),
          next.source,
        ].filter(Boolean)
      );
      merged.sources = [...all];
      continue;
    }
    merged[key] = value;
  }
  // Preserve every contributing source name on the candidate so the
  // scorer can boost Wikipedia-confirmed Wikidata hits.
  const allSources = new Set(
    [previous.source, next.source, ...(merged.sources ?? [])].filter(Boolean)
  );
  merged.sources = [...allSources];
  // Wikipedia titles tend to be plain ("Hawaii"); Wikidata labels
  // sometimes carry disambiguators ("Hawaii (state)"). Keep the
  // shortest non-empty label for cleaner UX.
  if (
    previous.label &&
    next.label &&
    previous.label.length < next.label.length
  ) {
    merged.label = previous.label;
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
  // Issue #21: Wikipedia is the FIRST disambiguation tier — its
  // article-driven hit usually reflects the most common reading of a
  // phrase. Wikidata still gets a smaller boost because it carries the
  // canonical Q-id graph used for context BFS. Wiktionary is intentionally
  // unboosted; it's the last-resort lexical fallback for stop words.
  const sourceTags = collectSourceTags(candidate);
  if (sourceTags.has(SOURCE_KIND.WIKIPEDIA)) {
    score += 12;
  }
  if (sourceTags.has(SOURCE_KIND.WIKIDATA)) {
    score += 8;
  }
  if (sourceTags.has(SOURCE_KIND.WIKTIONARY) && /^[a-z]+$/.test(ngram.text)) {
    score += 12;
  }
  if (isDisambiguationCandidate(candidate)) {
    score -= 20;
  }
  // Prefer longer phrases.
  score += ngram.size * 3;
  return { ...candidate, score, ngramSize: ngram.size };
}

function isDisambiguationCandidate(candidate) {
  const title = String(candidate.wikipediaTitle ?? candidate.label ?? '');
  const description = String(candidate.description ?? '').toLowerCase();
  return (
    /\bdisambiguation\b/i.test(title) ||
    /\bdisambiguation\b/.test(description) ||
    /\bmay refer to\b/.test(description) ||
    /\bcan refer to\b/.test(description) ||
    description.startsWith('look up ')
  );
}

function collectSourceTags(candidate) {
  const tags = new Set();
  if (candidate.source) {
    tags.add(candidate.source);
  }
  if (Array.isArray(candidate.sources)) {
    for (const source of candidate.sources) {
      tags.add(source);
    }
  }
  return tags;
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

  const claimedByStart = new Map();
  for (const ngram of claimed) {
    claimedByStart.set(ngram.start, ngram);
  }
  const phrases = [];
  let cursor = 0;
  while (cursor < tokens.length) {
    const ngram = claimedByStart.get(cursor);
    if (ngram) {
      phrases.push(buildPhraseFromNgram(ngram));
      cursor = ngram.end + 1;
      continue;
    }
    phrases.push(buildRawPhrase(tokens[cursor], cursor));
    cursor += 1;
  }
  return phrases;
}

function buildPhraseFromNgram(ngram) {
  const best = ngram.candidates[0];
  return {
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
          source: best.source ?? SOURCE_KIND.WIKIDATA,
          sourceUrl: best.sourceUrl ?? null,
          score: best.score,
          wikipediaUrl: null,
          wikipediaTitle: null,
          contextLabels: [],
          overrideEntry: best.overrideEntry ?? null,
        }
      : null,
  };
}

function buildRawPhrase(token, position) {
  return {
    text: token,
    tokens: [token],
    start: position,
    end: position,
    size: 1,
    candidates: [],
    entity: null,
  };
}

async function attachEntityDetails(phrase, config) {
  if (!phrase.entity) {
    return;
  }
  // Override entries already carry their final shape — promote it directly.
  if (phrase.entity.overrideEntry) {
    Object.assign(phrase.entity, overrideToEntity(phrase.entity.overrideEntry));
    return;
  }
  // Hydrate the chosen entity AND every Wikidata-shaped candidate so the
  // context aggregator can see which categories each alternative
  // belongs to (issue #21 — without this the contexts panel says
  // "No shared contexts inferred." even when the alternatives clearly
  // cluster around the same world).
  await Promise.all(
    phrase.candidates.map((candidate) =>
      hydrateCandidateDetails(candidate, config)
    )
  );
  // Sync the top hydrated candidate back into the phrase entity so
  // existing renderers keep their wikipediaUrl / contextLabels fields.
  const top = phrase.candidates[0];
  if (top?.contextLabels) {
    phrase.entity.contextLabels = top.contextLabels;
  }
  if (top?.wikipediaUrl) {
    phrase.entity.wikipediaUrl = top.wikipediaUrl;
    phrase.entity.wikipediaTitle = top.wikipediaTitle ?? null;
  }
}

async function hydrateCandidateDetails(candidate, config) {
  if (!candidate) {
    return;
  }
  if (candidate.overrideEntry) {
    Object.assign(candidate, overrideToEntity(candidate.overrideEntry));
    candidate.contextLabels = candidate.contextLabels ?? [];
    return;
  }
  const wikidata = pickWikidataResolver(candidate, config);
  if (!wikidata) {
    candidate.contextLabels = candidate.contextLabels ?? [];
    return;
  }
  const entity = await wikidata.getEntity(
    candidate.id,
    buildSourceContext(config)
  );
  if (!entity) {
    candidate.contextLabels = candidate.contextLabels ?? [];
    return;
  }
  applyEntityHydration(candidate, entity);
}

function pickWikidataResolver(candidate, config) {
  if (!/^[QP]\d+$/.test(candidate.id)) {
    return null;
  }
  if (!config.fetchImpl) {
    return null;
  }
  const wikidata = config.sources.byName.get(SOURCE_KIND.WIKIDATA);
  return wikidata?.getEntity ? wikidata : null;
}

function applyEntityHydration(candidate, entity) {
  const sitelink = entity.sitelinks?.enwiki?.title;
  if (sitelink) {
    candidate.wikipediaTitle = sitelink;
    candidate.wikipediaUrl = `${wikipediaArticleBaseUrl}${encodeURIComponent(
      sitelink.replace(/ /g, '_')
    )}`;
  }
  candidate.contextLabels = extractContextLabels(entity);
  candidate.aliases = extractAliases(entity);
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

// Surface every alias the entity carries so the candidate matcher can
// snap "to formalize" → Q115492965 even when the canonical label is
// "formalizing" (issue #21).
function extractAliases(entity) {
  const aliases = entity?.aliases?.en;
  if (!Array.isArray(aliases)) {
    return [];
  }
  return aliases
    .map((alias) => alias?.value)
    .filter((value) => typeof value === 'string' && value.length > 0);
}

async function fetchJson(url, config) {
  const key = String(url);
  const now = Number(config.now());
  const cached = config.cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }
  const response = await config.fetchImpl(key, {
    headers: wikimediaRequestHeaders(),
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

function aggregateContexts(phrases) {
  const counts = new Map();
  for (const phrase of phrases) {
    if (!phrase.entity) {
      continue;
    }
    // Walk every candidate (not just the chosen entity) so words with
    // multiple senses contribute their alternative contexts to the
    // shared-context election (issue #21 R21.5/R21.6). Each candidate
    // votes proportional to its share of the phrase's total score so
    // a strong winner still dominates while weaker alternatives keep
    // a voice in the aggregate.
    const candidates = phrase.candidates?.length
      ? phrase.candidates
      : [phrase.entity];
    const totalScore = candidates.reduce(
      (sum, candidate) => sum + Math.max(candidate?.score ?? 0, 1),
      0
    );
    for (const candidate of candidates) {
      const candidateWeight =
        totalScore > 0
          ? Math.max(candidate?.score ?? 0, 1) / totalScore
          : 1 / candidates.length;
      const labels = candidate?.contextLabels ?? [];
      for (const label of labels) {
        const key = label.targetId;
        const entry = counts.get(key) ?? {
          id: key,
          property: label.property,
          propertyLabel: label.propertyLabel,
          weight: 0,
          phrases: [],
          candidates: [],
        };
        entry.weight += candidateWeight;
        entry.candidates.push({
          phrase: phrase.text,
          candidateId: candidate.id,
          candidateLabel: candidate.label,
          weight: candidateWeight,
        });
        if (
          !entry.phrases.some(
            (existing) =>
              existing.text === phrase.text &&
              existing.entityId === phrase.entity.id
          )
        ) {
          entry.phrases.push({
            text: phrase.text,
            entityId: phrase.entity.id,
          });
        }
        counts.set(key, entry);
      }
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
        source: best.source ?? phrase.entity.source,
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
          kind: phrase.entity?.kind ?? null,
          entityLabel: phrase.entity?.label ?? null,
          entityDescription: phrase.entity?.description ?? null,
        })),
      },
    ];
  }
  const baseScore = phrases.reduce(
    (accumulator, phrase) => accumulator + (phrase.entity?.score ?? 0),
    0
  );
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
          const candidate = choice?.candidate ?? phrase.entity;
          return {
            text: phrase.text,
            entityId: candidate.id ?? phrase.entity.id,
            kind: candidate.kind ?? phrase.entity.kind,
            entityLabel: candidate.label ?? phrase.entity.label ?? null,
            entityDescription:
              candidate.description ?? phrase.entity.description ?? null,
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

function buildFormalizationCst(text, tokens, phrases, contexts, config) {
  const tokenSpans = sourceTokenSpans(text, tokens);
  return {
    type: 'formalization',
    version: 1,
    text,
    tokens: [...tokens],
    linkTargetMode: config.linkTargetMode,
    phrases: phrases.map((phrase, index) =>
      buildCstPhrase(phrase, index, config, tokenSpans)
    ),
    contexts: contexts.all.map((context, index) => ({
      id: `context-${index + 1}`,
      wikidataId: context.id,
      property: context.property,
      propertyLabel: context.propertyLabel,
      weight: context.weight,
      probability: context.probability,
    })),
  };
}

function buildCstPhrase(phrase, index, config, tokenSpans) {
  const firstToken = tokenSpans[phrase.start];
  const lastToken = tokenSpans[phrase.end];
  return {
    type: 'phrase',
    id: `phrase-${index + 1}`,
    text: phrase.text,
    tokens: [...phrase.tokens],
    start: phrase.start,
    end: phrase.end,
    sourceStart: firstToken?.start ?? null,
    sourceEnd: lastToken?.end ?? null,
    size: phrase.size,
    entity: phrase.entity ? buildCstEntity(phrase.entity, config) : null,
    candidates: (phrase.candidates ?? []).map((candidate) =>
      buildCstEntity(candidate, config)
    ),
  };
}

function sourceTokenSpans(text, tokens) {
  const spans = [];
  let cursor = 0;
  for (const token of tokens) {
    const start = text.indexOf(token, cursor);
    if (start === -1) {
      spans.push({ start: null, end: null });
      continue;
    }
    const end = start + token.length;
    spans.push({ start, end });
    cursor = end;
  }
  return spans;
}

function buildCstEntity(entity, config) {
  const normalized = {
    id: entity.id,
    label: entity.label ?? null,
    description: entity.description ?? null,
    kind: entity.kind ?? null,
    source: entity.source ?? null,
    sourceUrl: entity.sourceUrl ?? null,
    wikipediaUrl: entity.wikipediaUrl ?? null,
    wikipediaTitle: entity.wikipediaTitle ?? null,
    score: entity.score ?? null,
  };
  return {
    ...normalized,
    url: resolveLinkTarget(
      { entity: normalized },
      { linkTargetMode: config.linkTargetMode }
    ),
  };
}

function buildLinksNetwork(text, phrases, contexts) {
  const inputId = 'formalize-input-1';
  const links = [
    {
      id: inputId,
      role: 'input',
      references: [],
      value: { text },
      provenance: { sourceType: 'algorithm', method: 'formalize' },
    },
  ];
  phrases.forEach((phrase, index) => {
    links.push(buildPhraseLink(phrase, index, inputId));
  });
  contexts.all.forEach((context, index) => {
    links.push(buildContextLink(context, index, inputId));
  });
  return {
    id: 'formalize-links-network',
    kind: 'links-network',
    version: 1,
    beliefSystem: {
      id: 'formalize-default',
      name: 'Formalize prototype',
      probabilityStrategy: 'frequency-weighted-context',
      sourceWeights: { wikidata: 1, wordnet: 0.7, fandom: 0.6, algorithm: 0.5 },
    },
    links,
  };
}

function buildPhraseLink(phrase, index, inputId) {
  const entity = phrase.entity ?? null;
  return {
    id: `formalize-phrase-${index + 1}`,
    role: 'phrase',
    references: [inputId],
    value: phraseLinkValue(phrase, entity),
    provenance: phraseLinkProvenance(entity),
  };
}

function phraseLinkValue(phrase, entity) {
  return {
    text: phrase.text,
    position: phrase.start,
    size: phrase.size,
    wikidataId: entity?.id ?? null,
    wikidataLabel: entity?.label ?? null,
    wikidataKind: entity?.kind ?? null,
    wikipediaUrl: entity?.wikipediaUrl ?? null,
    source: entity?.source ?? null,
  };
}

function phraseLinkProvenance(entity) {
  if (!entity) {
    return { sourceType: 'algorithm', sourceUrl: null };
  }
  return {
    sourceType: entity.source ?? 'algorithm',
    sourceUrl: entity.sourceUrl ?? wikidataPageUrl(entity),
  };
}

function buildContextLink(context, index, inputId) {
  return {
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
  };
}

function htmlFromFormalizationCst(cst) {
  if (canRenderCstWithSourceText(cst)) {
    return htmlFromCstSourceText(cst);
  }
  return cst.phrases.map((phrase) => htmlFromCstPhrase(phrase)).join(' ');
}

function renderLinksNotation(cst) {
  const safeText = toLino(cst.text);
  const head = `(formalization: ${safeText})`;
  const phraseLines = cst.phrases.map((phrase) => {
    if (!phrase.entity) {
      return `(${phrase.id}: source ${toLino(phrase.text)} start ${phrase.start} end ${phrase.end} unresolved)`;
    }
    const label = phrase.entity.label ?? phrase.text;
    return `(${phrase.id}: source ${toLino(phrase.text)} start ${phrase.start} end ${phrase.end} id ${phrase.entity.id} label ${toLino(label)} kind ${phrase.entity.kind ?? 'entity'} markdownUrl ${toLino(phrase.entity.url)})`;
  });
  const contextLines = cst.contexts.map((context) => {
    const probability = (context.probability * 100).toFixed(1);
    return `(${context.id}: ${context.wikidataId} weight ${context.weight} probability ${probability})`;
  });
  return [head, ...phraseLines, ...contextLines].join('\n');
}

function markdownFromCstPhrase(phrase) {
  if (!phrase.entity) {
    return phrase.text;
  }
  return `[${escapeMarkdown(phrase.text)}](${phrase.entity.url} "${phrase.entity.id}")`;
}

function canRenderCstWithSourceText(cst) {
  return (
    typeof cst.text === 'string' &&
    cst.phrases.every(
      (phrase) =>
        Number.isInteger(phrase.sourceStart) &&
        Number.isInteger(phrase.sourceEnd) &&
        phrase.sourceEnd >= phrase.sourceStart
    )
  );
}

function markdownFromCstSourceText(cst) {
  const phrases = [...cst.phrases].sort(
    (left, right) => left.sourceStart - right.sourceStart
  );
  let cursor = 0;
  let markdown = '';
  for (const phrase of phrases) {
    if (phrase.sourceStart < cursor) {
      continue;
    }
    markdown += cst.text.slice(cursor, phrase.sourceStart);
    markdown += markdownFromCstPhrase(phrase);
    cursor = phrase.sourceEnd;
  }
  markdown += cst.text.slice(cursor);
  return markdown;
}

function htmlFromCstPhrase(phrase) {
  if (!phrase.entity) {
    return escapeHtml(phrase.text);
  }
  return `<a href="${escapeAttribute(phrase.entity.url)}" title="${escapeAttribute(
    phrase.entity.id
  )}">${escapeHtml(phrase.text)}</a>`;
}

function htmlFromCstSourceText(cst) {
  const phrases = [...cst.phrases].sort(
    (left, right) => left.sourceStart - right.sourceStart
  );
  let cursor = 0;
  let html = '';
  for (const phrase of phrases) {
    if (phrase.sourceStart < cursor) {
      continue;
    }
    html += escapeHtml(cst.text.slice(cursor, phrase.sourceStart));
    html += htmlFromCstPhrase(phrase);
    cursor = phrase.sourceEnd;
  }
  html += escapeHtml(cst.text.slice(cursor));
  return html;
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
