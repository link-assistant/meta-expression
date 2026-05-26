import { serializeLinksNotation } from './reporting.js';

const metaNamespace = 'https://link-assistant.github.io/meta-expression/vocab#';
const provNamespace = 'http://www.w3.org/ns/prov#';
const rdfNamespace = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const xsdNamespace = 'http://www.w3.org/2001/XMLSchema#';
const wikidataEntityPrefix = 'http://www.wikidata.org/entity/';
const wikidataDirectPrefix = 'http://www.wikidata.org/prop/direct/';
const defaultLimit = 50;
const maxLimit = 500;

export function exportScopedSparqlEvidence(input, options = {}) {
  const model = createGraphEvidenceModel(input, options);
  const scopedRecords = model.allEvidenceRecords
    .map(sparqlScopeRecord)
    .filter(Boolean);
  const selected = scopedRecords.slice(0, model.limit);

  return {
    format: 'meta-expression-scoped-sparql',
    sourceSurface: model.sourceSurface,
    exportedAt: model.exportedAt,
    limits: {
      maxEvidenceRecords: model.limit,
      selectedEvidenceRecords: selected.length,
      availableEvidenceRecords: scopedRecords.length,
      truncated: scopedRecords.length > selected.length,
    },
    provenance: createExportProvenance(model),
    guardrails: model.guardrails,
    scope: createSparqlScope(selected),
    prefixes: sparqlPrefixes(),
    query: createScopedSparqlQuery(selected, model),
  };
}

export function exportEvidenceRdfTriples(input, options = {}) {
  const model = createGraphEvidenceModel(input, options);
  const triples = [];

  for (const analysis of model.analyses) {
    triples.push(
      iriTriple(analysis.id, 'rdf:type', 'meta:Analysis'),
      literalTriple(
        analysis.id,
        'meta:statementText',
        analysis.statementText,
        'xsd:string'
      )
    );
    addGuardrailTriples(triples, analysis.id, analysis.guardrails);
  }

  for (const record of model.evidenceRecords) {
    triples.push(...evidenceRecordTriples(record));
  }

  return {
    format: 'meta-expression-rdf-triples',
    sourceSurface: model.sourceSurface,
    exportedAt: model.exportedAt,
    limits: model.limits,
    provenance: createExportProvenance(model),
    guardrails: model.guardrails,
    mappings: model.mappings,
    triples,
  };
}

export function importEvidenceRdfTriples(input) {
  const triples = Array.isArray(input?.triples) ? input.triples : [];
  const records = new Map();

  for (const triple of triples) {
    if (triple.predicate === 'rdf:type') {
      continue;
    }
    const record = records.get(triple.subject) ?? {
      rdfSubject: triple.subject,
      identifiers: {},
    };
    applyRdfTriple(record, triple);
    records.set(triple.subject, record);
  }

  return {
    status: 'imported',
    format: 'meta-expression-rdf-triples',
    evidenceRecords: [...records.values()].filter((record) => record.claim),
    guardrails: input?.guardrails ?? null,
    mappings: input?.mappings ?? [],
  };
}

export function exportEvidencePropertyGraph(input, options = {}) {
  const model = createGraphEvidenceModel(input, options);
  const graph = {
    format: 'meta-expression-property-graph',
    sourceSurface: model.sourceSurface,
    exportedAt: model.exportedAt,
    limits: model.limits,
    provenance: createExportProvenance(model),
    guardrails: model.guardrails,
    mappings: model.mappings,
    nodes: [],
    relationships: [],
  };
  const nodes = new Map();

  for (const analysis of model.analyses) {
    addNode(nodes, {
      id: analysis.id,
      labels: ['Analysis'],
      properties: {
        statement: analysis.statementText,
        sourceSurface: model.sourceSurface,
        confidence: analysis.guardrails.boundedConfidence,
        correctness: analysis.guardrails.correctness,
        signedConfidence: analysis.guardrails.signedConfidence,
        rawConfidence: analysis.guardrails.rawConfidence,
        bounded: analysis.guardrails.bounded,
      },
    });
  }

  for (const record of model.evidenceRecords) {
    addEvidenceGraphRecord(graph, nodes, record);
  }

  graph.nodes = [...nodes.values()];
  return graph;
}

