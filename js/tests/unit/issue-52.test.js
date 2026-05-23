import { describe, expect, it } from 'test-anywhere';
import {
  applyTranslationQuestionAnswers,
  createWikidataSource,
  createWiktionarySource,
  translateTextWith,
} from '../../src/index.js';
import { fetchWikimediaJson } from '../../src/wikimedia-fetch.js';

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

function missingJsonResponse() {
  return {
    ok: false,
    status: 404,
    headers: new Headers(),
    async json() {
      return { error: 'missing' };
    },
  };
}

describe('issue 52 - Translate request churn and answers', () => {
  it('coalesces concurrent Wikimedia 404s and caches negative results', async () => {
    const calls = [];
    const config = {
      cache: new Map(),
      cacheTtlMs: 1000,
      now: () => 0,
      async fetchImpl(url) {
        calls.push(String(url));
        await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
        return missingJsonResponse();
      },
    };
    const url =
      'https://en.wiktionary.org/api/rest_v1/page/definition/Platform';

    const concurrent = await Promise.allSettled([
      fetchWikimediaJson(url, config),
      fetchWikimediaJson(url, config),
    ]);

    expect(concurrent.every((result) => result.status === 'rejected')).toBe(
      true
    );
    expect(calls.length).toBe(1);

    await fetchWikimediaJson(url, config).catch(() => null);
    expect(calls.length).toBe(1);
  });

  it('normalizes Wiktionary lookup text before calling the definition API', async () => {
    const urls = [];
    const source = createWiktionarySource({ language: 'en' });

    const candidates = await source.searchPhrase('(Platform)', {
      fetchImpl: async () => emptyJsonResponse(),
      async fetchJson(url) {
        urls.push(String(url));
        return {
          en: [
            {
              partOfSpeech: 'Noun',
              definitions: [{ definition: 'a raised surface' }],
            },
          ],
        };
      },
    });

    expect(urls.length).toBe(1);
    expect(urls[0]).toContain('/definition/platform');
    expect(candidates[0].id).toBe('wikt:en:platform#Noun:0');
    expect(candidates[0].matchText).toBe('Platform');
  });

  it('batches same-tick Wikidata entity hydration requests', async () => {
    const urls = [];
    const source = createWikidataSource({ language: 'en' });
    const ctx = {
      fetchImpl: async () => emptyJsonResponse(),
      async fetchJson(url) {
        urls.push(new URL(String(url)));
        return {
          entities: {
            Q1: { id: 'Q1' },
            Q2: { id: 'Q2' },
          },
        };
      },
    };

    const entities = await Promise.all([
      source.getEntity('Q1', ctx),
      source.getEntity('Q2', ctx),
    ]);

    expect(entities.map((entity) => entity.id)).toEqual(['Q1', 'Q2']);
    expect(urls.length).toBe(1);
    expect(urls[0].searchParams.get('ids')).toBe('Q1|Q2');
  });

  it('batches target-language Wikidata label requests during translation', async () => {
    const urls = [];
    const source = {
      name: 'test-wikidata-source',
      async searchPhrase(text) {
        if (text === 'alpha') {
          return [wikidataCandidate('Q1', 'alpha')];
        }
        if (text === 'beta') {
          return [wikidataCandidate('Q2', 'beta')];
        }
        return [];
      },
    };

    const result = await translateTextWith('alpha beta', {
      fetch: async (url) => {
        urls.push(new URL(String(url)));
        return {
          ok: true,
          status: 200,
          async json() {
            return targetEntityPayload(url);
          },
        };
      },
      sources: [source],
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    const targetLookups = urls.filter(
      (url) =>
        url.hostname === 'www.wikidata.org' &&
        url.searchParams.get('action') === 'wbgetentities' &&
        url.searchParams.get('languages') === 'ru'
    );
    expect(result.plainText).toBe('альфа бета');
    expect(targetLookups.length).toBe(1);
    expect(targetLookups[0].searchParams.get('ids')).toBe('Q1|Q2');
  });

  it('applies selected question answers to translated output', async () => {
    const result = await translateTextWith('xyzzy', {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });
    const question = result.questionDetails[0];

    const answered = applyTranslationQuestionAnswers(result, {
      [question.variableName]: {
        optionId: 'manual-entry',
        targetText: 'ксиззи',
      },
    });

    expect(answered.plainText).toBe('ксиззи');
    expect(answered.markdown).toBe('ксиззи');
    expect(answered.questions).toEqual([]);
    expect(answered.questionDetails).toEqual([]);
    expect(answered.phrases[0].target.status).toBe('answered-manual');
    expect(answered.variables[0].resolvedByAnswer).toBe(true);
  });
});

function wikidataCandidate(id, label) {
  return {
    id,
    label,
    description: `${label} test entity`,
    kind: 'entity',
    source: 'wikidata',
    sourceUrl: `https://www.wikidata.org/wiki/${id}`,
    matchText: label,
  };
}

function targetEntityPayload(url) {
  const ids = new URL(String(url)).searchParams.get('ids')?.split('|') ?? [];
  const values = {
    Q1: 'альфа',
    Q2: 'бета',
  };
  return {
    entities: Object.fromEntries(
      ids.map((id) => [
        id,
        {
          id,
          labels: {
            ru: {
              value: values[id],
            },
          },
          descriptions: {
            ru: {
              value: `${values[id]} test entity`,
            },
          },
          sitelinks: {},
        },
      ])
    ),
  };
}
