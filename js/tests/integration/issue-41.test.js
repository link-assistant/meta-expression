import { describe, expect, it } from 'test-anywhere';
import { translateTextWith } from '../../src/index.js';
import { readFile } from 'node:fs/promises';
import { assertCompleteTranslationCoverage } from '../helpers/translation-coverage.js';

const issue41Input = 'Найти синонимы или примеры согласования';
const additionalTranslationExamples = Object.freeze([
  {
    label: 'Find synonyms',
    sourceLanguage: 'ru',
    targetLanguage: 'en',
    text: 'Найти синонимы',
    expected: 'Find synonyms',
  },
  {
    label: 'Find translation examples',
    sourceLanguage: 'ru',
    targetLanguage: 'en',
    text: 'Найти примеры перевода',
    expected: 'Find examples of translation',
  },
  {
    label: 'Translate text',
    sourceLanguage: 'ru',
    targetLanguage: 'en',
    text: 'Перевести текст',
    expected: 'Translate text',
  },
  {
    label: 'Formalize text',
    sourceLanguage: 'ru',
    targetLanguage: 'en',
    text: 'Формализовать текст',
    expected: 'Formalize text',
  },
  {
    label: 'Check statement',
    sourceLanguage: 'ru',
    targetLanguage: 'en',
    text: 'Проверить утверждение',
    expected: 'Check statement',
  },
  {
    label: 'Compare values',
    sourceLanguage: 'ru',
    targetLanguage: 'en',
    text: 'Сравнить значения',
    expected: 'Compare values',
  },
  {
    label: 'Show questions',
    sourceLanguage: 'ru',
    targetLanguage: 'en',
    text: 'Показать вопросы',
    expected: 'Show questions',
  },
  {
    label: 'Open page',
    sourceLanguage: 'ru',
    targetLanguage: 'en',
    text: 'Открыть страницу',
    expected: 'Open page',
  },
  {
    label: 'Save result',
    sourceLanguage: 'ru',
    targetLanguage: 'en',
    text: 'Сохранить результат',
    expected: 'Save result',
  },
  {
    label: 'Add examples',
    sourceLanguage: 'en',
    targetLanguage: 'ru',
    text: 'Add examples',
    expected: 'Добавьте примеры',
  },
]);

function jsonResponse(payload) {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
  });
}

function emptyJsonResponse() {
  return jsonResponse({});
}

function wikidataEntity({ id, label, description = '', sitelink = null }) {
  return {
    id,
    type: id.startsWith('P') ? 'property' : 'item',
    labels: { en: { value: label }, ru: { value: label } },
    descriptions: { en: { value: description }, ru: { value: description } },
    claims: {},
    aliases: {},
    sitelinks: sitelink ? { enwiki: { site: 'enwiki', title: sitelink } } : {},
  };
}

function entityPayload(entries) {
  const entities = {};
  for (const entry of entries) {
    entities[entry.id] = entry;
  }
  return { entities };
}

function makeIssue41Fetch() {
  return function mockFetch(url) {
    const parsed = new URL(url);
    const action = parsed.searchParams.get('action');

    if (parsed.hostname.endsWith('wikipedia.org') && action === 'query') {
      if (parsed.searchParams.get('list') === 'search') {
        const search = parsed.searchParams.get('srsearch');
        const routes = {
          'Найти синонимы или': [
            {
              title: 'Монро, Мэрилин',
              snippet:
                'Монро играла наивную модель, которая пыталась найти состоятельных мужей.',
            },
          ],
          'примеры согласования': [
            {
              title: 'Принцип четырёх глаз',
              snippet:
                'Финансовый директор участвует в согласовании по условиям.',
            },
          ],
        };
        return jsonResponse({ query: { search: routes[search] ?? [] } });
      }

      if (parsed.searchParams.get('prop') === 'pageprops') {
        const titles = parsed.searchParams.get('titles')?.split('|') ?? [];
        const pages = {};
        titles.forEach((title, index) => {
          const ids = {
            'Монро, Мэрилин': 'Q4616',
            'Принцип четырёх глаз': 'Q2523390',
          };
          pages[index + 1] = {
            title,
            pageprops: ids[title] ? { wikibase_item: ids[title] } : {},
          };
        });
        return jsonResponse({ query: { pages } });
      }
    }

    if (parsed.hostname === 'www.wikidata.org') {
      if (action === 'wbsearchentities') {
        return jsonResponse({ search: [] });
      }
      if (action === 'wbgetentities') {
        const ids = parsed.searchParams.get('ids');
        const routes = {
          Q4616: wikidataEntity({
            id: 'Q4616',
            label: 'Marilyn Monroe',
            description: 'American actress and model',
            sitelink: 'Marilyn Monroe',
          }),
          Q2523390: wikidataEntity({
            id: 'Q2523390',
            label: 'two-person rule',
            description: 'control mechanism',
            sitelink: 'Two-person rule',
          }),
        };
        return jsonResponse(
          routes[ids] ? entityPayload([routes[ids]]) : { entities: {} }
        );
      }
    }

    return emptyJsonResponse();
  };
}

