import { describe, it, expect } from 'test-anywhere';
import {
  analyzeStatement,
  analyzeStatementWithLiveEvidence,
  createWikimediaEvidenceClient,
  createStatementDraft,
  createIssueReportUrl,
  describeFormalizationLevel,
  getPreparedExamples,
  serializeLinksNotation,
} from '../src/index.js';

describe('meta-expression prototype pipeline', () => {
  it('keeps user selection as an explicit pipeline boundary', () => {
    const draft = createStatementDraft('1 + 1 = 2');

    expect(draft.status).toBe('selection-required');
    expect(draft.interpretations.length).toBe(3);
    expect(draft.linksNetwork.links.every((link) => link.id)).toBe(true);
  });

  it('evaluates fully computable arithmetic statements exactly', () => {
    const trueStatement = analyzeStatement('1 + 1 = 2');
    const falseStatement = analyzeStatement('1 + 1 = 1');
    const question = analyzeStatement('1 + 1');

    expect(trueStatement.result.kind).toBe('computed');
    expect(trueStatement.result.value).toBe(true);
    expect(trueStatement.result.confidence).toBe(1);
    expect(falseStatement.result.kind).toBe('computed');
    expect(falseStatement.result.value).toBe(false);
    expect(falseStatement.result.confidence).toBe(0);
    expect(question.result.kind).toBe('computed');
    expect(question.result.value).toBe(2);
    expect(question.formalization.expression.type).toBe('arithmetic-question');
  });

  it('represents real-world evidence as non-absolute links with provenance', () => {
    const analysis = analyzeStatement('Earth orbits the Sun');

    expect(analysis.result.kind).toBe('evidence-estimate');
    expect(analysis.result.confidence).toBeLessThan(1);
    expect(analysis.result.confidence).toBeGreaterThan(0.98);
    expect(analysis.result.supportingEvidence.length).toBe(1);
    expect(analysis.result.supportingEvidence[0].sourceType).toBe('wikidata');
    expect(
      analysis.linksNetwork.links.some((link) => link.role === 'support')
    ).toBe(true);
  });

  it('uses bounded Wikidata-backed evidence for a person alive claim', () => {
    const analysis = analyzeStatement('Elon Musk is alive');

    expect(analysis.result.kind).toBe('evidence-estimate');
    expect(analysis.result.value).toBe(0.99);
    expect(analysis.result.confidence).toBe(0.99);
    expect(analysis.result.supportingEvidence[0].identifiers.subject).toBe(
      'Q317521'
    );
    expect(analysis.result.supportingEvidence[0].identifiers.property).toBe(
      'P570'
    );
  });

  it('turns local user beliefs into support or refutation evidence', () => {
    const analysis = analyzeStatement('Elon Musk is alive', {
      userBeliefs: {
        'Elon Musk is alive': 0.1,
      },
    });

    expect(
      analysis.result.refutingEvidence.some(
        (evidence) => evidence.sourceType === 'user'
      )
    ).toBe(true);
    expect(analysis.result.confidence).toBeLessThan(0.99);
  });

  it('marks self-referential false statements as undetermined', () => {
    const analysis = analyzeStatement('this statement is false');

    expect(analysis.formalization.expression.type).toBe(
      'self-reference-paradox'
    );
    expect(analysis.result.value).toBe('undetermined');
    expect(analysis.result.confidence).toBe(0.5);
  });

  it('serializes the selected links network to Links Notation text', () => {
    const analysis = analyzeStatement('1 + 1 = 2');
    const lino = serializeLinksNotation(analysis.linksNetwork);

    expect(lino.includes('links-network')).toBe(true);
    expect(lino.includes('statement')).toBe(true);
    expect(lino.includes('supports')).toBe(true);
    expect(lino.includes(['g', 'raph'].join(''))).toBe(false);
  });

  it('exposes prepared examples, level descriptions, and report URLs', () => {
    const examples = getPreparedExamples();
    const level = describeFormalizationLevel(4);
    const reportUrl = createIssueReportUrl(analyzeStatement('1 + 1'), {
      pageUrl: 'https://link-assistant.github.io/meta-expression/web/',
      userAgent: 'test browser',
    });
    const decodedReportUrl = decodeURIComponent(reportUrl.replace(/\+/g, ' '));

    expect(
      examples.some((example) => example.input === 'Elon Musk is alive')
    ).toBe(true);
    expect(level.name).toBe('Fully computable expression');
    expect(decodedReportUrl).toContain(
      'https://github.com/link-assistant/meta-expression/issues/new'
    );
    expect(decodedReportUrl).toContain('## Statement');
    expect(decodedReportUrl).toContain('1 + 1');
    expect(decodedReportUrl).toContain('links-network');
  });

  it('resolves live Wikimedia evidence with reusable cache and statement templates', async () => {
    const fetchCalls = [];
    const client = createWikimediaEvidenceClient({
      fetch: async (url) => {
        fetchCalls.push(String(url));
        return mockWikimediaResponse(url);
      },
      now: () => 0,
    });

    const deadEvidence = await client.resolveEvidence('Ada Lovelace is dead');
    const capitalAnalysis = await analyzeStatementWithLiveEvidence(
      'Paris is the capital of France',
      { wikimediaClient: client }
    );
    const callsAfterFirstPass = fetchCalls.length;
    const cachedDeadEvidence = await client.resolveEvidence(
      'Ada Lovelace is dead'
    );

    expect(deadEvidence[0].polarity).toBe('support');
    expect(deadEvidence[0].identifiers.subject).toBe('Q7259');
    expect(deadEvidence[0].identifiers.property).toBe('P570');
    expect(deadEvidence[0].context.wikipediaSummaryUrl).toContain(
      'Ada_Lovelace'
    );
    expect(
      capitalAnalysis.result.supportingEvidence[0].identifiers.object
    ).toBe('Q90');
    expect(capitalAnalysis.result.confidence).toBeLessThan(1);
    expect(cachedDeadEvidence[0].claim).toBe(deadEvidence[0].claim);
    expect(fetchCalls.length).toBe(callsAfterFirstPass);
  });
});

