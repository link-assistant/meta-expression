import { describe, expect, it } from 'test-anywhere';
import {
  FORMALIZE_LINK_TARGETS,
  formalizeTextWith,
  tokenCoverage,
  translateTextWith,
} from '../../src/index.js';
import {
  assertCompleteTranslationCoverage,
  assertFormalizedSourceCoverage,
} from '../helpers/translation-coverage.js';

const issue52Input =
  'Links Platform planned as a system, that combines simple associative memory storage (Links) and transformation execution engine (Triggers). There will be an ability to program that system dynamically, due to the fact that all algorithms will be treated as data inside the storage. Such algorithms can also change themselves in real-time based on input from the environment. The Links Platform is a method of modeling the high-level associative memory effects of human mind. We strive to make our implementation of associative storage the most accurate, simple, universal, flexible, reliable and fast memory implementation for any data and knowledge. One of the most important goals of the project is to accelerate the development of automation to the level when automation can be itself automated. In other words, this project should help to implement a bot-programmer which will be able to create or edit programs based on descriptions in human language.';

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
    linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
    now: () => 0,
  });
}

async function formalizeOffline(text, language) {
  return formalizeTextWith(text, {
    fetch: () => emptyJsonResponse(),
    language,
    linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
    now: () => 0,
  });
}

describe('issue 52 - full Translate case coverage', () => {
  it('formalizes, translates, and formalizes the full reported text', async () => {
    const translated = await translateOffline(issue52Input, 'en', 'ru');

    expect(translated.sentences.length).toBe(7);
    expect(translated.plainText).toContain('Links Платформа запланирована');
    expect(translated.plainText).toContain('бот-программист');
    expect(
      translated.cst.sentences.map((sentence) => sentence.targetText)
    ).toEqual(translated.sentences.map((sentence) => sentence.plainText));
    assertCompleteTranslationCoverage(translated, issue52Input);

    const reformalized = await formalizeOffline(translated.plainText, 'ru');

    assertFormalizedSourceCoverage(reformalized, translated.plainText);
    expect(reformalized.markdown).toContain('](');
  });

  it('keeps the full case stable through back translation', async () => {
    const forward = await translateOffline(issue52Input, 'en', 'ru');
    const reverse = await translateOffline(forward.plainText, 'ru', 'en');
    const coverage = tokenCoverage(reverse.plainText, issue52Input);

    expect(reverse.questions).toEqual([]);
    expect(reverse.plainText).toContain('Links Platform planned');
    expect(reverse.plainText).toContain('bot-programmer');
    expect(coverage.ratio).toBe(1);
    assertCompleteTranslationCoverage(reverse, forward.plainText);
  });
});
