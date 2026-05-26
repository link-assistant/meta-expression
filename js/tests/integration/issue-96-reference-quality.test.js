import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';
import {
  assessReferenceAlignment,
  extractFirstParagraph,
  translateTextWith,
} from '../../src/index.js';

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/issue-96/articles.json', import.meta.url),
    'utf8'
  )
);

// Only Cyrillic content tokens are scored, so untranslated English residue can
// never inflate the alignment against the human Russian reference.
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

function translateToRussian(paragraph) {
  return translateTextWith(paragraph, {
    fetch: offlineFetch,
    sourceLanguage: 'en',
    targetLanguage: 'ru',
    now: () => 0,
  });
}

// Distinctive content words that the machine translation must reproduce from
// the human-written Russian Wikipedia lead of each article. Every entry was
// confirmed to appear verbatim in the captured human reference, so this gate
// fails loudly if the glossary or pipeline stops producing real, human-attested
// Russian vocabulary. Each article is checked directly so topic regressions
// cannot hide behind aggregate improvements.
const requiredHumanMatches = {
  '.xxx': ['домен', 'верхнего', 'уровня', 'порнографических'],
  Charlie_Kirk: [
    'американский',
    'активист',
    'медийная',
    'фигура',
    'республиканской',
    'партии',
  ],
  ChatGPT: ['чат', 'бот'],
  Google_Chrome: ['браузер', 'разрабатываемый'],
  '1989_Tiananmen_Square_protests_and_massacre': [
    'протеста',
    'тяньаньмэнь',
    'студенты',
  ],
  Ed_Gein: ['американский', 'убийца', 'похититель', 'трупов'],
  Donald_Trump: ['политический', 'деятель', 'президент'],
  Zohran_Mamdani: ['политический', 'деятель', 'мэр'],
  Elon_Musk: ['предприниматель'],
  'XXX_(2002_film)': ['американский', 'боевик', 'режиссёром'],
};

describe('issue 96 - English to Russian paragraph translation vs human reference', () => {
  for (const article of fixture.articles) {
    const required = requiredHumanMatches[article.enTitle];
    if (!required) {
      continue;
    }
    it(`matches the human Russian lead of ${article.enTitle} on ${required.join(', ')}`, async () => {
      const human = article.pages.ru?.extract ?? '';
      expect(human.length).toBeGreaterThan(0);

      const paragraph = extractFirstParagraph(article.pages.en.extract);
      const result = await translateToRussian(paragraph);
      const alignment = assessReferenceAlignment(result.plainText, human, {
        script: cyrillicPattern,
      });

      // Every distinctive word the machine produced for this topic is a word a
      // human translator actually used in the published Russian article.
      for (const token of required) {
        expect(alignment.matched).toContain(token);
      }
    });
  }

  it('reproduces human-attested Russian vocabulary across the top-2025 corpus', async () => {
    let totalOverlap = 0;
    let totalMachineTokens = 0;
    let articlesWithMatch = 0;
    let articlesWithReference = 0;

    for (const article of fixture.articles) {
      const human = article.pages.ru?.extract ?? '';
      if (!human) {
        continue;
      }
      articlesWithReference += 1;

      const paragraph = extractFirstParagraph(article.pages.en.extract);
      const result = await translateToRussian(paragraph);

      // The renderer never falls back to a bare language-code placeholder.
      expect(result.plainText.includes('[ru]')).toBe(false);

      const alignment = assessReferenceAlignment(result.plainText, human, {
        script: cyrillicPattern,
      });
      totalOverlap += alignment.overlap;
      totalMachineTokens += alignment.machineTokenCount;
      if (alignment.overlap >= 1) {
        articlesWithMatch += 1;
      }

      // Alignment must be deterministic so the gate is safe to run in CI/CD.
      const replay = await translateToRussian(paragraph);
      const replayAlignment = assessReferenceAlignment(
        replay.plainText,
        human,
        { script: cyrillicPattern }
      );
      expect(replayAlignment.matched).toEqual(alignment.matched);
    }

    // The fixture captured Russian human translations for the whole corpus.
    expect(articlesWithReference).toBe(10);
    // Issue #115 graduates the remaining no-match article and raises the
    // measured corpus floor from 22 to at least 40 human-attested tokens.
    expect(articlesWithMatch).toBe(10);
    expect(totalOverlap).toBeGreaterThanOrEqual(40);
    // At least 50% of every Russian word the machine emits across the corpus is
    // exactly a word a human chose.
    expect(totalMachineTokens).toBeGreaterThan(0);
    expect(totalOverlap / totalMachineTokens).toBeGreaterThanOrEqual(0.5);
  });
});
