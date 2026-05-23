import { translateTextWith } from './translate.js';

/**
 * Translation quality assessment for the issue #43 integration test.
 *
 * For each article (or pair of language extracts) the assessor:
 *
 *   1. Extracts the first statement from the source language extract.
 *   2. Translates it through the formalize → semantic meta language →
 *      naturalization pipeline implemented in `translateTextWith`.
 *   3. Checks whether the translation can be found in the target language
 *      extract. The match is intentionally lenient — content tokens of the
 *      translation must overlap with the target extract above a configurable
 *      coverage threshold.
 *   4. If the translation is not found:
 *      - If the source statement is in the per-article `skipList` the article
 *        is marked `skipped` (translation error in Wikipedia itself).
 *      - If the source statement is round-trip stable the article is marked
 *        `fix-suggested` and the suggested translation is recorded so it can
 *        be promoted to a translation fix later.
 *      - Otherwise the article is marked `failed`.
 *
 *   5. The configured `translationFixes` always pass; they describe deltas the
 *      project wants to push back to Wikipedia (or to its own glossary).
 */

const defaultMatchThreshold = 0.5;
const matchableTokenPattern = /[\p{L}\p{N}]+/gu;

const universalStopwords = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'as',
  'of',
  'in',
  'on',
  'at',
  'to',
  'and',
  'or',
  'for',
  'by',
  'with',
  'from',
  'this',
  'that',
  'it',
  'its',
  'also',
  'но',
  'не',
  'и',
  'или',
  'для',
  'по',
  'в',
  'на',
  'из',
  'с',
  'о',
  'об',
  'это',
  'как',
  'что',
  'который',
  'которая',
  'которое',
]);

/**
 * Extract the first statement of a Wikipedia article extract. The function
 * strips parenthetical asides (commonly used in foreign-language Wikipedia
 * articles to display the English spelling) and keeps the first sentence
 * terminated by `.`, `!`, or `?`. A trailing whitespace block (including
 * line breaks) also ends the statement so that nominal lead paragraphs with
 * no terminating punctuation still produce a usable string.
 *
 * @param {string} text
 * @returns {string}
 */
export function extractFirstStatement(text) {
  const normalized = String(text ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\(([^()]*)\)/g, (_match, inner) => {
      if (/[А-Яа-яЁё]/.test(inner) || /[A-Za-z]/.test(inner)) {
        return '';
      }
      return `(${inner})`;
    })
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) {
    return '';
  }
  const match = normalized.match(/^[\s\S]*?[.!?](?=\s|$)|^[\s\S]*?(?=\n\s*\n)/);
  const firstSentence = match ? match[0] : normalized;
  return firstSentence.trim();
}

/**
 * Tokenize text into Unicode-aware content tokens, lowercase them, and drop
 * universal stop words and digits-only strings.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeForMatch(text) {
  const tokens = String(text ?? '')
    .toLowerCase()
    .match(matchableTokenPattern);
  if (!tokens) {
    return [];
  }
  return tokens.filter(
    (token) =>
      token.length >= 2 &&
      !universalStopwords.has(token) &&
      !/^\d+$/.test(token)
  );
}

/**
 * Compute the fraction of unique content tokens from `candidate` that also
 * appear anywhere in `target`. Returns `{ ratio, found, missing }` so the
 * caller can both score and explain the match.
 *
 * @param {string} candidate
 * @param {string} target
 * @returns {{ratio: number, found: string[], missing: string[]}}
 */
export function tokenCoverage(candidate, target) {
  const candidateTokens = Array.from(new Set(tokenizeForMatch(candidate)));
  if (candidateTokens.length === 0) {
    return { ratio: 0, found: [], missing: [] };
  }
  const targetTokens = new Set(tokenizeForMatch(target));
  const found = candidateTokens.filter((token) => targetTokens.has(token));
  const missing = candidateTokens.filter((token) => !targetTokens.has(token));
  return {
    ratio: found.length / candidateTokens.length,
    found,
    missing,
  };
}

/**
 * Normalize a statement for skip-list comparison. Whitespace is collapsed and
 * trailing punctuation is removed so callers can store skip entries without
 * worrying about minor formatting drift.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeStatementKey(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[.!?\s]+$/, '')
    .trim();
}

function findFix(fixes, sourceStatement) {
  const key = normalizeStatementKey(sourceStatement);
  return fixes.find((fix) => normalizeStatementKey(fix.source) === key) ?? null;
}

function isSkipped(skipList, sourceStatement) {
  const key = normalizeStatementKey(sourceStatement);
  return skipList.some((entry) => {
    if (typeof entry === 'string') {
      return normalizeStatementKey(entry) === key;
    }
    return normalizeStatementKey(entry.source) === key;
  });
}

function translateStatement(statement, options) {
  return translateTextWith(statement, {
    fetch: options.fetch ?? (() => emptyJsonResponse()),
    cache: options.cache ?? null,
    sourceLanguage: options.sourceLanguage,
    targetLanguage: options.targetLanguage,
    now: options.now ?? (() => 0),
    translationStrategy: options.translationStrategy,
  });
}

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    json() {
      return Promise.resolve({});
    },
  });
}

function articleHeader(article) {
  return {
    enTitle: article.enTitle ?? null,
    qId: article.qId ?? null,
    sourceLanguage: article.sourceLanguage,
    targetLanguage: article.targetLanguage,
  };
}

/**
 * Assess translation quality for a single article pair.
 *
 * @param {object} article
 * @param {string} article.enTitle - English page title (used for logging).
 * @param {string} article.qId     - Wikidata Q-id of the topic.
 * @param {string} article.sourceLanguage
 * @param {string} article.targetLanguage
 * @param {string} article.sourceExtract
 * @param {string} article.targetExtract
 * @param {object} [options]
 * @param {Array}  [options.skipList]
 * @param {Array}  [options.translationFixes]
 * @param {Function} [options.fetch]
 * @param {Map}    [options.cache]
 * @param {Function} [options.now]
 * @param {number} [options.matchThreshold]
 * @param {string} [options.translationStrategy]
 * @returns {Promise<object>}
 */
