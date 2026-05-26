import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'test-anywhere';

describe('vision documentation', () => {
  it('promotes the canonical requirements and roadmap into docs', () => {
    expect(existsSync('docs/REQUIREMENTS.md')).toBe(true);
    expect(existsSync('docs/ROADMAP.md')).toBe(true);

    const readme = readFileSync('README.md', 'utf8');

    expect(readme.includes('docs/REQUIREMENTS.md')).toBe(true);
    expect(readme.includes('docs/ROADMAP.md')).toBe(true);
  });

  it('keeps first-class docs in links terminology', () => {
    const docs = [
      readFileSync('README.md', 'utf8'),
      readFileSync('docs/REQUIREMENTS.md', 'utf8'),
      readFileSync('docs/ROADMAP.md', 'utf8'),
    ].join('\n');
    const discouragedPhrases = [
      ['dependency ', 'g', 'raph'].join(''),
      ['partial ', 'g', 'raph'].join(''),
      ['no', 'des ='].join(''),
      ['ed', 'ges:'].join(''),
      ['everything is a ', 'g', 'raph'].join(''),
    ];

    for (const phrase of discouragedPhrases) {
      expect(docs.toLowerCase().includes(phrase)).toBe(false);
    }
  });

  it('keeps competitor parity research current and linked to follow-up issues', () => {
    const concepts = readFileSync('docs/COMPARISON-CONCEPTS.md', 'utf8');
    const features = readFileSync('docs/COMPARISON-FEATURES.md', 'utf8');
    const researchPath = 'docs/case-studies/issue-71/ONLINE-RESEARCH.md';
    const missingFeaturesPath =
      'docs/case-studies/issue-71/MISSING-FEATURES.md';

    expect(existsSync(researchPath)).toBe(true);
    expect(existsSync(missingFeaturesPath)).toBe(true);
    expect(concepts.includes('> Last checked: 2026-05-26.')).toBe(true);
    expect(features.includes('> Last checked: 2026-05-26.')).toBe(true);
    expect(features.includes('Competitor-derived follow-up issues')).toBe(true);
    expect(concepts.includes(researchPath)).toBe(true);
    expect(features.includes(missingFeaturesPath)).toBe(true);

    const missingFeatures = readFileSync(missingFeaturesPath, 'utf8');
    for (const expectedGap of [
      'ClaimReview / Schema.org',
      'PROV-O / JSON-LD',
      'OpenIE / AMR',
      'document-level originality',
      'literature-review evidence',
      'SPARQL and graph exports',
    ]) {
      expect(missingFeatures.includes(expectedGap)).toBe(true);
    }
  });
});