export function importEvidencePropertyGraph(input) {
  const nodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const relationships = Array.isArray(input?.relationships)
    ? input.relationships
    : [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const evidenceNodes = nodes.filter((node) =>
    node.labels?.includes('Evidence')
  );
  const evidenceRecords = evidenceNodes.map((node) =>
    importEvidenceNode(node, relationships, nodeById)
  );

  return {
    status: 'imported',
    format: 'meta-expression-property-graph',
    evidenceRecords,
    guardrails: input?.guardrails ?? null,
    mappings: input?.mappings ?? [],
  };
}

function createGraphEvidenceModel(input, options) {
  const sourceSurface = input?.status === 'checked' ? 'check' : 'analyze';
  validateGraphInput(input, sourceSurface);

  const limit = normalizeLimit(options.limit);
  const baseId = normalizeBaseId(
    options.baseId ??
      `urn:meta-expression:${sourceSurface}:${surfaceKey(input)}`
  );
  const model = {
    baseId,
    sourceSurface,
    exportedAt: timestampFrom(
      options.exportedAt ?? options.now?.() ?? new Date()
    ),
    limit,
    linksNotation: linksNotationFor(input, sourceSurface),
    analyses: [],
    evidenceRecords: [],
    mappings: [],
    guardrails: null,
    allEvidenceRecords: [],
    limits: {
      maxEvidenceRecords: limit,
      exportedEvidenceRecords: 0,
      availableEvidenceRecords: 0,
      truncated: false,
    },
  };

  const analyses = sourceSurface === 'check' ? input.statements : [input];
  for (const [index, value] of analyses.entries()) {
    const analysis = sourceSurface === 'check' ? value.analysis : value;
    model.analyses.push(createGraphAnalysis(analysis, model, index, value));
  }

  model.allEvidenceRecords = model.evidenceRecords;
  model.evidenceRecords = model.evidenceRecords.slice(0, limit);
  model.mappings = model.evidenceRecords.map((record) => ({
    linksNotationLinkId: record.linksNotationLinkId,
    rdfSubject: record.id,
    propertyGraphNodeId: record.id,
  }));
  model.guardrails = combinedGuardrails(model.analyses);
  model.limits.exportedEvidenceRecords = model.evidenceRecords.length;
  model.limits.truncated =
    model.limits.availableEvidenceRecords > model.evidenceRecords.length;
  return model;
}

function createGraphAnalysis(analysis, model, index, source) {
  const ordinal = index + 1;
  const id = nodeId(model.baseId, `analysis-${ordinal}`);
  const entry = {
    id,
    statementText:
      stringValue(source.text) || stringValue(analysis.statement?.value?.text),
    guardrails: guardrailsForResult(analysis.result),
  };
  const evidenceLinks = evidenceLinksFor(analysis);

  model.limits.availableEvidenceRecords += evidenceLinks.length;
  for (const [evidenceIndex, link] of evidenceLinks.entries()) {
    model.evidenceRecords.push(
      createGraphEvidenceRecord(link, entry, model, evidenceIndex)
    );
  }
  return entry;
}

function evidenceLinksFor(analysis) {
  const links = analysis.linksNetwork?.links ?? [];
  const evidenceLinks = links.filter((link) => link.role === 'evidence');
  if (evidenceLinks.length > 0) {
    return evidenceLinks;
  }
  return [
    ...(analysis.result?.supportingEvidence ?? []),
    ...(analysis.result?.refutingEvidence ?? []),
  ].map((value, index) => ({
    id: value.id ?? `evidence-${index + 1}`,
    value,
    provenance: {
      sourceType: value.sourceType,
      sourceUrl: value.sourceUrl,
      retrievedAt: value.retrievedAt,
    },
  }));
}

function createGraphEvidenceRecord(link, analysis, model, index) {
  const evidence = link.value ?? {};
  const id = nodeId(
    model.baseId,
    `${safeReference(analysis.id)}-evidence-${safeReference(link.id ?? index + 1)}`
  );
  return {
    id,
    analysisId: analysis.id,
    linksNotationLinkId: link.id,
    claim: stringValue(evidence.claim),
    polarity: stringValue(evidence.polarity) || 'support',
    weight: finiteNumber(evidence.weight) ?? 0,
    sourceType: stringValue(evidence.sourceType) || 'unknown',
    sourceUrl: stringValue(evidence.sourceUrl) || null,
    retrievedAt: stringValue(evidence.retrievedAt) || null,
    situation: situationId(evidence.situation),
    identifiers: jsonCompatible(evidence.identifiers ?? {}),
    provenance: jsonCompatible(link.provenance ?? {}),
    guardrails: analysis.guardrails,
  };
}

function evidenceRecordTriples(record) {
  const triples = [
    iriTriple(record.id, 'rdf:type', 'meta:EvidenceRecord', record),
    literalTriple(
      record.id,
      'meta:linksNotationLinkId',
      record.linksNotationLinkId
    ),
    literalTriple(record.id, 'meta:claim', record.claim),
    literalTriple(record.id, 'meta:polarity', record.polarity),
    literalTriple(record.id, 'meta:weight', record.weight, 'xsd:decimal'),
    literalTriple(record.id, 'meta:sourceType', record.sourceType),
    literalTriple(record.id, 'meta:situation', record.situation),
  ];
  if (record.sourceUrl) {
    triples.push(iriTriple(record.id, 'prov:wasDerivedFrom', record.sourceUrl));
  }
  if (record.retrievedAt) {
    triples.push(
      literalTriple(record.id, 'prov:generatedAtTime', record.retrievedAt)
    );
  }
  addIdentifierTriples(triples, record);
  return triples;
}

function addIdentifierTriples(triples, record) {
  const subject = wikidataId(record.identifiers.subject, 'Q');
  const property = wikidataId(record.identifiers.property, 'P');
  const object = wikidataId(record.identifiers.object, 'Q');
  if (subject) {
    triples.push(iriTriple(record.id, 'meta:wikidataSubject', `wd:${subject}`));
  }
  if (property) {
    triples.push(
      iriTriple(record.id, 'meta:wikidataProperty', `wdt:${property}`)
    );
  }
  if (object) {
    triples.push(iriTriple(record.id, 'meta:wikidataObject', `wd:${object}`));
  }
}

function addGuardrailTriples(triples, subject, guardrails) {
  triples.push(
    literalTriple(
      subject,
      'meta:boundedConfidence',
      guardrails.boundedConfidence,
      'xsd:decimal'
    ),
    literalTriple(
      subject,
      'meta:rawConfidence',
      guardrails.rawConfidence,
      'xsd:decimal'
    ),
    literalTriple(subject, 'meta:confidenceBounded', guardrails.bounded)
  );
}

function applyRdfTriple(record, triple) {
  const value = triple.object?.value;
  if (triple.predicate === 'meta:linksNotationLinkId') {
    record.linksNotationLinkId = value;
  } else if (triple.predicate === 'meta:claim') {
    record.claim = value;
  } else if (triple.predicate === 'meta:polarity') {
    record.polarity = value;
  } else if (triple.predicate === 'meta:weight') {
    record.weight = Number(value);
  } else if (triple.predicate === 'meta:sourceType') {
    record.sourceType = value;
  } else if (triple.predicate === 'meta:situation') {
    record.situation = value;
  } else if (triple.predicate === 'prov:wasDerivedFrom') {
    record.sourceUrl = value;
  } else if (triple.predicate === 'prov:generatedAtTime') {
    record.retrievedAt = value;
  } else if (triple.predicate === 'meta:wikidataSubject') {
    record.identifiers.subject = compactWikidataId(value);
  } else if (triple.predicate === 'meta:wikidataProperty') {
    record.identifiers.property = compactWikidataId(value);
  } else if (triple.predicate === 'meta:wikidataObject') {
    record.identifiers.object = compactWikidataId(value);
  }
}

function addEvidenceGraphRecord(graph, nodes, record) {
  addNode(nodes, {
    id: record.id,
    labels: ['Evidence'],
    properties: {
      linksNotationLinkId: record.linksNotationLinkId,
      claim: record.claim,
      polarity: record.polarity,
      weight: record.weight,
      sourceType: record.sourceType,
      sourceUrl: record.sourceUrl,
      retrievedAt: record.retrievedAt,
      situation: record.situation,
    },
  });
  addRelationship(graph, record.analysisId, record.id, 'HAS_EVIDENCE', {
    polarity: record.polarity,
    weight: record.weight,
  });
  addSourceNode(graph, nodes, record);
  addWikidataNodes(graph, nodes, record);
}

function addSourceNode(graph, nodes, record) {
  if (!record.sourceUrl) {
    return;
  }
  const id = nodeId(
    graph.provenance.baseId,
    `source-${shortHash(record.sourceUrl)}`
  );
  addNode(nodes, {
    id,
    labels: ['EvidenceSource'],
    properties: {
      sourceType: record.sourceType,
      url: record.sourceUrl,
      retrievedAt: record.retrievedAt,
    },
  });
  addRelationship(graph, record.id, id, 'DERIVED_FROM', {});
}

function addWikidataNodes(graph, nodes, record) {
  const entries = [
    ['HAS_WIKIDATA_SUBJECT', 'WikidataEntity', 'subject', 'Q'],
    ['HAS_WIKIDATA_PROPERTY', 'WikidataProperty', 'property', 'P'],
    ['HAS_WIKIDATA_OBJECT', 'WikidataEntity', 'object', 'Q'],
  ];
  for (const [type, label, key, prefix] of entries) {
    const wikidata = wikidataId(record.identifiers[key], prefix);
    if (!wikidata) {
      continue;
    }
    const id = nodeId(graph.provenance.baseId, `wikidata-${wikidata}`);
    addNode(nodes, {
      id,
      labels: [label],
      properties: {
        wikidataId: wikidata,
        iri: wikidataIri(wikidata),
      },
    });
    addRelationship(graph, record.id, id, type, {});
  }
}

function importEvidenceNode(node, relationships, nodeById) {
  const record = {
    linksNotationLinkId: node.properties.linksNotationLinkId,
    claim: node.properties.claim,
    polarity: node.properties.polarity,
    weight: node.properties.weight,
    sourceType: node.properties.sourceType,
    sourceUrl: node.properties.sourceUrl,
    retrievedAt: node.properties.retrievedAt,
    situation: node.properties.situation,
    identifiers: {},
  };
  for (const relationship of relationships) {
    if (relationship.startNode !== node.id) {
      continue;
    }
    const target = nodeById.get(relationship.endNode);
    const wikidataIdValue = target?.properties?.wikidataId;
    if (relationship.type === 'HAS_WIKIDATA_SUBJECT') {
      record.identifiers.subject = wikidataIdValue;
    } else if (relationship.type === 'HAS_WIKIDATA_PROPERTY') {
      record.identifiers.property = wikidataIdValue;
    } else if (relationship.type === 'HAS_WIKIDATA_OBJECT') {
      record.identifiers.object = wikidataIdValue;
    } else if (relationship.type === 'DERIVED_FROM') {
      record.sourceUrl = target?.properties?.url ?? record.sourceUrl;
    }
  }
  return record;
}

function sparqlScopeRecord(record) {
  const subject = wikidataId(record.identifiers.subject, 'Q');
  const property = wikidataId(record.identifiers.property, 'P');
  if (!subject || !property) {
    return null;
  }
  return {
    ...record,
    subject,
    property,
    object: wikidataId(record.identifiers.object, 'Q'),
  };
}

function createSparqlScope(records) {
  return {
    evidenceRecords: unique(
      records.map((record) => record.linksNotationLinkId)
    ),
    templates: unique(
      records.map((record) => record.situation).filter(Boolean)
    ),
    subjects: unique(records.map((record) => record.subject)),
    properties: unique(records.map((record) => record.property)),
    objects: unique(records.map((record) => record.object).filter(Boolean)),
  };
}

function createScopedSparqlQuery(records, model) {
  const rows = records.map(sparqlValuesRow);
  const values =
    rows.length > 0 ? rows.map((row) => `    ${row}`).join('\n') : '';
  return [
    '# Scoped meta-expression evidence export.',
    `# sourceSurface: ${model.sourceSurface}`,
    `# exportedAt: ${model.exportedAt}`,
    `# boundedConfidence: ${model.guardrails.boundedConfidence ?? 'null'}`,
    'PREFIX wd: <http://www.wikidata.org/entity/>',
    'PREFIX wdt: <http://www.wikidata.org/prop/direct/>',
    'PREFIX meta: <https://link-assistant.github.io/meta-expression/vocab#>',
    'PREFIX prov: <http://www.w3.org/ns/prov#>',
    'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>',
    '',
    'CONSTRUCT {',
    '  ?evidence meta:wikidataSubject ?subject ;',
    '    meta:wikidataProperty ?property ;',
    '    meta:wikidataObject ?object ;',
    '    meta:polarity ?polarity ;',
    '    meta:boundedConfidence ?boundedConfidence ;',
    '    prov:wasDerivedFrom ?source .',
    '  ?subject ?property ?object .',
    '} WHERE {',
    '  VALUES (?subject ?property ?object ?evidence ?source ?polarity ?boundedConfidence) {',
    values,
    '  }',
    '}',
    `LIMIT ${model.limit}`,
  ].join('\n');
}

function sparqlValuesRow(record) {
  const object = record.object ? `wd:${record.object}` : 'UNDEF';
  const source = record.sourceUrl ? iri(record.sourceUrl) : 'UNDEF';
  return [
    '(',
    `wd:${record.subject}`,
    `wdt:${record.property}`,
    object,
    iri(record.id),
    source,
    stringLiteral(record.polarity),
    decimalLiteral(record.guardrails?.boundedConfidence),
    ')',
  ].join(' ');
}

function sparqlPrefixes() {
  return {
    meta: metaNamespace,
    prov: provNamespace,
    rdf: rdfNamespace,
    xsd: xsdNamespace,
    wd: wikidataEntityPrefix,
    wdt: wikidataDirectPrefix,
  };
}

function guardrailsForResult(result = {}) {
  const rawConfidence = nullableNumber(result.calculation?.rawConfidence);
  const boundedConfidence = nullableNumber(result.confidence);
  return {
    boundedConfidence,
    rawConfidence,
    confidence: boundedConfidence,
    correctness: nullableNumber(result.correctness),
    signedConfidence: nullableNumber(result.signedConfidence),
    bounded:
      result.calculation?.bounded === true ||
      (rawConfidence !== null &&
        boundedConfidence !== null &&
        rawConfidence !== boundedConfidence),
    realWorldUncertainty: nullableNumber(
      result.calculation?.realWorldUncertainty
    ),
  };
}

function combinedGuardrails(analyses) {
  if (analyses.length === 1) {
    return analyses[0].guardrails;
  }
  return {
    boundedConfidence: null,
    rawConfidence: null,
    confidence: null,
    correctness: null,
    signedConfidence: null,
    bounded: analyses.some((analysis) => analysis.guardrails.bounded),
    realWorldUncertainty: null,
    analyses: analyses.map((analysis) => ({
      id: analysis.id,
      ...analysis.guardrails,
    })),
  };
}

function createExportProvenance(model) {
  return {
    baseId: model.baseId,
    generatedBy: 'meta-expression',
    sourceSurface: model.sourceSurface,
    exportedAt: model.exportedAt,
    linksNotation: model.linksNotation,
  };
}

function validateGraphInput(input, sourceSurface) {
  if (sourceSurface === 'check') {
    if (!Array.isArray(input.statements)) {
      throw new Error(
        'Graph evidence export requires analysis or check output.'
      );
    }
    return;
  }
  if (input?.status !== 'completed') {
    throw new Error('Graph evidence export requires analysis or check output.');
  }
}

function linksNotationFor(input, sourceSurface) {
  if (sourceSurface === 'check') {
    return input.linksNotation ?? '';
  }
  return input.linksNetwork ? serializeLinksNotation(input.linksNetwork) : '';
}

function addNode(nodes, node) {
  if (!nodes.has(node.id)) {
    nodes.set(node.id, node);
  }
}

function addRelationship(graph, startNode, endNode, type, properties) {
  graph.relationships.push({
    id: `${safeReference(type)}-${graph.relationships.length + 1}`,
    type,
    startNode,
    endNode,
    properties,
  });
}

function iriTriple(subject, predicate, object, record) {
  return triple(subject, predicate, { type: 'iri', value: object }, record);
}

function literalTriple(subject, predicate, value, datatype, record) {
  return triple(
    subject,
    predicate,
    {
      type: 'literal',
      value,
      datatype,
    },
    record
  );
}

function triple(subject, predicate, object, record) {
  return {
    subject,
    predicate,
    object,
    provenance: record
      ? {
          linksNotationLinkId: record.linksNotationLinkId,
          sourceUrl: record.sourceUrl,
          retrievedAt: record.retrievedAt,
        }
      : undefined,
  };
}

function normalizeLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultLimit;
  }
  return Math.max(1, Math.min(Math.floor(parsed), maxLimit));
}

