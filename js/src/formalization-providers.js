export const FORMALIZATION_PROVIDER_STATUS = Object.freeze({
  CANDIDATE: 'candidate',
  SELECTED: 'selected',
  VALIDATED: 'validated',
});

const defaultCandidateReason =
  'Provider output is a candidate formalization and is not evidence until selected or validated.';

/**
 * Wrap a static fixture in the same async provider interface used by live
 * OpenIE, AMR, SRL, LLM, or entity-linking adapters.
 *
 * @param {object} fixture
 * @returns {object}
 */
export function createFixtureFormalizationProvider(fixture) {
  const descriptor = Array.isArray(fixture) ? {} : (fixture ?? {});
  return {
    id: descriptor.id ?? 'fixture-formalization-provider',
    name: descriptor.name ?? descriptor.id ?? 'Fixture formalization provider',
    kind: descriptor.kind ?? 'fixture',
    sourceType: descriptor.sourceType ?? 'formalization-provider',
    version: descriptor.version ?? null,
    extract() {
      return Promise.resolve(fixture);
    },
  };
}

/**
 * Collect candidate structures from static provider output and async provider
 * adapters. These candidates are intentionally recorded as partial
 * formalization suggestions; `/formalize` never treats them as truth evidence.
 *
 * @param {string} text
 * @param {object} [options]
 * @param {object[]} [options.providers]
 * @param {object[]|object} [options.providerOutputs]
 * @param {string} [options.language]
 * @param {Function} [options.now]
 * @param {object[]} [options.steps]
 * @returns {Promise<object>}
 */
export async function collectFormalizationProviderCandidates(
  text,
  options = {}
) {
  const rawOutputs = normalizeArray(options.providerOutputs);
  const providerResults = await Promise.all(
    normalizeArray(options.providers).map((provider, index) =>
      invokeProvider(provider, index, text, options)
    )
  );
  const bundles = [
    ...rawOutputs.flatMap((output, index) =>
      expandProviderOutput(output, {
        id: `provider-output-${index + 1}`,
      })
    ),
    ...providerResults.flatMap((result) =>
      expandProviderOutput(result.output, result.descriptor)
    ),
  ].map((bundle, index) => normalizeProviderBundle(bundle, index));

  const providerCandidates = buildProviderCandidateSet(bundles);
  if (options.trace !== false && providerCandidates.providers.length > 0) {
    options.steps?.push({
      type: 'formalization-provider-candidates',
      providers: providerCandidates.providers.map((provider) => provider.id),
      triples: providerCandidates.triples.length,
      roles: providerCandidates.roles.length,
      entityLinks: providerCandidates.entityLinks.length,
      graphs: providerCandidates.graphs.length,
    });
  }
  return providerCandidates;
}

