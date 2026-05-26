import { describe, expect, it } from 'test-anywhere';
import {
  analyzeStatement,
  checkText,
  exportEvidenceJsonLd,
  exportEvidenceProvJsonLd,
  serializeLinksNotation,
} from '../../src/index.js';
import { runCliAsync } from '../../src/cli.js';
import { createMetaExpressionServer } from '../../src/server.js';

const exportedAt = '2026-05-26T12:00:00.000Z';

describe('issue 88 - JSON-LD and PROV-O evidence provenance', () => {
  it('exports /analyze evidence as JSON-LD with result, source, retrieval time, confidence inputs, and Links Notation', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');
    const linksNotation = serializeLinksNotation(analysis.linksNetwork);
    const jsonLd = exportEvidenceJsonLd(analysis, {
      baseId: 'https://example.org/meta-expression/cases/earth-orbits-sun',
      exportedAt,
    });

    expect(jsonLd['@context'].prov).toBe('http://www.w3.org/ns/prov#');
    expect(jsonLd.format).toBe('meta-expression-evidence-json-ld');
    expect(jsonLd.sourceSurface).toBe('analyze');
    expect(jsonLd.linksNotation).toBe(linksNotation);
    expect(jsonLd.analyses.length).toBe(1);
    expect(jsonLd.analyses[0].result.confidence).toBe(
      analysis.result.confidence
    );
    expect(
      jsonLd.analyses[0].result.confidenceInputs.some(
        (input) => input.kind === 'evidence'
      )
    ).toBe(true);
    expect(jsonLd.evidenceRecords[0].claim).toContain('Wikidata Q2 Earth');
    expect(jsonLd.evidenceRecords[0].retrievedAt).toBe('2026-04-26');
    expect(jsonLd.evidenceRecords[0].source).toBe(jsonLd.sources[0]['@id']);
    expect(jsonLd.sources[0].sourceType).toBe('wikidata');
    expect(jsonLd.sources[0].url).toBe('https://www.wikidata.org/wiki/Q2#P397');
  });

  it('projects /analyze evidence into a PROV-O-compatible JSON-LD graph', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');
    const prov = exportEvidenceProvJsonLd(analysis, {
      baseId: 'https://example.org/meta-expression/cases/earth-orbits-sun',
      exportedAt,
    });
    const activity = graphNode(prov, 'prov:Activity');
    const agent = graphNode(prov, 'prov:SoftwareAgent');
    const evidence = graphNode(prov, 'meta:EvidenceRecord');
    const source = graphNode(prov, 'meta:EvidenceSource');
    const result = graphNode(prov, 'meta:Result');

    expect(prov['@context'].prov).toBe('http://www.w3.org/ns/prov#');
    expect(activity['prov:wasAssociatedWith']).toBe(agent['@id']);
    expect(activity['prov:used']).toContain(source['@id']);
    expect(evidence['prov:wasDerivedFrom']).toBe(source['@id']);
    expect(evidence['prov:generatedAtTime']).toBe('2026-04-26');
    expect(result['prov:wasGeneratedBy']).toBe(activity['@id']);
  });

  it('exports /check evidence as JSON-LD without dropping the existing Links Notation output', () => {
    const checked = checkText('Earth orbits the Sun. 1 + 1 = 1.');
    const jsonLd = exportEvidenceJsonLd(checked, {
      baseId: 'https://example.org/meta-expression/cases/check-output',
      exportedAt,
    });

    expect(jsonLd.sourceSurface).toBe('check');
    expect(jsonLd.linksNotation).toBe(checked.linksNotation);
    expect(jsonLd.analyses.map((analysis) => analysis.statement.text)).toEqual([
      'Earth orbits the Sun.',
      '1 + 1 = 1.',
    ]);
    expect(
      jsonLd.evidenceRecords.some((record) => record.polarity === 'support')
    ).toBe(true);
    expect(
      jsonLd.evidenceRecords.some((record) => record.polarity === 'refute')
    ).toBe(true);
  });

  it('supports JSON-LD and PROV-O as analyze/check export formats in CLI and HTTP surfaces', async () => {
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
      ['analyze', '--input', 'Earth orbits the Sun', '--format', 'json-ld'],
      output
    );
    const cliPayload = JSON.parse(output.logs[0]);
    const started = await startServer();

    try {
      const response = await fetch(
        `http://127.0.0.1:${started.port}/check?input=${encodeURIComponent(
          'Earth orbits the Sun.'
        )}&format=prov-o`
      );
      const servicePayload = await response.json();

      expect(exitCode).toBe(0);
      expect(cliPayload.format).toBe('meta-expression-evidence-json-ld');
      expect(cliPayload.sourceSurface).toBe('analyze');
      expect(response.status).toBe(200);
      expect(
        graphNode(servicePayload, 'prov:Activity')['prov:used'].length
      ).toBe(1);
    } finally {
      await stopServer(started.server);
    }
  });
});

function graphNode(document, type) {
  return document['@graph'].find((node) => nodeTypes(node).includes(type));
}

function nodeTypes(node) {
  return Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createMetaExpressionServer({
      cacheRoot: '.cache/issue-88-test',
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
