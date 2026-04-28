import { describe, it, expect } from 'test-anywhere';
import { analyzeStatement } from '../src/index.js';

describe('issue 13 - default metrics: correctness and signed confidence', () => {
  it('exposes both correctness and signedConfidence on every result', () => {
    const analysis = analyzeStatement('1 + 1 = 2');
    expect('correctness' in analysis.result).toBe(true);
    expect('signedConfidence' in analysis.result).toBe(true);
  });

  it('reports correctness=1 and signedConfidence=+1 for a true arithmetic claim', () => {
    const analysis = analyzeStatement('1 + 1 = 2');
    expect(analysis.result.correctness).toBe(1);
    expect(analysis.result.signedConfidence).toBe(1);
  });

  it('reports correctness=0 and signedConfidence=-1 for a false arithmetic claim', () => {
    const analysis = analyzeStatement('1 + 1 = 1');
    expect(analysis.result.correctness).toBe(0);
    expect(analysis.result.signedConfidence).toBe(-1);
  });

  it('keeps correctness equal to the legacy unsigned confidence value', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');
    expect(analysis.result.correctness).toBe(analysis.result.confidence);
  });

  it('signedConfidence equals 2 * correctness - 1 whenever correctness is known', () => {
    const inputs = [
      'Earth orbits the Sun',
      'Moon orbits the Sun',
      'Elon Musk is alive',
      '1 + 1 = 2',
    ];
    for (const input of inputs) {
      const analysis = analyzeStatement(input);
      const correctness = analysis.result.correctness;
      const signed = analysis.result.signedConfidence;
      if (correctness === null || signed === null) {
        continue;
      }
      const expected = 2 * correctness - 1;
      expect(Math.abs(signed - expected)).toBeLessThan(1e-9);
    }
  });

  it('keeps signedConfidence within the documented [-1, 1] range', () => {
    const inputs = [
      'Earth orbits the Sun',
      'Moon orbits the Sun',
      'Elon Musk is alive',
      '1 + 1 = 2',
      '1 + 1 = 1',
      'this statement is false',
    ];
    for (const input of inputs) {
      const analysis = analyzeStatement(input);
      const signed = analysis.result.signedConfidence;
      if (signed === null) {
        continue;
      }
      expect(signed).toBeGreaterThanOrEqual(-1);
      expect(signed).toBeLessThanOrEqual(1);
    }
  });

  it('keeps correctness within the documented [0, 1] range', () => {
    const inputs = [
      'Earth orbits the Sun',
      'Moon orbits the Sun',
      'Elon Musk is alive',
      '1 + 1 = 2',
      '1 + 1 = 1',
      'this statement is false',
    ];
    for (const input of inputs) {
      const analysis = analyzeStatement(input);
      const correctness = analysis.result.correctness;
      if (correctness === null) {
        continue;
      }
      expect(correctness).toBeGreaterThanOrEqual(0);
      expect(correctness).toBeLessThanOrEqual(1);
    }
  });

  it('reports neutral metrics for the self-reference paradox', () => {
    const analysis = analyzeStatement('this statement is false');
    expect(analysis.result.correctness).toBe(0.5);
    expect(analysis.result.signedConfidence).toBe(0);
  });

  it('lets two competing real-world claims be ranked by signed confidence', () => {
    const supported = analyzeStatement('Earth orbits the Sun');
    const refuted = analyzeStatement('Moon orbits the Sun');
    if (
      supported.result.signedConfidence !== null &&
      refuted.result.signedConfidence !== null
    ) {
      expect(supported.result.signedConfidence).toBeGreaterThan(
        refuted.result.signedConfidence - 0.0001
      );
    }
  });
});