async function invokeProvider(provider, index, text, options) {
  const descriptor = providerDescriptor(provider, index);
  if (!provider || typeof provider.extract !== 'function') {
    return {
      descriptor,
      output: {
        ...descriptor,
        diagnostics: [
          {
            level: 'error',
            message: 'Formalization provider must expose extract(text, ctx).',
          },
        ],
      },
    };
  }
  try {
    const output = await provider.extract(text, {
      language: options.language ?? 'en',
      now: options.now,
    });
    return { descriptor, output };
  } catch (error) {
    return {
      descriptor,
      output: {
        ...descriptor,
        diagnostics: [
          {
            level: 'error',
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      },
    };
  }
}

function providerDescriptor(provider, index) {
  return {
    id: provider?.id ?? `formalization-provider-${index + 1}`,
    name:
      provider?.name ?? provider?.id ?? `Formalization provider ${index + 1}`,
    kind: provider?.kind ?? 'provider',
    sourceType: provider?.sourceType ?? 'formalization-provider',
    version: provider?.version ?? null,
  };
}

function expandProviderOutput(output, descriptor) {
  if (Array.isArray(output)) {
    return output.flatMap((entry) => expandProviderOutput(entry, descriptor));
  }
  if (!output || typeof output !== 'object') {
    return [{ ...descriptor, diagnostics: [] }];
  }
  if (
    output.type === 'formalization-provider-candidates' &&
    Array.isArray(output.providers)
  ) {
    return output.providers.map((provider) => ({
      ...descriptor,
      ...provider,
      triples: (output.triples ?? []).filter(
        (entry) => entry.providerId === provider.id
      ),
      roles: (output.roles ?? []).filter(
        (entry) => entry.providerId === provider.id
      ),
      entityLinks: (output.entityLinks ?? []).filter(
        (entry) => entry.providerId === provider.id
      ),
      graphs: (output.graphs ?? []).filter(
        (entry) => entry.providerId === provider.id
      ),
      diagnostics: [
        ...(provider.diagnostics ?? []),
        ...(output.diagnostics ?? []).filter(
          (entry) => entry.providerId === provider.id
        ),
      ],
    }));
  }
  return [{ ...descriptor, ...output }];
}

function normalizeProviderBundle(raw, index) {
  const id = cleanString(raw.id) || `formalization-provider-${index + 1}`;
  const status = normalizeStatus(raw.status);
  const sourceType = cleanString(raw.sourceType) || 'formalization-provider';
  const provenance = {
    sourceType,
    method: cleanString(raw.kind) || cleanString(raw.name) || id,
    providerId: id,
    providerVersion: cleanString(raw.version) || null,
    retrievedAt: cleanString(raw.retrievedAt) || null,
  };
  const provider = {
    id,
    name: cleanString(raw.name) || id,
    kind: cleanString(raw.kind) || 'provider',
    sourceType,
    version: cleanString(raw.version) || null,
    status,
    retrievedAt: cleanString(raw.retrievedAt) || null,
    confidence: finiteNumber(raw.confidence),
    truthScoring: truthScoringForStatus(status),
    provenance,
    diagnostics: normalizeDiagnostics(raw.diagnostics, id),
  };
  const context = { provider, provenance, status };
  const triples = normalizeArray(raw.triples).map((entry, itemIndex) =>
    normalizeTriple(entry, itemIndex, context)
  );
  const roles = normalizeArray(raw.roles).map((entry, itemIndex) =>
    normalizeRole(entry, itemIndex, context)
  );
  const entityLinks = normalizeArray(raw.entityLinks ?? raw.entities).map(
    (entry, itemIndex) => normalizeEntityLink(entry, itemIndex, context)
  );
  const graphs = normalizeArray(raw.graphs).map((entry, itemIndex) =>
    normalizeGraph(entry, itemIndex, context)
  );
  provider.candidateCounts = {
    triples: triples.length,
    roles: roles.length,
    entityLinks: entityLinks.length,
    graphs: graphs.length,
  };
  return { provider, triples, roles, entityLinks, graphs };
}

function normalizeTriple(raw, index, context) {
  const status = normalizeStatus(raw.status, context.status);
  return {
    id: cleanString(raw.id) || `${context.provider.id}-triple-${index + 1}`,
    providerId: context.provider.id,
    kind: 'triple',
    subject: normalizeProviderPart(raw.subject),
    predicate: normalizeProviderPart(raw.predicate ?? raw.relation),
    object: normalizeProviderPart(raw.object),
    confidence: finiteNumber(raw.confidence),
    status,
    selected: raw.selected === true || status === 'selected',
    validated: raw.validated === true || status === 'validated',
    truthScoring: truthScoringForStatus(status),
    provenance: context.provenance,
  };
}

function normalizeRole(raw, index, context) {
  const status = normalizeStatus(raw.status, context.status);
  return {
    id: cleanString(raw.id) || `${context.provider.id}-role-${index + 1}`,
    providerId: context.provider.id,
    kind: 'semantic-role-frame',
    predicate: normalizeProviderPart(raw.predicate),
    arguments: normalizeArray(raw.arguments).map((argument, argumentIndex) => ({
      id:
        cleanString(argument.id) ||
        `${context.provider.id}-role-${index + 1}-argument-${argumentIndex + 1}`,
      role: cleanString(argument.role) || `ARG${argumentIndex}`,
      ...normalizeProviderPart(argument),
    })),
    confidence: finiteNumber(raw.confidence),
    status,
    selected: raw.selected === true || status === 'selected',
    validated: raw.validated === true || status === 'validated',
    truthScoring: truthScoringForStatus(status),
    provenance: context.provenance,
  };
}

function normalizeEntityLink(raw, index, context) {
  const status = normalizeStatus(raw.status, context.status);
  return {
    id:
      cleanString(raw.id) || `${context.provider.id}-entity-link-${index + 1}`,
    providerId: context.provider.id,
    kind: 'entity-link',
    ...normalizeProviderPart(raw),
    target: normalizeProviderTarget(raw.target ?? raw.entity ?? raw.candidate),
    confidence: finiteNumber(raw.confidence),
    status,
    selected: raw.selected === true || status === 'selected',
    validated: raw.validated === true || status === 'validated',
    truthScoring: truthScoringForStatus(status),
    provenance: context.provenance,
  };
}

function normalizeGraph(raw, index, context) {
  const status = normalizeStatus(raw.status, context.status);
  return {
    id: cleanString(raw.id) || `${context.provider.id}-graph-${index + 1}`,
    providerId: context.provider.id,
    kind: 'semantic-graph',
    format: cleanString(raw.format) || 'provider-graph',
    text: cleanString(raw.text) || '',
    nodes: normalizeArray(raw.nodes),
    edges: normalizeArray(raw.edges),
    confidence: finiteNumber(raw.confidence),
    status,
    selected: raw.selected === true || status === 'selected',
    validated: raw.validated === true || status === 'validated',
    truthScoring: truthScoringForStatus(status),
    provenance: context.provenance,
  };
}

function normalizeProviderPart(raw) {
  if (typeof raw === 'string') {
    return {
      text: raw,
      sourceStart: null,
      sourceEnd: null,
      target: null,
    };
  }
  const span = normalizeSpan(raw?.span ?? raw);
  return {
    text: cleanString(raw?.text ?? raw?.label) || '',
    sourceStart: span.sourceStart,
    sourceEnd: span.sourceEnd,
    target: normalizeProviderTarget(raw?.target ?? raw?.entity ?? null),
  };
}

function normalizeProviderTarget(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  return {
    id: cleanString(raw.id) || null,
    label: cleanString(raw.label) || null,
    description: cleanString(raw.description) || null,
    kind: cleanString(raw.kind) || null,
    source: cleanString(raw.source) || null,
    sourceUrl: cleanString(raw.sourceUrl ?? raw.url) || null,
  };
}

function normalizeSpan(raw) {
  if (Array.isArray(raw)) {
    return {
      sourceStart: integerOrNull(raw[0]),
      sourceEnd: integerOrNull(raw[1]),
    };
  }
  return {
    sourceStart: integerOrNull(raw?.sourceStart ?? raw?.start),
    sourceEnd: integerOrNull(raw?.sourceEnd ?? raw?.end),
  };
}

function buildProviderCandidateSet(bundles) {
  const providers = bundles.map((bundle) => bundle.provider);
  const triples = bundles.flatMap((bundle) => bundle.triples);
  const roles = bundles.flatMap((bundle) => bundle.roles);
  const entityLinks = bundles.flatMap((bundle) => bundle.entityLinks);
  const graphs = bundles.flatMap((bundle) => bundle.graphs);
  const diagnostics = providers.flatMap((provider) => provider.diagnostics);
  return {
    type: 'formalization-provider-candidates',
    version: 1,
    status: providers.length > 0 ? 'candidate-only' : 'empty',
    truthScoring: truthScoringForStatus('candidate'),
    providers,
    triples,
    roles,
    entityLinks,
    graphs,
    diagnostics,
  };
}

function normalizeDiagnostics(raw, providerId) {
  return normalizeArray(raw).map((diagnostic, index) => ({
    id: cleanString(diagnostic.id) || `${providerId}-diagnostic-${index + 1}`,
    providerId,
    level: cleanString(diagnostic.level) || 'info',
    message: cleanString(diagnostic.message) || '',
  }));
}

function truthScoringForStatus(status) {
  if (status === 'candidate') {
    return {
      included: false,
      eligible: false,
      reason: defaultCandidateReason,
    };
  }
  return {
    included: false,
    eligible: true,
    reason:
      '/formalize records selected or validated provider output as structured input, but does not score it as truth evidence.',
  };
}

function normalizeStatus(value, fallback = 'candidate') {
  const normalized = cleanString(value || fallback).toLowerCase();
  if (
    normalized === FORMALIZATION_PROVIDER_STATUS.SELECTED ||
    normalized === FORMALIZATION_PROVIDER_STATUS.VALIDATED
  ) {
    return normalized;
  }
  return FORMALIZATION_PROVIDER_STATUS.CANDIDATE;
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

function integerOrNull(value) {
  return Number.isInteger(value) ? value : null;
}
