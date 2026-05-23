import { describe, expect, it } from 'test-anywhere';
import { tokenCoverage, translateTextWith } from '../../src/index.js';

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

function sourceTokens(text) {
  return text.split(/\s+/).filter(Boolean);
}

function assertSourceFormalizationIsComplete(result, source) {
  const phrases = result.formalization.cst.phrases;
  expect(phrases.map((phrase) => phrase.text)).toEqual(sourceTokens(source));
  expect(phrases.every((phrase) => phrase.entity?.id)).toBe(true);
  expect(phrases.every((phrase) => phrase.entity?.url)).toBe(true);
  expect(result.formalization.markdown).not.toBe(source);
  expect(result.formalization.markdown).toContain('](');
}

function assertSemanticLinksAreComplete(result) {
  const links = result.semanticMetaLanguage.links;
  expect(links.length).toBe(result.formalization.cst.phrases.length);
  expect(links.every((link) => link.meaning.id)).toBe(true);
  expect(links.every((link) => link.meaning.url)).toBe(true);
}

function assertTargetNaturalizationIsComplete(result) {
  const targetUnits = result.sentences.flatMap(
    (sentence) => sentence.targetUnits
  );
  expect(targetUnits.length).toBeGreaterThan(0);
  expect(targetUnits.every((unit) => unit.targetEntityId)).toBe(true);
  expect(targetUnits.every((unit) => unit.targetUrl)).toBe(true);
  expect(result.markdown).not.toBe(result.plainText);
  expect(result.markdown).toContain('](');
  expect(result.html).toContain('<a ');
  expect(result.naturalization.sentences[0].targetUnits).toEqual(targetUnits);
}

describe('issue 48 - complete formalize -> semantic -> naturalize coverage', () => {
  for (const example of issue48Cases) {
    it(`formalizes and naturalizes every word from issue ${example.issue}`, async () => {
      const result = await translateOffline(example.source, 'ru', 'en');

      expect(result.plainText).toBe(example.expected);
      expect(result.questions).toEqual([]);
      assertSourceFormalizationIsComplete(result, example.source);
      assertSemanticLinksAreComplete(result);
      assertTargetNaturalizationIsComplete(result);
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
