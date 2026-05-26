import { describe, expect, it } from 'test-anywhere';
import {
  extractFirstParagraph,
  extractParagraphs,
  normalizeParagraphText,
} from '../../src/index.js';

describe('issue 96 - paragraph extraction helpers', () => {
  it('collapses internal whitespace and non-breaking spaces', () => {
    expect(normalizeParagraphText('Charles James  Kirk   was')).toBe(
      'Charles James Kirk was'
    );
    expect(normalizeParagraphText('  leading and trailing  ')).toBe(
      'leading and trailing'
    );
    expect(normalizeParagraphText('')).toBe('');
    expect(normalizeParagraphText(null)).toBe('');
  });

  it('splits an extract into normalized non-empty paragraphs', () => {
    const extract =
      'First paragraph with detail.\n\nSecond  paragraph.\n   \nThird paragraph here.\n';
    expect(extractParagraphs(extract)).toEqual([
      'First paragraph with detail.',
      'Second paragraph.',
      'Third paragraph here.',
    ]);
  });

  it('splits on single newlines as used by Wikipedia explaintext extracts', () => {
    const extract = 'Lead sentence.\nSecond block.\nThird block.';
    expect(extractParagraphs(extract)).toEqual([
      'Lead sentence.',
      'Second block.',
      'Third block.',
    ]);
  });

  it('returns the first normalized paragraph or an empty string', () => {
    expect(extractFirstParagraph('Alpha beta.\n\nGamma delta.')).toBe(
      'Alpha beta.'
    );
    expect(extractFirstParagraph('   \n\n   ')).toBe('');
    expect(extractFirstParagraph('')).toBe('');
  });
});
