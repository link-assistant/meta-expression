import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'test-anywhere';
import { checkText, checkTextWithLiveEvidence } from '../src/index.js';
import { parseCliArguments, runCliAsync } from '../src/cli.js';
import { createMetaExpressionServer } from '../src/server.js';

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createMetaExpressionServer({
      cacheRoot: '.cache/issue-17-test',
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

async function canUseLocalServer() {
  const deno = globalThis.Deno;
  if (!deno?.permissions?.query) {
    return true;
  }
  const status = await deno.permissions.query({
    name: 'net',
    host: '127.0.0.1',
  });
  return status.state === 'granted';
}

const localServerTestsEnabled = await canUseLocalServer();

describe('issue 17 - check text statements', () => {
  it('detects statements and assigns red-to-green correctness colors', () => {
    const result = checkText('Earth orbits the Sun. 1 + 1 = 1.');

    expect(result.status).toBe('checked');
    expect(result.statements.length).toBe(2);
    expect(result.statements[0].text).toBe('Earth orbits the Sun.');
    expect(result.statements[0].correctness).toBeGreaterThan(0.7);
    expect(result.statements[0].correctness).toBeLessThan(0.75);
    expect(result.statements[0].wrongness).toBeGreaterThan(0.25);
    expect(result.statements[0].color.hue).toBeGreaterThan(80);
    expect(result.statements[1].text).toBe('1 + 1 = 1.');
    expect(result.statements[1].correctness).toBe(0);
    expect(result.statements[1].wrongness).toBe(1);
    expect(result.statements[1].color.hue).toBe(0);
    expect(result.summary.correct).toBe(1);
    expect(result.summary.wrong).toBe(1);
    expect(result.html).toContain('data-check-statement="true"');
    expect(result.markdown).toContain('Earth orbits the Sun.');
    expect(result.linksNotation).toContain('check');
  });
});

describe('issue 17 - evidence probability scoring', () => {
  it('lets preferences control the probability assigned to evidence situations', () => {
    const result = checkText('Earth orbits the Sun.', {
      preferenceProfile: {
        evidenceScoring: {
          'wikidata-structured-claim': 0.55,
        },
      },
    });
    const statement = result.statements[0];

    expect(Math.abs(statement.correctness - 0.55)).toBeLessThan(0.0001);
    expect(
      statement.analysis.result.supportingEvidence.some(
        (evidence) =>
          evidence.score?.situationId === 'wikidata-structured-claim'
      )
    ).toBe(true);
    expect(
      statement.analysis.result.refutingEvidence.some(
        (evidence) => evidence.score?.residual === true
      )
    ).toBe(true);
  });

  it('uses belief-system preferences for worldview-sensitive statements', () => {
    const skeptical = checkText('God exists.', {
      preferenceProfile: {
        beliefs: {
          'god-exists': 0.1,
        },
      },
    });
    const believer = checkText('God exists.', {
      preferenceProfile: {
        beliefs: {
          'god-exists': 0.9,
        },
      },
    });

    expect(skeptical.statements[0].correctness).toBeLessThan(0.2);
    expect(believer.statements[0].correctness).toBeGreaterThan(0.8);
  });

  it('scores cited Wikipedia statements in the 75-99% band with debug reasoning', async () => {
    const result = await checkTextWithLiveEvidence(
      'Mercury is the smallest planet in the Solar System.',
      {
        fetch: mockWikipediaFetch,
        includeFixtureEvidence: false,
      }
    );
    const statement = result.statements[0];
    const wikipediaEvidence = statement.analysis.result.supportingEvidence.find(
      (evidence) => evidence.sourceType === 'wikipedia'
    );
    const reasoningTrace = statement.analysis.linksNetwork.links
      .filter((link) => link.role === 'reasoning-step')
      .map((link) => link.value.text)
      .join('\n');

    expect(statement.correctness).toBeGreaterThan(0.75);
    expect(statement.correctness).toBeLessThan(0.99);
    expect(wikipediaEvidence.score.situationId).toBe(
      'wikipedia-cited-statement'
    );
    expect(reasoningTrace).toContain('Wikipedia page');
    expect(result.markdown).toContain('Mercury is the smallest planet');
    expect(result.linksNotation).toContain('supportWeight');
  });

  it('finds similar Wikipedia wording after exact search misses', async () => {
    const result = await checkTextWithLiveEvidence(
      'Mercury is the smallest planet of the Solar System.',
      {
        fetch: mockWikipediaFetch,
        includeFixtureEvidence: false,
      }
    );
    const wikipediaEvidence =
      result.statements[0].analysis.result.supportingEvidence.find(
        (evidence) => evidence.sourceType === 'wikipedia'
      );

    expect(result.statements[0].correctness).toBeGreaterThan(0.75);
    expect(wikipediaEvidence.identifiers.match).toBe('similar');
    expect(wikipediaEvidence.score.situationId).toBe(
      'wikipedia-cited-statement'
    );
  });

  it('allows cited Wikipedia scoring to be tuned by preferences', async () => {
    const result = await checkTextWithLiveEvidence(
      'Mercury is the smallest planet in the Solar System.',
      {
        fetch: mockWikipediaFetch,
        includeFixtureEvidence: false,
        preferenceProfile: {
          evidenceScoring: {
            'wikipedia-cited-statement': 0.8,
          },
        },
      }
    );

    expect(Math.abs(result.statements[0].correctness - 0.8)).toBeLessThan(
      0.0001
    );
  });
});

describe('issue 17 - check integration surfaces', () => {
  it('supports CLI check and fact-check aliases', async () => {
    const parsed = parseCliArguments([
      'fact-check',
      '--input',
      'Earth orbits the Sun.',
    ]);
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

    expect(parsed.command).toBe('fact-check');
    const code = await runCliAsync(['check', 'Earth orbits the Sun.'], output);
    const payload = JSON.parse(output.logs[0]);

    expect(code).toBe(0);
    expect(payload.status).toBe('checked');
    expect(payload.statements[0].correctness).toBeGreaterThan(0.7);
  });

  it('exposes HTTP /check and /fact-check endpoints', async () => {
    if (!localServerTestsEnabled) {
      return;
    }
    const started = await startServer();
    try {
      const base = `http://127.0.0.1:${started.port}`;
      const jsonResponse = await fetch(
        `${base}/fact-check?input=${encodeURIComponent('1 + 1 = 1.')}`
      );
      const htmlResponse = await fetch(
        `${base}/check?input=${encodeURIComponent('Earth orbits the Sun.')}&format=html`
      );
      const payload = await jsonResponse.json();
      const html = await htmlResponse.text();

      expect(jsonResponse.status).toBe(200);
      expect(payload.statements[0].wrongness).toBe(1);
      expect(htmlResponse.headers.get('content-type')).toContain('text/html');
      expect(html).toContain('data-check-statement="true"');
    } finally {
      await stopServer(started.server);
    }
  });

  it('wires the static web app with check and fact-check hash aliases', async () => {
    const html = await readFile(
      new URL('../web/index.html', import.meta.url),
      'utf8'
    );
    const app = await readFile(
      new URL('../web/app.js', import.meta.url),
      'utf8'
    );
    const pageReport = await readFile(
      new URL('../web/page-report.js', import.meta.url),
      'utf8'
    );

    expect(html).toContain('id="nav-check"');
    expect(html).toContain('id="page-check"');
    expect(html).toContain('id="check-output"');
    expect(app).toContain('setupCheckPage({');
    expect(app).toContain("'fact-check': 'check'");
    expect(pageReport).toContain("check: 'Check'");
  });
});

function mockWikipediaFetch(url) {
  const parsed = new URL(String(url));
  if (parsed.hostname !== 'en.wikipedia.org') {
    throw new Error(`Unexpected mock URL: ${url}`);
  }
  if (parsed.pathname !== '/w/api.php') {
    return jsonResponse({
      title: 'Mercury (planet)',
      extract: 'Mercury summary.',
      content_urls: {
        desktop: {
          page: 'https://en.wikipedia.org/wiki/Mercury_(planet)',
        },
      },
    });
  }
  const action = parsed.searchParams.get('action');
  if (action === 'query') {
    const search = parsed.searchParams.get('srsearch') ?? '';
    if (search.startsWith('"') && search.includes(' of the Solar System')) {
      return jsonResponse({ query: { search: [] } });
    }
    return jsonResponse({
      query: {
        search: [
          {
            pageid: 123,
            title: 'Mercury (planet)',
            snippet: 'Mercury is the smallest planet in the Solar System.',
          },
        ],
      },
    });
  }
  if (action === 'parse') {
    return jsonResponse({
      parse: {
        pageid: 123,
        title: 'Mercury (planet)',
        wikitext:
          'Mercury is the smallest planet in the Solar System.<ref>{{cite web|url=https://example.test/mercury}}</ref>',
        externallinks: ['https://example.test/mercury'],
      },
    });
  }
  throw new Error(`Unexpected mock action: ${action}`);
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
