import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';
import {
  parseFormalAiTranslationPrompt,
  translateFormalAiPromptWith,
} from '../../src/index.js';

const corpus = JSON.parse(
  readFileSync(
    new URL('../fixtures/formal-ai-test-corpus.json', import.meta.url),
    'utf8'
  )
);

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

function corpusCases() {
  return corpus.files.flatMap((file) =>
    file.tests.map((test) => ({
      ...test,
      path: file.path,
      language: file.language,
    }))
  );
}

async function translatePrompt(prompt) {
  return translateFormalAiPromptWith(prompt, {
    fetch: () => emptyJsonResponse(),
    now: () => 0,
  });
}

describe('issue 54 - exact formal-ai upstream test corpus index', () => {
  it('indexes every formal-ai test case from the pinned upstream commit', () => {
    expect(corpus.source).toEqual({
      repository: 'link-assistant/formal-ai',
      commit: 'e1467d531534af582a2f457e69695ac6861131b8',
      committedAt: '2026-05-23T23:02:47+00:00',
      subject: 'chore: release v0.107.0',
    });
    expect(corpus.summary).toEqual({
      testFileCount: 61,
      rustTestCount: 534,
      jsTestCount: 172,
      totalTestCount: 706,
      ignoredRustTestCount: 69,
      ignoredJsTestCount: 0,
      ignoredTotalTestCount: 69,
    });

    const cases = corpusCases();
    expect(cases.length).toBe(corpus.summary.totalTestCount);
    expect(new Set(cases.map((testCase) => testCase.id)).size).toBe(
      corpus.summary.totalTestCount
    );
    expect(corpus.files.every((file) => file.sha256.length === 64)).toBe(true);

    for (const [path, name] of [
      [
        'tests/unit/specification/translation_via_links.rs',
        'russian_translate_how_are_you_prompt_returns_english_surface',
      ],
      [
        'tests/unit/specification/translation_via_links.rs',
        'issue_221_common_english_nouns_translate_to_russian',
      ],
      [
        'tests/unit/specification/summarization_pipeline.rs',
        'formalize_summarize_deformalize_round_trip_keeps_meaning',
      ],
      [
        'tests/unit/specification/links_network.rs',
        'every_answer_includes_links_notation_trace',
      ],
      [
        'tests/e2e/tests/issue-210.spec.js',
        'translate quoted Russian prompts instead of identity, capabilities, or placeholders',
      ],
      [
        'tests/e2e/tests/issue-218.spec.js',
        '#216 — unquoted apple covers all supported target languages',
      ],
      [
        'tests/e2e/tests/issue-230.spec.js',
        'unknown translation gaps are explicit for every supported target language',
      ],
    ]) {
      expect(
        cases.some(
          (testCase) => testCase.path === path && testCase.name === name
        )
      ).toBe(true);
    }
  });
});

describe('issue 54 - formal-ai prompt parsing', () => {
  it('parses formal-ai translation prompt variants without configuration', () => {
    expect(
      parseFormalAiTranslationPrompt('Translate "hello" to Russian')
    ).toEqual({
      type: 'translation',
      sourceText: 'hello',
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      promptLanguage: 'en',
    });
    expect(
      parseFormalAiTranslationPrompt('Переведи «яблоко» на английский')
    ).toEqual({
      type: 'translation',
      sourceText: 'яблоко',
      sourceLanguage: 'ru',
      targetLanguage: 'en',
      promptLanguage: 'ru',
    });
    expect(
      parseFormalAiTranslationPrompt('apple का हिंदी में अनुवाद करो')
    ).toEqual({
      type: 'translation',
      sourceText: 'apple',
      sourceLanguage: 'en',
      targetLanguage: 'hi',
      promptLanguage: 'hi',
    });
    expect(parseFormalAiTranslationPrompt('把 apple 翻译成中文')).toEqual({
      type: 'translation',
      sourceText: 'apple',
      sourceLanguage: 'en',
      targetLanguage: 'zh',
      promptLanguage: 'zh',
    });
  });
});

describe('issue 54 - formal-ai prompt translation corpus', () => {
  it('answers formal-ai translation-via-links corpus prompts', async () => {
    for (const [prompt, expected] of [
      ['Переведи "как у тебя дела?" на английский.', 'how are you?'],
      ['Переведи "Как у тебя дела?" на английский.', 'How are you?'],
      ['Переведи как дела на английский', 'how are you'],
      ['Переведи кто ты такой на ангилйский', 'who are you'],
      ['Переведи что это такое? на английский', 'what is this?'],
      ['Переведи доброе яблоко на английский', 'good apple'],
      ['Переведи спасибо на английский', 'thank you'],
      ['Переведи да на английский', 'yes'],
      ['Переведи нет на английский', 'no'],
      ['Переведи привет на английский', 'hello'],
      ['Translate hello to Russian', 'привет'],
      ['Translate thank you to Russian', 'спасибо'],
      ['Translate hello to Hindi', 'नमस्ते'],
      ['Translate hello to Chinese', '你好'],
      ['Translate apple to Russian', 'яблоко'],
      ['Translate Apple to Russian', 'Яблоко'],
      ['Translate apple to English', 'apple'],
      ['apple का हिंदी में अनुवाद करो', 'सेब'],
      ['把 apple 翻译成中文', '苹果'],
      ['Переведи "яблоко" на английский', 'apple'],
      ['Переведи «яблоко» на английский', 'apple'],
      ['Переведи яблоко на английский', 'apple'],
    ]) {
      const result = await translatePrompt(prompt);
      expect(result.answer).toBe(expected);
      expect(result.questions).toEqual([]);
      expect(result.evidenceLinks).toContain(
        `language_from:${result.formalAiPrompt.sourceLanguage}`
      );
      expect(result.evidenceLinks).toContain(
        `language_to:${result.formalAiPrompt.targetLanguage}`
      );
    }
  });

  it('covers formal-ai common-noun translation prompts in both directions', async () => {
    for (const [russian, english] of [
      ['помидор', 'tomato'],
      ['огурец', 'cucumber'],
      ['картофель', 'potato'],
      ['морковь', 'carrot'],
      ['хлеб', 'bread'],
      ['вода', 'water'],
    ]) {
      const ruToEn = await translatePrompt(
        `Переведи "${russian}" на английский`
      );
      expect(ruToEn.answer).toBe(english);
      expect(ruToEn.questions).toEqual([]);

      const enToRu = await translatePrompt(`Translate "${english}" to Russian`);
      expect(enToRu.answer).toBe(russian);
      expect(enToRu.questions).toEqual([]);
    }
  });

  it('reports formal-ai translation gaps without language placeholders', async () => {
    for (const prompt of [
      'Переведи "неведомослово" на английский',
      'Translate "zzqxqv" to Russian',
      'Translate "zzqxqv" to Hindi',
      'Translate "zzqxqv" to Chinese',
    ]) {
      const result = await translatePrompt(prompt);
      expect(result.answer).toBe(
        `could not translate "${result.formalAiPrompt.sourceText}" to ${result.formalAiPrompt.targetLanguage}`
      );
      expect(
        result.answer.includes(`[${result.formalAiPrompt.targetLanguage}]`)
      ).toBe(false);
      expect(result.evidenceLinks).toContain(
        `translation_gap:${result.formalAiPrompt.sourceText}`
      );
      expect(result.questions.length).toBeGreaterThan(0);
    }
  });
});
