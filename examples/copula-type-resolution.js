/**
 * Contextual "X is a Y" copula disambiguation (issue #128 R12).
 *
 * A bare predicate noun like "state" is ambiguous on its own — it could be a
 * sovereign polity, a condition, or a federated state. In the copula sentence
 * "Hawaii is a state." the subject already carries an asserted type (Hawaii
 * `instance of` Q35657 "U.S. state"), so the predicate denotes that very class.
 * The formalizer resolves "state" to the contextually-correct Q35657 — with a
 * Russian counterpart "Штат США" — instead of the generic federated-state
 * concept Q7275, language-neutrally.
 *
 * This example is fully offline: it uses a small mock Wikidata/Wiktionary fetch
 * (the same fixtures the issue #128 tests use) so it runs anywhere with no
 * network access.
 *
 * Run with any supported runtime:
 * - Node.js: node examples/copula-type-resolution.js
 * - Bun:     bun examples/copula-type-resolution.js
 * - Deno:    deno run --allow-read examples/copula-type-resolution.js
 */

import {
  createWikidataSource,
  createWiktionarySource,
  formalizeTextWith,
  translateTextWith,
} from '../js/src/index.js';

function jsonResponse(payload) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json() {
      return Promise.resolve(payload);
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

// Wikidata "instance of" (P31) claim pointing at the given type id.
function instanceOf(targetId) {
  return { P31: [{ mainsnak: { datavalue: { value: { id: targetId } } } }] };
}

function makeFetch() {
  return function mockFetch(url) {
    const parsed = new URL(url);
    if (parsed.hostname === 'en.wiktionary.org') {
      return jsonResponse({});
    }
    const action = parsed.searchParams.get('action');
    if (action === 'wbsearchentities') {
      const key = [
        parsed.searchParams.get('search'),
        parsed.searchParams.get('type'),
        parsed.searchParams.get('language') ?? 'en',
      ].join('|');
      const routes = {
        'Hawaii|item|en': [
          { id: 'Q782', label: 'Hawaii', description: 'US state' },
        ],
        'state|item|en': [
          { id: 'Q7275', label: 'state', description: 'sovereign polity' },
        ],
      };
      return jsonResponse({ search: routes[key] ?? [] });
    }
    if (action === 'wbgetentities') {
      const language = parsed.searchParams.get('languages') ?? 'en';
      const routes = {
        // Hawaii asserts instance-of Q35657 "U.S. state" — this is the signal
        // that licenses the predicate's sense.
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
        }),
        'Q7275|ru': entity({
          id: 'Q7275',
          label: 'государство',
          language: 'ru',
          sitelink: 'Государство',
        }),
        'Q35657|en': entity({
          id: 'Q35657',
          label: 'U.S. state',
          language: 'en',
          sitelink: 'U.S. state',
        }),
        'Q35657|ru': entity({
          id: 'Q35657',
          label: 'Штат США',
          language: 'ru',
          sitelink: 'Штат США',
        }),
      };
      const entities = {};
      for (const id of String(parsed.searchParams.get('ids') ?? '').split(
        '|'
      )) {
        const row = routes[`${id}|${language}`];
        if (row) {
          entities[row.id] = row;
        }
      }
      return jsonResponse(Object.keys(entities).length ? { entities } : {});
    }
    return jsonResponse({});
  };
}

const options = {
  fetch: makeFetch(),
  sources: [
    createWikidataSource({ language: 'en' }),
    createWiktionarySource({ language: 'en' }),
  ],
  now: () => 0,
};

const formalization = await formalizeTextWith('Hawaii is a state.', options);
const phrases = formalization.cst?.phrases ?? [];
const statePhrase = phrases.find((phrase) => phrase.text === 'state');

console.log('Sentence: "Hawaii is a state."');
console.log(
  `  "state" resolved to: ${statePhrase?.entity?.id} (${statePhrase?.entity?.label})`
);
console.log(`  Wikipedia: ${statePhrase?.entity?.wikipediaUrl ?? '(none)'}`);

const translation = await translateTextWith('Hawaii is a state.', {
  ...options,
  targetLanguage: 'ru',
});
console.log(`  English -> Russian: ${translation.plainText}`);
console.log(
  `  transformations: ${translation.sentences[0].transformations.join(', ')}`
);
