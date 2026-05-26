import { describe, expect, it } from 'test-anywhere';
import { translateTextWith } from '../../src/index.js';
import {
  listDirectionalPairs,
  listLexiconConcepts,
  listLexiconLanguages,
} from '../../src/semantic-lexicon.js';

// Issue #96 requires every translation feature to be exercised in all four
// supported languages (English, Russian, Hindi, Chinese) and to survive a
// round trip. The interlingua makes that possible without any direct language
// pair in the code: a single concept id maps to per-language surface forms, so
// each of the four languages routes through the same intermediate meaning.
//
// Hindi (Devanagari) and Chinese (Han) do not encode letter case, so a word
// translated *out of* them into English or Russian cannot recover the original
// casing — the engine renders an isolated word capitalized. The semantic round
// trip is therefore verified case-insensitively; the meaning, not the casing,
// is what must survive.

const SUPPORTED_LANGUAGES = ['en', 'hi', 'ru', 'zh'];

// Shared vocabulary attested for all four languages by a single concept id:
//   apple -> Wikidata Q89, hello -> en.wiktionary.org/wiki/hello.
const SHARED_VOCABULARY = [
  {
    concept: 'apple',
    forms: { en: 'apple', ru: 'яблоко', hi: 'सेब', zh: '苹果' },
  },
  {
    concept: 'hello',
    forms: { en: 'hello', ru: 'привет', hi: 'नमस्ते', zh: '你好' },
  },
];

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    json() {
      return Promise.resolve({});
    },
  });
}

async function translate(text, sourceLanguage, targetLanguage) {
  return translateTextWith(text, {
    fetch: () => emptyJsonResponse(),
    sourceLanguage,
    targetLanguage,
    now: () => 0,
  });
}

function orderedLanguagePairs() {
  const pairs = [];
  for (const source of SUPPORTED_LANGUAGES) {
    for (const target of SUPPORTED_LANGUAGES) {
      if (source !== target) {
        pairs.push([source, target]);
      }
    }
  }
  return pairs;
}

const lowercase = (text) => text.toLocaleLowerCase();

describe('issue 96 - four-language interlingua round trips', () => {
  it('declares all four supported languages in the interlingua', () => {
    expect(listLexiconLanguages().sort()).toEqual(SUPPORTED_LANGUAGES);
  });

  it('serves every ordered pair among the four languages through concept ids', () => {
    const pairs = listDirectionalPairs();
    for (const [source, target] of orderedLanguagePairs()) {
      expect(pairs).toContain(`${source}:${target}`);
    }
  });

  it('maps the shared vocabulary through a single id carrying every language', () => {
    const concepts = listLexiconConcepts();
    for (const { concept, forms } of SHARED_VOCABULARY) {
      const matches = concepts.filter(
        (entry) => entry.primary?.en === forms.en
      );
      // Exactly one concept id is responsible for the word across all
      // languages — no per-direction duplicates re-introducing a language pair.
      const unified = matches.filter((entry) =>
        SUPPORTED_LANGUAGES.every((language) => entry.primary?.[language])
      );
      expect(unified.length).toBe(1);
      const [entry] = unified;
      for (const language of SUPPORTED_LANGUAGES) {
        expect(entry.primary[language]).toBe(forms[language]);
        expect(entry.labels[language]).toContain(forms[language]);
      }
      expect(entry.id).toBe(concept === 'apple' ? 'Q89' : 'wikt:en:hello');
      expect(entry.url.length).toBeGreaterThan(0);
    }
  });

  it('translates the shared vocabulary forward in every direction', async () => {
    for (const { concept, forms } of SHARED_VOCABULARY) {
      for (const [source, target] of orderedLanguagePairs()) {
        const result = await translate(forms[source], source, target);
        const detail = `${concept} ${source}->${target}`;
        expect(`${detail}: ${lowercase(result.plainText)}`).toBe(
          `${detail}: ${lowercase(forms[target])}`
        );
        expect(`${detail} questions`).toBe(
          `${detail} questions${result.questions.length ? ' FAILED' : ''}`
        );
      }
    }
  });

  it('survives a round trip through every other language', async () => {
    for (const { concept, forms } of SHARED_VOCABULARY) {
      for (const [source, target] of orderedLanguagePairs()) {
        const forward = await translate(forms[source], source, target);
        const back = await translate(forward.plainText, target, source);
        const detail = `${concept} ${source}->${target}->${source}`;
        expect(`${detail}: ${lowercase(back.plainText)}`).toBe(
          `${detail}: ${lowercase(forms[source])}`
        );
      }
    }
  });
});