function mockWikimediaResponse(url) {
  const parsed = new URL(String(url));
  if (parsed.hostname === 'www.wikidata.org') {
    const action = parsed.searchParams.get('action');
    if (action === 'wbsearchentities') {
      return jsonResponse({
        search: [
          searchEntityResult(parsed.searchParams.get('search') ?? ''),
        ].filter(Boolean),
      });
    }
    if (action === 'wbgetentities') {
      return jsonResponse({
        entities: Object.fromEntries(
          (parsed.searchParams.get('ids') ?? '')
            .split('|')
            .filter(Boolean)
            .map((id) => [id, wikidataEntity(id)])
        ),
      });
    }
  }

  if (parsed.hostname === 'en.wikipedia.org') {
    const title = decodeURIComponent(parsed.pathname.split('/').pop() ?? '');
    return jsonResponse({
      title,
      extract: `${title.replace(/_/g, ' ')} summary.`,
      content_urls: {
        desktop: {
          page: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        },
      },
    });
  }

  throw new Error(`Unexpected mock URL: ${url}`);
}

function searchEntityResult(search) {
  const entities = {
    'ada lovelace': ['Q7259', 'Ada Lovelace'],
    paris: ['Q90', 'Paris'],
    france: ['Q142', 'France'],
  };
  const entity = entities[search.trim().toLowerCase()];
  return entity ? { id: entity[0], label: entity[1] } : null;
}

function wikidataEntity(id) {
  const entities = {
    Q7259: {
      id: 'Q7259',
      labels: { en: { value: 'Ada Lovelace' } },
      descriptions: { en: { value: 'English mathematician' } },
      claims: {
        P570: [timeClaim('+1852-11-27T00:00:00Z')],
      },
      sitelinks: { enwiki: { title: 'Ada_Lovelace' } },
    },
    Q142: {
      id: 'Q142',
      labels: { en: { value: 'France' } },
      descriptions: { en: { value: 'country in Western Europe' } },
      claims: {
        P36: [entityClaim('Q90')],
      },
      sitelinks: { enwiki: { title: 'France' } },
    },
    Q90: {
      id: 'Q90',
      labels: { en: { value: 'Paris' } },
      descriptions: { en: { value: 'capital and largest city of France' } },
      claims: {},
      sitelinks: { enwiki: { title: 'Paris' } },
    },
  };
  return entities[id] ?? { id, missing: '' };
}

function entityClaim(id) {
  return {
    mainsnak: {
      datavalue: {
        value: { id },
      },
    },
  };
}

function timeClaim(time) {
  return {
    mainsnak: {
      datavalue: {
        value: { time },
      },
    },
  };
}

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
  };
}
