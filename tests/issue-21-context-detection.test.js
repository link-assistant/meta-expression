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
