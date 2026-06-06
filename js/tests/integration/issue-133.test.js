import { describe, expect, it } from 'test-anywhere';
import {
  aggregateBigContextsFromGraph,
  buildWordContexts,
  createDefaultSourceTiers,
  FORMALIZE_LINK_TARGETS,
  translateTextWith,
} from '../../src/index.js';
import { resolveConceptForm } from '../../src/semantic-lexicon.js';

const ruStateUrl =
  'https://ru.wikipedia.org/wiki/%D0%A8%D1%82%D0%B0%D1%82_%D0%A1%D0%A8%D0%90';
const ruCaliforniaUrl =
  'https://ru.wikipedia.org/wiki/%D0%9A%D0%B0%D0%BB%D0%B8%D1%84%D0%BE%D1%80%D0%BD%D0%B8%D1%8F';

function jsonResponse(payload = {}) {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
  });
}

function wikidataEntity({ id, label, language, sitelink = null }) {
  const site = `${language}wiki`;
  return {
    id,
    type: id.startsWith('P') ? 'property' : 'item',
    labels: { [language]: { value: label } },
    descriptions: {
      [language]: { value: `${label} description` },
    },
    aliases: {},
    claims: {},
    sitelinks: sitelink ? { [site]: { site, title: sitelink } } : {},
  };
}

function entityPayload(entries) {
  return {
    entities: Object.fromEntries(entries.map((entry) => [entry.id, entry])),
  };
}

function makeCaliforniaTargetFetch(calls = []) {
  return async function mockFetch(url) {
    const parsed = new URL(url);
    const action = parsed.searchParams.get('action');
    const ids = parsed.searchParams.get('ids');
    const languages = parsed.searchParams.get('languages') ?? 'en';
    calls.push({ action, ids, languages, url: String(url) });

    if (action !== 'wbgetentities' || ids !== 'Q99') {
      return jsonResponse();
    }
    if (languages === 'en') {
      return jsonResponse(
        entityPayload([
          wikidataEntity({
            id: 'Q99',
            label: 'California',
            language: 'en',
            sitelink: 'California',
          }),
        ])
      );
    }
    if (languages === 'ru') {
      return jsonResponse(
        entityPayload([
          wikidataEntity({
            id: 'Q99',
            label: 'Калифорния',
            language: 'ru',
            sitelink: 'Калифорния',
          }),
        ])
      );
    }
    return jsonResponse();
  };
}

describe('issue 133 - Translate defaults and state links', () => {
  it('keeps the source-backed Russian Wikipedia URL for Q35657', () => {
    const state = resolveConceptForm('Q35657', 'ru');

    expect(state?.text).toBe('штат');
    expect(state?.url).toBe(ruStateUrl);
  });

  it('uses Wikipedia links by default in Translate output', async () => {
    const result = await translateTextWith('state', {
      fetch: () => jsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    expect(result.plainText).toBe('штат');
    expect(result.formalization.linkTargetMode).toBe(
      FORMALIZE_LINK_TARGETS.WIKIPEDIA
    );
    expect(result.markdown).toContain(ruStateUrl);
    expect(result.markdown).not.toContain(
      'https://www.wikidata.org/wiki/Q35657'
    );
  });

  it('prefers a live target-language Wikipedia sitelink over a local concept URL', async () => {
    const calls = [];
    const result = await translateTextWith('California is a state.', {
      fetch: makeCaliforniaTargetFetch(calls),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    expect(result.plainText).toBe('Калифорния это штат.');
    expect(result.markdown).toContain(ruCaliforniaUrl);
    expect(result.markdown).not.toContain('https://www.wikidata.org/wiki/Q99');
    expect(
      calls.some((call) => call.ids === 'Q99' && call.languages === 'ru')
    ).toBe(true);
  });

  it('defaults source priority to Wikipedia, Wikidata, Wiktionary, virtual overrides', () => {
    expect(createDefaultSourceTiers('en').map((source) => source.name)).toEqual(
      ['wikipedia', 'wikidata', 'wiktionary', 'virtual-source-overrides']
    );
  });

  it('surfaces transitive broad contexts on word candidates', () => {
    const phrases = [
      {
        text: 'Hawaii',
        start: 0,
        end: 0,
        entity: {
          id: 'Q782',
          label: 'Hawaii',
          contextLabels: [
            {
              property: 'P31',
              propertyLabel: 'instance of',
              targetId: 'Q35657',
            },
          ],
        },
        candidates: [
          {
            id: 'Q782',
            label: 'Hawaii',
            score: 20,
            contextLabels: [
              {
                property: 'P31',
                propertyLabel: 'instance of',
                targetId: 'Q35657',
              },
            ],
          },
        ],
      },
      {
        text: 'state',
        start: 3,
        end: 3,
        entity: {
          id: 'Q35657',
          label: 'state',
          contextLabels: [
            {
              property: 'P279',
              propertyLabel: 'subclass of',
              targetId: 'Q107390',
            },
          ],
        },
        candidates: [
          {
            id: 'Q35657',
            label: 'state',
            score: 20,
            contextLabels: [
              {
                property: 'P279',
                propertyLabel: 'subclass of',
                targetId: 'Q107390',
              },
            ],
          },
        ],
      },
    ];
    const aggregate = aggregateBigContextsFromGraph(
      new Map([['Q35657', [{ id: 'Q107390', property: 'P279' }]]]),
      phrases,
      { maxDepth: 2 }
    );

    const wordContexts = buildWordContexts(phrases, {
      broadContexts: aggregate.all,
    });
    const hawaii = wordContexts.find((word) => word.text === 'Hawaii');
    const state = wordContexts.find((word) => word.text === 'state');

    expect(
      hawaii?.candidates[0].broadContexts.some(
        (context) => context.id === 'Q107390'
      )
    ).toBe(true);
    expect(
      state?.candidates[0].broadContexts.some(
        (context) => context.id === 'Q107390'
      )
    ).toBe(true);
  });
});
