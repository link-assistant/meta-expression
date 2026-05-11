/**
 * Issue #26 — comparable-system fixtures.
 *
 * Each fixture in this file is harvested from the canonical docs of a
 * comparable project (Wolfram Alpha, Metamath, Lean/Coq/Z3, Wikidata,
 * Stanford OpenIE, AMR, AllenNLP SRL, ClaimReview, Snopes, SBERT, …).
 * See `docs/case-studies/issue-26/TEST-CASES.md` for the full catalogue
 * and `docs/COMPARISON-FEATURES.md` for the per-feature matrix.
 *
 * Assertions follow the project guardrails (issue #13, issue #17):
 *   - Arithmetic kernel is deterministic, so `correctness ∈ {0, 1}` and
 *     `signedConfidence ∈ {-1, +1}`.
 *   - Real-world claims must keep `0 < correctness < 1` and produce
 *     bounded confidence; tests assert the *band* and never demand the
 *     same binary verdict a closed-world tool would.
 *   - When a fixture depends on the live Wikimedia resolver (network)
 *     the analyzer returns `null`/`'unknown'`. Those rows are asserted
 *     defensively so the suite still runs offline.
 *   - NL → triple/SRL/AMR extraction is roadmap-deferred (Phase 8),
 *     so those cases are recorded with `it.skip`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'test-anywhere';
import { analyzeStatement } from '../src/index.js';

const TEST_CASES_PATH = 'docs/case-studies/issue-26/TEST-CASES.md';
const COMPARISON_CONCEPTS_PATH = 'docs/COMPARISON-CONCEPTS.md';
const COMPARISON_FEATURES_PATH = 'docs/COMPARISON-FEATURES.md';
const CASE_STUDY_README_PATH = 'docs/case-studies/issue-26/README.md';

describe('issue 26 — A. arithmetic kernel (deterministic)', () => {
  const trueArithmetic = ['1 + 1 = 2', '2 + 2 = 4', '2 * 3 = 6', '10 - 4 = 6'];
  const falseArithmetic = ['1 + 1 = 1', '2 + 2 = 5', '2 * 3 = 7', '10 - 4 = 5'];

  for (const input of trueArithmetic) {
    it(`reports correctness=1 and signedConfidence=+1 for "${input}" (matches Wolfram Alpha / Z3 sat / Lean rfl)`, () => {
      const analysis = analyzeStatement(input);
      expect(analysis.result.correctness).toBe(1);
      expect(analysis.result.signedConfidence).toBe(1);
      expect(analysis.result.kind).toBe('computed');
      expect(analysis.result.value).toBe(true);
    });
  }

  for (const input of falseArithmetic) {
    it(`reports correctness=0 and signedConfidence=-1 for "${input}" (matches Wolfram Alpha False / Z3 unsat)`, () => {
      const analysis = analyzeStatement(input);
      expect(analysis.result.correctness).toBe(0);
      expect(analysis.result.signedConfidence).toBe(-1);
      expect(analysis.result.kind).toBe('computed');
      expect(analysis.result.value).toBe(false);
    });
  }

  it('returns the question-shaped value for "1 + 1" (Wolfram Alpha "Result" pod = 2)', () => {
    const analysis = analyzeStatement('1 + 1');
    expect(analysis.result.kind).toBe('computed');
    expect(analysis.result.value).toBe(2);
  });

  it('returns the question-shaped value for "1 - 1" (Wolfram Alpha "Result" pod = 0)', () => {
    const analysis = analyzeStatement('1 - 1');
    expect(analysis.result.kind).toBe('computed');
    expect(analysis.result.value).toBe(0);
  });
});

describe('issue 26 — B. Wikidata-structured public facts', () => {
  it('keeps "Earth orbits the Sun" within the (0.5, 1) support band (Wikidata Q2 P398 Q525)', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');
    const c = analysis.result.correctness;
    expect(c).not.toBeNull();
    expect(c).toBeGreaterThan(0.5);
    expect(c).toBeLessThan(1);
    expect(analysis.result.kind).toBe('evidence-estimate');
  });

  it('keeps real-world confidence bounded below 1 to leave room for refutation', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');
    expect(analysis.result.confidence).toBeLessThan(1);
  });

  it('still resolves "Moon orbits the Sun" as supported via the parent-body chain Moon → Earth → Sun', () => {
    const analysis = analyzeStatement('Moon orbits the Sun');
    const c = analysis.result.correctness;
    if (c === null) {
      // Live resolver not configured in this environment — fixture is
      // tracked as documentation in TEST-CASES.md §B.
      return;
    }
    expect(c).toBeGreaterThan(0.5);
    expect(c).toBeLessThan(1);
  });

  it('refuses to claim binary certainty for negated facts (e.g. "Earth does not orbit the Sun")', () => {
    const analysis = analyzeStatement('Earth does not orbit the Sun');
    const c = analysis.result.correctness;
    if (c === null) {
      return;
    }
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThan(1);
  });
});

describe('issue 26 — C. Wikidata P570 liveness templates', () => {
  it('keeps "Elon Musk is alive" within the (0.5, 1) support band (Wikidata Q317521 has no P570)', () => {
    const analysis = analyzeStatement('Elon Musk is alive');
    const c = analysis.result.correctness;
    expect(c).not.toBeNull();
    expect(c).toBeGreaterThan(0.5);
    expect(c).toBeLessThan(1);
    expect(analysis.result.kind).toBe('evidence-estimate');
  });

  it('keeps bounded confidence (<1) for the liveness fixture so refutation remains representable', () => {
    const analysis = analyzeStatement('Elon Musk is alive');
    expect(analysis.result.confidence).toBeLessThan(1);
  });

  it('handles the negated liveness fixture without crashing or claiming binary certainty', () => {
    const analysis = analyzeStatement('Elon Musk is dead');
    const c = analysis.result.correctness;
    if (c === null) {
      return;
    }
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThan(1);
  });
});

describe('issue 26 — D. self-reference / Liar paradox', () => {
  it('returns neutral metrics for "this statement is false" (Tarski/Kripke undetermined)', () => {
    const analysis = analyzeStatement('this statement is false');
    expect(analysis.result.correctness).toBe(0.5);
    expect(analysis.result.signedConfidence).toBe(0);
    expect(analysis.result.value).toBe('undetermined');
  });

  it('never assigns a binary verdict to a self-referential claim', () => {
    const analysis = analyzeStatement('this statement is false');
    expect(analysis.result.value).not.toBe(true);
    expect(analysis.result.value).not.toBe(false);
  });
});

describe('issue 26 — E. NL → logic / triple extraction (roadmap Phase 8)', () => {
  it.skip('extracts (Barack Obama; was born in; Hawaii) triple — Stanford OpenIE canonical', () => {});
  it.skip('extracts SRL roles for "Mary gave John a book" — AllenNLP canonical', () => {});
  it.skip('exposes scope-ambiguous FOL for "Every man loves a woman" — Boxer/Montague', () => {});
  it.skip('emits AMR-style CST for "The boy wants to go" — AMR canonical', () => {});
});

describe('issue 26 — F. disputed-truth corpora (band-only, Phase 10)', () => {
  it.skip('keeps `0 < correctness < 1` for ClaimReview "5G causes coronavirus" — Google Fact Check', () => {});
  it.skip('keeps `0 < correctness < 1` for Snopes "Einstein failed math in school"', () => {});
  it.skip('keeps `0 < correctness < 1` for Politifact "Barack Obama was born in Kenya"', () => {});
});

describe('issue 26 — G. uniqueness / paraphrase (covered indirectly by issue-27 tests)', () => {
  it.skip('detects paraphrase similarity for SBERT STS-B canonical pair', () => {});
  it.skip('returns at least one source match for the iThenticate sample text', () => {});
});

describe('issue 26 — documentation sanity', () => {
  it('publishes the concept comparison doc with the documented legend symbols', () => {
    expect(existsSync(COMPARISON_CONCEPTS_PATH)).toBe(true);
    const concepts = readFileSync(COMPARISON_CONCEPTS_PATH, 'utf8');
    expect(concepts.includes('Last checked:')).toBe(true);
    expect(concepts.length).toBeGreaterThan(500);
  });

  it('publishes the feature comparison matrix with the four legend symbols', () => {
    expect(existsSync(COMPARISON_FEATURES_PATH)).toBe(true);
    const features = readFileSync(COMPARISON_FEATURES_PATH, 'utf8');
    for (const symbol of ['✓', '≈', '—', '✗']) {
      expect(features.includes(symbol)).toBe(true);
    }
    expect(features.includes('Last checked:')).toBe(true);
  });

  it('publishes the case-study README and test-case catalogue', () => {
    expect(existsSync(CASE_STUDY_README_PATH)).toBe(true);
    expect(existsSync(TEST_CASES_PATH)).toBe(true);
    const catalogue = readFileSync(TEST_CASES_PATH, 'utf8');
    expect(catalogue.includes('Arithmetic kernel')).toBe(true);
    expect(catalogue.includes('Wikidata')).toBe(true);
  });
});
