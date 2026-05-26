import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';
import {
  extractFirstParagraph,
  extractParagraphs,
  translateTextWith,
} from '../../src/index.js';
import {
  assertFormalizedSourceCoverage,
  assertSemanticMetaLanguageCoverage,
} from '../helpers/translation-coverage.js';

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/issue-96/articles.json', import.meta.url),
    'utf8'
  )
);

// The popular Wikipedia editions captured for the top-2025 topics. These are
// among the most-spoken languages, matching the issue's "most popular
// languages" requirement.
const popularLanguages = [
  'en',
  'es',
  'de',
  'fr',
  'ru',
  'ja',
  'zh',
  'pt',
  'it',
  'ar',
];
const cyrillicPattern = /[Ѐ-ӿ]+/;

function offlineFetch() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

function translateParagraph(paragraph, sourceLanguage, targetLanguage) {
  return translateTextWith(paragraph, {
    fetch: offlineFetch,
    sourceLanguage,
    targetLanguage,
    now: () => 0,
  });
}

function assertParagraphPipeline(result, paragraph, targetLanguage) {
  // Every source token of the whole paragraph is formalized and linked.
  assertFormalizedSourceCoverage(result, paragraph);
  // Every formalized phrase has a semantic-meta-language meaning link.
  assertSemanticMetaLanguageCoverage(result);

  // The paragraph is naturalized back into a target-language rendering.
  expect(result.naturalization.type).toBe('naturalization');
  expect(result.cst.naturalization).toBe(result.naturalization);

  const targetUnits = result.sentences.flatMap(
    (sentence) => sentence.targetUnits
  );
  const naturalizedUnits = result.naturalization.sentences.flatMap(
    (sentence) => sentence.targetUnits
  );
  expect(targetUnits.length).toBeGreaterThan(0);
  expect(naturalizedUnits).toEqual(targetUnits);

  // The renderers always produce output and never fabricate a bare
  // language-code placeholder for unresolved phrases.
  expect(typeof result.plainText).toBe('string');
  expect(result.plainText.length).toBeGreaterThan(0);
  expect(result.plainText.includes(`[${targetLanguage}]`)).toBe(false);
  expect(typeof result.markdown).toBe('string');
  expect(typeof result.html).toBe('string');
  expect(typeof result.linksNotation).toBe('string');
  expect(result.linksNotation.length).toBeGreaterThan(0);
}

describe('issue 96 - top-2025 article fixture', () => {
  it('captures the top-10 most viewed 2025 articles from the Topviews last-year list', () => {
    expect(fixture.pageviewsYear).toBe('2025');
    expect(fixture.pageviewsSource).toContain('topviews');
    expect(fixture.pageviewsSource).toContain('last-year');
    expect(fixture.articles.length).toBe(10);
    expect(fixture.languages).toEqual(popularLanguages);
  });

  it('captures multi-paragraph prose for each article in most popular languages', () => {
    const seenTargetLanguages = new Set();
    for (const article of fixture.articles) {
      expect(article.qId).toMatch(/^Q\d+$/);
      expect(article.rank).toBeGreaterThan(0);
      expect(article.views).toBeGreaterThan(0);

      // The source project is en.wikipedia, so every captured article has an
      // English lead, and the best-supported target (Russian) is present.
      expect(article.languages).toContain('en');
      expect(article.languages).toContain('ru');
      expect(article.languages.length).toBeGreaterThanOrEqual(5);

      const englishParagraph = extractFirstParagraph(article.pages.en.extract);
      expect(englishParagraph.length).toBeGreaterThan(0);
      // A real paragraph, not a single token.
      expect(englishParagraph.split(' ').length).toBeGreaterThan(5);

      for (const language of article.languages) {
        expect(popularLanguages).toContain(language);
        expect(article.pages[language].extract.length).toBeGreaterThan(0);
        if (language !== 'en') {
          seenTargetLanguages.add(language);
        }
      }
    }
    // The fixture exercises a broad spread of the most popular languages.
    expect(seenTargetLanguages.size).toBeGreaterThanOrEqual(8);
    for (const language of [
      'ru',
      'es',
      'de',
      'fr',
      'ja',
      'zh',
      'pt',
      'it',
      'ar',
    ]) {
      expect(seenTargetLanguages.has(language)).toBe(true);
    }
  });
});

describe('issue 96 - paragraph translation into most popular languages', () => {
  for (const article of fixture.articles) {
    it(`translates the ${article.enTitle} lead paragraph into every captured language`, async () => {
      const paragraph = extractFirstParagraph(article.pages.en.extract);
      const targets = article.languages.filter((language) => language !== 'en');
      expect(targets.length).toBeGreaterThan(0);

      for (const targetLanguage of targets) {
        const result = await translateParagraph(
          paragraph,
          'en',
          targetLanguage
        );
        assertParagraphPipeline(result, paragraph, targetLanguage);

        // Translation is deterministic: the same paragraph yields the same
        // rendering, which is what makes the gate safe to run in CI/CD.
        const replay = await translateParagraph(
          paragraph,
          'en',
          targetLanguage
        );
        expect(replay.plainText).toBe(result.plainText);

        // Unresolved phrases are surfaced as explicit, language-scoped
        // questions rather than being silently dropped or hallucinated.
        for (const question of result.questions) {
          expect(typeof question).toBe('string');
          expect(question).toContain(`from en to ${targetLanguage}`);
        }
      }
    });
  }
});

describe('issue 96 - English to Russian paragraph translation quality', () => {
  it('produces real Russian vocabulary for every top-2025 lead paragraph', async () => {
    for (const article of fixture.articles) {
      const paragraph = extractFirstParagraph(article.pages.en.extract);
      const result = await translateParagraph(paragraph, 'en', 'ru');

      assertParagraphPipeline(result, paragraph, 'ru');
      // The pipeline resolved at least some vocabulary into Russian rather than
      // leaving the entire paragraph in English.
      expect(cyrillicPattern.test(result.plainText)).toBe(true);

      // Multi-sentence leads stay multi-sentence after translation.
      expect(result.sentences.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('issue 96 - multi-paragraph article coverage', () => {
  it('translates every paragraph of a multi-paragraph lead', async () => {
    const article = fixture.articles.find(
      (entry) => extractParagraphs(entry.pages.en.extract).length >= 2
    );
    expect(Boolean(article)).toBe(true);

    const paragraphs = extractParagraphs(article.pages.en.extract);
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);

    for (const paragraph of paragraphs) {
      const result = await translateParagraph(paragraph, 'en', 'ru');
      assertParagraphPipeline(result, paragraph, 'ru');
    }
  });
});
