import { serializeLinksNotation } from './reporting.js';

const metaNamespace = 'https://link-assistant.github.io/meta-expression/vocab#';
const provNamespace = 'http://www.w3.org/ns/prov#';
const schemaNamespace = 'https://schema.org/';
const xsdNamespace = 'http://www.w3.org/2001/XMLSchema#';

const jsonLdContext = Object.freeze({
  meta: metaNamespace,
  prov: provNamespace,
  schema: schemaNamespace,
  xsd: xsdNamespace,
  analyses: {
    '@id': 'meta:analysis',
    '@container': '@set',
  },
  evidenceRecords: {
    '@id': 'meta:evidenceRecord',
    '@container': '@set',
  },
  sources: {
    '@id': 'meta:source',
    '@container': '@set',
  },
  source: {
    '@id': 'prov:wasDerivedFrom',
    '@type': '@id',
  },
  confidence: 'meta:confidence',
  confidenceInputs: {
    '@id': 'meta:confidenceInput',
    '@container': '@list',
  },
  correctness: 'meta:correctness',
  linksNotation: 'meta:linksNotation',
  retrievedAt: 'prov:generatedAtTime',
});

const provContext = Object.freeze({
  meta: metaNamespace,
  prov: provNamespace,
  schema: schemaNamespace,
  xsd: xsdNamespace,
});

export function exportEvidenceJsonLd(input, options = {}) {
  const model = createProvenanceModel(input, options);
  return {
    '@context': jsonLdContext,
    '@id': model.exportId,
    '@type': ['meta:EvidenceExport', 'prov:Bundle'],
    format: 'meta-expression-evidence-json-ld',
    sourceSurface: model.sourceSurface,
    exportedAt: model.exportedAt,
    analyses: model.analyses.map(jsonLdAnalysis),
    evidenceRecords: model.evidenceRecords.map(jsonLdEvidenceRecord),
    sources: model.sources.map(jsonLdSource),
    linksNotation: model.linksNotation,
  };
}

export function exportEvidenceProvJsonLd(input, options = {}) {
  const model = createProvenanceModel(input, options);
  const graph = [
    {
      '@id': model.agentId,
      '@type': ['prov:Agent', 'prov:SoftwareAgent', 'meta:MetaExpression'],
      'prov:label': 'meta-expression',
    },
    ...model.sources.map(provSource),
  ];

  for (const analysis of model.analyses) {
    graph.push(provStatement(analysis), provActivity(analysis, model));
    graph.push(...analysis.evidenceRecords.map(provEvidenceRecord));
    graph.push(provResult(analysis));
  }

  return {
    '@context': provContext,
    '@id': model.exportId,
    '@type': ['prov:Bundle', 'meta:EvidenceProvenanceExport'],
    format: 'meta-expression-prov-o-json-ld',
    sourceSurface: model.sourceSurface,
    exportedAt: model.exportedAt,
    linksNotation: model.linksNotation,
    '@graph': graph,
  };
}

function createProvenanceModel(input, options) {
  const sourceSurface = input?.status === 'checked' ? 'check' : 'analyze';
  if (sourceSurface === 'check' && !Array.isArray(input.statements)) {
    throw new Error(
      'Evidence provenance export requires analysis or check output.'
    );
  }
  if (sourceSurface === 'analyze' && input?.status !== 'completed') {
    throw new Error(
      'Evidence provenance export requires analysis or check output.'
    );
  }

  const baseId = normalizeBaseId(
    options.baseId ??
      `urn:meta-expression:${sourceSurface}:${surfaceKey(input)}`
  );
  const model = {
    baseId,
    exportId: nodeId(baseId, 'evidence-export'),
    agentId: nodeId(baseId, 'agent-meta-expression'),
    sourceSurface,
    exportedAt: timestampFrom(
      options.exportedAt ?? options.now?.() ?? new Date()
    ),
    linksNotation: linksNotationFor(input, options, sourceSurface),
    analyses: [],
    evidenceRecords: [],
    sourceMap: new Map(),
    sources: [],
  };

  if (sourceSurface === 'check') {
    for (const [index, statement] of input.statements.entries()) {
      model.analyses.push(
        createAnalysisEntry(statement.analysis, model, {
          index,
          statementId: statement.id,
          statementText: statement.text,
          statementStart: statement.start,
          statementEnd: statement.end,
        })
      );
    }
    return model;
  }

  model.analyses.push(createAnalysisEntry(input, model, { index: 0 }));
  return model;
}

