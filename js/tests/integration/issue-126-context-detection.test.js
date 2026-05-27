/**
 * Tests for issue #126 — wrong context detection.
 *
 * The reported failure: the phrase "developing systems" was formalized as
 * Q41668433 — a 1997 clinical-trials *scientific article* titled
 * "Developing systems for cost-effective auditing of clinical trials" —
 * instead of the everyday meaning of the words. Wikidata's
 * `wbsearchentities` happily returns scholarly-publication entities whose
 * long titles merely *contain* the searched phrase, and the scorer used to
 * treat that title-fragment match as evidence that the multi-word n-gram was
 * a meaningful phrase. It then claimed the tokens and rendered the article.
 *
 * These tests pin the fix:
 *
 *  1. A scholarly-publication candidate whose title merely *contains* the
 *     phrase must NOT be selected, and must not keep the multi-word n-gram
 *     alive at the expense of the individual words.
 *
 *  2. Per-word context detection must be surfaced on the result so the
 *     debug log / UI can show how each word's possible contexts were
 *     detected and which overall context was most likely.
 */

import { describe, it, expect } from 'test-anywhere';
import { formalizeTextWith } from '../../src/index.js';

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

function entity({ id, label, description = '', sitelink, claims = {} }) {
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
    descriptions: description ? { en: { value: description } } : {},
    aliases: {},
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
      return jsonResponse({ search: route ?? [] });
    }
    if (action === 'wbgetentities') {
      const ids = parsed.searchParams.get('ids') ?? '';
      const entities = {};
      for (const id of ids.split('|').filter(Boolean)) {
        if (routes.entities?.[id]) {
          entities[id] = routes.entities[id];
        }
      }
      return jsonResponse({ entities });
    }
    return jsonResponse({});
  };
}

describe('issue 126 — scholarly-article candidates must not hijack phrases', () => {
  it('does not formalize "developing systems" as a scientific article', async () => {
    const fetchImpl = makeFetch({
      search: {
        // Wikidata's top hit for the bare phrase is a clinical-trials
        // paper whose title merely *contains* "developing systems".
        'developing systems|item': [
          {
            id: 'Q41668433',
            label:
              'Developing systems for cost-effective auditing of clinical trials',
            description: 'scientific article published on December 1, 1997',
          },
        ],
        // The individual words have ordinary concept hits.
        'developing|item': [
          {
            id: 'Q1366697',
            label: 'developing',
            description: 'process of creating something',
          },
        ],
        'systems|item': [
          {
            id: 'Q58778',
            label: 'system',
            description:
              'group of interacting or interrelated entities forming a unified whole',
          },
        ],
      },
      entities: {
        Q41668433: entity({
          id: 'Q41668433',
          label:
            'Developing systems for cost-effective auditing of clinical trials',
          description: 'scientific article published on December 1, 1997',
          claims: { P31: ['Q13442814'] }, // scholarly article
        }),
        Q1366697: entity({
          id: 'Q1366697',
          label: 'developing',
          description: 'process of creating something',
          claims: { P31: ['Q3249551'] },
        }),
        Q58778: entity({
          id: 'Q58778',
          label: 'system',
          description: 'group of interacting entities',
          claims: { P31: ['Q16889133'] },
        }),
      },
    });

    const result = await formalizeTextWith('developing systems', {
      fetch: fetchImpl,
      maxNgramSize: 2,
      now: () => 0,
    });

    const selectedIds = result.phrases
      .map((phrase) => phrase.entity?.id)
      .filter(Boolean);
    // The scientific article must never be the chosen sense.
    expect(selectedIds.includes('Q41668433')).toBe(false);
    // The everyday words must survive as their own phrases.
    expect(selectedIds.includes('Q58778')).toBe(true);
  });

  it('surfaces per-word context detection on the result', async () => {
    const fetchImpl = makeFetch({
      search: {
        'systems|item': [
          {
            id: 'Q58778',
            label: 'system',
            description: 'group of interacting entities',
          },
        ],
      },
      entities: {
        Q58778: entity({
          id: 'Q58778',
          label: 'system',
          description: 'group of interacting entities',
          claims: { P31: ['Q16889133'], P279: ['Q35120'] },
        }),
      },
    });

    const result = await formalizeTextWith('systems', {
      fetch: fetchImpl,
      maxNgramSize: 1,
      now: () => 0,
    });

    expect(Array.isArray(result.wordContexts)).toBe(true);
    const systemsWord = result.wordContexts.find(
      (entry) => entry.text === 'systems'
    );
    expect(systemsWord).not.toBe(undefined);
    // Each candidate's detected contexts are surfaced for the UI/debug log.
    const top = systemsWord.candidates[0];
    expect(top.id).toBe('Q58778');
    expect(Array.isArray(top.contexts)).toBe(true);
    expect(top.contexts.some((ctx) => ctx.targetId === 'Q16889133')).toBe(true);
  });
});
