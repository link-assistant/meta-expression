import { describe, expect, it } from 'test-anywhere';
import {
  createTermDataSource,
  decodeFromDoublets,
  getTerm,
  parseTermDataLinksNotation,
} from '../../src/index.js';

function jsonResponse(payload) {
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers(),
    async json() {
      return payload;
    },
  });
}

function wikidataSearchPayload() {
  return {
    search: [
      {
        id: 'Q89',
        label: 'apple',
        description: 'fruit of the apple tree',
        match: { type: 'label', text: 'apple' },
      },
    ],
  };
}

function wikidataEntityPayload() {
  return {
    entities: {
      Q89: {
        id: 'Q89',
        labels: { en: { value: 'apple' } },
        aliases: { en: [{ value: 'malus domestica' }] },
        descriptions: { en: { value: 'fruit of the apple tree' } },
        claims: {
          P31: [
            {
              mainsnak: {
                datavalue: {
                  type: 'wikibase-entityid',
                  value: { id: 'Q3314483', 'numeric-id': 3314483 },
                },
              },
            },
          ],
        },
        sitelinks: { enwiki: { title: 'Apple' } },
      },
    },
  };
}

function wikipediaSummaryPayload() {
  return {
    title: 'Apple',
    extract: 'An apple is an edible fruit produced by an apple tree.',
    description: 'edible fruit',
    content_urls: {
      desktop: { page: 'https://en.wikipedia.org/wiki/Apple' },
    },
  };
}

function wiktionaryDefinitionPayload() {
  return {
    en: [
      {
        partOfSpeech: 'Noun',
        definitions: [
          { definition: 'A common, round fruit produced by an apple tree.' },
        ],
      },
    ],
  };
}

function makeFetch(calls) {
  return async function fetchFixture(url) {
    calls.push(String(url));
    const parsed = new URL(String(url));
    if (
      parsed.hostname === 'www.wikidata.org' &&
      parsed.searchParams.get('action') === 'wbsearchentities'
    ) {
      return jsonResponse(wikidataSearchPayload());
    }
    if (
      parsed.hostname === 'www.wikidata.org' &&
      parsed.searchParams.get('action') === 'wbgetentities'
    ) {
      return jsonResponse(wikidataEntityPayload());
    }
    if (parsed.hostname === 'en.wikipedia.org') {
      return jsonResponse(wikipediaSummaryPayload());
    }
    if (parsed.hostname === 'en.wiktionary.org') {
      return jsonResponse(wiktionaryDefinitionPayload());
    }
    return jsonResponse({});
  };
}

describe('issue 108 - unified term data source', () => {
  it('merges Wikimedia term data with provenance and dual cache artifacts', async () => {
    const calls = [];
    const cache = new Map();
    const source = createTermDataSource({
      cache,
      cacheJitterMs: 0,
      cacheTtlMs: 1000,
      fetch: makeFetch(calls),
      now: () => 0,
    });

    const first = await source.getTerm('apple');

    expect(first.kind).toBe('term-data');
    expect(first.fields.id).toBe('Q89');
    expect(first.fields.label).toBe('apple');
    expect(first.fields.description).toBe('fruit of the apple tree');
    expect(first.fields.wikipediaTitle).toBe('Apple');
    expect(first.fields.wikipediaSummary).toContain('edible fruit');
    expect(first.fields.wiktionaryEntries[0].partOfSpeech).toBe('Noun');
    expect(first.fields.claims.P31[0].id).toBe('Q3314483');

    expect(first.provenance.fields.label[0].source).toBe('wikidata');
    expect(first.provenance.fields.wikipediaSummary[0].source).toBe(
      'wikipedia'
    );
    expect(first.provenance.fields.wiktionaryEntries[0].source).toBe(
      'wiktionary'
    );
    expect(first.provenance.fields.wiktionaryEntries[0].targetField).toBe(
      'fields.wiktionaryEntries'
    );

    const parsed = parseTermDataLinksNotation(first.artifacts.linksNotation);
    expect(parsed.fields.id).toBe('Q89');
    expect(parsed.provenance.fields.label[0].mergeStrategy).toBe(
      'prefer-wikidata-label'
    );

    const decoded = decodeFromDoublets(first.artifacts.binary);
    expect(decoded.fields.wikipediaTitle).toBe('Apple');

    const rawCacheEntries = [...cache.entries()].filter(([key]) =>
      key.startsWith('https://')
    );
    expect(rawCacheEntries.length).toBe(4);
    for (const [, entry] of rawCacheEntries) {
      expect(entry.artifacts.linksNotation).toContain('term-data-request');
      expect(decodeFromDoublets(entry.artifacts.binary).request.url).toContain(
        'https://'
      );
    }

    const callCount = calls.length;
    const second = await source.getTerm('apple');
    expect(calls.length).toBe(callCount);
    expect(second.fields).toEqual(first.fields);
    expect(second.artifacts.linksNotation).toBe(first.artifacts.linksNotation);
  });

  it('caches repeated top-level getTerm calls', async () => {
    const calls = [];
    const options = {
      cacheJitterMs: 0,
      cacheTtlMs: 1000,
      fetch: makeFetch(calls),
      now: () => 0,
    };

    await getTerm('issue108 cache probe', options);
    const callCount = calls.length;
    const second = await getTerm('issue108 cache probe', options);

    expect(calls.length).toBe(callCount);
    expect(second.fields.id).toBe('Q89');
  });
});
