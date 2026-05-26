import { describe, expect, it } from 'test-anywhere';
import {
  analyzeStatement,
  checkText,
  exportEvidencePropertyGraph,
  exportEvidenceRdfTriples,
  exportScopedSparqlEvidence,
  importEvidencePropertyGraph,
  importEvidenceRdfTriples,
} from '../../src/index.js';
import { runCliAsync } from '../../src/cli.js';
import { createMetaExpressionServer } from '../../src/server.js';

const exportedAt = '2026-05-26T12:00:00.000Z';

describe('issue 92 - scoped SPARQL and graph-database interchange', () => {
  it('exports selected Q/P evidence templates as a scoped SPARQL CONSTRUCT query with limits and provenance', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');
    const sparql = exportScopedSparqlEvidence(analysis, {
      baseId: 'https://example.org/meta-expression/cases/earth-orbits-sun',
      exportedAt,
      limit: 5,
    });

    expect(sparql.format).toBe('meta-expression-scoped-sparql');
    expect(sparql.sourceSurface).toBe('analyze');
    expect(sparql.limits.maxEvidenceRecords).toBe(5);
    expect(sparql.scope.subjects).toEqual(['Q2']);
    expect(sparql.scope.properties).toEqual(['P397']);
    expect(sparql.scope.objects).toEqual(['Q525']);
    expect(sparql.scope.templates).toEqual(['wikidata-structured-claim']);
    expect(sparql.provenance.generatedBy).toBe('meta-expression');
    expect(sparql.provenance.linksNotation).toContain('links-network');
    expect(sparql.guardrails.boundedConfidence).toBe(
      analysis.result.confidence
    );
    expect(sparql.guardrails.boundedConfidence).toBeLessThan(1);
    expect(sparql.query).toContain('CONSTRUCT');
    expect(sparql.query).toContain(
      'VALUES (?subject ?property ?object ?evidence ?source ?polarity ?boundedConfidence)'
    );
    expect(sparql.query).toContain('wd:Q2');
    expect(sparql.query).toContain('wdt:P397');
    expect(sparql.query).toContain('wd:Q525');
    expect(sparql.query).toContain('LIMIT 5');
  });

  it('maps Links Notation evidence links to RDF triples and back', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');
    const evidenceLink = analysis.linksNetwork.links.find(
      (link) => link.role === 'evidence'
    );
    const rdf = exportEvidenceRdfTriples(analysis, {
      baseId: 'https://example.org/meta-expression/cases/earth-orbits-sun',
      exportedAt,
    });
    const imported = importEvidenceRdfTriples(rdf);

    expect(rdf.format).toBe('meta-expression-rdf-triples');
    expect(rdf.mappings[0].linksNotationLinkId).toBe(evidenceLink.id);
    expect(
      rdf.triples.some(
        (triple) =>
          triple.predicate === 'meta:wikidataSubject' &&
          triple.object.value === 'wd:Q2'
      )
    ).toBe(true);
    expect(
      rdf.triples.some(
        (triple) =>
          triple.predicate === 'meta:wikidataProperty' &&
          triple.object.value === 'wdt:P397'
      )
    ).toBe(true);
    expect(imported.evidenceRecords[0].identifiers).toEqual({
      subject: 'Q2',
      property: 'P397',
      object: 'Q525',
    });
    expect(imported.guardrails.boundedConfidence).toBe(
      analysis.result.confidence
    );
  });

  it('applies scoped SPARQL limits after counting available Q/P evidence', () => {
    const checked = checkText(
      'Earth orbits the Sun. Paris is the capital of France.'
    );
    const sparql = exportScopedSparqlEvidence(checked, {
      exportedAt,
      limit: 1,
    });

    expect(sparql.sourceSurface).toBe('check');
    expect(sparql.limits.availableEvidenceRecords).toBeGreaterThan(1);
    expect(sparql.limits.selectedEvidenceRecords).toBe(1);
    expect(sparql.limits.truncated).toBe(true);
    expect(sparql.scope.subjects).toEqual(['Q2']);
    expect(sparql.query).toContain('LIMIT 1');
  });

  it('maps Links Notation evidence links to a graph-database property graph and back', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');
    const propertyGraph = exportEvidencePropertyGraph(analysis, {
      baseId: 'https://example.org/meta-expression/cases/earth-orbits-sun',
      exportedAt,
    });
    const imported = importEvidencePropertyGraph(propertyGraph);

    expect(propertyGraph.format).toBe('meta-expression-property-graph');
    expect(
      propertyGraph.nodes.some(
        (node) =>
          node.labels.includes('WikidataEntity') &&
          node.properties.wikidataId === 'Q2'
      )
    ).toBe(true);
    expect(
      propertyGraph.nodes.some(
        (node) =>
          node.labels.includes('WikidataProperty') &&
          node.properties.wikidataId === 'P397'
      )
    ).toBe(true);
    expect(
      propertyGraph.relationships.some(
        (relationship) => relationship.type === 'HAS_WIKIDATA_SUBJECT'
      )
    ).toBe(true);
    expect(imported.evidenceRecords[0].sourceType).toBe('wikidata');
    expect(imported.evidenceRecords[0].identifiers.property).toBe('P397');
  });

  it('does not let generic graph export bypass bounded-confidence guardrails', () => {
    const analysis = analyzeStatement('Earth orbits the Sun', {
      evidenceScoring: { 'wikidata-structured-claim': 1 },
      realWorldUncertainty: 0.2,
    });
    const rdf = exportEvidenceRdfTriples(analysis);
    const propertyGraph = exportEvidencePropertyGraph(analysis);
    const analysisNode = propertyGraph.nodes.find((node) =>
      node.labels.includes('Analysis')
    );

    expect(analysis.result.calculation.rawConfidence).toBe(1);
    expect(analysis.result.confidence).toBe(0.8);
    expect(rdf.guardrails.rawConfidence).toBe(1);
    expect(rdf.guardrails.boundedConfidence).toBe(0.8);
    expect(propertyGraph.guardrails.rawConfidence).toBe(1);
    expect(propertyGraph.guardrails.boundedConfidence).toBe(0.8);
    expect(analysisNode.properties.confidence).toBe(0.8);
    expect(importEvidencePropertyGraph(propertyGraph).guardrails).toEqual(
      propertyGraph.guardrails
    );
  });

  registerSurfaceExportTests();
});

function registerSurfaceExportTests() {
  it('supports scoped SPARQL exports from CLI and HTTP analyze surfaces', async () => {
    const output = {
      logs: [],
      errors: [],
      log(value) {
        this.logs.push(value);
      },
      error(value) {
        this.errors.push(value);
      },
    };
    const exitCode = await runCliAsync(
      [
        'analyze',
        '--input',
        'Earth orbits the Sun',
        '--format',
        'sparql',
        '--limit',
        '3',
      ],
      output
    );
    const started = await startServer();

    try {
      const response = await fetch(
        `http://127.0.0.1:${started.port}/analyze?input=${encodeURIComponent(
          'Earth orbits the Sun'
        )}&format=sparql&limit=4`
      );
      const body = await response.text();

      expect(exitCode).toBe(0);
      expect(output.errors).toEqual([]);
      expect(output.logs[0]).toContain('LIMIT 3');
      expect(output.logs[0]).toContain('wdt:P397');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain(
        'application/sparql-query'
      );
      expect(body).toContain('LIMIT 4');
    } finally {
      await stopServer(started.server);
    }
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createMetaExpressionServer({
      cacheRoot: '.cache/issue-92-test',
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ server, port });
    });
  });
}

function stopServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}