export function assessArticleTranslation(article, options = {}) {
  const skipList = options.skipList ?? [];
  const translationFixes = options.translationFixes ?? [];
  const matchThreshold = options.matchThreshold ?? defaultMatchThreshold;
  const sourceExtract = article.sourceExtract ?? '';
  const targetExtract = article.targetExtract ?? '';
  const sourceStatement = extractFirstStatement(sourceExtract);
  const header = articleHeader(article);

  if (!sourceStatement) {
    return Promise.resolve({
      ...header,
      sourceStatement: '',
      status: 'no-statement',
      reason: 'source extract is empty',
    });
  }

  const explicitFix = findFix(translationFixes, sourceStatement);
  if (explicitFix) {
    return Promise.resolve({
      ...header,
      sourceStatement,
      status: 'translation-fix',
      suggestedTranslation: explicitFix.target,
      note: explicitFix.note ?? null,
    });
  }

  if (isSkipped(skipList, sourceStatement)) {
    return Promise.resolve({
      ...header,
      sourceStatement,
      status: 'skipped',
      reason: 'in skip list',
    });
  }

  return runTranslationCheck({
    header,
    sourceStatement,
    targetExtract,
    matchThreshold,
    options,
  });
}

async function runTranslationCheck({
  header,
  sourceStatement,
  targetExtract,
  matchThreshold,
  options,
}) {
  const forwardOptions = {
    sourceLanguage: header.sourceLanguage,
    targetLanguage: header.targetLanguage,
    fetch: options.fetch,
    cache: options.cache,
    now: options.now,
    translationStrategy: options.translationStrategy,
  };
  const forward = await translateStatement(sourceStatement, forwardOptions);
  const coverage = tokenCoverage(forward.plainText, targetExtract);
  if (coverage.ratio >= matchThreshold) {
    return {
      ...header,
      sourceStatement,
      translatedStatement: forward.plainText,
      status: 'matched',
      coverage,
    };
  }

  const reverseOptions = {
    ...forwardOptions,
    sourceLanguage: header.targetLanguage,
    targetLanguage: header.sourceLanguage,
  };
  const reverse = await translateStatement(forward.plainText, reverseOptions);
  const roundTrip = tokenCoverage(reverse.plainText, sourceStatement);
  const status = roundTrip.ratio >= matchThreshold ? 'fix-suggested' : 'failed';
  return {
    ...header,
    sourceStatement,
    translatedStatement: forward.plainText,
    status,
    coverage,
    roundTripText: reverse.plainText,
    roundTripCoverage: roundTrip,
  };
}

/**
 * Resolve the source/target language pair from a fixture-style article entry
 * that contains `languages` (sorted by extract length) and `pages` keyed by
 * language code.
 *
 * @param {object} entry
 * @returns {{sourceLanguage: string, targetLanguage: string, sourceExtract: string, targetExtract: string}}
 */
export function selectLanguagePair(entry) {
  const languages = Array.isArray(entry?.languages) ? entry.languages : [];
  if (languages.length < 2) {
    return {
      sourceLanguage: null,
      targetLanguage: null,
      sourceExtract: '',
      targetExtract: '',
    };
  }
  const [sourceLanguage, targetLanguage] = languages;
  const pages = entry.pages ?? {};
  return {
    sourceLanguage,
    targetLanguage,
    sourceExtract: pages[sourceLanguage]?.extract ?? '',
    targetExtract: pages[targetLanguage]?.extract ?? '',
  };
}

/**
 * Assess every article in a fixture set sequentially. The function returns
 * a structured report that the integration test (and the CLI) can pretty
 * print and assert on.
 *
 * @param {Array<object>} articles
 * @param {object} [options]
 * @returns {Promise<{results: object[], summary: object}>}
 */
export async function assessArticleSet(articles, options = {}) {
  const results = [];
  for (const article of articles) {
    const pair = selectLanguagePair(article);
    const result = await assessArticleTranslation(
      {
        enTitle: article.enTitle,
        qId: article.qId,
        sourceLanguage: pair.sourceLanguage,
        targetLanguage: pair.targetLanguage,
        sourceExtract: pair.sourceExtract,
        targetExtract: pair.targetExtract,
      },
      options
    );
    results.push(result);
  }
  const summary = summarizeAssessment(results);
  return { results, summary };
}

/**
 * Summarize an array of `assessArticleTranslation` results into counts per
 * status plus a `failed` array for easy assertion in tests.
 *
 * @param {object[]} results
 * @returns {object}
 */
export function summarizeAssessment(results) {
  const summary = {
    total: results.length,
    matched: 0,
    skipped: 0,
    'translation-fix': 0,
    'fix-suggested': 0,
    failed: 0,
    'no-statement': 0,
    failures: [],
  };
  for (const result of results) {
    if (Object.prototype.hasOwnProperty.call(summary, result.status)) {
      summary[result.status] += 1;
    }
    if (result.status === 'failed') {
      summary.failures.push(result);
    }
  }
  return summary;
}
