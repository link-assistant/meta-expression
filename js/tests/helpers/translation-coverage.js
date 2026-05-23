import { expect } from 'test-anywhere';

export function assertCompleteTranslationCoverage(result, sourceText) {
  assertFormalizedSourceCoverage(result, sourceText);
  assertSemanticMetaLanguageCoverage(result);
  assertTargetNaturalizationCoverage(result);
  expect(result.questions).toEqual([]);
}

export function assertFormalizedSourceCoverage(result, sourceText) {
  const cst = result.formalization?.cst ?? result.cst?.formalization;
  expect(cst?.type).toBe('formalization');
  expect(cst.text).toBe(String(sourceText ?? cst.text));
  expect(cst.tokens.length).toBeGreaterThan(0);

  const covered = new Set();
  for (const phrase of cst.phrases) {
    expect(Boolean(phrase.entity?.id)).toBe(true);
    expect(Boolean(phrase.entity?.url)).toBe(true);
    for (let index = phrase.start; index <= phrase.end; index += 1) {
      covered.add(index);
    }
  }

  for (let index = 0; index < cst.tokens.length; index += 1) {
    expect(covered.has(index)).toBe(true);
  }
}

export function assertSemanticMetaLanguageCoverage(result) {
  const links = result.semanticMetaLanguage?.links ?? [];
  const phrases = result.formalization?.cst?.phrases ?? [];
  expect(result.semanticMetaLanguage?.type).toBe('semantic-meta-language');
  expect(links.length).toBe(phrases.length);

  for (const link of links) {
    expect(Boolean(link.meaning?.id)).toBe(true);
    expect(Boolean(link.meaning?.url)).toBe(true);
  }
}

export function assertTargetNaturalizationCoverage(result) {
  const targetUnits = result.sentences.flatMap(
    (sentence) => sentence.targetUnits
  );
  const naturalizedUnits = result.naturalization.sentences.flatMap(
    (sentence) => sentence.targetUnits
  );

  expect(result.naturalization.type).toBe('naturalization');
  expect(targetUnits.length).toBeGreaterThan(0);
  expect(naturalizedUnits).toEqual(targetUnits);
  expect(result.cst.naturalization).toBe(result.naturalization);
  expect(result.markdown).toContain('](');
  expect(result.html).toContain('<a ');

  for (const unit of targetUnits) {
    expect(Boolean(unit.targetEntityId)).toBe(true);
    expect(Boolean(unit.targetUrl)).toBe(true);
    expect(unit.markdown).toContain('](');
    expect(unit.html).toContain('<a ');
  }
}
