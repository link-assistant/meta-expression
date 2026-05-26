import { describe, expect, it } from 'test-anywhere';
import {
  analyzeStatement,
  reasonFormalStatements,
  serializeLinksNotation,
} from '../../src/index.js';

const entailmentProgram = `
((p = true) has probability 1)
((entails (p = true) (q = true)) has probability 1)
(? (q = true))
`;

describe('issue 67 - formal statement reasoning', () => {
  it('derives formal entailments and surfaces dependency provenance as links', () => {
    const analysis = analyzeStatement(entailmentProgram);
    const reasoningLinks = analysis.linksNetwork.links.filter(
      (link) => link.role === 'reasoning-step'
    );
    const serialized = serializeLinksNotation(analysis.linksNetwork);

    expect(analysis.selectedInterpretation.kind).toBe(
      'formal-reasoning-program'
    );
    expect(analysis.result.kind).toBe('computed');
    expect(analysis.result.value).toBe(true);
    expect(analysis.result.confidence).toBe(1);
    expect(analysis.result.supportingEvidence[0].sourceType).toBe(
      'relative-meta-logic'
    );
    expect(analysis.dependencies).toContain('(q = true) depends on (p = true)');
    expect(
      reasoningLinks.some(
        (link) =>
          link.provenance.sourceType === 'relative-meta-logic' &&
          link.value.method === 'evaluate'
      )
    ).toBe(true);
    expect(
      reasoningLinks.some((link) => link.value.method === 'runTactics')
    ).toBe(true);
    expect(serialized).toContain('relative-meta-logic');
  });

  it('answers contradiction and dependency queries over formal statements', () => {
    const contradiction = reasonFormalStatements(`
((p = true) has probability 1)
(? (contradicts (p = true) (not (p = true))))
`);
    const dependency = reasonFormalStatements(entailmentProgram);

    expect(contradiction.value).toBe(true);
    expect(contradiction.relations.contradictions[0].left).toBe('(p = true)');
    expect(
      dependency.dependencies.some(
        (entry) =>
          entry.source === '(p = true)' &&
          entry.target === '(q = true)' &&
          entry.relation === 'entails'
      )
    ).toBe(true);
  });

  it('keeps self-reference undetermined while adding formal reasoning', () => {
    const analysis = analyzeStatement('this statement is false');

    expect(analysis.formalization.expression.type).toBe(
      'self-reference-paradox'
    );
    expect(analysis.result.value).toBe('undetermined');
    expect(analysis.result.confidence).toBe(0.5);
  });
});
