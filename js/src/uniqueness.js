import { detectStatements } from './check.js';
import { serializeLino } from './lino.js';

const defaultLocale = 'en';
const defaultLimit = 3;
const citeThreshold = 0.75;
const reviewThreshold = 0.35;

export function createDefaultUniquenessSources(options = {}) {
  const language = options.language ?? defaultLocale;
  return [
    createWikipediaUniquenessSource({ language }),
    createOpenAlexUniquenessSource(),
    createCrossrefUniquenessSource(options.crossref ?? {}),
    createDuckDuckGoUniquenessSource(),
  ];
}

export function createWikipediaUniquenessSource(options = {}) {
  const language = options.language ?? defaultLocale;
  return {
    id: 'wikipedia',
    label: 'Wikipedia',
    async search(statement, ctx) {
      const endpoint = `https://${language}.wikipedia.org/w/api.php`;
      const url = new URL(endpoint);
      url.searchParams.set('action', 'query');
      url.searchParams.set('format', 'json');
      url.searchParams.set('list', 'search');
      url.searchParams.set('srsearch', quoteQuery(statement.query));
      url.searchParams.set('srlimit', String(ctx.limit));
      url.searchParams.set('origin', '*');
      const payload = await fetchJson(ctx.fetch, url);
      return (payload.query?.search ?? []).map((entry) => {
        const snippet = stripHtml(entry.snippet ?? '');
        const title = String(entry.title ?? '');
        const searchable = `${title} ${snippet}`;
        const exact = containsPhrase(searchable, statement.query);
        const similarity = tokenSimilarity(searchable, statement.query);
        return buildMatch({
          sourceId: 'wikipedia',
          sourceLabel: 'Wikipedia',
          title,
          url: wikipediaPageUrl(language, entry),
          snippet,
          score: exact ? 0.92 : similarity * 0.65,
          matchKind: exact ? 'exact' : 'related',
          query: statement.query,
        });
      });
    },
  };
}

export function createOpenAlexUniquenessSource() {
  return {
    id: 'openalex',
    label: 'OpenAlex',
    async search(statement, ctx) {
      const url = new URL('https://api.openalex.org/works');
      url.searchParams.set('search', statement.query);
      url.searchParams.set('per-page', String(ctx.limit));
      url.searchParams.set(
        'select',
        'id,display_name,publication_year,doi,authorships,relevance_score'
      );
      const payload = await fetchJson(ctx.fetch, url);
      return (payload.results ?? []).map((work) => {
        const title = String(work.display_name ?? '');
        const exact = containsPhrase(title, statement.query);
        const similarity = tokenSimilarity(title, statement.query);
        const score = exact ? 0.88 : similarity * 0.72;
        const authors = (work.authorships ?? [])
          .map((entry) => entry.author?.display_name)
          .filter(Boolean)
          .slice(0, 3)
          .join(', ');
        return buildMatch({
          sourceId: 'openalex',
          sourceLabel: 'OpenAlex',
          title,
          url: work.doi ?? work.id,
          snippet: [authors, work.publication_year].filter(Boolean).join(' - '),
          score,
          matchKind: exact ? 'exact-title' : 'similar-work',
          query: statement.query,
        });
      });
    },
  };
}

export function createCrossrefUniquenessSource(options = {}) {
  return {
    id: 'crossref',
    label: 'Crossref',
    async search(statement, ctx) {
      const url = new URL('https://api.crossref.org/works');
      url.searchParams.set('query.bibliographic', statement.query);
      url.searchParams.set('rows', String(ctx.limit));
      if (options.mailto) {
        url.searchParams.set('mailto', options.mailto);
      }
      const payload = await fetchJson(ctx.fetch, url);
      return (payload.message?.items ?? []).map((item) => {
        const title = String(item.title?.[0] ?? '');
        const exact = containsPhrase(title, statement.query);
        const similarity = tokenSimilarity(title, statement.query);
        return buildMatch({
          sourceId: 'crossref',
          sourceLabel: 'Crossref',
          title,
          url: item.URL ?? doiUrl(item.DOI),
          snippet: item['container-title']?.[0] ?? item.DOI ?? '',
          score: exact ? 0.86 : similarity * 0.68,
          matchKind: exact ? 'exact-title' : 'bibliographic-match',
          query: statement.query,
        });
      });
    },
  };
}

