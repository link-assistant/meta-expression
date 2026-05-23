import { describe, expect, it } from 'test-anywhere';
import { formalizeTextWith, translateTextWith } from '../../src/index.js';

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

function wikidataCandidate(id, label, kind = 'entity') {
  return {
    id,
    label,
    description: `${label} test entity`,
    kind,
    source: 'wikidata',
    sourceUrl:
      kind === 'property'
        ? `https://www.wikidata.org/wiki/Property:${id}`
        : `https://www.wikidata.org/wiki/${id}`,
    matchText: label,
    score: 1,
    ngramSize: label.split(/\s+/).length,
  };
}

function astronomySource() {
  const candidatesByText = new Map([
    ['moon', [wikidataCandidate('Q405', 'Moon')]],
    ['orbits', [wikidataCandidate('P397', 'orbits', 'property')]],
    ['sun', [wikidataCandidate('Q525', 'Sun')]],
  ]);
  return {
    name: 'test-source',
    async searchPhrase(text) {
      return candidatesByText.get(text.toLowerCase()) ?? [];
    },
  };
}

describe('issue 54 - formal-ai linguistic metadata', () => {
  it('publishes linguistic CST/AST metadata and links for structural fragments', async () => {
    const text = 'Moon orbits the Sun.';
    const result = await formalizeTextWith(text, {
      fetch: () => emptyJsonResponse(),
      sources: [astronomySource()],
      now: () => 0,
    });

    const metadata = result.cst.linguisticMetadata;
    const subject = metadata.fragments.find(
      (fragment) => fragment.role === 'subject'
    );
    const predicate = metadata.fragments.find(
      (fragment) => fragment.role === 'predicate'
    );
    const object = metadata.fragments.find(
      (fragment) => fragment.role === 'object'
    );
    const relation = metadata.relations.find(
      (entry) => entry.type === 'subject-predicate-object'
    );

    expect(result.ast).toBe(result.cst.ast);
    expect(result.cst.ast).toBe(metadata.ast);
    expect(
      metadata.fragments.some((fragment) => fragment.type === 'word')
    ).toBe(true);
    expect(
      metadata.fragments.some(
        (fragment) => fragment.type === 'symbol' && fragment.text === '.'
      )
    ).toBe(true);
    expect(
      metadata.fragments.some(
        (fragment) =>
          fragment.type === 'noun-phrase' && fragment.text === 'the Sun'
      )
    ).toBe(true);
    expect(
      metadata.fragments.some(
        (fragment) =>
          fragment.type === 'verb-phrase' && fragment.text === 'orbits'
      )
    ).toBe(true);
    expect(subject.text).toBe('Moon');
    expect(predicate.text).toBe('orbits');
    expect(object.text).toBe('Sun');
    expect(text.slice(subject.sourceStart, subject.sourceEnd)).toBe('Moon');
    expect(text.slice(predicate.sourceStart, predicate.sourceEnd)).toBe(
      'orbits'
    );
    expect(text.slice(object.sourceStart, object.sourceEnd)).toBe('Sun');
    expect(subject.phraseIds).toContain('phrase-1');
    expect(predicate.phraseIds).toContain('phrase-2');
    expect(object.phraseIds).toContain('phrase-4');
    expect(Boolean(relation)).toBe(true);
    expect(relation.subjectFragmentId).toBe(subject.id);
    expect(relation.predicateFragmentId).toBe(predicate.id);
    expect(relation.objectFragmentId).toBe(object.id);
    expect(metadata.dependencies.map((entry) => entry.relation)).toContain(
      'nsubj'
    );
    expect(metadata.dependencies.map((entry) => entry.relation)).toContain(
      'root'
    );
    expect(metadata.dependencies.map((entry) => entry.relation)).toContain(
      'obj'
    );
    expect(
      result.linksNetwork.links.some(
        (link) => link.role === 'linguistic-fragment'
      )
    ).toBe(true);
    expect(
      result.linksNetwork.links.some(
        (link) =>
          link.role === 'linguistic-dependency' && link.value.relation === 'obj'
      )
    ).toBe(true);
    expect(result.linksNotation).toContain('subject-predicate-object');
  });

  it('carries source linguistic metadata through translation semantic links', async () => {
    const result = await translateTextWith('Moon orbits the Sun.', {
      fetch: () => emptyJsonResponse(),
      sources: [astronomySource()],
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    expect(
      result.cst.formalization.linguisticMetadata.relations.some(
        (entry) => entry.type === 'subject-predicate-object'
      )
    ).toBe(true);
    expect(
      result.semanticMetaLanguage.links.some(
        (link) => link.sourceFragment?.role === 'predicate'
      )
    ).toBe(true);
  });
});
