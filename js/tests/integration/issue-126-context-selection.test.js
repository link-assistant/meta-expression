/**
 * Tests for issue #126 — context-selection questions that DON'T disappear and
 * actually modify the formalization (and therefore re-run translation).
 *
 * The reported failure: the Translate page showed questions that looked
 * "fake" — answering one removed the question without changing the English
 * formalization. The fix surfaces a `contextQuestions` array for every
 * ambiguous word and honors a `contextSelections` option that re-picks the
 * chosen sense, re-deriving the formalization (and re-running translation
 * downstream).
 */

import { describe, it, expect } from 'test-anywhere';
import { formalizeTextWith, translateTextWith } from '../../src/index.js';

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

function entity({ id, label, description = '', claims = {} }) {
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
    type: 'item',
    labels: { en: { value: label } },
    descriptions: description ? { en: { value: description } } : {},
    aliases: {},
    claims: wikidataClaims,
    sitelinks: {},
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
      return jsonResponse({
        search: routes.search?.[`${search}|${type}`] ?? [],
      });
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

// Two senses of "bank" share the exact label, so both are plausible
// candidates of the same single-word phrase — a genuine homonym.
function bankFetch() {
  return makeFetch({
    search: {
      'bank|item': [
        { id: 'Q100', label: 'bank', description: 'financial institution' },
        { id: 'Q200', label: 'bank', description: 'land alongside a river' },
      ],
    },
    entities: {
      Q100: entity({
        id: 'Q100',
        label: 'bank',
        description: 'financial institution',
        claims: { P31: ['Q22687'] },
      }),
      Q200: entity({
        id: 'Q200',
        label: 'bank',
        description: 'land alongside a river',
        claims: { P31: ['Q9430'] },
      }),
    },
  });
}

describe('issue 126 — context-selection questions modify the formalization', () => {
  it('surfaces a persistent context question for an ambiguous word', async () => {
    const result = await formalizeTextWith('bank', {
      fetch: bankFetch(),
      maxNgramSize: 1,
      now: () => 0,
    });

    expect(Array.isArray(result.contextQuestions)).toBe(true);
    const question = result.contextQuestions.find(
      (entry) => entry.phraseText === 'bank'
    );
    expect(question).not.toBe(undefined);
    expect(question.options.length).toBe(2);
    // The default winner is reported as selected so the UI can pre-highlight
    // it, but the question itself stays available (it is not consumed).
    const selected = question.options.find((option) => option.selected);
    expect(selected.entityId).toBe('Q100');
    expect(question.selectedEntityId).toBe('Q100');
  });

  it('re-picks the chosen sense when a context selection is supplied', async () => {
    const baseline = await formalizeTextWith('bank', {
      fetch: bankFetch(),
      maxNgramSize: 1,
      now: () => 0,
    });
    const phrase = baseline.phrases.find((entry) => entry.text === 'bank');
    expect(phrase.entity.id).toBe('Q100');

    const pinned = await formalizeTextWith('bank', {
      fetch: bankFetch(),
      maxNgramSize: 1,
      now: () => 0,
      contextSelections: { [phrase.start]: 'Q200' },
    });
    const pinnedPhrase = pinned.phrases.find((entry) => entry.text === 'bank');
    expect(pinnedPhrase.entity.id).toBe('Q200');
    expect(pinnedPhrase.entity.description).toBe('land alongside a river');

    // The question persists and now reports the user's choice as selected.
    const question = pinned.contextQuestions.find(
      (entry) => entry.phraseText === 'bank'
    );
    expect(question.selectedEntityId).toBe('Q200');
    expect(question.options.find((option) => option.selected).entityId).toBe(
      'Q200'
    );
  });

  it('accepts selections keyed by phrase text as well', async () => {
    const pinned = await formalizeTextWith('bank', {
      fetch: bankFetch(),
      maxNgramSize: 1,
      now: () => 0,
      contextSelections: { bank: 'Q200' },
    });
    const phrase = pinned.phrases.find((entry) => entry.text === 'bank');
    expect(phrase.entity.id).toBe('Q200');
  });

  it('re-runs translation against the re-derived formalization', async () => {
    const baseline = await translateTextWith('bank', {
      fetch: bankFetch(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });
    const baselineEntity = baseline.formalization.phrases.find(
      (entry) => entry.text === 'bank'
    ).entity.id;
    expect(baselineEntity).toBe('Q100');

    const pinned = await translateTextWith('bank', {
      fetch: bankFetch(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
      contextSelections: { bank: 'Q200' },
    });
    const pinnedEntity = pinned.formalization.phrases.find(
      (entry) => entry.text === 'bank'
    ).entity.id;
    expect(pinnedEntity).toBe('Q200');
  });
});
