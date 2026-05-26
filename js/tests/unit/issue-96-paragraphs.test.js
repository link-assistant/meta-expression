import { describe, expect, it } from 'test-anywhere';
import {
  assessReferenceAlignment,
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

const round3 = (value) => Math.round(value * 1000) / 1000;

describe('issue 96 - reference alignment scorer', () => {
  it('scores set overlap precision, recall, and F1 against a reference', () => {
    const alignment = assessReferenceAlignment(
      'американский предприниматель основатель',
      'американский предприниматель Маск'
    );
    // Two of the three unique machine tokens are attested by the reference.
    expect(alignment.overlap).toBe(2);
    expect(alignment.machineTokenCount).toBe(3);
    expect(alignment.referenceTokenCount).toBe(3);
    expect(round3(alignment.precision)).toBe(0.667);
    expect(round3(alignment.recall)).toBe(0.667);
    expect(round3(alignment.f1)).toBe(0.667);
    expect(alignment.matched).toContain('американский');
    expect(alignment.matched).toContain('предприниматель');
    expect(alignment.missing).toEqual(['основатель']);
  });

  it('keeps only target-script tokens when a script filter is given', () => {
    // Untranslated English residue must not count toward the alignment.
    const alignment = assessReferenceAlignment(
      'CEO американский businessman предприниматель',
      'американский предприниматель',
      { script: /[Ѐ-ӿ]+/ }
    );
    expect(alignment.machineTokenCount).toBe(2);
    expect(alignment.matched.sort()).toEqual([
      'американский',
      'предприниматель',
    ]);
    expect(alignment.precision).toBe(1);
  });

  it('ignores global flags on the script filter so no tokens are skipped', () => {
    const stateful = /[Ѐ-ӿ]+/g;
    const first = assessReferenceAlignment('текст домен', 'текст домен', {
      script: stateful,
    });
    const second = assessReferenceAlignment('текст домен', 'текст домен', {
      script: stateful,
    });
    expect(first.overlap).toBe(2);
    expect(second.overlap).toBe(2);
  });

  it('returns zeroed metrics for empty input', () => {
    const alignment = assessReferenceAlignment('', 'американский');
    expect(alignment.overlap).toBe(0);
    expect(alignment.precision).toBe(0);
    expect(alignment.recall).toBe(0);
    expect(alignment.f1).toBe(0);
    expect(alignment.matched).toEqual([]);
  });
});
