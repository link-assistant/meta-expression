import { describe, expect, it } from 'test-anywhere';
import { analyzeStatement, createIssueReportUrl } from '../../src/index.js';

const balancedRangeProgram = `
(range: -1 1)
(valence: 3)
((p = true) has probability 0)
(? (p = true))
`;

describe('issue 68 - reproducible statement probability', () => {
  it('maps relative-meta-logic truth range and valence onto default metrics', () => {
    const analysis = analyzeStatement(balancedRangeProgram);

    expect(analysis.result.kind).toBe('computed');
    expect(analysis.result.value).toBe('unknown');
    expect(analysis.result.probability).toBe(0.5);
    expect(analysis.result.correctness).toBe(0.5);
    expect(analysis.result.signedConfidence).toBe(0);
    expect(analysis.result.calculation.strategy).toBe(
      'relative-meta-logic-truth-value'
    );
    expect(analysis.result.calculation.truthValue).toBe(0);
    expect(analysis.result.calculation.truthRange).toEqual([-1, 1]);
    expect(analysis.result.calculation.valence).toBe(3);
  });

  it('exposes a reproducible probability calculation for each result kind', () => {
    const analyses = [
      analyzeStatement('1 + 1 = 2'),
      analyzeStatement('Earth orbits the Sun'),
      analyzeStatement('this statement is false'),
      analyzeStatement(balancedRangeProgram),
    ];

    for (const analysis of analyses) {
      expect(analysis.result.probability).toBe(analysis.result.correctness);
      expect(analysis.result.calculation.probability).toBe(
        analysis.result.probability
      );
      expect(analysis.result.calculation.correctness).toBe(
        analysis.result.correctness
      );
      expect(analysis.result.calculation.signedConfidence).toBe(
        analysis.result.signedConfidence
      );
      expect(Array.isArray(analysis.result.calculation.inputs)).toBe(true);
      expect(analysis.result.calculation.inputs.length).toBeGreaterThan(0);
    }
  });

  it('includes probability inputs in issue reports', () => {
    const reportUrl = createIssueReportUrl(
      analyzeStatement('Earth orbits the Sun'),
      { timestamp: '2026-05-25T00:00:00.000Z' }
    );
    const body = new URL(reportUrl).searchParams.get('body');

    expect(body).toContain('## Probability Calculation');
    expect(body).toContain('**Probability**');
    expect(body).toContain('sourceWeights');
    expect(body).toContain('real-world-uncertainty');
    expect(body).toContain('wikidata-structured-claim');
  });
});
