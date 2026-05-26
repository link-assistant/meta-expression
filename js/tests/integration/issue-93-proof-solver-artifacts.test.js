import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';
import {
  analyzeStatement,
  collectProofSolverArtifactEvidence,
  createLeanProofArtifactAdapter,
  createSmtLibSolverArtifactAdapter,
} from '../../src/index.js';

const artifacts = JSON.parse(
  readFileSync(
    new URL(
      '../fixtures/issue-93/proof-solver-artifacts.json',
      import.meta.url
    ),
    'utf8'
  )
);

describe('issue 93 - proof and solver artifact adapters', () => {
  it('normalizes proof assistant and solver artifacts into bounded provenance-bearing evidence', async () => {
    const bundle = await collectProofSolverArtifactEvidence('1 + 1 = 2', {
      artifacts,
      adapters: [
        createLeanProofArtifactAdapter(),
        createSmtLibSolverArtifactAdapter(),
      ],
      maxEvidenceWeight: 0.75,
      now: () => new Date('2026-05-26T12:00:00.000Z'),
    });

    expect(bundle.type).toBe('proof-solver-artifact-evidence');
    expect(bundle.status).toBe('evidence-only');
    expect(bundle.guardrails.executionGate.issue).toBe(72);
    expect(bundle.guardrails.absoluteClaims).toBe(false);
    expect(bundle.artifacts.map((artifact) => artifact.format)).toEqual([
      'lean4',
      'smt-lib',
    ]);
    expect(bundle.artifacts[0].family).toBe('proof-assistant');
    expect(bundle.artifacts[1].family).toBe('solver-query');
    expect(
      bundle.artifacts.every((artifact) => artifact.truthScoring.included)
    ).toBe(true);
    expect(
      bundle.artifacts.every((artifact) => !artifact.truthScoring.absolute)
    ).toBe(true);
    expect(bundle.evidence.length).toBe(2);
    expect(bundle.evidence.map((evidence) => evidence.sourceType)).toEqual([
      'proof-assistant-artifact',
      'solver-artifact',
    ]);
    expect(bundle.evidence.every((evidence) => evidence.weight < 1)).toBe(true);
    expect(bundle.evidence.every((evidence) => evidence.weight <= 0.75)).toBe(
      true
    );
    expect(
      bundle.artifacts.every(
        (artifact) => artifact.truthScoring.maxEvidenceWeight === 0.75
      )
    ).toBe(true);
    expect(bundle.evidence[0].claim).toContain('Lean 4');
    expect(bundle.evidence[1].claim).toContain('unsat');
  });

  it('attaches artifact evidence through analyzeStatement without producing absolute confidence', async () => {
    const bundle = await collectProofSolverArtifactEvidence('1 + 1 = 2', {
      artifacts,
    });
    const analysis = analyzeStatement('1 + 1 = 2', {
      interpretationIndex: 1,
      evidence: bundle.evidence,
    });
    const artifactEvidenceLinks = analysis.linksNetwork.links.filter(
      (link) =>
        link.role === 'evidence' &&
        link.value.situation === 'external-proof-solver-artifact'
    );

    expect(analysis.result.kind).toBe('evidence-estimate');
    expect(analysis.result.confidence).toBeLessThan(1);
    expect(analysis.result.supportingEvidence.length).toBe(2);
    expect(artifactEvidenceLinks.length).toBe(2);
    expect(artifactEvidenceLinks[0].provenance.sourceType).toBe(
      'proof-assistant-artifact'
    );
    expect(artifactEvidenceLinks[1].provenance.sourceType).toBe(
      'solver-artifact'
    );
  });
});