export function createDuckDuckGoUniquenessSource() {
  return {
    id: 'duckduckgo',
    label: 'DuckDuckGo Instant Answer',
    async search(statement, ctx) {
      const url = new URL('https://api.duckduckgo.com/');
      url.searchParams.set('q', quoteQuery(statement.query));
      url.searchParams.set('format', 'json');
      url.searchParams.set('no_redirect', '1');
      url.searchParams.set('no_html', '1');
      url.searchParams.set('skip_disambig', '1');
      const payload = await fetchJson(ctx.fetch, url);
      const candidates = [
        {
          title: payload.Heading,
          snippet: payload.AbstractText,
          url: payload.AbstractURL,
        },
        ...flattenRelatedTopics(payload.RelatedTopics ?? []),
      ].filter((entry) => entry.title || entry.snippet);
      return candidates.slice(0, ctx.limit).map((entry) => {
        const text = `${entry.title ?? ''} ${entry.snippet ?? ''}`;
        const exact = containsPhrase(text, statement.query);
        const similarity = tokenSimilarity(text, statement.query);
        return buildMatch({
          sourceId: 'duckduckgo',
          sourceLabel: 'DuckDuckGo Instant Answer',
          title: entry.title ?? entry.snippet,
          url: entry.url,
          snippet: entry.snippet ?? '',
          score: exact ? 0.78 : similarity * 0.62,
          matchKind: exact ? 'instant-answer-exact' : 'instant-answer',
          query: statement.query,
        });
      });
    },
  };
}

export async function searchTextUniqueness(input, options = {}) {
  const text = String(input ?? '');
  const detected = detectStatements(text, options);
  const sources = options.sources ?? createDefaultUniquenessSources(options);
  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
  const limit = clampInteger(options.limit ?? defaultLimit, 1, 10);
  const now = normalizeNow(options.now);
  const exclusions = collectExclusions(text, options);

  const statements = [];
  for (const [index, statement] of detected.entries()) {
    statements.push(
      await searchStatementUniqueness(statement, index, {
        exclusions,
        fetch: fetchImpl,
        limit,
        now,
        sources,
      })
    );
  }

  return buildUniquenessResult(text, statements, exclusions, now);
}

async function searchStatementUniqueness(statement, index, ctx) {
  const query = normalizeStatementQuery(statement.text);
  const sourceResults = await Promise.all(
    ctx.sources.map((source) =>
      searchSource(source, { ...statement, query }, ctx)
    )
  );
  const matches = sourceResults
    .flatMap((result) => result.matches)
    .map((match) => applyMatchExclusion(match, statement, ctx.exclusions))
    .sort((a, b) => b.score - a.score);
  const exclusions = ctx.exclusions.filter((exclusion) =>
    rangesOverlap(
      statement.start,
      statement.end,
      exclusion.span.start,
      exclusion.span.end
    )
  );
  const sourceErrors = sourceResults
    .filter((result) => result.error)
    .map(({ sourceId, sourceLabel, error }) => ({
      sourceId,
      sourceLabel,
      error,
    }));
  const existingLikelihood = combineLikelihoods(
    matches.map((match) => match.score)
  );
  const uniqueness = clamp(1 - existingLikelihood, 0, 1);
  return {
    id: `statement-${index + 1}`,
    text: statement.text,
    start: statement.start,
    end: statement.end,
    query,
    existingLikelihood,
    uniqueness,
    suggestedAction: suggestedAction(existingLikelihood),
    matches,
    exclusions,
    sourceErrors,
    checkedAt: ctx.now,
    color: colorForUniqueness(uniqueness),
  };
}

