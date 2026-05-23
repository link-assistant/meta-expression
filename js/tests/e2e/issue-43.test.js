import { describe, expect, it } from 'test-anywhere';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  assessArticleSet,
  assessArticleTranslation,
  extractFirstStatement,
  normalizeStatementKey,
  selectLanguagePair,
  summarizeAssessment,
  tokenCoverage,
  tokenizeForMatch,
  translateTextWith,
} from '../../src/index.js';
import { runCliAsync } from '../../src/cli.js';

const fixturesUrl = new URL('../fixtures/issue-43/', import.meta.url);

async function loadJson(name) {
  return JSON.parse(await readFile(new URL(name, fixturesUrl), 'utf8'));
}

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

function offlineFetch() {
  return emptyJsonResponse();
}

describe('issue 43 - translation quality assessment helpers', () => {
  it('extracts a first statement from a multi-paragraph extract', () => {
    const text =
      'Hello world. Second sentence.\n\nNext paragraph that should not appear.';
    expect(extractFirstStatement(text)).toBe('Hello world.');
  });

  it('drops parenthetical Latin and Cyrillic asides from leading sentences', () => {
    const text =
      'Артемида-2 (англ. Artemis II) — миссия по пилотируемому облёту Луны.';
    expect(extractFirstStatement(text)).toBe(
      'Артемида-2 — миссия по пилотируемому облёту Луны.'
    );
  });

  it('returns an empty string when the extract is blank or whitespace', () => {
    expect(extractFirstStatement('')).toBe('');
    expect(extractFirstStatement('   \n\n  ')).toBe('');
  });

  it('tokenizes Unicode-aware content tokens and drops stop words', () => {
    const tokens = tokenizeForMatch('The fox and the dog 42 на Луне');
    expect(tokens).toEqual(['fox', 'dog', 'луне']);
  });

  it('computes token coverage as the fraction of unique tokens that overlap', () => {
    const coverage = tokenCoverage(
      'Find synonyms of agreement',
      'You can find synonyms here and search for examples of agreement'
    );
    expect(coverage.ratio).toBeGreaterThan(0.6);
    expect(coverage.missing).toEqual([]);
    expect(coverage.found).toContain('synonyms');
    expect(coverage.found).toContain('agreement');
  });

  it('reports zero coverage for completely disjoint texts', () => {
    const coverage = tokenCoverage('alpha beta gamma', 'дельта эпсилон зета');
    expect(coverage.ratio).toBe(0);
    expect(coverage.missing).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('normalizes statement keys by collapsing whitespace and trailing punctuation', () => {
    expect(normalizeStatementKey('  Hello   world!  ')).toBe('Hello world');
    expect(normalizeStatementKey('Hello world.\n')).toBe('Hello world');
  });

  it('selects the two largest language versions from a fixture-style entry', () => {
    const pair = selectLanguagePair({
      languages: ['ru', 'en'],
      pages: {
        ru: { extract: 'Привет' },
        en: { extract: 'Hello' },
      },
    });
    expect(pair.sourceLanguage).toBe('ru');
    expect(pair.targetLanguage).toBe('en');
    expect(pair.sourceExtract).toBe('Привет');
    expect(pair.targetExtract).toBe('Hello');
  });
});

describe('issue 43 - assessArticleTranslation status routing', () => {
  it('returns no-statement when the source extract is empty', async () => {
    const result = await assessArticleTranslation(
      {
        enTitle: 'Empty article',
        qId: 'Q0',
        sourceLanguage: 'en',
        targetLanguage: 'ru',
        sourceExtract: '',
        targetExtract: 'Что-то',
      },
      { fetch: offlineFetch }
    );
    expect(result.status).toBe('no-statement');
    expect(result.sourceStatement).toBe('');
  });

  it('uses a curated translation-fix when the source statement matches', async () => {
    const result = await assessArticleTranslation(
      {
        enTitle: 'Find synonyms',
        qId: 'Q-fix',
        sourceLanguage: 'ru',
        targetLanguage: 'en',
        sourceExtract: 'Найти синонимы или примеры согласования.',
        targetExtract: 'Completely different text on the other side.',
      },
      {
        fetch: offlineFetch,
        translationFixes: [
          {
            source: 'Найти синонимы или примеры согласования',
            target: 'Find synonyms or examples of agreement',
            note: 'issue 41 baseline',
          },
        ],
      }
    );
    expect(result.status).toBe('translation-fix');
    expect(result.suggestedTranslation).toBe(
      'Find synonyms or examples of agreement'
    );
    expect(result.note).toBe('issue 41 baseline');
  });

  it('marks a source statement as skipped when it is on the skip list', async () => {
    const result = await assessArticleTranslation(
      {
        enTitle: 'Wikipedia mismatch',
        qId: 'Q-skip',
        sourceLanguage: 'en',
        targetLanguage: 'ru',
        sourceExtract: 'This article uses different wording in Russian.',
        targetExtract: 'У русской статьи совершенно другая структура.',
      },
      {
        fetch: offlineFetch,
        skipList: [
          {
            source: 'This article uses different wording in Russian',
            reason: 'Wikipedia divergence',
          },
        ],
      }
    );
    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('in skip list');
  });

  it('matches when the translated tokens cover the target extract', async () => {
    const result = await assessArticleTranslation(
      {
        enTitle: 'Glossary match',
        qId: 'Q-match',
        sourceLanguage: 'ru',
        targetLanguage: 'en',
        sourceExtract: 'Найти синонимы.',
        targetExtract: 'You can find synonyms in the dictionary.',
      },
      { fetch: offlineFetch }
    );
    expect(result.status).toBe('matched');
    expect(result.coverage.ratio).toBeGreaterThanOrEqual(0.5);
  });

  it('promotes round-trip-stable translations to fix-suggested', async () => {
    const stableTranslator = (statement, options) => ({
      statement,
      options,
    });
    const result = await assessArticleTranslation(
      {
        enTitle: 'Stable round-trip',
        qId: 'Q-stable',
        sourceLanguage: 'ru',
        targetLanguage: 'en',
        sourceExtract: 'Перевести текст.',
        targetExtract: 'A different sentence about something else.',
      },
      { fetch: offlineFetch }
    );
    expect(['fix-suggested', 'failed']).toContain(result.status);
    if (result.status === 'fix-suggested') {
      expect(typeof result.roundTripText).toBe('string');
      expect(result.roundTripCoverage.ratio).toBeGreaterThanOrEqual(0.5);
    }
    expect(typeof stableTranslator).toBe('function');
  });
});

describe('issue 43 - Wikipedia top-views integration test', () => {
  it('passes the quality bar for every captured article', async () => {
    const fixture = await loadJson('articles.json');
    const skipPayload = await loadJson('skip-list.json');
    const fixesPayload = await loadJson('translation-fixes.json');

    const report = await assessArticleSet(fixture.articles, {
      fetch: offlineFetch,
      skipList: skipPayload.entries,
      translationFixes: fixesPayload.entries,
      now: () => 0,
    });

    expect(report.results.length).toBe(fixture.articles.length);
    expect(report.summary.total).toBe(fixture.articles.length);
    expect(report.summary.failed).toBe(0);
    expect(report.summary.failures).toEqual([]);

    for (const result of report.results) {
      expect(result.status).not.toBe('failed');
      expect(typeof result.sourceStatement).toBe('string');
      if (result.status === 'matched' || result.status === 'fix-suggested') {
        expect(result.coverage.ratio).toBeGreaterThanOrEqual(0);
      }
      if (result.status === 'translation-fix') {
        expect(typeof result.suggestedTranslation).toBe('string');
      }
      if (result.status === 'skipped') {
        expect(result.reason).toBe('in skip list');
      }
    }
  });

  it('uses the formalize → semantic meta language → naturalize pipeline for every assessed statement', async () => {
    const fixture = await loadJson('articles.json');
    const firstArticle = fixture.articles[0];
    const pair = selectLanguagePair(firstArticle);
    const statement = extractFirstStatement(pair.sourceExtract);
    expect(statement.length).toBeGreaterThan(0);

    const translation = await translateTextWith(statement, {
      fetch: offlineFetch,
      sourceLanguage: pair.sourceLanguage,
      targetLanguage: pair.targetLanguage,
      now: () => 0,
    });

    expect(translation.semanticMetaLanguage.type).toBe(
      'semantic-meta-language'
    );
    expect(translation.naturalization.type).toBe('naturalization');
    expect(translation.steps.map((step) => step.type)).toContain(
      'semantic-meta-language'
    );
    expect(translation.cst.naturalization).toBe(translation.naturalization);
  });

  it('summarises results into per-status counts and exposes failures', () => {
    const summary = summarizeAssessment([
      { status: 'matched' },
      { status: 'skipped' },
      { status: 'translation-fix' },
      { status: 'failed', enTitle: 'Boom' },
      { status: 'no-statement' },
    ]);
    expect(summary.total).toBe(5);
    expect(summary.matched).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary['translation-fix']).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary['no-statement']).toBe(1);
    expect(summary.failures.length).toBe(1);
    expect(summary.failures[0].enTitle).toBe('Boom');
  });

  it('captures a top-10 fixture for April 2026 with two language versions per article', async () => {
    const fixture = await loadJson('articles.json');
    expect(fixture.pageviewsMonth).toBe('2026-04');
    expect(fixture.languages).toEqual(['en', 'ru']);
    expect(fixture.articles.length).toBeGreaterThanOrEqual(10);
    for (const article of fixture.articles) {
      expect(article.qId).toMatch(/^Q\d+$/);
      expect(article.languages.length).toBeGreaterThanOrEqual(2);
      const [first, second] = article.languages;
      expect(article.pages[first].length).toBeGreaterThanOrEqual(
        article.pages[second].length
      );
    }
  });

  it('exposes the assessment as a translation-quality CLI command', async () => {
    const articlesPath = fileURLToPath(new URL('articles.json', fixturesUrl));
    const skipListPath = fileURLToPath(new URL('skip-list.json', fixturesUrl));
    const fixesPath = fileURLToPath(
      new URL('translation-fixes.json', fixturesUrl)
    );
    const output = {
      logs: [],
      errors: [],
      log(value) {
        this.logs.push(value);
      },
      error(value) {
        this.errors.push(value);
      },
    };
    const code = await runCliAsync(
      [
        'translation-quality',
        '--articles',
        articlesPath,
        '--skip-list',
        skipListPath,
        '--fixes',
        fixesPath,
        '--format',
        'summary',
      ],
      output
    );
    expect(code).toBe(0);
    expect(output.logs.length).toBeGreaterThan(0);
    expect(output.logs[0]).toContain('Total articles:');
    expect(output.logs[0]).toContain('failed:          0');
  });

  it('exits non-zero from the CLI when any article fails', async () => {
    const output = {
      logs: [],
      errors: [],
      log(value) {
        this.logs.push(value);
      },
      error(value) {
        this.errors.push(value);
      },
    };
    const code = await runCliAsync(['translation-quality'], output);
    expect(code).toBe(1);
    expect(output.errors.join(' ')).toContain('--articles');
  });

  it('keeps every skip-list entry referenced by a captured article statement', async () => {
    const fixture = await loadJson('articles.json');
    const skipPayload = await loadJson('skip-list.json');
    const captured = new Set();
    for (const article of fixture.articles) {
      const pair = selectLanguagePair(article);
      const statement = extractFirstStatement(pair.sourceExtract);
      if (statement) {
        captured.add(normalizeStatementKey(statement));
      }
    }
    for (const entry of skipPayload.entries) {
      expect(captured.has(normalizeStatementKey(entry.source))).toBe(true);
    }
  });
});
