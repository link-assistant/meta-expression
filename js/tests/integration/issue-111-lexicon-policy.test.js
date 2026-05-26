import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';

const semanticLexicon = JSON.parse(
  readFileSync(
    new URL('../../data/semantic-lexicon.json', import.meta.url),
    'utf8'
  )
);
const sourceReport = JSON.parse(
  readFileSync(
    new URL('../../data/lexicon-source-report.json', import.meta.url),
    'utf8'
  )
);
const lexiconOverrides = JSON.parse(
  readFileSync(
    new URL('../../data/lexicon-overrides.json', import.meta.url),
    'utf8'
  )
);

const legacyManualSources = new Set(['curated-seed', 'override']);
const policyThreshold = 0.5;

function conceptLabel(concept) {
  return `${concept.id} (${concept.status ?? concept.source ?? 'unknown'})`;
}

function usagePolicyAllows(concept) {
  const policy = concept.usagePolicy;
  if (!policy || typeof policy !== 'object') {
    return false;
  }
  return ['formalizations', 'naturalizations', 'translations'].some((kind) => {
    const usage = policy[kind];
    const used = Number(usage?.used);
    const total = Number(usage?.total);
    return (
      Number.isFinite(used) &&
      Number.isFinite(total) &&
      total > 0 &&
      used / total > policyThreshold
    );
  });
}

function validDerivation(derivation) {
  return (
    derivation &&
    typeof derivation.strategy === 'string' &&
    derivation.strategy.length > 0 &&
    typeof derivation.source === 'string' &&
    derivation.source.length > 0
  );
}

describe('issue 111 - lexicon hardcoded-data policy', () => {
  it('requires >50% usage proof for hand-written per-concept lexicon data', () => {
    const violations = semanticLexicon.concepts
      .filter(
        (concept) =>
          legacyManualSources.has(concept.source) && !usagePolicyAllows(concept)
      )
      .map(conceptLabel);

    expect(violations).toEqual([]);
  });

  it('keeps lexicon override records policy-proven rather than ad hoc', () => {
    const violations = (lexiconOverrides.concepts ?? [])
      .filter((concept) => !usagePolicyAllows(concept))
      .map((concept) => concept.id);

    expect(violations).toEqual([]);
  });

  it('records generated lexicon remainders as rule-derived data', () => {
    const violations = (sourceReport.concepts ?? [])
      .filter((concept) => legacyManualSources.has(concept.status))
      .map(conceptLabel);

    expect(violations).toEqual([]);
  });

  it('requires rule-derived concepts to point back to source data or a rule', () => {
    const recordedIds = new Set(
      (sourceReport.concepts ?? []).map((concept) => concept.id)
    );
    const violations = semanticLexicon.concepts
      .filter(
        (concept) =>
          concept.source === 'rule-derived' &&
          !recordedIds.has(concept.id) &&
          !validDerivation(concept.derivation)
      )
      .map(conceptLabel);

    expect(violations).toEqual([]);
  });
});
