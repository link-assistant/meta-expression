import { describe, it, expect } from 'test-anywhere';
import {
  analyzeStatement,
  createStatementDraft,
  createIssueReportUrl,
  describeFormalizationLevel,
  getPreparedExamples,
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
    const question = analyzeStatement('1 + 1');

    expect(trueStatement.result.kind).toBe('computed');
    expect(trueStatement.result.value).toBe(true);
    expect(trueStatement.result.confidence).toBe(1);
    expect(falseStatement.result.kind).toBe('computed');
    expect(falseStatement.result.value).toBe(false);
    expect(falseStatement.result.confidence).toBe(0);
    expect(question.result.kind).toBe('computed');
    expect(question.result.value).toBe(2);
    expect(question.formalization.expression.type).toBe('arithmetic-question');
  });

  it('represents real-world evidence as non-absolute links with provenance', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');

    expect(analysis.result.kind).toBe('evidence-estimate');
    expect(analysis.result.confidence).toBeLessThan(1);
    expect(analysis.result.confidence).toBeGreaterThan(0.98);
    expect(analysis.result.supportingEvidence.length).toBe(1);
    expect(analysis.result.supportingEvidence[0].sourceType).toBe('wikidata');
    expect(
      analysis.linksNetwork.links.some((link) => link.role === 'support')
    ).toBe(true);
  });

  it('uses bounded Wikidata-backed evidence for a person alive claim', () => {
    const analysis = analyzeStatement('Elon Musk is alive');

    expect(analysis.result.kind).toBe('evidence-estimate');
    expect(analysis.result.value).toBe(0.99);
    expect(analysis.result.confidence).toBe(0.99);
    expect(analysis.result.supportingEvidence[0].identifiers.subject).toBe(
      'Q317521'
    );
    expect(analysis.result.supportingEvidence[0].identifiers.property).toBe(
      'P570'
    );
  });

  it('turns local user beliefs into support or refutation evidence', () => {
    const analysis = analyzeStatement('Elon Musk is alive', {
      userBeliefs: {
        'Elon Musk is alive': 0.1,
      },
    });

    expect(
      analysis.result.refutingEvidence.some(
        (evidence) => evidence.sourceType === 'user'
      )
    ).toBe(true);
    expect(analysis.result.confidence).toBeLessThan(0.99);
  });

  it('marks self-referential false statements as undetermined', () => {
    const analysis = analyzeStatement('this statement is false');

    expect(analysis.formalization.expression.type).toBe(
      'self-reference-paradox'
    );
    expect(analysis.result.value).toBe('undetermined');
    expect(analysis.result.confidence).toBe(0.5);
  });

  it('serializes the selected links network to Links Notation text', () => {
    const analysis = analyzeStatement('1 + 1 = 2');
    const lino = serializeLinksNotation(analysis.linksNetwork);

    expect(lino.includes('links-network')).toBe(true);
    expect(lino.includes('statement')).toBe(true);
    expect(lino.includes('supports')).toBe(true);
    expect(lino.includes('graph')).toBe(false);
  });

  it('exposes prepared examples, level descriptions, and report URLs', () => {
    const examples = getPreparedExamples();
    const level = describeFormalizationLevel(4);
    const reportUrl = createIssueReportUrl(analyzeStatement('1 + 1'), {
      pageUrl: 'https://link-assistant.github.io/meta-expression/web/',
      userAgent: 'test browser',
    });
    const decodedReportUrl = decodeURIComponent(reportUrl.replace(/\+/g, ' '));

    expect(
      examples.some((example) => example.input === 'Elon Musk is alive')
    ).toBe(true);
    expect(level.name).toBe('Fully computable expression');
    expect(decodedReportUrl).toContain(
      'https://github.com/link-assistant/meta-expression/issues/new'
    );
    expect(decodedReportUrl).toContain('## Statement');
    expect(decodedReportUrl).toContain('1 + 1');
    expect(decodedReportUrl).toContain('links-network');
  });
});
