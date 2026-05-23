import { describe, it, expect } from 'test-anywhere';
import {
  FORMALIZE_SOURCE_KIND,
  createWikidataSource,
  translateTextWith,
} from '../../src/index.js';
import { assertCompleteTranslationCoverage } from '../helpers/translation-coverage.js';

function jsonResponse(payload, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
  });
}

function searchPayload(entries) {
  return { search: entries };
}

function entityPayload(entries) {
  const entities = {};
  for (const entry of entries) {
    entities[entry.id] = entry;
  }
  return { entities };
}

function entity({ id, label, language = 'en', sitelink = null }) {
  const site = `${language}wiki`;
  return {
    id,
    type: id.startsWith('P') ? 'property' : 'item',
    labels: { [language]: { value: label } },
    descriptions: {
      [language]: { value: `${label} description` },
    },
    claims: {},
    aliases: {},
    sitelinks: sitelink ? { [site]: { site, title: sitelink } } : {},
  };
}

function makeIdentifiedFetch(routes, calls) {
  return function mockFetch(url, init = {}) {
    const parsed = new URL(url);
    const action = parsed.searchParams.get('action');
    const call = {
      action,
      search: parsed.searchParams.get('search'),
      type: parsed.searchParams.get('type'),
      language: parsed.searchParams.get('language') ?? 'en',
      ids: parsed.searchParams.get('ids'),
      languages: parsed.searchParams.get('languages') ?? 'en',
      identified: hasMetaExpressionHeader(init.headers),
    };
    calls.push(call);

    if (!call.identified) {
      return jsonResponse({ error: 'missing Wikimedia user agent' }, 429);
    }
    if (action === 'wbsearchentities') {
      const route =
        routes.search?.[`${call.search}|${call.type}|${call.language}`];
      return jsonResponse(searchPayload(route ?? []));
    }
    if (action === 'wbgetentities') {
      const route = routes.entities?.[`${call.ids}|${call.languages}`];
      return jsonResponse(route ? entityPayload([route]) : { entities: {} });
    }
    return jsonResponse({});
  };
}

function hasMetaExpressionHeader(headers) {
  const apiUserAgent = readHeader(headers, 'Api-User-Agent');
  const userAgent = readHeader(headers, 'User-Agent');
  return [apiUserAgent, userAgent].some((value) =>
    String(value ?? '').includes('meta-expression')
  );
}

function readHeader(headers, name) {
  if (!headers) {
    return null;
  }
  if (typeof headers.get === 'function') {
    return headers.get(name);
  }
  return headers[name] ?? headers[name.toLowerCase()] ?? null;
}

function hawaiiStateRoutes() {
  return {
    search: {
      'Hawaii|item|en': [
        { id: 'Q782', label: 'Hawaii', description: 'US state' },
      ],
      'Hawaii is a|item|en': [
        { id: 'Q782', label: 'Hawaii', description: 'US state' },
      ],
      'a state|item|en': [
        { id: 'Q7275', label: 'state', description: 'federated state' },
      ],
      'state|item|en': [
        { id: 'Q7275', label: 'state', description: 'federated state' },
      ],
      'Гавайи|item|ru': [
        { id: 'Q782', label: 'Гавайи', description: 'штат США' },
      ],
      'штат|item|ru': [
        { id: 'Q7275', label: 'штат', description: 'federated state' },
      ],
    },
    entities: {
      'Q782|en': entity({
        id: 'Q782',
        label: 'Hawaii',
        language: 'en',
        sitelink: 'Hawaii',
      }),
      'Q782|ru': entity({
        id: 'Q782',
        label: 'Гавайи',
        language: 'ru',
        sitelink: 'Гавайи',
      }),
      'Q7275|en': entity({
        id: 'Q7275',
        label: 'state',
        language: 'en',
        sitelink: 'Federated state',
      }),
      'Q7275|ru': entity({
        id: 'Q7275',
        label: 'государство',
        language: 'ru',
        sitelink: 'Государство',
      }),
    },
  };
}

function createStateDisambiguationSource() {
  return {
    name: FORMALIZE_SOURCE_KIND.WIKIPEDIA,
    async searchPhrase(text) {
      if (text !== 'state') {
        return [];
      }
      return [
        {
          id: 'Q12251220',
          label: 'State',
          description:
            'Look up State or state in Wiktionary. State may refer to many topics.',
          kind: 'entity',
          source: FORMALIZE_SOURCE_KIND.WIKIPEDIA,
          matchText: 'State',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/State',
          wikipediaTitle: 'State',
        },
      ];
    },
  };
}

