import { describe, it, expect } from 'test-anywhere';
import {
  formalizeTextWith,
  FORMALIZE_LINK_TARGETS,
  tokenizeForFormalize,
  generateFormalizeNgrams,
  buildFormalizeMarkdownLink,
  buildFormalizeHtmlLink,
  resolveFormalizeLinkTarget,
} from '../src/index.js';

const wikidataApiUrl = 'https://www.wikidata.org/w/api.php';

function jsonResponse(payload) {
  return Promise.resolve({
    ok: true,
    status: 200,
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

function entity({ id, label, sitelink, claims = {} }) {
  const wikidataClaims = {};
  for (const [property, ids] of Object.entries(claims)) {
    wikidataClaims[property] = ids.map((target) => ({
      mainsnak: {
        datavalue: {
          value: { id: target, 'numeric-id': Number(target.slice(1)) },
        },
      },
    }));
  }
  return {
    id,
    type: id.startsWith('P') ? 'property' : 'item',
    labels: { en: { value: label } },
    descriptions: {},
    claims: wikidataClaims,
    sitelinks: sitelink ? { enwiki: { site: 'enwiki', title: sitelink } } : {},
  };
}

function makeFetch(routes) {
  return function mockFetch(url) {
    const parsed = new URL(url);
    const action = parsed.searchParams.get('action');
    if (action === 'wbsearchentities') {
      const search = parsed.searchParams.get('search');
      const type = parsed.searchParams.get('type');
      const route = routes.search?.[`${search}|${type}`];
      if (route) {
        return jsonResponse(searchPayload(route));
      }
      return jsonResponse(searchPayload([]));
    }
    if (action === 'wbgetentities') {
      const ids = parsed.searchParams.get('ids');
      const route = routes.entities?.[ids];
      if (route) {
        return jsonResponse(entityPayload([route]));
      }
      return jsonResponse({ entities: {} });
    }
    return jsonResponse({});
  };
}

// eslint-disable-next-line max-lines-per-function
describe('issue 15 — formalize text into Wikipedia/Wikidata-anchored phrases', () => {
  it('tokenizes input and skips stop-only n-grams', () => {
    const tokens = tokenizeForFormalize('Barack Obama was born in Hawaii.');
    expect(tokens.join(' ')).toBe('Barack Obama was born in Hawaii');
    const ngrams = generateFormalizeNgrams(tokens, 3);
    const stopOnly = ngrams.find((entry) => entry.text === 'in');
    expect(stopOnly).toBe(undefined);
    const longest = ngrams.find((entry) => entry.text === 'Barack Obama was');
    expect(longest).not.toBe(undefined);
  });

  it('prefers the longest non-overlapping match (Barack Obama as one entity)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Barack Obama|item': [
          {
            id: 'Q76',
            label: 'Barack Obama',
            description: '44th US president',
          },
        ],
        'Barack|item': [
          { id: 'Q761', label: 'Barack', description: 'a different person' },
        ],
        'Obama|item': [{ id: 'Q762', label: 'Obama', description: 'a city' }],
        'Hawaii|item': [
          { id: 'Q782', label: 'Hawaii', description: 'US state' },
        ],
      },
      entities: {
        Q76: entity({
          id: 'Q76',
          label: 'Barack Obama',
          sitelink: 'Barack Obama',
          claims: { P31: ['Q5'], P106: ['Q82955'] },
        }),
        Q782: entity({
          id: 'Q782',
          label: 'Hawaii',
          sitelink: 'Hawaii',
          claims: { P31: ['Q35657'] },
        }),
      },
    });

    const result = await formalizeTextWith('Barack Obama Hawaii', {
      fetch: fetchImpl,
      maxNgramSize: 2,
      now: () => 0,
    });

    const linkedPhrases = result.phrases.filter((phrase) => phrase.entity);
    expect(linkedPhrases.length).toBe(2);
    const obama = linkedPhrases.find(
      (phrase) => phrase.text === 'Barack Obama'
    );
    expect(obama?.entity?.id).toBe('Q76');
    expect(obama?.size).toBe(2);
    const hawaii = linkedPhrases.find((phrase) => phrase.text === 'Hawaii');
    expect(hawaii?.entity?.id).toBe('Q782');
  });

  it('emits HTML link with title containing the Q id (F6)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Hawaii|item': [{ id: 'Q782', label: 'Hawaii', description: 'state' }],
      },
      entities: {
        Q782: entity({ id: 'Q782', label: 'Hawaii', sitelink: 'Hawaii' }),
      },
    });
    const result = await formalizeTextWith('Hawaii', {
      fetch: fetchImpl,
      now: () => 0,
    });
    expect(result.html.includes('title="Q782"')).toBe(true);
    expect(result.html.includes('https://en.wikipedia.org/wiki/Hawaii')).toBe(
      true
    );
  });

  it('renders Markdown with [phrase](url "Qid") shape (F8)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Hawaii|item': [{ id: 'Q782', label: 'Hawaii', description: 'state' }],
      },
      entities: {
        Q782: entity({ id: 'Q782', label: 'Hawaii', sitelink: 'Hawaii' }),
      },
    });
    const result = await formalizeTextWith('Hawaii', {
      fetch: fetchImpl,
      now: () => 0,
    });
    expect(result.markdown).toBe(
      '[Hawaii](https://en.wikipedia.org/wiki/Hawaii "Q782")'
    );
  });

  it('falls back to Wikidata page when no enwiki sitelink (properties)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'place of birth|property': [
          {
            id: 'P19',
            label: 'place of birth',
            description: 'most specific known birth location',
          },
        ],
        'place of birth|item': [],
      },
      entities: {
        P19: entity({ id: 'P19', label: 'place of birth' }),
      },
    });
    const result = await formalizeTextWith('place of birth', {
      fetch: fetchImpl,
      maxNgramSize: 3,
      now: () => 0,
    });
    const phrase = result.phrases.find(
      (entry) => entry.entity && entry.entity.id === 'P19'
    );
    expect(phrase).not.toBe(undefined);
    const url = resolveFormalizeLinkTarget(phrase, {
      linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIPEDIA,
    });
    expect(url).toBe('https://www.wikidata.org/wiki/Property:P19');
  });

  it('respects local viewer toggle for entities and properties (F7)', async () => {
    const phrase = {
      text: 'Hawaii',
      entity: {
        id: 'Q782',
        label: 'Hawaii',
        kind: 'entity',
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Hawaii',
      },
    };
    const propertyPhrase = {
      text: 'place of birth',
      entity: {
        id: 'P19',
        label: 'place of birth',
        kind: 'property',
        wikipediaUrl: null,
      },
    };
    expect(
      resolveFormalizeLinkTarget(phrase, {
        linkTargetMode: FORMALIZE_LINK_TARGETS.LOCAL,
      })
    ).toBe(
      'https://link-assistant.github.io/human-language/entities.html#Q782'
    );
    expect(
      resolveFormalizeLinkTarget(propertyPhrase, {
        linkTargetMode: FORMALIZE_LINK_TARGETS.LOCAL,
      })
    ).toBe(
      'https://link-assistant.github.io/human-language/properties.html#P19'
    );
  });

  it('always switches link targets to Wikidata when mode=wikidata', () => {
    const phrase = {
      text: 'Hawaii',
      entity: {
        id: 'Q782',
        label: 'Hawaii',
        kind: 'entity',
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Hawaii',
      },
    };
    expect(
      resolveFormalizeLinkTarget(phrase, {
        linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
      })
    ).toBe('https://www.wikidata.org/wiki/Q782');
  });

  it('aggregates contexts with weight and probability (F10/F11)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Albert Einstein|item': [
          { id: 'Q937', label: 'Albert Einstein', description: 'physicist' },
        ],
        'Marie Curie|item': [
          { id: 'Q7186', label: 'Marie Curie', description: 'physicist' },
        ],
      },
      entities: {
        Q937: entity({
          id: 'Q937',
          label: 'Albert Einstein',
          sitelink: 'Albert Einstein',
          claims: { P31: ['Q5'], P106: ['Q169470'] },
        }),
        Q7186: entity({
          id: 'Q7186',
          label: 'Marie Curie',
          sitelink: 'Marie Curie',
          claims: { P31: ['Q5'], P106: ['Q169470'] },
        }),
      },
    });
    const result = await formalizeTextWith('Albert Einstein Marie Curie', {
      fetch: fetchImpl,
      maxNgramSize: 2,
      now: () => 0,
    });
    const human = result.contexts.find((entry) => entry.id === 'Q5');
    expect(human?.weight).toBe(2);
    const physicist = result.contexts.find((entry) => entry.id === 'Q169470');
    expect(physicist?.weight).toBe(2);
    const totalProbability = result.contexts.reduce(
      (sum, entry) => sum + entry.probability,
      0
    );
    expect(Math.abs(totalProbability - 1)).toBeLessThan(1e-6);
    expect(result.mainContext?.weight).toBe(2);
  });

  it('produces at most maxInterpretations interpretations (F13)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Mercury|item': [
          { id: 'Q308', label: 'Mercury', description: 'planet' },
          { id: 'Q925', label: 'Mercury', description: 'element' },
          { id: 'Q1430', label: 'Mercury', description: 'Roman god' },
        ],
      },
      entities: {
        Q308: entity({
          id: 'Q308',
          label: 'Mercury',
          sitelink: 'Mercury (planet)',
          claims: { P31: ['Q634'] },
        }),
      },
    });
    const result = await formalizeTextWith('Mercury', {
      fetch: fetchImpl,
      maxInterpretations: 5,
      now: () => 0,
    });
    expect(result.interpretations.length <= 5).toBe(true);
    expect(result.interpretations.length >= 1).toBe(true);
    expect(result.interpretations[0].rank).toBe(1);
  });

  it('emits Links Notation with phrase and context lines (F9)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Hawaii|item': [{ id: 'Q782', label: 'Hawaii', description: 'state' }],
      },
      entities: {
        Q782: entity({
          id: 'Q782',
          label: 'Hawaii',
          sitelink: 'Hawaii',
          claims: { P31: ['Q35657'] },
        }),
      },
    });
    const result = await formalizeTextWith('Hawaii', {
      fetch: fetchImpl,
      now: () => 0,
    });
    expect(result.linksNotation.includes('(formalization:')).toBe(true);
    expect(result.linksNotation.includes('phrase-1')).toBe(true);
    expect(result.linksNotation.includes('Q782')).toBe(true);
  });

  it('reuses cache for repeated calls (F15)', async () => {
    let calls = 0;
    const cache = new Map();
    const fetchImpl = (url) => {
      calls += 1;
      return makeFetch({
        search: {
          'Hawaii|item': [
            { id: 'Q782', label: 'Hawaii', description: 'state' },
          ],
        },
        entities: {
          Q782: entity({ id: 'Q782', label: 'Hawaii', sitelink: 'Hawaii' }),
        },
      })(url);
    };
    await formalizeTextWith('Hawaii', {
      fetch: fetchImpl,
      cache,
      now: () => 0,
    });
    const callsAfterFirst = calls;
    await formalizeTextWith('Hawaii', {
      fetch: fetchImpl,
      cache,
      now: () => 0,
    });
    expect(calls).toBe(callsAfterFirst);
  });

  it('keeps every word in a phrase, even without a Wikidata match', async () => {
    const fetchImpl = makeFetch({});
    const result = await formalizeTextWith('xyzzy plugh', {
      fetch: fetchImpl,
      now: () => 0,
    });
    const joined = result.phrases.map((phrase) => phrase.text).join(' ');
    expect(joined).toBe('xyzzy plugh');
    expect(result.phrases.every((phrase) => phrase.text.length > 0)).toBe(true);
  });

  it('builds Markdown and HTML links via the standalone helpers', () => {
    const phrase = {
      text: 'Hawaii',
      entity: {
        id: 'Q782',
        label: 'Hawaii',
        kind: 'entity',
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Hawaii',
      },
    };
    expect(
      buildFormalizeMarkdownLink(phrase, {
        linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIPEDIA,
      })
    ).toBe('[Hawaii](https://en.wikipedia.org/wiki/Hawaii "Q782")');
    expect(
      buildFormalizeHtmlLink(phrase, {
        linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIPEDIA,
      })
    ).toBe(
      '<a href="https://en.wikipedia.org/wiki/Hawaii" title="Q782">Hawaii</a>'
    );
  });

  it('always includes the configured Wikidata API endpoint when fetching', async () => {
    const requested = [];
    const fetchImpl = (url) => {
      requested.push(url);
      return jsonResponse({ search: [] });
    };
    await formalizeTextWith('test', { fetch: fetchImpl, now: () => 0 });
    expect(requested.every((url) => url.startsWith(wikidataApiUrl))).toBe(true);
  });
});