async function searchSource(source, statement, ctx) {
  try {
    if (!ctx.fetch) {
      throw new Error('fetch is not available in this runtime');
    }
    const matches = await source.search(statement, ctx);
    return {
      sourceId: source.id,
      sourceLabel: source.label,
      matches: (matches ?? [])
        .filter(Boolean)
        .map((match) => normalizeSearchMatch(match, statement, source))
        .filter((match) => match.score > 0),
    };
  } catch (error) {
    return {
      sourceId: source.id,
      sourceLabel: source.label,
      matches: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildUniquenessResult(text, statements, exclusions, checkedAt) {
  const summary = summarizeStatements(statements);
  const originalityReport = buildOriginalityReport(
    text,
    statements,
    summary,
    exclusions,
    checkedAt
  );
  return {
    status: 'checked',
    text,
    existingLikelihood: summary.averageExistingLikelihood,
    uniqueness: summary.averageUniqueness,
    summary,
    statements,
    originalityReport,
    html: renderUniquenessHtml(text, statements),
    markdown: renderUniquenessMarkdown(statements, summary),
    linksNotation: renderUniquenessLino(text, statements, summary),
  };
}

function summarizeStatements(statements) {
  const total = statements.length;
  const cited = statements.filter(
    (statement) => statement.suggestedAction === 'cite-or-quote'
  ).length;
  const review = statements.filter(
    (statement) => statement.suggestedAction === 'review-matches'
  ).length;
  const original = statements.filter(
    (statement) => statement.suggestedAction === 'likely-original'
  ).length;
  const averageExistingLikelihood =
    total === 0
      ? null
      : statements.reduce((sum, item) => sum + item.existingLikelihood, 0) /
        total;
  return {
    total,
    citeOrQuote: cited,
    reviewMatches: review,
    likelyOriginal: original,
    averageExistingLikelihood,
    averageUniqueness:
      averageExistingLikelihood === null ? null : 1 - averageExistingLikelihood,
  };
}

function renderUniquenessHtml(text, statements) {
  let cursor = 0;
  let html = '';
  for (const statement of statements) {
    html += escapeHtml(text.slice(cursor, statement.start));
    html += renderStatementSpan(statement);
    cursor = statement.end;
  }
  return html + escapeHtml(text.slice(cursor));
}

function renderStatementSpan(statement) {
  const style = [
    `--uniqueness-hue: ${statement.color.hue}`,
    `--uniqueness-foreground: ${statement.color.foreground}`,
    `--uniqueness-background: ${statement.color.background}`,
    `--uniqueness-border: ${statement.color.border}`,
  ].join('; ');
  return `<span class="uniqueness-statement" data-existing-likelihood="${dataValue(
    statement.existingLikelihood
  )}" data-uniqueness="${dataValue(statement.uniqueness)}" style="${style}">${escapeHtml(
    statement.text
  )}</span>`;
}

function renderUniquenessMarkdown(statements, summary) {
  const lines = [
    `Checked ${summary.total} statement${summary.total === 1 ? '' : 's'} for uniqueness.`,
    '',
  ];
  for (const statement of statements) {
    lines.push(
      `- ${formatPercent(statement.existingLikelihood)} existing / ${formatPercent(
        statement.uniqueness
      )} unique [${statement.suggestedAction}]: ${statement.text}`
    );
    for (const match of statement.matches.slice(0, 3)) {
      const excluded = match.excluded
        ? `, excluded: ${match.exclusion.reason}`
        : '';
      lines.push(
        `  - ${match.sourceLabel} (${match.matchKind}, ${formatPercent(
          match.score
        )}${excluded}): ${match.title}${
          match.sourceUrl ? ` - ${match.sourceUrl}` : ''
        }`
      );
    }
  }
  return `${lines.join('\n')}\n`;
}

function renderUniquenessLino(text, statements, summary) {
  return serializeLino(
    {
      text,
      summary,
      statements: statements.map((statement) => ({
        id: statement.id,
        text: statement.text,
        start: statement.start,
        end: statement.end,
        query: statement.query,
        existingLikelihood: statement.existingLikelihood,
        uniqueness: statement.uniqueness,
        suggestedAction: statement.suggestedAction,
        matches: statement.matches.map((match) => ({
          sourceId: match.sourceId,
          sourceLabel: match.sourceLabel,
          title: match.title,
          url: match.url,
          sourceUrl: match.sourceUrl,
          score: match.score,
          matchStrength: match.matchStrength,
          matchKind: match.matchKind,
          inputSpan: match.inputSpan,
          sourceSpan: match.sourceSpan,
          excluded: match.excluded,
          exclusion: match.exclusion,
        })),
      })),
    },
    { rootIdentifier: 'uniqueness' }
  );
}

function buildMatch({
  sourceId,
  sourceLabel,
  title,
  url,
  snippet,
  score,
  matchKind,
  sourceText,
  sourceSpan,
  query,
}) {
  const normalizedScore = clamp(Number(score), 0, 1);
  const normalizedTitle = normalizeWhitespace(title);
  const normalizedSnippet = normalizeWhitespace(snippet);
  const normalizedSourceText = normalizeWhitespace(
    sourceText ?? (normalizedSnippet || normalizedTitle)
  );
  return {
    sourceId,
    sourceLabel,
    title: normalizedTitle,
    url: url || null,
    sourceUrl: url || null,
    snippet: normalizedSnippet,
    sourceText: normalizedSourceText,
    sourceSpan: normalizeSourceSpan(sourceSpan, normalizedSourceText, query),
    score: normalizedScore,
    matchStrength: normalizedScore,
    matchKind,
  };
}

function normalizeSearchMatch(match, statement, source) {
  const url = match.url ?? match.sourceUrl ?? null;
  const title = normalizeWhitespace(match.title);
  const snippet = normalizeWhitespace(match.snippet);
  const sourceText = normalizeWhitespace(
    match.sourceText ?? (snippet || title)
  );
  const score = clamp(
    Number(match.score ?? match.matchStrength ?? match.strength ?? 0),
    0,
    1
  );
  return {
    ...match,
    sourceId: String(match.sourceId ?? source.id),
    sourceLabel: String(match.sourceLabel ?? source.label),
    title,
    url,
    sourceUrl: url,
    snippet,
    sourceText,
    sourceSpan: normalizeSourceSpan(
      match.sourceSpan,
      sourceText,
      statement.query
    ),
    score,
    matchStrength: score,
    matchKind: String(match.matchKind ?? 'source-match'),
    inputSpan: normalizeInputSpan(match.inputSpan, statement),
    excluded: false,
    exclusion: null,
  };
}

function normalizeInputSpan(span, statement) {
  if (
    span &&
    Number.isFinite(Number(span.start)) &&
    Number.isFinite(Number(span.end))
  ) {
    const start = Number(span.start);
    const end = Number(span.end);
    return {
      start,
      end,
      text: String(span.text ?? statement.text),
    };
  }
  return {
    start: statement.start,
    end: statement.end,
    text: statement.text,
  };
}

function normalizeSourceSpan(span, sourceText, query) {
  if (
    span &&
    Number.isFinite(Number(span.start)) &&
    Number.isFinite(Number(span.end))
  ) {
    const start = Number(span.start);
    const end = Number(span.end);
    return {
      start,
      end,
      text: String(span.text ?? sourceText.slice(start, end)),
    };
  }
  return inferSourceSpan(sourceText, query);
}

function inferSourceSpan(sourceText, query) {
  const text = String(sourceText ?? '');
  if (!text) {
    return null;
  }
  const needle = normalizeWhitespace(query);
  if (needle) {
    const index = text.toLowerCase().indexOf(needle.toLowerCase());
    if (index >= 0) {
      return {
        start: index,
        end: index + needle.length,
        text: text.slice(index, index + needle.length),
      };
    }
  }
  const end = Math.min(text.length, 240);
  return {
    start: 0,
    end,
    text: text.slice(0, end),
  };
}

function applyMatchExclusion(match, statement, exclusions) {
  const exclusion = exclusions.find((candidate) =>
    rangesOverlap(
      statement.start,
      statement.end,
      candidate.span.start,
      candidate.span.end
    )
  );
  return {
    ...match,
    excluded: Boolean(exclusion),
    exclusion: exclusion ? summarizeExclusion(exclusion) : null,
  };
}

function buildOriginalityReport(
  text,
  statements,
  summary,
  exclusions,
  checkedAt
) {
  const matches = [];
  for (const statement of statements) {
    for (const match of statement.matches) {
      matches.push({
        id: `match-${matches.length + 1}`,
        statementId: statement.id,
        statementText: statement.text,
        sourceId: match.sourceId,
        sourceLabel: match.sourceLabel,
        sourceTitle: match.title,
        sourceUrl: match.sourceUrl,
        matchKind: match.matchKind,
        score: match.score,
        strength: match.matchStrength,
        matchStrength: match.matchStrength,
        inputSpan: match.inputSpan,
        sourceSpan: match.sourceSpan,
        excluded: match.excluded,
        exclusion: match.exclusion,
      });
    }
  }
  const scoredMatches = matches.filter((match) => !match.excluded);
  const overallExistingLikelihood = combineLikelihoods(
    scoredMatches.map((match) => match.strength)
  );
  return {
    kind: 'document-originality-report',
    checkedAt,
    document: {
      textLength: text.length,
      statementCount: statements.length,
    },
    overallExistingLikelihood,
    overallUniqueness: clamp(1 - overallExistingLikelihood, 0, 1),
    averageExistingLikelihood: summary.averageExistingLikelihood,
    averageUniqueness: summary.averageUniqueness,
    scoredMatchCount: scoredMatches.length,
    excludedMatchCount: matches.length - scoredMatches.length,
    matchedSources: summarizeMatchedSources(matches),
    matches,
    exclusions: exclusions.map(summarizeExclusion),
  };
}

function summarizeMatchedSources(matches) {
  const bySource = new Map();
  for (const match of matches) {
    const key = [match.sourceId, match.sourceUrl, match.sourceTitle].join('|');
    if (!bySource.has(key)) {
      bySource.set(key, {
        sourceId: match.sourceId,
        sourceLabel: match.sourceLabel,
        sourceTitle: match.sourceTitle,
        sourceUrl: match.sourceUrl,
        matchCount: 0,
        excludedMatchCount: 0,
        strongestMatch: 0,
        averageStrength: 0,
      });
    }
    const source = bySource.get(key);
    source.matchCount += 1;
    if (match.excluded) {
      source.excludedMatchCount += 1;
    }
    source.strongestMatch = Math.max(source.strongestMatch, match.strength);
    source.averageStrength += match.strength;
  }
  return [...bySource.values()].map((source) => ({
    ...source,
    averageStrength:
      source.matchCount === 0 ? 0 : source.averageStrength / source.matchCount,
  }));
}

function collectExclusions(text, options) {
  const configured = Array.isArray(options.exclusions)
    ? options.exclusions.map((exclusion, index) =>
        normalizeConfiguredExclusion(exclusion, index, text)
      )
    : [];
  const quoted =
    options.excludeQuotedText === false ? [] : detectQuotedExclusionSpans(text);
  const references =
    options.excludeReferences === false
      ? []
      : detectReferenceExclusionSpans(text);
  return [...configured, ...quoted, ...references].filter(Boolean);
}

function normalizeConfiguredExclusion(exclusion, index, text) {
  const span = normalizeConfiguredExclusionSpan(exclusion, text);
  if (!span) {
    return null;
  }
  return {
    id: String(exclusion.id ?? `configured-exclusion-${index + 1}`),
    ruleId: String(exclusion.ruleId ?? 'configured-exclusion'),
    reason: String(exclusion.reason ?? 'Configured text exclusion.'),
    span,
  };
}

function normalizeConfiguredExclusionSpan(exclusion, text) {
  const start = Number(exclusion?.start ?? exclusion?.span?.start);
  const end = Number(exclusion?.end ?? exclusion?.span?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return {
    start,
    end,
    text: String(
      exclusion.text ?? exclusion.span?.text ?? text.slice(start, end)
    ),
  };
}

function detectQuotedExclusionSpans(text) {
  const exclusions = [];
  let quoteStart = -1;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '"') {
      continue;
    }
    if (quoteStart === -1) {
      quoteStart = index + 1;
      continue;
    }
    const spanText = text.slice(quoteStart, index);
    if (spanText.trim()) {
      exclusions.push({
        id: `quoted-text-${exclusions.length + 1}`,
        ruleId: 'quoted-text',
        reason:
          'Quoted text is reported but excluded from document originality scoring.',
        span: {
          start: quoteStart,
          end: index,
          text: spanText,
        },
      });
    }
    quoteStart = -1;
  }
  return exclusions;
}

function detectReferenceExclusionSpans(text) {
  const match =
    /(^|\n)\s*(references|bibliography|works cited)\s*:?\s*(\n|$)/iu.exec(text);
  if (!match) {
    return [];
  }
  const start = match.index + match[0].length;
  if (start >= text.length) {
    return [];
  }
  return [
    {
      id: 'references-section-1',
      ruleId: 'references-section',
      reason:
        'Reference-list text is reported but excluded from document originality scoring.',
      span: {
        start,
        end: text.length,
        text: text.slice(start),
      },
    },
  ];
}

function summarizeExclusion(exclusion) {
  return {
    id: exclusion.id,
    ruleId: exclusion.ruleId,
    reason: exclusion.reason,
    span: exclusion.span,
  };
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(String(url), {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function normalizeStatementQuery(text) {
  return String(text ?? '')
    .replace(/^[\s"'`]+|[\s"'`]+$/g, '')
    .replace(/[.!?]+$/u, '')
    .trim();
}

function normalizeComparable(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function containsPhrase(haystack, needle) {
  const normalizedHaystack = normalizeComparable(haystack);
  const normalizedNeedle = normalizeComparable(needle);
  return Boolean(
    normalizedNeedle && normalizedHaystack.includes(normalizedNeedle)
  );
}

function tokenSimilarity(a, b) {
  const left = new Set(normalizeComparable(a).split(' ').filter(Boolean));
  const right = new Set(normalizeComparable(b).split(' ').filter(Boolean));
  if (!left.size || !right.size) {
    return 0;
  }
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) {
      intersection += 1;
    }
  }
  return intersection / Math.max(left.size, right.size);
}

function combineLikelihoods(scores) {
  if (!scores.length) {
    return 0;
  }
  return clamp(
    1 - scores.reduce((remaining, score) => remaining * (1 - score), 1),
    0,
    0.99
  );
}

function suggestedAction(existingLikelihood) {
  if (existingLikelihood >= citeThreshold) {
    return 'cite-or-quote';
  }
  if (existingLikelihood >= reviewThreshold) {
    return 'review-matches';
  }
  return 'likely-original';
}

function colorForUniqueness(uniqueness) {
  const hue = Math.round(clamp(uniqueness, 0, 1) * 120);
  return {
    hue,
    foreground: `hsl(${hue} 72% 22%)`,
    background: `hsl(${hue} 82% 90%)`,
    border: `hsl(${hue} 62% 44%)`,
  };
}

function flattenRelatedTopics(topics) {
  const entries = [];
  for (const topic of topics) {
    if (Array.isArray(topic.Topics)) {
      entries.push(...flattenRelatedTopics(topic.Topics));
      continue;
    }
    entries.push({
      title: topic.Text,
      snippet: topic.Text,
      url: topic.FirstURL,
    });
  }
  return entries;
}

function wikipediaPageUrl(language, entry) {
  if (entry.pageid) {
    return `https://${language}.wikipedia.org/?curid=${entry.pageid}`;
  }
  if (entry.title) {
    return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(
      entry.title.replace(/\s+/g, '_')
    )}`;
  }
  return null;
}

function doiUrl(doi) {
  return doi ? `https://doi.org/${doi}` : null;
}

function quoteQuery(value) {
  return `"${String(value ?? '').replace(/"/g, '\\"')}"`;
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNow(now) {
  const value = typeof now === 'function' ? now() : new Date();
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return value instanceof Date ? value.toISOString() : new Date().toISOString();
}

function formatPercent(value) {
  return value === null ? 'unknown' : `${Math.round(value * 100)}%`;
}

function dataValue(value) {
  return String(Number(value.toFixed(6)));
}

function clampInteger(value, min, max) {
  const parsed = Number(value);
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : min));
}

function rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