describe('issue 35 — Hawaii translation through semantic phrases', () => {
  it('identifies Wikimedia calls, rejects grammar-fragment n-grams, and emits Russian', async () => {
    const calls = [];
    const fetchImpl = makeIdentifiedFetch(hawaiiStateRoutes(), calls);

    const result = await translateTextWith('Hawaii is a state.', {
      fetch: fetchImpl,
      sources: [createWikidataSource({ language: 'en' })],
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    const wikidataLinkedPhrases = result.formalization.cst.phrases.filter(
      (phrase) => /^[QP]\d+$/.test(phrase.entity?.id ?? '')
    );
    expect(calls.every((call) => call.identified)).toBe(true);
    expect(calls.map((call) => call.search)).not.toContain('Hawaii is a');
    expect(calls.map((call) => call.search)).not.toContain('a state');
    expect(calls.map((call) => call.search)).not.toContain('is a state');
    expect(wikidataLinkedPhrases.map((phrase) => phrase.text)).toEqual([
      'Hawaii',
      'state',
    ]);
    expect(wikidataLinkedPhrases.map((phrase) => phrase.entity.id)).toEqual([
      'Q782',
      'Q7275',
    ]);
    expect(result.plainText).toBe('Гавайи это штат.');
    expect(result.markdown).toContain('[Гавайи](');
    expect(result.markdown).toContain('[это](');
    expect(result.markdown).toContain('[штат](');
    const stateTranslation = result.phrases.find(
      (phrase) => phrase.source.text === 'state'
    );
    expect(stateTranslation.entityId).toBe('Q7275');
    expect(stateTranslation.target.text).toBe('штат');
    expect(stateTranslation.target.entityId).toBe('Q35657');
    expect(result.linksNotation).toContain(
      'source (state) target (штат) status translated id Q7275 targetId Q35657'
    );
    expect(result.sentences[0].transformations).toEqual([
      'english-article-omission',
      'english-copula-to-russian-eto',
      'english-us-state-predicate-to-russian-shtat',
    ]);
    assertCompleteTranslationCoverage(result, 'Hawaii is a state.');
  });

  it('round-trips the fixed sentence through Russian without semantic loss', async () => {
    const calls = [];
    const fetchImpl = makeIdentifiedFetch(hawaiiStateRoutes(), calls);

    const ru = await translateTextWith('Hawaii is a state.', {
      fetch: fetchImpl,
      sources: [createWikidataSource({ language: 'en' })],
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });
    const en = await translateTextWith(ru.plainText, {
      fetch: fetchImpl,
      sources: [createWikidataSource({ language: 'ru' })],
      sourceLanguage: 'ru',
      targetLanguage: 'en',
      now: () => 0,
    });

    expect(ru.plainText).toBe('Гавайи это штат.');
    expect(en.plainText).toBe('Hawaii is a state.');
    expect(en.sentences[0].transformations).toEqual([
      'russian-copula-to-english-be',
      'english-indefinite-article-insertion',
    ]);
    assertCompleteTranslationCoverage(ru, 'Hawaii is a state.');
    assertCompleteTranslationCoverage(en, 'Гавайи это штат.');
    expect(calls.map((call) => call.search)).not.toContain('Гавайи это');
    expect(calls.map((call) => call.search)).not.toContain('это штат');
    expect(en.questions).toEqual([]);
  });

  it('prefers the Wikidata state concept over a Wikipedia disambiguation page', async () => {
    const calls = [];
    const fetchImpl = makeIdentifiedFetch(hawaiiStateRoutes(), calls);

    const result = await translateTextWith('Hawaii is a state.', {
      fetch: fetchImpl,
      sources: [
        createStateDisambiguationSource(),
        createWikidataSource({ language: 'en' }),
      ],
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    const statePhrase = result.formalization.cst.phrases.find(
      (phrase) => phrase.text === 'state'
    );
    expect(statePhrase.entity.id).toBe('Q7275');
    expect(result.plainText).toBe('Гавайи это штат.');
    assertCompleteTranslationCoverage(result, 'Hawaii is a state.');
  });
});