function createAnalysisEntry(analysis, model, source) {
  const ordinal = source.index + 1;
  const localId = `analysis-${ordinal}`;
  const statementText =
    stringValue(source.statementText) ||
    stringValue(analysis?.statement?.value?.text);
  const entry = {
    analysis,
    localId,
    analysisId: nodeId(model.baseId, localId),
    activityId: nodeId(model.baseId, `activity-${localId}`),
    statementId: nodeId(
      model.baseId,
      source.statementId ?? `statement-${ordinal}`
    ),
    statementText,
    statementStart: source.statementStart ?? null,
    statementEnd: source.statementEnd ?? null,
    resultId: nodeId(model.baseId, `result-${ordinal}`),
    evidenceRecords: [],
  };
  const evidenceItems = [
    ...(analysis?.result?.supportingEvidence ?? []),
    ...(analysis?.result?.refutingEvidence ?? []),
  ];
  entry.evidenceRecords = evidenceItems.map((evidence, index) =>
    createEvidenceRecord(evidence, entry, index, model)
  );
  model.evidenceRecords.push(...entry.evidenceRecords);
  return entry;
}

function createEvidenceRecord(evidence, analysis, index, model) {
  const source = sourceForEvidence(evidence, model);
  return {
    id: nodeId(
      model.baseId,
      `${analysis.localId}-evidence-${safeReference(evidence.id ?? index + 1)}`
    ),
    analysisId: analysis.analysisId,
    resultId: analysis.resultId,
    sourceId: source.id,
    sourceType: source.sourceType,
    sourceUrl: source.url,
    retrievedAt: stringValue(evidence.retrievedAt) || null,
    claim: stringValue(evidence.claim),
    polarity: stringValue(evidence.polarity) || 'support',
    weight: finiteNumber(evidence.weight) ?? 0,
    situation: situationId(evidence.situation),
    identifiers: jsonCompatible(evidence.identifiers ?? {}),
  };
}

function sourceForEvidence(evidence, model) {
  const sourceType = stringValue(evidence.sourceType) || 'unknown';
  const url = stringValue(evidence.sourceUrl) || null;
  const key = `${sourceType}\n${url ?? 'local'}`;
  const existing = model.sourceMap.get(key);
  if (existing) {
    if (!existing.retrievedAt && evidence.retrievedAt) {
      existing.retrievedAt = stringValue(evidence.retrievedAt);
    }
    return existing;
  }

  const source = {
    id: nodeId(
      model.baseId,
      `source-${safeReference(sourceType)}-${shortHash(key)}`
    ),
    sourceType,
    url,
    retrievedAt: stringValue(evidence.retrievedAt) || null,
  };
  model.sourceMap.set(key, source);
  model.sources.push(source);
  return source;
}

function jsonLdAnalysis(entry) {
  const result = entry.analysis.result;
  return {
    '@id': entry.analysisId,
    '@type': ['meta:GeneratedAnalysis'],
    statement: {
      '@id': entry.statementId,
      '@type': ['schema:Claim', 'meta:Statement'],
      text: entry.statementText,
      start: entry.statementStart,
      end: entry.statementEnd,
    },
    interpretation: {
      id: entry.analysis.selectedInterpretation?.id ?? null,
      kind: entry.analysis.selectedInterpretation?.kind ?? null,
      paraphrase: entry.analysis.selectedInterpretation?.paraphrase ?? null,
    },
    result: {
      '@id': entry.resultId,
      '@type': ['meta:Result', 'prov:Entity'],
      kind: result.kind,
      value: jsonCompatible(result.value),
      confidence: nullableNumber(result.confidence),
      probability: nullableNumber(result.probability),
      correctness: nullableNumber(result.correctness),
      signedConfidence: nullableNumber(result.signedConfidence),
      supportWeight: nullableNumber(
        result.supportWeight ?? result.calculation?.supportWeight
      ),
      refuteWeight: nullableNumber(
        result.refuteWeight ?? result.calculation?.refuteWeight
      ),
      confidenceInputs: jsonCompatible(result.calculation?.inputs ?? []),
      evidenceRecords: entry.evidenceRecords.map((record) => record.id),
    },
  };
}

