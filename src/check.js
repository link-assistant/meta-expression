import { analyzeStatement, analyzeStatementWithLiveEvidence } from './index.js';
import { serializeLino } from './lino.js';

const defaultLocale = 'en';
const wrongThreshold = 1 / 3;
const correctThreshold = 2 / 3;

export function checkText(input, options = {}) {
  const text = String(input ?? '');
  const statements = analyzeDetectedStatements(text, options);
  return buildCheckResult(text, statements);
}

export async function checkTextWithLiveEvidence(input, options = {}) {
  const text = String(input ?? '');
  const detected = detectStatements(text, options);
  const statements = [];
  for (const [index, statement] of detected.entries()) {
    const analysis = await analyzeStatementWithLiveEvidence(
      normalizeAnalysisInput(statement.text),
      checkAnalysisOptions(options, 'check-live')
    );
    statements.push(statementFromAnalysis(statement, analysis, index));
  }
  return buildCheckResult(text, statements);
}

export function detectStatements(input, options = {}) {
  const text = String(input ?? '');
  const intlSegments = segmentWithIntl(text, options.locale ?? defaultLocale);
  const segments = intlSegments.length ? intlSegments : fallbackSegments(text);
  const statements = segments
    .map((segment) => trimSegment(text, segment.start, segment.end))
    .filter((segment) => segment.text && hasStatementContent(segment.text));

  if (statements.length === 0 && text.trim()) {
    return [trimSegment(text, 0, text.length)];
  }

  return statements;
}

export function colorForCorrectness(correctness) {
  const value =
    typeof correctness === 'number' && Number.isFinite(correctness)
      ? clamp(correctness, 0, 1)
      : 0.5;
  const hue = Math.round(value * 120);
  return {
    hue,
    foreground: `hsl(${hue} 72% 22%)`,
    background: `hsl(${hue} 82% 90%)`,
    border: `hsl(${hue} 62% 44%)`,
  };
}

function analyzeDetectedStatements(text, options) {
  return detectStatements(text, options).map((statement, index) => {
    const analysis = analyzeStatement(
      normalizeAnalysisInput(statement.text),
      checkAnalysisOptions(options, 'check')
    );
    return statementFromAnalysis(statement, analysis, index);
  });
}

function checkAnalysisOptions(options, selectedBy) {
  const { analyze, analyzer, live, locale, ...analysisOptions } = options ?? {};
  void analyze;
  void analyzer;
  void live;
  void locale;
  return {
    ...analysisOptions,
    selectedBy: analysisOptions.selectedBy ?? selectedBy,
  };
}

function statementFromAnalysis(statement, analysis, index) {
  const correctness = normalizedCorrectness(analysis.result.correctness);
  const wrongness = correctness === null ? null : clamp(1 - correctness, 0, 1);
  return {
    id: `statement-${index + 1}`,
    text: statement.text,
    start: statement.start,
    end: statement.end,
    analysisInput: normalizeAnalysisInput(statement.text),
    correctness,
    wrongness,
    color: colorForCorrectness(correctness),
    result: {
      kind: analysis.result.kind,
      value: analysis.result.value,
      explanation: analysis.result.explanation,
    },
    analysis,
  };
}

function buildCheckResult(text, statements) {
  const summary = summarizeStatements(statements);
  return {
    status: 'checked',
    text,
    summary,
    statements,
    html: renderCheckHtml(text, statements),
    markdown: renderCheckMarkdown(statements, summary),
    linksNotation: renderCheckLino(text, statements, summary),
  };
}

function summarizeStatements(statements) {
  const known = statements.filter(
    (statement) => statement.correctness !== null
  );
  const correct = statements.filter(
    (statement) => statement.correctness >= correctThreshold
  ).length;
  const wrong = statements.filter(
    (statement) =>
      statement.correctness !== null && statement.correctness <= wrongThreshold
  ).length;
  const uncertain = statements.length - correct - wrong;
  const averageCorrectness =
    known.length === 0
      ? null
      : known.reduce((sum, item) => sum + item.correctness, 0) / known.length;
  return {
    total: statements.length,
    correct,
    wrong,
    uncertain,
    averageCorrectness,
    averageWrongness:
      averageCorrectness === null ? null : clamp(1 - averageCorrectness, 0, 1),
  };
}

function renderCheckHtml(text, statements) {
  let cursor = 0;
  let html = '';
  for (const statement of statements) {
    html += escapeHtml(text.slice(cursor, statement.start));
    html += renderStatementSpan(statement);
    cursor = statement.end;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}

function renderStatementSpan(statement) {
  const correctness = dataValue(statement.correctness);
  const wrongness = dataValue(statement.wrongness);
  const style = [
    `--check-hue: ${statement.color.hue}`,
    `--check-foreground: ${statement.color.foreground}`,
    `--check-background: ${statement.color.background}`,
    `--check-border: ${statement.color.border}`,
  ].join('; ');
  return `<span class="check-statement" data-check-statement="true" data-correctness="${correctness}" data-wrongness="${wrongness}" style="${style}">${escapeHtml(statement.text)}</span>`;
}

function renderCheckMarkdown(statements, summary) {
  const lines = [
    `Checked ${summary.total} statement${summary.total === 1 ? '' : 's'}.`,
    '',
  ];
  for (const statement of statements) {
    lines.push(
      `- ${formatPercent(statement.correctness)} correct / ${formatPercent(
        statement.wrongness
      )} wrong: ${statement.text}`
    );
  }
  return `${lines.join('\n')}\n`;
}

function renderCheckLino(text, statements, summary) {
  return serializeLino(
    {
      text,
      summary,
      statements: statements.map((statement) => ({
        id: statement.id,
        text: statement.text,
        start: statement.start,
        end: statement.end,
        correctness: statement.correctness,
        wrongness: statement.wrongness,
        hue: statement.color.hue,
        result: statement.result.value,
        explanation: statement.result.explanation,
      })),
    },
    { rootIdentifier: 'check' }
  );
}

function segmentWithIntl(text, locale) {
  const Segmenter = globalThis.Intl?.Segmenter;
  if (!Segmenter) {
    return [];
  }
  try {
    const segmenter = new Segmenter(locale, { granularity: 'sentence' });
    return [...segmenter.segment(text)].map((segment) => ({
      start: segment.index,
      end: segment.index + segment.segment.length,
    }));
  } catch {
    return [];
  }
}

function fallbackSegments(text) {
  const segments = [];
  const pattern = /[^\s.!?\n][^.!?\n]*(?:[.!?]+|(?=\n|$))/gu;
  for (const match of text.matchAll(pattern)) {
    segments.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return segments;
}

function trimSegment(source, start, end) {
  const raw = source.slice(start, end);
  const lead = raw.match(/^\s*/u)?.[0].length ?? 0;
  const trail = raw.match(/\s*$/u)?.[0].length ?? 0;
  return {
    text: raw.slice(lead, raw.length - trail),
    start: start + lead,
    end: end - trail,
  };
}

function hasStatementContent(text) {
  return /[\p{Letter}\p{Number}]/u.test(text);
}

function normalizeAnalysisInput(text) {
  return text.replace(/[.!?]+$/u, '').trim() || text.trim();
}

function normalizedCorrectness(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, 0, 1)
    : null;
}

function formatPercent(value) {
  return value === null ? 'unknown' : `${Math.round(value * 100)}%`;
}

function dataValue(value) {
  return value === null ? 'unknown' : String(Number(value.toFixed(6)));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
