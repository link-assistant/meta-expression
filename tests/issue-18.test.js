import { describe, it, expect } from 'test-anywhere';
import {
  analyzeStatement,
  getPreferenceBeliefProbability,
  isPreferenceBeliefVisible,
  parsePreferenceProfile,
  serializePreferenceProfile,
} from '../src/index.js';

describe('issue 18 - preference profiles', () => {
  it('round-trips a profile through Links Notation', () => {
    const profile = {
      activeContextId: 'star-wars',
      beliefs: {
        'god-exists': 0.9,
        'christianity-is-true': 0.3,
      },
    };

    const encoded = serializePreferenceProfile(profile);
    const decoded = parsePreferenceProfile(encoded);

    expect(decoded.activeContextId).toBe('star-wars');
    expect(getPreferenceBeliefProbability(decoded, 'god-exists')).toBe(0.9);
    expect(
      getPreferenceBeliefProbability(decoded, 'christianity-is-true')
    ).toBe(0.3);
  });

  it('keeps specific religion sliders hidden unless the God belief is positive', () => {
    expect(
      isPreferenceBeliefVisible(
        { id: 'christianity-is-true' },
        {
          beliefs: { 'god-exists': 0.5 },
        }
      )
    ).toBe(false);
    expect(
      isPreferenceBeliefVisible(
        { id: 'christianity-is-true' },
        {
          beliefs: { 'god-exists': 0.7 },
        }
      )
    ).toBe(true);
  });

  it('derives atheist refutations for specific religions', () => {
    const analysis = analyzeStatement('Christianity is true', {
      evidence: [],
      preferenceProfile: {
        beliefs: {
          'god-exists': 0,
        },
      },
    });

    expect(analysis.result.refutingEvidence.length).toBeGreaterThan(0);
    expect(analysis.result.signedConfidence).toBeLessThan(0);
  });

  it('uses the selected context as local lore evidence', () => {
    const analysis = analyzeStatement('The Force exists', {
      evidence: [],
      preferenceProfile: {
        activeContextId: 'star-wars',
      },
    });

    expect(analysis.result.supportingEvidence.length).toBeGreaterThan(0);
    expect(analysis.result.correctness).toBeGreaterThan(0.9);
  });
});
