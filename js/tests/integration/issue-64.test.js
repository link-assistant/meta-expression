import { describe, expect, it } from 'test-anywhere';
import { analyzeStatement, FORMALIZATION_LEVELS } from '../../src/index.js';

describe('issue 64 - general statement formalization', () => {
  it('turns arbitrary text into partial structured meaning links with questions', () => {
    const analysis = analyzeStatement('OpenAI creates useful tools');
    const expression = analysis.formalization.expression;

    expect(analysis.formalization.level).toBe(
      FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION
    );
    expect(expression.type).toBe('partial-claim');
    expect(expression.cst.type).toBe('statement-formalization');
    expect(expression.linguisticMetadata.relations[0].type).toBe(
      'subject-predicate-object'
    );
    expect(expression.meaningLinks.length).toBeGreaterThanOrEqual(3);
    expect(
      expression.meaningLinks.some(
        (link) =>
          link.role === 'subject' &&
          link.text === 'OpenAI' &&
          link.target.id === 'lex:en:openai'
      )
    ).toBe(true);
    expect(
      expression.meaningLinks.some(
        (link) => link.role === 'predicate' && link.text === 'creates'
      )
    ).toBe(true);
    expect(expression.variables.map((entry) => entry.name)).toContain(
      '?subject'
    );
    expect(expression.questions.length).toBeGreaterThanOrEqual(3);
    expect(analysis.formalization.unknowns).toContain('?subject');
    expect(
      analysis.linksNetwork.links.some(
        (link) =>
          link.role === 'meaning' &&
          link.value.text === 'OpenAI -> lex:en:openai'
      )
    ).toBe(true);
  });

  it('keeps concrete acceptance examples evidence-backed while adding metadata', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');

    expect(analysis.formalization.expression.type).toBe('wikidata-claim');
    expect(analysis.formalization.expression.wikidata.subject).toBe('Q2');
    expect(analysis.result.confidence).toBeGreaterThan(0.7);
    expect(
      analysis.formalization.expression.meaningLinks.some(
        (link) => link.target.id === 'Q2'
      )
    ).toBe(true);
  });
});
