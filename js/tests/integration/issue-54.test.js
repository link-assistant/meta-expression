import { describe, expect, it } from 'test-anywhere';
import { formalizeTextWith, translateTextWith } from '../../src/index.js';

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

function wikidataCandidate(id, label, kind = 'entity') {
  return {
    id,
    label,
    description: `${label} test entity`,
    kind,
    source: 'wikidata',
    sourceUrl:
      kind === 'property'
        ? `https://www.wikidata.org/wiki/Property:${id}`
        : `https://www.wikidata.org/wiki/${id}`,
    matchText: label,
    score: 1,
    ngramSize: label.split(/\s+/).length,
  };
}

describe('issue 54 - formal-ai compatibility hooks', () => {
  it('applies configurable rules before and after formalization', async () => {
    const result = await formalizeTextWith('kitten', {
      fetch: () => emptyJsonResponse(),
      sources: [
        {
          name: 'test-source',
          async searchPhrase(text) {
            return text === 'cat' ? [wikidataCandidate('Q146', 'cat')] : [];
          },
        },
      ],
      beforeFormalizationRules: [
        {
          id: 'kitten-to-cat',
          pattern: 'kitten',
          replacement: 'cat',
        },
      ],
      afterFormalizationRules: [
        {
          id: 'mark-compatible',
          apply(formalization) {
            return {
              ...formalization,
              compatibility: 'formal-ai',
            };
          },
        },
      ],
      now: () => 0,
    });

    expect(result.text).toBe('cat');
    expect(result.compatibility).toBe('formal-ai');
    expect(result.cst.phrases[0].entity.id).toBe('Q146');
    expect(result.steps.map((step) => step.rule)).toContain('kitten-to-cat');
    expect(result.steps.map((step) => step.rule)).toContain('mark-compatible');
  });

  it('supports translation and naturalization rules with a deformalization alias', async () => {
    const result = await translateTextWith('search', {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      beforeTranslationRules: [
        {
          id: 'search-to-find',
          pattern: 'search',
          replacement: 'find',
        },
      ],
      beforeNaturalizationRules: [
        {
          id: 'prefer-razyskat',
          pattern: 'найти',
          replacement: 'разыскать',
        },
      ],
      afterTranslationRules: [
        {
          id: 'tag-translation',
          apply(translation) {
            return {
              ...translation,
              compatibility: 'formal-ai',
            };
          },
        },
      ],
      now: () => 0,
    });

    expect(result.text).toBe('find');
    expect(result.plainText).toBe('разыскать');
    expect(result.naturalization.targetText).toBe('разыскать');
    expect(result.deformalization).toBe(result.naturalization);
    expect(result.cst.deformalization).toBe(result.naturalization);
    expect(result.compatibility).toBe('formal-ai');
    const ruleIds = result.steps.map((step) => step.rule);
    expect(ruleIds).toContain('search-to-find');
    expect(ruleIds).toContain('prefer-razyskat');
    expect(ruleIds).toContain('tag-translation');
  });
});