function jsonLdEvidenceRecord(record) {
  return {
    '@id': record.id,
    '@type': ['meta:EvidenceRecord', 'prov:Entity'],
    claim: record.claim,
    polarity: record.polarity,
    weight: record.weight,
    situation: record.situation,
    source: record.sourceId,
    sourceType: record.sourceType,
    sourceUrl: record.sourceUrl,
    retrievedAt: record.retrievedAt,
    identifiers: record.identifiers,
    result: record.resultId,
  };
}

function jsonLdSource(source) {
  return {
    '@id': source.id,
    '@type': ['meta:EvidenceSource', 'prov:Entity'],
    sourceType: source.sourceType,
    url: source.url,
    retrievedAt: source.retrievedAt,
  };
}

function provSource(source) {
  return {
    '@id': source.id,
    '@type': ['prov:Entity', 'meta:EvidenceSource'],
    'prov:type': source.sourceType,
    'prov:location': source.url,
    'prov:generatedAtTime': source.retrievedAt,
    'meta:sourceType': source.sourceType,
    'meta:url': source.url,
  };
}

function provStatement(analysis) {
  return {
    '@id': analysis.statementId,
    '@type': ['prov:Entity', 'schema:Claim', 'meta:Statement'],
    'schema:text': analysis.statementText,
  };
}

function provActivity(analysis, model) {
  return {
    '@id': analysis.activityId,
    '@type': ['prov:Activity', 'meta:GeneratedAnalysis'],
    'prov:wasAssociatedWith': model.agentId,
    'prov:startedAtTime': model.exportedAt,
    'prov:used': unique(
      analysis.evidenceRecords.map((record) => record.sourceId)
    ),
    'schema:text': analysis.statementText,
    'meta:selectedInterpretation':
      analysis.analysis.selectedInterpretation?.kind ?? null,
  };
}

function provEvidenceRecord(record) {
  return {
    '@id': record.id,
    '@type': ['prov:Entity', 'meta:EvidenceRecord'],
    'prov:wasDerivedFrom': record.sourceId,
    'prov:generatedAtTime': record.retrievedAt,
    'prov:value': record.claim,
    'meta:polarity': record.polarity,
    'meta:weight': record.weight,
    'meta:situation': record.situation,
    'meta:sourceType': record.sourceType,
    'meta:sourceUrl': record.sourceUrl,
    'meta:result': record.resultId,
  };
}

function provResult(analysis) {
  const result = analysis.analysis.result;
  return {
    '@id': analysis.resultId,
    '@type': ['prov:Entity', 'meta:Result'],
    'prov:wasGeneratedBy': analysis.activityId,
    'prov:value': jsonCompatible(result.value),
    'meta:confidence': nullableNumber(result.confidence),
    'meta:probability': nullableNumber(result.probability),
    'meta:correctness': nullableNumber(result.correctness),
    'meta:signedConfidence': nullableNumber(result.signedConfidence),
    'meta:confidenceInput': jsonCompatible(result.calculation?.inputs ?? []),
  };
}

function linksNotationFor(input, options, sourceSurface) {
  if (options.linksNotation !== undefined) {
    return String(options.linksNotation);
  }
  if (sourceSurface === 'check') {
    return input.linksNotation ?? '';
  }
  return serializeLinksNotation(input.linksNetwork);
}

function surfaceKey(input) {
  const text =
    input?.text ??
    input?.statement?.value?.text ??
    input?.statements?.[0]?.text ??
    'case';
  return safeReference(text);
}

function normalizeBaseId(value) {
  return String(value ?? 'urn:meta-expression:evidence')
    .trim()
    .replace(/[?#]+$/u, '');
}

function nodeId(baseId, fragment) {
  return `${baseId}#${safeReference(fragment)}`;
}

function situationId(value) {
  if (typeof value === 'object' && value !== null) {
    return stringValue(value.id) || null;
  }
  return stringValue(value) || null;
}

function timestampFrom(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return stringValue(value) || new Date().toISOString();
}

function jsonCompatible(value) {
  if (value === undefined) {
    return null;
  }
  if (
    value === null ||
    ['string', 'number', 'boolean'].includes(typeof value)
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(jsonCompatible);
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, jsonCompatible(entryValue)])
    );
  }
  return String(value);
}

function nullableNumber(value) {
  return finiteNumber(value);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  return '';
}

function safeReference(value) {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'value'
  );
}

function shortHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
