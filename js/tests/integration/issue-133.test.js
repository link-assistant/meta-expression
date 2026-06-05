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

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

describe('issue 133 - Translate defaults and state links', () => {
  it('keeps the source-backed Russian Wikipedia URL for Q35657', () => {
    const state = resolveConceptForm('Q35657', 'ru');

    expect(state?.text).toBe('штат');
    expect(state?.url).toBe(ruStateUrl);
  });

  it('uses Wikipedia links by default in Translate output', async () => {
    const result = await translateTextWith('state', {
      fetch: () => emptyJsonResponse(),
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
