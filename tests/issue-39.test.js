import { describe, expect, it } from 'test-anywhere';
import { translateTextWith } from '../src/index.js';
import { readFile } from 'node:fs/promises';

const issue39Input =
  'Formalize source text with Wikidata, then translate each sentence through labels and transformation rules. Unresolved parts remain variables with questions.';
const TRANSLATION_STRATEGIES = Object.freeze({
  CONTEXTUAL_GLOSSARY: 'contextual-glossary',
  SEMANTIC_LABEL: 'semantic-label',
  LEXICAL_GLOSSARY: 'lexical-glossary',
});

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

describe('issue 39 - technical sentence translation', () => {
  it('uses contextual glossary and Russian grammar rules for the reported text', async () => {
    const result = await translateTextWith(issue39Input, {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    expect(result.plainText).toBe(
      'Формализуйте исходный текст с помощью Викиданных, затем переведите каждое предложение через метки и правила преобразования. Неразрешенные части остаются переменными с вопросами.'
    );
    expect(result.questions).toEqual([]);
    expect(result.phrases.every((phrase) => phrase.variable === null)).toBe(
      true
    );
    expect(result.sentences[0].transformations).toContain(
      'english-with-wikidata-to-russian-instrumental'
    );
    expect(result.sentences[0].transformations).toContain(
      'english-transformation-rules-to-russian-noun-phrase'
    );
    expect(
      result.steps.some(
        (step) =>
          step.type === 'translation-phrase' &&
          step.strategy === TRANSLATION_STRATEGIES.CONTEXTUAL_GLOSSARY
      )
    ).toBe(true);
  });

  it('does not let formalized phrases cross sentence boundaries', async () => {
    const result = await translateTextWith(issue39Input, {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
      overrides: [
        {
          phrase: 'transformation rules Unresolved',
          entityId: 'Q999999',
          label: 'Bad cross-sentence candidate',
          kind: 'entity',
        },
      ],
    });

    expect(result.plainText).toBe(
      'Формализуйте исходный текст с помощью Викиданных, затем переведите каждое предложение через метки и правила преобразования. Неразрешенные части остаются переменными с вопросами.'
    );
    expect(
      result.formalization.phrases.some(
        (phrase) => phrase.text === 'transformation rules Unresolved'
      )
    ).toBe(false);
  });

  it('keeps a strict semantic-label strategy for traceable fallback behavior', async () => {
    const result = await translateTextWith(issue39Input, {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      translationStrategy: TRANSLATION_STRATEGIES.SEMANTIC_LABEL,
      now: () => 0,
    });

    expect(result.plainText).toBe(
      'Formalize source text with Wikidata then translate each sentence through labels and transformation rules. Unresolved parts remain variables with questions.'
    );
    expect(result.questions.length).toBeGreaterThan(0);
  });

  it('returns structured answer options for unresolved translation questions', async () => {
    const result = await translateTextWith('xyzzy', {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    expect(result.questions.length).toBe(1);
    expect(result.questionDetails.length).toBe(1);
    expect(result.questionDetails[0].question).toBe(result.questions[0]);
    expect(result.questionDetails[0].selectedOptionId).toBe('preserve-source');
    expect(
      result.questionDetails[0].options.map((option) => option.id)
    ).toEqual(['preserve-source', 'map-entity', 'manual-entry']);
  });

  it('exposes translation strategies and prepared Translate examples in the web app', async () => {
    const { listTranslationStrategies } = await import('../src/index.js');
    const strategies = listTranslationStrategies();
    expect(strategies.map((strategy) => strategy.id)).toEqual([
      TRANSLATION_STRATEGIES.CONTEXTUAL_GLOSSARY,
      TRANSLATION_STRATEGIES.SEMANTIC_LABEL,
      TRANSLATION_STRATEGIES.LEXICAL_GLOSSARY,
    ]);

    const html = await readFile(
      new URL('../web/index.html', import.meta.url),
      'utf8'
    );
    const translateUi = await readFile(
      new URL('../web/translate-ui.js', import.meta.url),
      'utf8'
    );
    const samples = await readFile(
      new URL('../web/translate-samples.js', import.meta.url),
      'utf8'
    );

    expect(html).toContain('id="translate-sample"');
    expect(html).toContain('id="translate-strategy"');
    expect(translateUi).toContain('translateSamples');
    expect(samples).toContain(issue39Input);
  });
});
