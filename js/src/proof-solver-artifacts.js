export const PROOF_SOLVER_ARTIFACT_FORMATS = Object.freeze({
  LEAN4: 'lean4',
  SMT_LIB: 'smt-lib',
});

export const PROOF_SOLVER_ARTIFACT_STATUS = Object.freeze({
  CANDIDATE: 'candidate',
  VALIDATED: 'validated',
  UNSUPPORTED: 'unsupported',
});

const issue72Gate = Object.freeze({
  issue: 72,
  label: 'execution-parity-gate',
  url: 'https://github.com/link-assistant/meta-expression/issues/72',
});
const defaultMaxEvidenceWeight = 0.9;
const artifactSituation = 'external-proof-solver-artifact';
const boundedEvidenceReason =
  'External proof and solver artifacts are recorded as bounded evidence; local execution and parity validation stay behind issue #72.';

export function createLeanProofArtifactAdapter(options = {}) {
  return {
    id: options.id ?? 'lean4-proof-artifact-adapter',
    name: options.name ?? 'Lean 4 proof artifact adapter',
    kind: options.kind ?? 'proof-assistant',
    formats: options.formats ?? ['lean4', 'lean'],
    sourceType: options.sourceType ?? 'proof-assistant-artifact',
    version: options.version ?? '1',
    adapt(raw, context = {}) {
      return normalizeArtifact(raw, context, {
        adapter: this,
        family: 'proof-assistant',
        defaultFormat: PROOF_SOLVER_ARTIFACT_FORMATS.LEAN4,
        resultKind: 'proof',
        checks: validateLeanArtifact(raw),
      });
    },
  };
}

export function createSmtLibSolverArtifactAdapter(options = {}) {
  return {
    id: options.id ?? 'smt-lib-solver-artifact-adapter',
    name: options.name ?? 'SMT-LIB solver artifact adapter',
    kind: options.kind ?? 'solver-query',
    formats: options.formats ?? ['smt-lib', 'smtlib', 'smt2'],
    sourceType: options.sourceType ?? 'solver-artifact',
    version: options.version ?? '1',
    adapt(raw, context = {}) {
      return normalizeArtifact(raw, context, {
        adapter: this,
        family: 'solver-query',
        defaultFormat: PROOF_SOLVER_ARTIFACT_FORMATS.SMT_LIB,
        resultKind: 'solver-result',
        checks: validateSmtLibArtifact(raw),
      });
    },
  };
}

export function createFixtureProofSolverArtifactAdapter(fixture) {
  const descriptor = Array.isArray(fixture) ? {} : (fixture ?? {});
  return {
    id: descriptor.id ?? 'fixture-proof-solver-artifact-adapter',
    name:
      descriptor.name ??
      descriptor.id ??
      'Fixture proof and solver artifact adapter',
    kind: descriptor.kind ?? 'fixture',
    sourceType: descriptor.sourceType ?? 'proof-solver-fixture',
    version: descriptor.version ?? null,
    extract() {
      return Promise.resolve(fixture);
    },
  };
}

export async function collectProofSolverArtifactEvidence(
  claimText,
  options = {}
) {
  const adapters = normalizeAdapters(options.adapters);
  const maxEvidenceWeight = normalizeMaxEvidenceWeight(
    options.maxEvidenceWeight
  );
  const collected = await collectAdapterOutputs(claimText, options);
  const rawArtifacts = [
    ...normalizeArray(options.artifacts),
    ...collected.artifacts,
  ];
  const diagnostics = [...collected.diagnostics];
  const normalizedArtifacts = [];

  for (const [index, raw] of rawArtifacts.entries()) {
    const adapter = findAdapterForArtifact(raw, adapters);
    if (!adapter) {
      diagnostics.push({
        id: `proof-solver-artifact-diagnostic-${index + 1}`,
        level: 'warning',
        message: `No proof/solver artifact adapter found for format "${cleanString(
          raw?.format ?? raw?.artifact?.language
        )}".`,
      });
      continue;
    }
    normalizedArtifacts.push(
      adapter.adapt(raw, {
        claimText,
        index,
        maxEvidenceWeight,
        now: options.now,
      })
    );
  }

  const evidence = normalizedArtifacts.flatMap((artifact) =>
    artifact.evidence ? [artifact.evidence] : []
  );
  return {
    type: 'proof-solver-artifact-evidence',
    version: 1,
    status: evidence.length > 0 ? 'evidence-only' : 'empty',
    claim: {
      text: cleanString(claimText),
      key: normalizeKey(claimText),
    },
    guardrails: {
      executionGate: issue72Gate,
      absoluteClaims: false,
      defaultMaxEvidenceWeight,
      reason: boundedEvidenceReason,
    },
    adapters: adapters.map(adapterSummary),
    artifacts: normalizedArtifacts,
    evidence,
    diagnostics,
  };
}

