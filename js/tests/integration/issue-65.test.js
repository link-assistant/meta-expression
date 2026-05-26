import { describe, expect, it } from 'test-anywhere';
import {
  applyObjectTransformationRules,
  applyTextTransformationRules,
  rewriteLinksNotation,
  simplifyLinksNotation,
} from '../../src/transformation-rules.js';

describe('issue 65 - Links Notation rewrite transformations', () => {
  it('rewrites Links Notation terms with RML-style direction and occurrence controls', () => {
    expect(rewriteLinksNotation('((f a) = (f a))', '(a = b)')).toBe(
      '((f b) = (f b))'
    );
    expect(
      rewriteLinksNotation('(b = b)', '(a = b)', { direction: 'backward' })
    ).toBe('(a = a)');
    expect(
      rewriteLinksNotation('((pair a a) = (pair b a))', '(a = b)', {
        occurrence: 2,
      })
    ).toBe('((pair a b) = (pair b a))');
  });

  it('simplifies Links Notation with a guarded repeated rewrite set', () => {
    expect(simplifyLinksNotation('((f a) = (f a))', ['(a = b)'])).toBe(
      '((f b) = (f b))'
    );
    expect(() =>
      simplifyLinksNotation('(a = a)', ['(a = b)', '(b = a)'], {
        maxSteps: 3,
      })
    ).toThrow(/termination guard/i);
  });

  it('runs declarative rewrite and simplify rules through existing transformation hooks', async () => {
    const steps = [];
    const result = await applyTextTransformationRules(
      '((pair a a) = (pair a a))',
      [
        {
          id: 'rewrite-second-a',
          rewrite: '(a = b)',
          occurrence: 2,
        },
        {
          id: 'simplify-b-to-c',
          simplify: ['(b = c)'],
        },
      ],
      { phase: 'links-rewrite', steps }
    );

    expect(result).toBe('((pair a c) = (pair a a))');
    expect(steps.map((step) => step.rule)).toEqual([
      'rewrite-second-a',
      'simplify-b-to-c',
    ]);
    expect(
      steps.every((step) => step.type === 'custom-transformation-rule')
    ).toBe(true);
  });

  it('rewrites a targeted Links Notation field on object transformations', async () => {
    const result = await applyObjectTransformationRules(
      { linksNotation: '(a = a)', untouched: true },
      {
        id: 'rewrite-links-field',
        target: 'linksNotation',
        rewrite: { from: 'a', to: 'b' },
        occurrence: 'first',
      }
    );

    expect(result).toEqual({
      linksNotation: '(b = a)',
      untouched: true,
    });
  });

  it('keeps zero-config hook behavior for legacy text rules', async () => {
    const steps = [];
    const result = await applyTextTransformationRules(
      'kitten',
      [{ id: 'kitten-to-cat', pattern: 'kitten', replacement: 'cat' }],
      { phase: 'legacy', steps }
    );

    expect(result).toBe('cat');
    expect(steps.map((step) => step.rule)).toEqual(['kitten-to-cat']);
  });
});
