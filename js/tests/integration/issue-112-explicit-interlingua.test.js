import { describe, expect, it } from 'test-anywhere';
import {
  formalizeTextWith,
  naturalizeExpressionWith,
  translateTextWith,
} from '../../src/index.js';

function wikidataCandidate(id, label) {
  return {
    id,
    label,
    description: `${label} test entity`,
    kind: 'entity',
    source: 'wikidata',
    sourceUrl: `https://www.wikidata.org/wiki/${id}`,
    matchText: label,
  };
}

function alphaBetaSource() {
  return {
    name: 'test-wikidata-source',
    async searchPhrase(text) {
      if (text === 'alpha') {
        return [wikidataCandidate('Q1', 'alpha')];
      }
      if (text === 'beta') {
        return [wikidataCandidate('Q2', 'beta')];
      }
      return [];
    },
  };
}

function emptySource() {
  return {
    name: 'empty-test-source',
    async searchPhrase() {
      return [];
    },
  };
}

function targetEntityPayload(url) {
  const ids = new URL(String(url)).searchParams.get('ids')?.split('|') ?? [];
  const values = {
    Q1: 'альфа',
    Q2: 'бета',
  };
  return {
    entities: Object.fromEntries(
      ids.map((id) => [
        id,
        {
          id,
          labels: {
            ru: {
              value: values[id],
            },
          },
          descriptions: {
            ru: {
              value: `${values[id]} test entity`,
            },
          },
          sitelinks: {},
        },
      ])
    ),
  };
}

function fetchTargetEntities(url) {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return targetEntityPayload(url);
    },
  });
}

function poisonRawSourceStrings(formalization) {
  const poison = 'x';
  const metadata = formalization.cst.linguisticMetadata;
  return {
    ...formalization,
    text: poison,
    ast: {
      ...formalization.ast,
      text: poison,
    },
    cst: {
      ...formalization.cst,
      text: poison,
      linguisticMetadata: {
        ...metadata,
        text: poison,
        ast: {
          ...metadata.ast,
          text: poison,
        },
        cst: {
          ...metadata.cst,
          text: poison,
          sentences: metadata.cst.sentences.map((sentence) => ({
            ...sentence,
            text: poison,
          })),
        },
      },
    },
  };
}

function reconstructSourceText(sourceReconstruction) {
  return sourceReconstruction.units.map((unit) => unit.text).join('');
}

describe('issue 112 - explicit interlingua reconstruction', () => {
  it('formalization records enough linguistic metadata to reconstruct the source without the raw source string', async () => {
    const result = await formalizeTextWith('Moon orbits the Sun.', {
      fetch: null,
      sources: [emptySource()],
      now: () => 0,
    });
    const metadata = result.cst.linguisticMetadata;

    expect(reconstructSourceText(metadata.sourceReconstruction)).toBe(
      'Moon orbits the Sun.'
    );
    expect(
      metadata.sourceReconstruction.units.map((unit) => unit.kind)
    ).toEqual([
      'token',
      'separator',
      'token',
      'separator',
      'token',
      'separator',
      'token',
      'symbol',
    ]);
    expect(metadata.attachments.map((entry) => entry.type)).toContain(
      'noun-phrase-attachment'
    );
    expect(metadata.attachments.map((entry) => entry.type)).toContain(
      'verb-phrase-attachment'
    );
    expect(metadata.agreements.map((entry) => entry.type)).toContain(
      'subject-predicate-agreement'
    );
    expect(metadata.dependencies.map((entry) => entry.relation)).toContain(
      'det'
    );
    expect(metadata.cst.tokens.every((token) => token.features)).toBe(true);
  });

  it('carries explicit coreference chains in the formalization metadata', async () => {
    const result = await formalizeTextWith('Moon orbits the Sun. It shines.', {
      fetch: null,
      sources: [emptySource()],
      now: () => 0,
    });
    const chain = result.cst.linguisticMetadata.coreferenceChains.find(
      (entry) => entry.mentions.some((mention) => mention.text === 'It')
    );

    expect(Boolean(chain)).toBe(true);
    expect(chain.mentions.map((mention) => mention.text)).toEqual([
      'Sun',
      'It',
    ]);
  });

  it('translates and naturalizes from the reconstructed semantic meta language after raw source strings are poisoned', async () => {
    const result = await translateTextWith('alpha beta', {
      fetch: fetchTargetEntities,
      sources: [alphaBetaSource()],
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
      afterFormalizationRules: [poisonRawSourceStrings],
    });

    expect(result.text).toBe('alpha beta');
    expect(result.sentences[0].source.text).toBe('alpha beta');
    expect(result.plainText).toBe('альфа бета');
    expect(result.semanticMetaLanguage.sourceReconstruction.units.length).toBe(
      3
    );

    const naturalized = await naturalizeExpressionWith({
      ...result.semanticMetaLanguage,
      text: 'x',
    });
    expect(naturalized.text).toBe('alpha beta');
  });
});
