import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';
import {
  createFixtureFormalizationProvider,
  formalizeTextWith,
} from '../../src/index.js';
import { createMetaExpressionServer } from '../../src/server.js';

const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../fixtures/issue-89/openie-amr-srl-provider.json',
      import.meta.url
    ),
    'utf8'
  )
);

const input = 'Stanford OpenIE extracts relations.';

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

function candidate(id, label, kind = 'entity') {
  return {
    id,
    label,
    description: `${label} fixture candidate`,
    kind,
    source: 'fixture-source',
    sourceUrl: `https://example.test/${id}`,
    matchText: label,
    score: 10,
    ngramSize: label.split(/\s+/).length,
  };
}

function deterministicSource() {
  const candidatesByText = new Map([
    [
      'stanford openie',
      [candidate('fixture:stanford-openie', 'Stanford OpenIE')],
    ],
    ['extracts', [candidate('fixture:extracts', 'extracts', 'property')]],
    ['relations', [candidate('fixture:relations', 'relations')]],
  ]);
  return {
    name: 'fixture-source',
    async searchPhrase(text) {
      return candidatesByText.get(text.toLowerCase()) ?? [];
    },
  };
}

function serverOverrides() {
  return [
    override('Stanford', 'fixture:stanford', 'Stanford'),
    override('OpenIE', 'fixture:openie', 'OpenIE'),
    override('extracts', 'fixture:extracts', 'extracts', 'property'),
    override('relations', 'fixture:relations', 'relations'),
  ];
}

function override(phrase, entityId, label, kind = 'entity') {
  return {
    phrase,
    entityId,
    label,
    kind,
    source: 'fixture-override',
    sourceUrl: `https://example.test/${entityId}`,
  };
}

describe('issue 89 - OpenIE AMR SRL formalization providers', () => {
  it('records provider triples, roles, entity links, and graphs without changing deterministic formalization', async () => {
    const base = await formalizeTextWith(input, {
      fetch: () => emptyJsonResponse(),
      sources: [deterministicSource()],
      now: () => 0,
    });
    const withProvider = await formalizeTextWith(input, {
      fetch: () => emptyJsonResponse(),
      sources: [deterministicSource()],
      providers: [createFixtureFormalizationProvider(fixture)],
      now: () => 0,
    });

    expect(withProvider.markdown).toBe(base.markdown);
    expect(withProvider.interpretations).toEqual(base.interpretations);
    expect(
      withProvider.phrases.map((phrase) => phrase.entity?.id ?? null)
    ).toEqual(base.phrases.map((phrase) => phrase.entity?.id ?? null));
    expect(withProvider.providerCandidates.providers[0].id).toBe(fixture.id);
    expect(withProvider.providerCandidates.triples[0].status).toBe('candidate');
    expect(withProvider.providerCandidates.triples[0].truthScoring).toEqual({
      included: false,
      eligible: false,
      reason:
        'Provider output is a candidate formalization and is not evidence until selected or validated.',
    });
    expect(withProvider.providerCandidates.roles[0].arguments.length).toBe(2);
    expect(withProvider.providerCandidates.entityLinks[0].target.id).toBe(
      'external:stanford-openie'
    );
    expect(withProvider.cst.providerCandidates.graphs[0].format).toBe('amr');
    expect(
      withProvider.linksNetwork.links.some(
        (link) =>
          link.role === 'provider-candidate-triple' &&
          link.provenance.sourceType === 'nlp-provider'
      )
    ).toBe(true);
  });

  it('accepts mocked provider output through HTTP /formalize without treating it as verified evidence', async () => {
    const started = await startServer();
    try {
      const response = await fetch(
        `http://127.0.0.1:${started.port}/formalize`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            input,
            format: 'json',
            maxNgramSize: 1,
            noRepoOverrides: true,
            overrides: serverOverrides(),
            providerOutputs: [fixture],
          }),
        }
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.providerCandidates.providers[0].kind).toBe(
        'openie-amr-srl'
      );
      expect(payload.providerCandidates.entityLinks[0].status).toBe(
        'candidate'
      );
      expect(
        payload.providerCandidates.entityLinks[0].truthScoring.included
      ).toBe(false);
      expect(
        payload.phrases.map((phrase) => phrase.entity?.source ?? null)
      ).toEqual([
        'fixture-override',
        'fixture-override',
        'fixture-override',
        'fixture-override',
      ]);
      expect(payload.markdown).toContain('fixture:stanford');
      expect(Object.hasOwn(payload, 'supportingEvidence')).toBe(false);
      expect(Object.hasOwn(payload, 'refutingEvidence')).toBe(false);
    } finally {
      await stopServer(started.server);
    }
  });
});

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createMetaExpressionServer({
      cacheRoot: `.cache/issue-89-test-${process.pid}`,
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