async function collectAdapterOutputs(claimText, options) {
  const extractors = normalizeArray(options.sourceAdapters).filter(
    (adapter) => typeof adapter?.extract === 'function'
  );
  const legacyExtractors = normalizeArray(options.adapters).filter(
    (adapter) =>
      typeof adapter?.extract === 'function' &&
      typeof adapter?.adapt !== 'function'
  );
  const outputs = await Promise.all(
    [...extractors, ...legacyExtractors].map((adapter) =>
      invokeSourceAdapter(adapter, claimText, options)
    )
  );
  return outputs.reduce(
    (collected, output) => {
      collected.artifacts.push(...expandArtifactOutput(output));
      collected.diagnostics.push(...expandOutputDiagnostics(output));
      return collected;
    },
    { artifacts: [], diagnostics: [] }
  );
}

async function invokeSourceAdapter(adapter, claimText, options) {
  try {
    return await adapter.extract(claimText, {
      now: options.now,
      executionGate: issue72Gate,
    });
  } catch (error) {
    return {
      diagnostics: [
        {
          level: 'error',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

function expandArtifactOutput(output) {
  if (Array.isArray(output)) {
    return output.flatMap((entry) => expandArtifactOutput(entry));
  }
  if (
    output?.type === 'proof-solver-artifact-evidence' &&
    Array.isArray(output.artifacts)
  ) {
    return output.artifacts;
  }
  if (output?.artifacts) {
    return normalizeArray(output.artifacts);
  }
  if (output?.diagnostics && !isArtifactLike(output)) {
    return [];
  }
  return normalizeArray(output);
}

function expandOutputDiagnostics(output) {
  if (Array.isArray(output)) {
    return output.flatMap((entry) => expandOutputDiagnostics(entry));
  }
  return normalizeArray(output?.diagnostics).map((diagnostic, index) => ({
    id:
      cleanString(diagnostic?.id) ||
      `proof-solver-source-adapter-diagnostic-${index + 1}`,
    level: cleanString(diagnostic?.level) || 'warning',
    message:
      cleanString(diagnostic?.message) ||
      'Source adapter returned a diagnostic.',
  }));
}

function isArtifactLike(output) {
  return Boolean(
    output &&
    (output.format ||
      output.artifact ||
      output.text ||
      output.snippet ||
      output.result ||
      output.claim)
  );
}

function normalizeAdapters(adapters) {
  const provided = normalizeArray(adapters).filter(
    (adapter) => typeof adapter?.adapt === 'function'
  );
  if (provided.length > 0) {
    return provided;
  }
  return [
    createLeanProofArtifactAdapter(),
    createSmtLibSolverArtifactAdapter(),
  ];
}

function findAdapterForArtifact(raw, adapters) {
  const format = normalizeFormat(raw?.format ?? raw?.artifact?.language);
  return adapters.find((adapter) =>
    normalizeArray(adapter.formats).map(normalizeFormat).includes(format)
  );
}

function normalizeArtifact(raw, context, defaults) {
  const adapter = defaults.adapter;
  const maxEvidenceWeight = normalizeMaxEvidenceWeight(
    context.maxEvidenceWeight
  );
  const checks = defaults.checks;
  const identity = artifactIdentity(raw, context, adapter);
  const format = normalizeArtifactFormat(raw, defaults);
  const result = normalizeArtifactResult(raw, identity.retrievedAt, defaults);
  const eligible = isEvidenceEligible(identity.claimText, result, checks);
  const status = eligible
    ? PROOF_SOLVER_ARTIFACT_STATUS.VALIDATED
    : PROOF_SOLVER_ARTIFACT_STATUS.CANDIDATE;
  const weight = clamp(
    finiteNumber(raw?.weight ?? raw?.result?.weight) ?? maxEvidenceWeight,
    0,
    maxEvidenceWeight
  );
  const normalized = {
    id: identity.id,
    family: defaults.family,
    format,
    system: artifactSystem(raw, adapter),
    adapterId: adapter.id,
    claim: {
      text: identity.claimText,
      key: normalizeKey(identity.claimText),
    },
    artifact: normalizeArtifactPayload(raw, defaults),
    result,
    provenance: {
      sourceType: adapter.sourceType,
      method: adapter.kind,
      adapterId: adapter.id,
      adapterVersion: adapter.version ?? null,
      sourceUrl: identity.sourceUrl,
      retrievedAt: identity.retrievedAt,
    },
    verification: {
      executed: false,
      executionGate: issue72Gate,
      checks,
      diagnostics: checks
        .filter((check) => !check.passed)
        .map((check) => ({
          level: 'warning',
          message: check.message,
        })),
    },
    status,
    truthScoring: truthScoring(status, eligible, maxEvidenceWeight),
    evidence: null,
  };

  if (eligible) {
    normalized.evidence = artifactToEvidence(normalized, { weight });
  }
  return normalized;
}

function artifactIdentity(raw, context, adapter) {
  const claimText = cleanString(raw?.claim) || cleanString(context.claimText);
  return {
    id: artifactId(raw, context, adapter, claimText),
    claimText,
    sourceUrl: artifactSourceUrl(raw),
    retrievedAt: artifactRetrievedAt(raw, context),
  };
}

function artifactId(raw, context, adapter, claimText) {
  return (
    cleanString(raw?.id) ||
    `${adapter.id}-${context.index + 1 || safeReference(claimText)}`
  );
}

function artifactSourceUrl(raw) {
  return (
    cleanString(raw?.sourceUrl ?? raw?.result?.sourceUrl) ||
    defaultSourceUrl(raw)
  );
}

function artifactRetrievedAt(raw, context) {
  return (
    cleanString(raw?.retrievedAt ?? raw?.result?.checkedAt) ||
    timestampFrom(context.now?.())
  );
}

function normalizeArtifactFormat(raw, defaults) {
  return (
    normalizeFormat(raw?.format ?? raw?.artifact?.language) ||
    defaults.defaultFormat
  );
}

function normalizeArtifactPayload(raw, defaults) {
  const artifact = raw?.artifact ?? {};
  return {
    language: cleanString(artifact.language) || defaults.defaultFormat,
    entrypoint: cleanString(artifact.entrypoint) || null,
    intent: cleanString(artifact.intent) || null,
    text: cleanString(artifact.text ?? raw?.text ?? raw?.snippet),
  };
}

function normalizeArtifactResult(raw, retrievedAt, defaults) {
  const result = raw?.result ?? {};
  return {
    kind: defaults.resultKind,
    outcome: normalizeOutcome(result.outcome ?? raw?.outcome),
    polarity: normalizePolarity(raw?.polarity ?? result.polarity),
    checker: cleanString(result.checker ?? result.solver) || null,
    mode: cleanString(result.mode) || 'external',
    checkedAt: cleanString(result.checkedAt) || retrievedAt,
    absolute: false,
  };
}

function artifactSystem(raw, adapter) {
  const result = raw?.result ?? {};
  return (
    cleanString(raw?.system ?? result.checker ?? result.solver) || adapter.name
  );
}

function isEvidenceEligible(claimText, result, checks) {
  return Boolean(
    claimText &&
    result.outcome &&
    result.polarity &&
    checks.every((check) => check.passed)
  );
}

function validateLeanArtifact(raw) {
  const text = cleanString(raw?.artifact?.text ?? raw?.text ?? raw?.snippet);
  return [
    {
      id: 'lean-non-empty',
      passed: text.length > 0,
      message: 'Lean artifact text is required.',
    },
    {
      id: 'lean-declaration',
      passed: /\b(theorem|lemma|example)\b/u.test(text),
      message: 'Lean artifact should contain a theorem, lemma, or example.',
    },
    {
      id: 'lean-proof-term',
      passed: /:=/u.test(text),
      message: 'Lean artifact should include a proof term separator.',
    },
  ];
}

function validateSmtLibArtifact(raw) {
  const text = cleanString(raw?.artifact?.text ?? raw?.text ?? raw?.snippet);
  const outcome = normalizeOutcome(raw?.result?.outcome ?? raw?.outcome);
  return [
    {
      id: 'smt-lib-non-empty',
      passed: text.length > 0,
      message: 'SMT-LIB artifact text is required.',
    },
    {
      id: 'smt-lib-check-sat',
      passed: /\(\s*check-sat\s*\)/iu.test(text),
      message: 'SMT-LIB artifact should contain a check-sat query.',
    },
    {
      id: 'smt-lib-outcome',
      passed: ['sat', 'unsat', 'unknown'].includes(outcome),
      message: 'SMT-LIB result should be sat, unsat, or unknown.',
    },
  ];
}

function truthScoring(
  status,
  included,
  maxEvidenceWeight = defaultMaxEvidenceWeight
) {
  return {
    included,
    eligible: status === PROOF_SOLVER_ARTIFACT_STATUS.VALIDATED,
    absolute: false,
    maxEvidenceWeight,
    executionGate: issue72Gate,
    reason: included
      ? boundedEvidenceReason
      : 'Artifact is retained as provenance, but it is not scored until it names a claim, result, polarity, and passes adapter shape checks.',
  };
}

function artifactToEvidence(artifact, options) {
  const claimKey = artifact.claim.key;
  return {
    id: `artifact-evidence-${safeReference(artifact.id)}`,
    key: claimKey,
    polarity: artifact.result.polarity,
    weight: options.weight,
    sourceType: artifact.provenance.sourceType,
    situation: artifactSituation,
    sourceUrl: artifact.provenance.sourceUrl,
    retrievedAt: artifact.provenance.retrievedAt,
    claim: artifactEvidenceClaim(artifact),
    identifiers: {
      artifactId: artifact.id,
      format: artifact.format,
      family: artifact.family,
      system: artifact.system,
      outcome: artifact.result.outcome,
      executionGate: 'issue-72',
    },
    context: {
      artifact: {
        id: artifact.id,
        format: artifact.format,
        family: artifact.family,
        result: artifact.result,
        verification: artifact.verification,
      },
      reasoningSteps: [
        {
          text: `${artifact.system} artifact reported ${artifact.result.outcome} for "${artifact.claim.text}".`,
          sourceUrl: artifact.provenance.sourceUrl,
        },
        {
          text: 'meta-expression records this as bounded evidence and does not execute the external checker in this adapter.',
          sourceUrl: issue72Gate.url,
        },
      ],
    },
  };
}

function artifactEvidenceClaim(artifact) {
  const outcome = artifact.result.outcome;
  const system = artifact.system;
  const family =
    artifact.family === 'proof-assistant'
      ? 'proof artifact'
      : 'solver artifact';
  return `${system} ${family} reports ${outcome} for "${artifact.claim.text}"; recorded as bounded external evidence, not an absolute local proof.`;
}

function adapterSummary(adapter) {
  return {
    id: adapter.id,
    name: adapter.name,
    kind: adapter.kind,
    formats: normalizeArray(adapter.formats),
    sourceType: adapter.sourceType,
    version: adapter.version ?? null,
  };
}

function defaultSourceUrl(raw) {
  const system = cleanString(raw?.system).toLowerCase();
  if (system.includes('lean')) {
    return 'https://lean-lang.org/';
  }
  if (system.includes('z3')) {
    return 'https://github.com/Z3Prover/z3';
  }
  return null;
}

function normalizeOutcome(value) {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === 'proved' || normalized === 'valid') {
    return normalized;
  }
  if (['sat', 'unsat', 'unknown', 'counterexample'].includes(normalized)) {
    return normalized;
  }
  return normalized || null;
}

function normalizePolarity(value) {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === 'supports') {
    return 'support';
  }
  if (normalized === 'refutes') {
    return 'refute';
  }
  if (normalized === 'support' || normalized === 'refute') {
    return normalized;
  }
  return null;
}

function normalizeFormat(value) {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === 'smtlib' || normalized === 'smt2') {
    return PROOF_SOLVER_ARTIFACT_FORMATS.SMT_LIB;
  }
  if (normalized === 'lean') {
    return PROOF_SOLVER_ARTIFACT_FORMATS.LEAN4;
  }
  return normalized;
}

function normalizeKey(input) {
  return cleanString(input)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ');
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.filter((entry) => entry !== null && entry !== undefined);
  }
  if (value === null || value === undefined) {
    return [];
  }
  return [value];
}

function cleanString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMaxEvidenceWeight(value) {
  const parsed = finiteNumber(value);
  return parsed === null ? defaultMaxEvidenceWeight : clamp(parsed, 0, 0.99);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function timestampFrom(value) {
  if (!value) {
    return new Date().toISOString();
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toISOString();
}

function safeReference(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 64);
}
