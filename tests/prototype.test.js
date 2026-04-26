import { describe, it, expect } from 'test-anywhere';
import {
  analyzeStatement,
  createStatementDraft,
  serializeLinksNotation,
} from '../src/index.js';

describe('meta-expression prototype pipeline', () => {
  it('keeps user selection as an explicit pipeline boundary', () => {
    const draft = createStatementDraft('1 + 1 = 2');

    expect(draft.status).toBe('selection-required');
    expect(draft.interpretations.length).toBe(3);
    expect(draft.linksNetwork.links.every((link) => link.id)).toBe(true);
  });

  it('evaluates fully computable arithmetic statements exactly', () => {
    const trueStatement = analyzeStatement('1 + 1 = 2');
    const falseStatement = analyzeStatement('1 + 1 = 1');

    expect(trueStatement.result.kind).toBe('computed');
    expect(trueStatement.result.value).toBe(true);
    expect(trueStatement.result.confidence).toBe(1);
    expect(falseStatement.result.kind).toBe('computed');
    expect(falseStatement.result.value).toBe(false);
    expect(falseStatement.result.confidence).toBe(0);
  });

  it('represents real-world evidence as links with provenance', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');

    expect(analysis.result.kind).toBe('evidence-estimate');
    expect(analysis.result.confidence).toBe(1);
    expect(analysis.result.supportingEvidence.length).toBe(1);
    expect(analysis.result.supportingEvidence[0].sourceType).toBe('wikidata');
    expect(
      analysis.linksNetwork.links.some((link) => link.role === 'support')
    ).toBe(true);
  });

  it('serializes the selected links network to Links Notation text', () => {
    const analysis = analyzeStatement('1 + 1 = 2');
    const lino = serializeLinksNotation(analysis.linksNetwork);

    expect(lino.includes('links-network')).toBe(true);
    expect(lino.includes('statement')).toBe(true);
    expect(lino.includes('supports')).toBe(true);
    expect(lino.includes('graph')).toBe(false);
  });
});
