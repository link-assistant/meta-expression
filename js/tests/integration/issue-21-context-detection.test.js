/**
 * Tests for the issue #21 disambiguation + context-detection upgrades.
 *
 * Two behaviours are pinned here:
 *
 *  1. "to formalize" verb-form expansion — searching the bare token
 *     `formalize` must ALSO probe `to formalize`, the alias under which
 *     Q115492965 is stored. Without this expansion the candidate list
 *     never surfaces Q115492965 (its canonical label is `formalizing`).
 *
 *  2. Multi-candidate context aggregation — every Wikidata-shaped
 *     candidate of every phrase contributes a weighted vote to the
 *     shared-context tally. A sentence whose top picks disagree should
 *     still produce a non-empty contexts list when the alternatives
 *     cluster around a common world.
 */

import { describe, it, expect } from 'test-anywhere';
import {
  formalizeTextWith,
  aggregateBigContextsFromGraph,
  createWikipediaSource,
  createWiktionarySource,
  createWikidataSource,
  createDefaultSourceTiers,
  FORMALIZE_SOURCES,
  generateFormalizeNgrams,
  tokenizeForFormalize,
} from '../../src/index.js';

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

function entity({ id, label, aliases = [], sitelink, claims = {} }) {
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
    aliases: aliases.length ? { en: aliases.map((value) => ({ value })) } : {},
    descriptions: {},
    claims: wikidataClaims,
    sitelinks: sitelink ? { enwiki: { site: 'enwiki', title: sitelink } } : {},
  };
}