function surfaceKey(input) {
  if (input?.status === 'checked') {
    return shortHash(input.markdown ?? input.linksNotation ?? 'check');
  }
  return safeReference(input?.statement?.value?.text ?? 'analysis');
}

function normalizeBaseId(value) {
  return String(value ?? 'urn:meta-expression:graph').replace(/[#/]+$/u, '');
}

function nodeId(baseId, fragment) {
  return `${baseId}#${safeReference(fragment)}`;
}

function timestampFrom(value) {
  if (typeof value === 'string') {
    return value;
  }
  return new Date(value).toISOString();
}

function situationId(value) {
  if (!value) {
    return null;
  }
  return typeof value === 'string' ? value : stringValue(value.id);
}

function wikidataId(value, prefix) {
  const text = String(value ?? '').trim();
  return new RegExp(`^${prefix}\\d+$`, 'u').test(text) ? text : null;
}

function compactWikidataId(value) {
  return String(value ?? '')
    .replace(/^wd:/u, '')
    .replace(/^wdt:/u, '')
    .replace(wikidataEntityPrefix, '')
    .replace(wikidataDirectPrefix, '');
}

function wikidataIri(id) {
  return id.startsWith('P')
    ? `${wikidataDirectPrefix}${id}`
    : `${wikidataEntityPrefix}${id}`;
}

function decimalLiteral(value) {
  return value === null || value === undefined
    ? 'UNDEF'
    : `"${Number(value)}"^^xsd:decimal`;
}

function stringLiteral(value) {
  return `"${String(value ?? '')
    .replace(/\\/gu, '\\\\')
    .replace(/"/gu, '\\"')
    .replace(/\r/gu, '\\r')
    .replace(/\n/gu, '\\n')}"`;
}

function iri(value) {
  return `<${String(value).replace(/[<>"{}|^`\\]/gu, encodeURIComponent)}>`;
}

function unique(values) {
  return [...new Set(values)];
}

function nullableNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(value) {
  return typeof value === 'string' && value ? value : '';
}

function jsonCompatible(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
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
  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  }
  return hash.toString(36);
}
