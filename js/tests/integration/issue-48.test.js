import { describe, expect, it } from 'test-anywhere';
import { tokenCoverage, translateTextWith } from '../../src/index.js';
import { assertCompleteTranslationCoverage } from '../helpers/translation-coverage.js';

const issue48Cases = Object.freeze([
  {
    issue: 45,
    source: 'Найти синонимы или примеры согласования',
    expected: 'Find synonyms or examples of agreement',
    minimumRoundTripCoverage: 1,
  },
  {
    issue: 46,
    source: 'Перевести текст',
    expected: 'Translate text',
    minimumRoundTripCoverage: 0.5,
  },
  {
    issue: 47,
    source: 'Сравнить значения',
    expected: 'Compare values',
    minimumRoundTripCoverage: 0.5,
  },
]);

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

async function translateOffline(text, sourceLanguage, targetLanguage) {
  return translateTextWith(text, {
    fetch: () => emptyJsonResponse(),
    sourceLanguage,
    targetLanguage,
    now: () => 0,
  });
}

describe('issue 48 - complete formalize -> semantic -> naturalize coverage', () => {
  for (const example of issue48Cases) {
    it(`formalizes and naturalizes every word from issue ${example.issue}`, async () => {
      const result = await translateOffline(example.source, 'ru', 'en');

      expect(result.plainText).toBe(example.expected);
      assertCompleteTranslationCoverage(result, example.source);
    });

    it(`keeps issue ${example.issue} stable through a round trip`, async () => {
      const forward = await translateOffline(example.source, 'ru', 'en');
      const reverse = await translateOffline(forward.plainText, 'en', 'ru');
      const coverage = tokenCoverage(reverse.plainText, example.source);

      expect(reverse.questions).toEqual([]);
      expect(coverage.ratio >= example.minimumRoundTripCoverage).toBe(true);
    });
  }
});