function makeFetch(routes) {
  return function mockFetch(url) {
    const parsed = new URL(url);
    if (parsed.origin + parsed.pathname !== wikidataApiUrl) {
      return jsonResponse({});
    }
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

describe('issue 21 — verb-form disambiguation', () => {
  it('routes "formalize" through the "to formalize" alias to Q115492965', async () => {
    const calls = [];
    const baseFetch = makeFetch({
      search: {
        // Wikidata's natural top hit for the bare verb is unrelated
        // (Formalized Mathematics) — exactly the failure described in
        // the issue. The "to formalize" variant returns Q115492965.
        'formalize|item': [
          {
            id: 'Q1156400',
            label: 'Formalized Mathematics',
            description: 'journal',
          },
        ],
        'to formalize|item': [
          {
            id: 'Q115492965',
            label: 'formalizing',
            description: 'act of describing in a strict form',
            match: { type: 'alias', text: 'to formalize' },
            aliases: ['to formalize', 'formalization'],
          },
        ],
      },
      entities: {
        Q115492965: entity({
          id: 'Q115492965',
          label: 'formalizing',
          aliases: ['to formalize', 'formalization'],
          sitelink: 'Formalization',
          claims: { P31: ['Q1969448'] },
        }),
        Q1156400: entity({
          id: 'Q1156400',
          label: 'Formalized Mathematics',
          sitelink: 'Formalized Mathematics',
          claims: { P31: ['Q41298'] },
        }),
      },
    });
    function recordingFetch(url, init) {
      calls.push(String(url));
      return baseFetch(url, init);
    }

    const result = await formalizeTextWith('formalize', {
      fetch: recordingFetch,
      maxNgramSize: 1,
      now: () => 0,
    });

    const phrase = result.phrases.find((entry) => entry.text === 'formalize');
    expect(phrase).not.toBe(undefined);
    const ids = phrase.candidates.map((candidate) => candidate.id);
    expect(ids.includes('Q115492965')).toBe(true);

    const usedToFormalize = calls.some(
      (url) =>
        url.includes('search=to+formalize') ||
        url.includes('search=to%20formalize')
    );
    expect(usedToFormalize).toBe(true);
  });

  it('does not expand multi-token phrases or non-verb-like tokens', async () => {
    const calls = [];
    const baseFetch = makeFetch({ search: {}, entities: {} });
    function recordingFetch(url, init) {
      calls.push(String(url));
      return baseFetch(url, init);
    }
    await formalizeTextWith('Hawaii archipelago', {
      fetch: recordingFetch,
      maxNgramSize: 2,
      now: () => 0,
    });
    const expanded = calls.find((url) => url.includes('search=to+'));
    expect(expanded).toBe(undefined);
  });
});

describe('issue 21 — multi-candidate context aggregation', () => {
  it('lets weaker candidates contribute weighted votes to the shared context', () => {
    // Three phrases. Each has TWO candidates. Top picks (Q11, Q21, Q31)
    // disagree on a single small graph, but their alternatives all roll
    // up to the same big context Q1000. Without multi-candidate voting
    // Q1000 would only receive one vote (from whichever phrase happened
    // to elect it). With it, Q1000 wins decisively.
    const edges = new Map([
      ['Q11', [{ id: 'Q100', property: 'P31' }]],
      ['Q12', [{ id: 'Q1000', property: 'P31' }]],
      ['Q21', [{ id: 'Q200', property: 'P31' }]],
      ['Q22', [{ id: 'Q1000', property: 'P31' }]],
      ['Q31', [{ id: 'Q300', property: 'P31' }]],
      ['Q32', [{ id: 'Q1000', property: 'P31' }]],
    ]);

    const phrases = [
      {
        text: 'a',
        entity: {
          id: 'Q11',
          score: 10,
          contextLabels: [{ property: 'P31', targetId: 'Q11' }],
        },
        candidates: [
          {
            id: 'Q11',
            score: 10,
            contextLabels: [{ property: 'P31', targetId: 'Q11' }],
          },
          {
            id: 'Q12',
            score: 8,
            contextLabels: [{ property: 'P31', targetId: 'Q12' }],
          },
        ],
      },
      {
        text: 'b',
        entity: {
          id: 'Q21',
          score: 10,
          contextLabels: [{ property: 'P31', targetId: 'Q21' }],
        },
        candidates: [
          {
            id: 'Q21',
            score: 10,
            contextLabels: [{ property: 'P31', targetId: 'Q21' }],
          },
          {
            id: 'Q22',
            score: 8,
            contextLabels: [{ property: 'P31', targetId: 'Q22' }],
          },
        ],
      },
      {
        text: 'c',
        entity: {
          id: 'Q31',
          score: 10,
          contextLabels: [{ property: 'P31', targetId: 'Q31' }],
        },
        candidates: [
          {
            id: 'Q31',
            score: 10,
            contextLabels: [{ property: 'P31', targetId: 'Q31' }],
          },
          {
            id: 'Q32',
            score: 8,
            contextLabels: [{ property: 'P31', targetId: 'Q32' }],
          },
        ],
      },
    ];

    const aggregated = aggregateBigContextsFromGraph(edges, phrases, {
      maxDepth: 2,
    });

    expect(aggregated.main.id).toBe('Q1000');
    // Q1000 collects a vote from each of the three phrases via the
    // weaker candidate, so its sourcePhrases must be all three.
    expect(aggregated.main.sourcePhrases.length).toBe(3);
    // The dominant candidates' direct contexts (Q11, Q21, Q31) and
    // their immediate ancestors (Q100, Q200, Q300) must still appear
    // in the aggregate so the chosen sense remains visible.
    const ids = aggregated.all.map((entry) => entry.id);
    expect(ids.includes('Q11')).toBe(true);
    expect(ids.includes('Q21')).toBe(true);
    expect(ids.includes('Q31')).toBe(true);
  });

  it('records sourceCandidates with the per-candidate weight', () => {
    const edges = new Map([
      ['Q1', [{ id: 'Q9', property: 'P31' }]],
      ['Q2', [{ id: 'Q9', property: 'P31' }]],
    ]);
    const phrases = [
      {
        text: 'reasoning',
        entity: {
          id: 'Q1',
          score: 30,
          contextLabels: [{ property: 'P31', targetId: 'Q1' }],
        },
        candidates: [
          {
            id: 'Q1',
            label: 'reasoning',
            score: 30,
            contextLabels: [{ property: 'P31', targetId: 'Q1' }],
          },
          {
            id: 'Q2',
            label: 'reasoning (math)',
            score: 10,
            contextLabels: [{ property: 'P31', targetId: 'Q2' }],
          },
        ],
      },
    ];
    const aggregated = aggregateBigContextsFromGraph(edges, phrases, {
      maxDepth: 2,
    });
    const q9 = aggregated.all.find((entry) => entry.id === 'Q9');
    expect(q9).not.toBe(undefined);
    expect(q9.sourceCandidates.length).toBe(2);
    const total = q9.sourceCandidates.reduce(
      (sum, candidate) => sum + candidate.weight,
      0
    );
    // Per-candidate weights sum to 1 across a single phrase.
    expect(Math.abs(total - 1) < 1e-9).toBe(true);
  });
});

describe('issue 21 — disambiguation tier registry', () => {
  it('exposes the four default tiers in priority order', () => {
    const tiers = createDefaultSourceTiers('en');
    expect(tiers.length).toBe(4);
    expect(tiers[0].name).toBe(FORMALIZE_SOURCES.WIKIPEDIA);
    expect(tiers[1].name).toBe(FORMALIZE_SOURCES.WIKIDATA);
    expect(tiers[2].name).toBe(FORMALIZE_SOURCES.VIRTUAL);
    expect(tiers[3].name).toBe(FORMALIZE_SOURCES.WIKTIONARY);
  });

  it('keeps single-token stop words in the n-gram list with stopOnly=true', () => {
    const tokens = tokenizeForFormalize('the cat');
    const ngrams = generateFormalizeNgrams(tokens, 2);
    const the = ngrams.find((entry) => entry.text === 'the');
    expect(the).not.toBe(undefined);
    expect(the.stopOnly).toBe(true);
    const cat = ngrams.find((entry) => entry.text === 'cat');
    expect(cat).not.toBe(undefined);
    expect(cat.stopOnly).toBe(false);
  });
});

describe('issue 21 — Wikipedia tier', () => {
  it('Wikipedia source backfills wikibase_item Q-ids onto its candidates', async () => {
    const wikipediaApi = 'https://en.wikipedia.org/w/api.php';
    function mockFetch(url) {
      const parsed = new URL(url);
      const action = parsed.searchParams.get('action');
      if (parsed.origin + parsed.pathname !== wikipediaApi) {
        return jsonResponse({});
      }
      if (action === 'query' && parsed.searchParams.get('list') === 'search') {
        return jsonResponse({
          query: {
            search: [
              { title: 'Hawaii', snippet: '<em>Hawaii</em> is a US state.' },
            ],
          },
        });
      }
      if (
        action === 'query' &&
        parsed.searchParams.get('prop') === 'pageprops'
      ) {
        return jsonResponse({
          query: {
            pages: {
              123: {
                title: 'Hawaii',
                pageprops: { wikibase_item: 'Q782' },
              },
            },
          },
        });
      }
      return jsonResponse({});
    }
    const source = createWikipediaSource();
    const candidates = await source.searchPhrase('Hawaii', {
      fetchImpl: mockFetch,
      fetchJson: async (url) => (await mockFetch(url)).json(),
    });
    expect(candidates.length).toBe(1);
    expect(candidates[0].id).toBe('Q782');
    expect(candidates[0].wikipediaTitle).toBe('Hawaii');
    expect(candidates[0].source).toBe(FORMALIZE_SOURCES.WIKIPEDIA);
  });

  it('falls back to a wp:<slug> id when Wikipedia returns no wikibase_item', async () => {
    function mockFetch(url) {
      const parsed = new URL(url);
      if (parsed.searchParams.get('list') === 'search') {
        return jsonResponse({
          query: { search: [{ title: 'Local Page', snippet: 'page' }] },
        });
      }
      return jsonResponse({ query: { pages: { 0: { title: 'Local Page' } } } });
    }
    const source = createWikipediaSource();
    const candidates = await source.searchPhrase('local page', {
      fetchImpl: mockFetch,
      fetchJson: async (url) => (await mockFetch(url)).json(),
    });
    expect(candidates.length).toBe(1);
    expect(candidates[0].id).toBe('wp:en:local_page');
    expect(candidates[0].wikibaseId).toBe(null);
  });
});

describe('issue 21 — Wiktionary tier', () => {
  it('Wiktionary source returns one candidate per definition for single tokens', async () => {
    const wiktionaryEndpoint =
      'https://en.wiktionary.org/api/rest_v1/page/definition/the';
    function mockFetch(url) {
      if (String(url) !== wiktionaryEndpoint) {
        return jsonResponse({});
      }
      return jsonResponse({
        en: [
          {
            partOfSpeech: 'Article',
            definitions: [
              { definition: '<b>The</b> definite article.' },
              { definition: 'Used to refer to a specific item.' },
            ],
          },
        ],
      });
    }
    const source = createWiktionarySource();
    const candidates = await source.searchPhrase('the', {
      fetchImpl: mockFetch,
      fetchJson: async (url) => (await mockFetch(url)).json(),
    });
    expect(candidates.length).toBe(2);
    expect(candidates[0].partOfSpeech).toBe('Article');
    expect(candidates[0].definition.includes('<b>')).toBe(false);
    expect(candidates[0].source).toBe(FORMALIZE_SOURCES.WIKTIONARY);
    expect(candidates[0].id.startsWith('wikt:en:the')).toBe(true);
  });

  it('skips Wiktionary lookups for multi-token phrases', async () => {
    let called = false;
    function mockFetch() {
      called = true;
      return jsonResponse({});
    }
    const source = createWiktionarySource();
    const candidates = await source.searchPhrase('Hawaii archipelago', {
      fetchImpl: mockFetch,
      fetchJson: async (url) => (await mockFetch(url)).json(),
    });
    expect(candidates.length).toBe(0);
    expect(called).toBe(false);
  });
});

describe('issue 21 — pipeline integration of new tiers', () => {
  it('routes stop words ONLY to the Wiktionary tier in the full pipeline', async () => {
    // The full pipeline must NOT spend Wikipedia / Wikidata calls on
    // glue words. Only Wiktionary should fire for `the`.
    const calls = [];
    function recordingFetch(url) {
      calls.push(String(url));
      const parsed = new URL(url);
      if (parsed.host === 'en.wiktionary.org') {
        return jsonResponse({
          en: [
            {
              partOfSpeech: 'Article',
              definitions: [{ definition: 'definite article' }],
            },
          ],
        });
      }
      return jsonResponse({ search: [], query: { search: [], pages: {} } });
    }
    const result = await formalizeTextWith('the', {
      fetch: recordingFetch,
      now: () => 0,
    });
    const wiktionaryHits = calls.filter((url) =>
      url.startsWith('https://en.wiktionary.org/api/rest_v1/page/definition/')
    );
    const wikipediaHits = calls.filter((url) =>
      url.startsWith('https://en.wikipedia.org/w/api.php')
    );
    const wikidataHits = calls.filter((url) =>
      url.startsWith('https://www.wikidata.org/w/api.php')
    );
    expect(wiktionaryHits.length > 0).toBe(true);
    expect(wikipediaHits.length).toBe(0);
    expect(wikidataHits.length).toBe(0);
    const phrase = result.phrases.find((entry) => entry.text === 'the');
    expect(phrase).not.toBe(undefined);
    expect(phrase.candidates.length > 0).toBe(true);
    expect(phrase.candidates[0].source).toBe(FORMALIZE_SOURCES.WIKTIONARY);
  });

  it('Wikipedia-confirmed Wikidata Q-id outranks a bare Wikidata-only hit', async () => {
    // Two distinct Q-ids surface for `Hawaii`. Q782 is confirmed by
    // BOTH Wikipedia (via wikibase_item) and Wikidata search; Q500
    // shows up only on Wikidata. The Wikipedia-confirmed candidate
    // should win because Wikipedia is the FIRST tier per issue #21.
    function mockFetch(url) {
      const parsed = new URL(url);
      if (parsed.host === 'en.wikipedia.org') {
        if (parsed.searchParams.get('list') === 'search') {
          return jsonResponse({
            query: { search: [{ title: 'Hawaii', snippet: 'state' }] },
          });
        }
        return jsonResponse({
          query: {
            pages: {
              1: { title: 'Hawaii', pageprops: { wikibase_item: 'Q782' } },
            },
          },
        });
      }
      if (parsed.host === 'www.wikidata.org') {
        if (parsed.searchParams.get('action') === 'wbsearchentities') {
          return jsonResponse({
            search: [
              { id: 'Q500', label: 'Hawaii (other)', description: 'misc' },
              { id: 'Q782', label: 'Hawaii', description: 'US state' },
            ],
          });
        }
        if (parsed.searchParams.get('action') === 'wbgetentities') {
          const ids = parsed.searchParams.get('ids') ?? '';
          const entities = {};
          for (const id of ids.split('|').filter(Boolean)) {
            entities[id] = {
              id,
              type: 'item',
              labels: {
                en: { value: id === 'Q782' ? 'Hawaii' : 'Hawaii (other)' },
              },
              descriptions: {},
              claims: {},
              sitelinks:
                id === 'Q782'
                  ? { enwiki: { site: 'enwiki', title: 'Hawaii' } }
                  : {},
            };
          }
          return jsonResponse({ entities });
        }
      }
      return jsonResponse({});
    }
    const result = await formalizeTextWith('Hawaii', {
      fetch: mockFetch,
      now: () => 0,
      maxNgramSize: 1,
    });
    const phrase = result.phrases.find((entry) => entry.text === 'Hawaii');
    expect(phrase).not.toBe(undefined);
    expect(phrase.entity?.id).toBe('Q782');
    // Q782 candidate must carry both source tags so future scorers /
    // UI tooltips can attribute the hit correctly.
    const merged = phrase.candidates.find((entry) => entry.id === 'Q782');
    expect(merged).not.toBe(undefined);
    expect(
      Array.isArray(merged.sources) &&
        merged.sources.includes(FORMALIZE_SOURCES.WIKIPEDIA) &&
        merged.sources.includes(FORMALIZE_SOURCES.WIKIDATA)
    ).toBe(true);
  });

  it('still allows callers to disable the new tiers by passing explicit sources', async () => {
    const calls = [];
    function recordingFetch(url) {
      calls.push(String(url));
      return jsonResponse({ search: [] });
    }
    await formalizeTextWith('test', {
      fetch: recordingFetch,
      now: () => 0,
      sources: [createWikidataSource()],
    });
    const offWikidata = calls.filter(
      (url) => !url.startsWith('https://www.wikidata.org/w/api.php')
    );
    expect(offWikidata.length).toBe(0);
  });
});