describe('issue 41 - Russian translate fallback', () => {
  it('translates the reported Russian phrase through lexical glossary entries', async () => {
    const result = await translateTextWith(issue41Input, {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'ru',
      targetLanguage: 'en',
      now: () => 0,
    });

    expect(result.plainText).toBe('Find synonyms or examples of agreement');
    assertCompleteTranslationCoverage(result, issue41Input);
    expect(result.sentences[0].transformations).toContain(
      'russian-examples-genitive-to-english-of-phrase'
    );
  });

  it('does not translate unrelated full-text search hits as phrase meanings', async () => {
    const result = await translateTextWith(issue41Input, {
      fetch: makeIssue41Fetch(),
      sourceLanguage: 'ru',
      targetLanguage: 'en',
      now: () => 0,
    });

    expect(result.plainText).toBe('Find synonyms or examples of agreement');
    expect(result.markdown).not.toContain('Marilyn Monroe');
    expect(result.markdown).not.toContain('two-person rule');
    expect(
      result.formalization.cst.phrases.some((phrase) =>
        ['Q4616', 'Q2523390'].includes(phrase.entity?.id)
      )
    ).toBe(false);
    assertCompleteTranslationCoverage(result, issue41Input);
  });

  it('exposes semantic meta language before naturalizing the target text', async () => {
    const result = await translateTextWith(issue41Input, {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'ru',
      targetLanguage: 'en',
      now: () => 0,
    });

    expect(result.semanticMetaLanguage.type).toBe('semantic-meta-language');
    expect(result.semanticMetaLanguage.links.length).toBeGreaterThan(0);
    expect(result.semanticMetaLanguage.linksNotation).toContain(
      '(semantic-meta-language:'
    );
    expect(result.semanticMetaLanguage.linksNotation).toContain(
      'semantic-link-'
    );
    expect(result.naturalization.type).toBe('naturalization');
    expect(result.naturalization.linksNotation).toContain('(naturalization:');
    expect(result.cst.semanticMetaLanguage).toBe(result.semanticMetaLanguage);
    expect(result.cst.naturalization).toBe(result.naturalization);
    expect(result.linksNotation).toContain('(semantic-meta-language:');
    expect(result.linksNotation).toContain('(naturalization:');
    expect(result.steps.map((step) => step.type)).toContain(
      'semantic-meta-language'
    );
    assertCompleteTranslationCoverage(result, issue41Input);
  });

  it('supports ten more Translate examples through reusable glossary naturalization', async () => {
    for (const example of additionalTranslationExamples) {
      const result = await translateTextWith(example.text, {
        fetch: () => emptyJsonResponse(),
        sourceLanguage: example.sourceLanguage,
        targetLanguage: example.targetLanguage,
        now: () => 0,
      });

      expect(result.plainText).toBe(example.expected);
      assertCompleteTranslationCoverage(result, example.text);
      expect(result.semanticMetaLanguage.links.length).toBeGreaterThan(0);
      expect(result.naturalization.targetText).toBe(example.expected);
    }
  });

  it('exposes the reported phrase as a Translate sample', async () => {
    const samples = await readFile(
      new URL('../../../web/translate-samples.js', import.meta.url),
      'utf8'
    );

    expect(samples).toContain(issue41Input);
    expect(samples).toContain("sourceLanguage: 'ru'");
    expect(samples).toContain("targetLanguage: 'en'");
    for (const example of additionalTranslationExamples) {
      expect(samples).toContain(example.text);
    }
  });
});
