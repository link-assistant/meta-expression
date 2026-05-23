import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'test-anywhere';

const FEATURE_COMPARISON_PATH = 'docs/COMPARISON-FEATURES.md';
const ISSUE_20_CASE_STUDY_PATH = 'docs/case-studies/issue-20/README.md';

describe('issue 20 — Jenni AI comparison expansion', () => {
  it('adds a focused academic-writing assistant feature lens', () => {
    const features = readFileSync(FEATURE_COMPARISON_PATH, 'utf8');

    expect(
      features.includes('Expanded academic-writing assistant matrix')
    ).toBe(true);

    for (const project of [
      'Jenni AI',
      'Elicit',
      'Grammarly',
      'Consensus.app',
    ]) {
      expect(features.includes(project)).toBe(true);
    }

    for (const feature of [
      'F8 Real-world evidence',
      'F13 /uniqueness (originality)',
      'F16 Issue-report URL prefilled',
    ]) {
      expect(features.includes(feature)).toBe(true);
    }
  });

  it('archives the issue-specific research trail', () => {
    expect(existsSync(ISSUE_20_CASE_STUDY_PATH)).toBe(true);

    const caseStudy = readFileSync(ISSUE_20_CASE_STUDY_PATH, 'utf8');
    expect(
      caseStudy.includes(
        'https://github.com/link-assistant/meta-expression/issues/20'
      )
    ).toBe(true);
    expect(caseStudy.includes('https://jenni.ai/pricing')).toBe(true);
    expect(
      caseStudy.includes('https://help.jenni.ai/docs/ai-tools/ai-autocomplete/')
    ).toBe(true);
  });
});
