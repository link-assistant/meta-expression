import { describe, expect, it } from 'test-anywhere';
import {
  createWikidataSource,
  createWiktionarySource,
  formalizeTextWith,
  translateTextWith,
} from '../../src/index.js';

// Issue #128 reproduces the Translate-page report for "Hawaii is a state."
// (en -> ru) and pins the three rendering requirements raised there:
//   R3 — English phrases should surface a Wikipedia link (like Russian does)
//        when the Wikipedia link target is selected, instead of a bare
//        wikidata.org URL.
//   R4 — the links notation should expose a merged entity definition that
//        lists every sense matched across Wikidata / Wikipedia / Wiktionary.
//   R5 — both the formalization and translation links notation should report
//        the selected contexts in priority order with the exact probability
//        and how many words share each context.

function jsonResponse(payload) {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
  });
}

function entity({ id, label, language, sitelink, claims = {} }) {
  const site = `${language}wiki`;
  return {
    id,
    type: id.startsWith('P') ? 'property' : 'item',
    labels: { [language]: { value: label } },
    descriptions: { [language]: { value: `${label} description` } },
    claims,
    aliases: {},
    sitelinks: sitelink ? { [site]: { site, title: sitelink } } : {},
  };
}

// Both Hawaii and "state" are instances of the same Wikidata class so the
// context election sees two words sharing one context (sharedBy 2) — exactly
// the situation issue #128 asks the links notation to explain.
function instanceOf(targetId) {
  return {
    P31: [{ mainsnak: { datavalue: { value: { id: targetId } } } }],
  };
}

function makeIssue128Fetch() {
  return async function mockFetch(url) {
    const parsed = new URL(url);
    if (parsed.hostname === 'en.wiktionary.org') {
      const page = decodeURIComponent(parsed.pathname.split('/').pop() ?? '');
      if (page === 'is-a') {
        return jsonResponse({
          en: [
            {
              partOfSpeech: 'Noun',
              definitions: [
                {
                  definition:
                    'The relationship between two entities in which one inherits from the other.',
                },
              ],
            },
          ],
        });
      }
      return jsonResponse({});
    }

    const action = parsed.searchParams.get('action');
    if (action === 'wbsearchentities') {
      const search = parsed.searchParams.get('search');
      const type = parsed.searchParams.get('type');
      const language = parsed.searchParams.get('language') ?? 'en';
      const routes = {
        'Hawaii|item|en': [
          { id: 'Q782', label: 'Hawaii', description: 'US state' },
        ],
        'state|item|en': [
          { id: 'Q7275', label: 'state', description: 'sovereign polity' },
        ],
      };
      return jsonResponse({
        search: routes[`${search}|${type}|${language}`] ?? [],
      });
    }
    if (action === 'wbgetentities') {
      const ids = parsed.searchParams.get('ids');
      const languages = parsed.searchParams.get('languages') ?? 'en';
      const routes = {
        'Q782|en': entity({
          id: 'Q782',
          label: 'Hawaii',
          language: 'en',
          sitelink: 'Hawaii',
          claims: instanceOf('Q35657'),
        }),
        'Q782|ru': entity({
          id: 'Q782',
          label: 'Гавайи',
          language: 'ru',
          sitelink: 'Гавайи',
          claims: instanceOf('Q35657'),
        }),
        'Q7275|en': entity({
          id: 'Q7275',
          label: 'state',
          language: 'en',
          sitelink: 'State (polity)',
          claims: instanceOf('Q35657'),
        }),
        'Q7275|ru': entity({
          id: 'Q7275',
          label: 'государство',
          language: 'ru',
          sitelink: 'Государство',
          claims: instanceOf('Q35657'),
        }),
      };
      const entries = String(ids ?? '')
        .split('|')
        .map((id) => routes[`${id}|${languages}`])
        .filter(Boolean);
      const entities = {};
      for (const entry of entries) {
        entities[entry.id] = entry;
      }
      return jsonResponse(entries.length ? { entities } : {});
    }
    return jsonResponse({});
  };
}

function formalizeOptions() {
  return {
    fetch: makeIssue128Fetch(),
    sources: [
      createWikidataSource({ language: 'en' }),
      createWiktionarySource({ language: 'en' }),
    ],
    now: () => 0,
  };
}

describe('issue 128 - Hawaii is a state links notation', () => {
  it('renders an English Wikipedia link when the Wikipedia target is selected (R3)', async () => {
    const result = await formalizeTextWith('Hawaii is a state.', {
      ...formalizeOptions(),
      linkTargetMode: 'wikipedia',
    });

    expect(result.markdown).toContain(
      '[Hawaii](https://en.wikipedia.org/wiki/Hawaii "Q782")'
    );
    expect(result.markdown).not.toContain('wikidata.org/wiki/Q782');
  });

  it('exposes a merged entity definition for each phrase (R4)', async () => {
    const result = await formalizeTextWith('Hawaii is a state.', {
      ...formalizeOptions(),
      linkTargetMode: 'wikipedia',
    });

    expect(result.linksNotation).toContain('phrase-1-definition:');
    expect(result.linksNotation).toContain(
      'wikipedia (https://en.wikipedia.org/wiki/Hawaii)'
    );
    expect(result.linksNotation).toContain('wikidata (Q782)');
    expect(result.linksNotation).toContain('phrase-1-sense-1:');
  });

  it('reports selected contexts with priority and probability (R5)', async () => {
    const result = await formalizeTextWith('Hawaii is a state.', {
      ...formalizeOptions(),
      linkTargetMode: 'wikipedia',
    });

    const contextLine = result.linksNotation
      .split('\n')
      .find((line) => line.includes('priority 1 probability'));
    expect(contextLine).toBeTruthy();
    expect(contextLine).toContain('Q35657');
    // Hawaii and state both vote for Q35657, so the context is shared by two
    // words and the links notation must say so.
    expect(contextLine).toContain('words 2');
    expect(contextLine).toContain('Hawaii');
    expect(contextLine).toContain('state');
  });

  it('carries the contexts into the translation links notation (R5)', async () => {
    const translation = await translateTextWith('Hawaii is a state.', {
      ...formalizeOptions(),
      targetLanguage: 'ru',
      linkTargetMode: 'wikipedia',
    });

    const notation = translation.cst.linksNotation ?? translation.linksNotation;
    const contextLine = (notation ?? '')
      .split('\n')
      .find((line) => line.includes('priority 1 probability'));
    expect(contextLine).toBeTruthy();
    expect(contextLine).toContain('Q35657');
  });
});
