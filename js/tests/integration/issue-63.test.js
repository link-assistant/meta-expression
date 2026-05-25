import { describe, expect, it } from 'test-anywhere';
import {
  analyzeStatement,
  exportPortableCaseData,
  importPortableCaseData,
  loadPortableCaseFromDoublets,
  savePortableCaseToDoublets,
} from '../../src/index.js';

const retrievedAt = '2026-05-25T00:00:00.000Z';

const parisEvidence = {
  id: 'unicode-evidence-1',
  key: 'paris is the capital of france',
  polarity: 'support',
  weight: 0.75,
  sourceType: 'wikidata',
  situation: 'wikidata-structured-claim',
  sourceUrl: 'https://www.wikidata.org/wiki/Q142#P36',
  retrievedAt,
  claim: 'Paris est la capitale de la France - проверено 🌍',
  identifiers: {
    subject: 'Q142',
    property: 'P36',
    object: 'Q90',
  },
};

describe('issue 63 - durable Doublets-backed storage', () => {
  it('round-trips statement and evidence links without losing identity, provenance, Unicode, or versions', () => {
    const analysis = analyzeStatement('Paris is the capital of France', {
      evidence: [parisEvidence],
    });
    const saved = savePortableCaseToDoublets(analysis, {
      caseId: 'issue-63-paris',
      exportedAt: retrievedAt,
    });
    const loaded = loadPortableCaseFromDoublets(saved);
    const scoredEvidence = analysis.result.supportingEvidence[0];
    const statement = loaded.linksNetwork.links.find(
      (link) => link.role === 'statement'
    );
    const evidence = loaded.linksNetwork.links.find(
      (link) => link.role === 'evidence'
    );

    expect(saved.binary instanceof Uint8Array).toBe(true);
    expect(saved.linksNotation).toContain('(doublets:');
    expect(loaded.caseId).toBe('issue-63-paris');
    expect(loaded.linksNetwork.version).toBe(1);
    expect(statement.id).toBe(analysis.statement.id);
    expect(statement.value.text).toBe('Paris is the capital of France');
    expect(statement.value.version).toBe(1);
    expect(statement.version).toBe(1);
    expect(evidence.id).toBe(parisEvidence.id);
    expect(evidence.references).toEqual([statement.id]);
    expect(evidence.value.claim).toBe(parisEvidence.claim);
    expect(evidence.value.weight).toBe(scoredEvidence.weight);
    expect(evidence.provenance.sourceType).toBe('wikidata');
    expect(evidence.provenance.retrievedAt).toBe(retrievedAt);
  });

  it('imports current links-network fixtures as portable case data', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');
    const portable = exportPortableCaseData(analysis.linksNetwork, {
      caseId: 'legacy-links-network',
      exportedAt: retrievedAt,
    });
    const imported = importPortableCaseData(analysis.linksNetwork);

    expect(portable.schema).toBe('meta-expression.portable-case');
    expect(portable.migratedFrom).toBe('links-network-v1');
    expect(portable.linksNetwork.links.length).toBe(
      analysis.linksNetwork.links.length
    );
    expect(imported.migratedFrom).toBe('links-network-v1');
    expect(imported.linksNetwork.links[0].id).toBe(
      analysis.linksNetwork.links[0].id
    );
  });
});
