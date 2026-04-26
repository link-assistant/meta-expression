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
});
