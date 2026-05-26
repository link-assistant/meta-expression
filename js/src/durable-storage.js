import { decodeFromDoublets, encodeAsDoublets } from './doublets.js';

const portableCaseSchema = 'meta-expression.portable-case';
const portableCaseVersion = 1;

export function exportPortableCaseData(input, options = {}) {
  const source = asPortableSource(input);
  const linksNetwork = normalizeLinksNetwork(source.linksNetwork);

  return {
    schema: portableCaseSchema,
    version: portableCaseVersion,
    caseId:
      options.caseId ??
      source.caseId ??
      linksNetwork.id ??
      'meta-expression-case',
    exportedAt:
      options.exportedAt ?? source.exportedAt ?? new Date().toISOString(),
    migratedFrom:
      options.migratedFrom ?? source.migratedFrom ?? migrationSource(input),
    storage: {
      backend: 'doublets',
      linkFields: [
        'id',
        'role',
        'references',
        'value',
        'provenance',
        'version',
      ],
      stringEncoding: 'unicode-codepoint-sequence',
    },
    linksNetwork,
  };
}

export function importPortableCaseData(input, options = {}) {
  return exportPortableCaseData(input, {
    caseId: input?.caseId ?? options.caseId,
    exportedAt: input?.exportedAt ?? options.exportedAt,
    migratedFrom: input?.migratedFrom ?? options.migratedFrom,
  });
}

export function savePortableCaseToDoublets(input, options = {}) {
  const portable = exportPortableCaseData(input, options);
  const { binary, rootIndex, store } = encodeAsDoublets(portable);

  return {
    format: portableCaseSchema,
    version: portableCaseVersion,
    binary,
    rootIndex,
    linksNotation: store.toLinksNotation(),
    portable,
  };
}

export function loadPortableCaseFromDoublets(input) {
  const binary = input instanceof Uint8Array ? input : input?.binary;
  if (!(binary instanceof Uint8Array)) {
    throw new TypeError(
      'Portable Doublets input must include Uint8Array bytes.'
    );
  }
  const decoded = decodeFromDoublets(binary, input?.rootIndex);
  return importPortableCaseData(decoded);
}

function asPortableSource(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('Portable case data requires a links network.');
  }
  if (input.schema === portableCaseSchema && input.linksNetwork) {
    return input;
  }
  if (input.kind === 'links-network' && Array.isArray(input.links)) {
    return { linksNetwork: input };
  }
  if (input.linksNetwork?.kind === 'links-network') {
    return { linksNetwork: input.linksNetwork };
  }
  throw new TypeError('Unsupported portable case input shape.');
}

function migrationSource(input) {
  if (input?.schema === portableCaseSchema) {
    return 'portable-case-v1';
  }
  if (input?.kind === 'links-network') {
    return 'links-network-v1';
  }
  return 'statement-analysis-v1';
}

function normalizeLinksNetwork(network) {
  return {
    id: String(network.id ?? 'links-network'),
    kind: 'links-network',
    version: finiteVersion(network.version),
    beliefSystem: clonePortableValue(network.beliefSystem ?? {}),
    links: (network.links ?? []).map((link, index) =>
      normalizeLinkRecord(link, index)
    ),
  };
}

function normalizeLinkRecord(link, index) {
  const value = clonePortableValue(link.value ?? null);
  return {
    id: String(link.id ?? `link-${index + 1}`),
    role: String(link.role ?? 'link'),
    references: Array.isArray(link.references)
      ? link.references.map((reference) => String(reference))
      : [],
    version: finiteVersion(link.version ?? value?.version),
    value,
    provenance: normalizeProvenance(link.provenance),
  };
}

function normalizeProvenance(provenance = {}) {
  return {
    sourceType: String(provenance.sourceType ?? 'unknown'),
    method: provenance.method ?? undefined,
    sourceUrl: provenance.sourceUrl ?? null,
    retrievedAt: provenance.retrievedAt ?? null,
  };
}

function finiteVersion(value) {
  const version = Number(value ?? 1);
  return Number.isFinite(version) && version > 0 ? version : 1;
}

function clonePortableValue(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(clonePortableValue);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      clonePortableValue(entry),
    ])
  );
}
