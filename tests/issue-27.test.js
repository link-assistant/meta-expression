import { readFile } from 'node:fs/promises';
import { describe, it, expect } from 'test-anywhere';
import { searchTextUniqueness } from '../src/index.js';
import { parseCliArguments, runCliAsync } from '../src/cli.js';
import { createMetaExpressionServer } from '../src/server.js';

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createMetaExpressionServer({
      cacheRoot: '.cache/issue-27-test',
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

function jsonResponse(payload) {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
  });
}

function makeUniquenessFetch() {
  return function mockFetch(url) {
    const parsed = new URL(String(url));
    const query = [
      parsed.searchParams.get('srsearch'),
      parsed.searchParams.get('search'),
      parsed.searchParams.get('query.bibliographic'),
      parsed.searchParams.get('q'),
    ]
      .filter(Boolean)
      .join(' ');
    const hasKnownStatement = query.includes('Earth orbits the Sun');

    if (parsed.hostname.includes('wikipedia.org')) {
      return jsonResponse({
        query: {
          search: hasKnownStatement
            ? [
                {
                  pageid: 42,
                  title: 'Earth orbit',
                  snippet:
                    'Reference text: <span class="searchmatch">Earth</span> orbits the Sun.',
                },
              ]
            : [],
        },
      });
    }

    if (parsed.hostname === 'api.openalex.org') {
      return jsonResponse({
        results: hasKnownStatement
          ? [
              {
                id: 'https://openalex.org/W123',
                display_name: 'Earth orbits the Sun',
                publication_year: 2024,
                doi: 'https://doi.org/10.1234/earth',
                relevance_score: 100,
                authorships: [{ author: { display_name: 'Ada Example' } }],
              },
            ]
          : [],
      });
    }

    if (parsed.hostname === 'api.crossref.org') {
      return jsonResponse({
        message: {
          items: hasKnownStatement
            ? [
                {
                  title: ['Earth orbits the Sun'],
                  DOI: '10.1234/earth',
                  URL: 'https://doi.org/10.1234/earth',
                  score: 80,
                },
              ]
            : [],
        },
      });
    }

    if (parsed.hostname === 'api.duckduckgo.com') {
      return jsonResponse(
        hasKnownStatement
          ? {
              Heading: 'Earth orbit',
              AbstractText: 'Earth orbits the Sun.',
              AbstractURL: 'https://example.test/earth-orbit',
            }
          : {}
      );
    }

    return jsonResponse({});
  };
}

function makeNoisyUniquenessFetch() {
  return function mockFetch(url) {
    const parsed = new URL(String(url));

    if (parsed.hostname.includes('wikipedia.org')) {
      return jsonResponse({
        query: {
          search: [
            {
              pageid: 42,
              title: 'Earth orbit',
              snippet: 'Reference text: Earth orbits the Sun.',
            },
          ],
        },
      });
    }

    if (parsed.hostname === 'api.openalex.org') {
      return jsonResponse({
        results: [
          {
            id: 'https://openalex.org/W123',
            display_name: 'Earth orbits the Sun',
            publication_year: 2024,
            doi: 'https://doi.org/10.1234/earth',
            relevance_score: 100,
            authorships: [{ author: { display_name: 'Ada Example' } }],
          },
        ],
      });
    }

    if (parsed.hostname === 'api.crossref.org') {
      return jsonResponse({
        message: {
          items: [
            {
              title: ['Earth orbits the Sun'],
              DOI: '10.1234/earth',
              URL: 'https://doi.org/10.1234/earth',
              score: 80,
            },
          ],
        },
      });
    }

    if (parsed.hostname === 'api.duckduckgo.com') {
      return jsonResponse({
        Heading: 'Earth orbit',
        AbstractText: 'Earth orbits the Sun.',
        AbstractURL: 'https://example.test/earth-orbit',
      });
    }

    return jsonResponse({});
  };
}

describe('issue 27 - uniqueness likelihood', () => {
  it('scores exact external matches as citation candidates per statement', async () => {
    const result = await searchTextUniqueness(
      'Earth orbits the Sun. A locally coined statement has no prior source.',
      {
        fetch: makeUniquenessFetch(),
        now: () => '2026-05-10T00:00:00.000Z',
      }
    );

    expect(result.status).toBe('checked');
    expect(result.summary.total).toBe(2);
    expect(result.statements[0].text).toBe('Earth orbits the Sun.');
    expect(result.statements[0].existingLikelihood).toBeGreaterThan(0.85);
    expect(result.statements[0].uniqueness).toBeLessThan(0.15);
    expect(result.statements[0].suggestedAction).toBe('cite-or-quote');
    expect(
      result.statements[0].matches.some(
        (match) => match.sourceId === 'wikipedia'
      )
    ).toBe(true);
    expect(result.statements[1].existingLikelihood).toBe(0);
    expect(result.statements[1].suggestedAction).toBe('likely-original');
    expect(result.markdown).toContain('cite-or-quote');
    expect(result.linksNotation).toContain('uniqueness');
  });

  it('ignores unrelated rows returned by public search providers', async () => {
    const result = await searchTextUniqueness(
      'Freshly coined cobalt theorem predicts square rain.',
      {
        fetch: makeNoisyUniquenessFetch(),
      }
    );

    expect(result.summary.total).toBe(1);
    expect(result.statements[0].matches.length).toBe(0);
    expect(result.statements[0].existingLikelihood).toBe(0);
    expect(result.statements[0].suggestedAction).toBe('likely-original');
  });

  it('wires uniqueness into the CLI, including the issue title typo alias', async () => {
    const parsed = parseCliArguments([
      'uniquness',
      '--input',
      'Earth orbits the Sun',
    ]);
    expect(parsed.command).toBe('uniquness');

    const previousFetch = globalThis.fetch;
    const messages = [];
    const errors = [];
    globalThis.fetch = makeUniquenessFetch();
    try {
      const exit = await runCliAsync(
        [
          'uniqueness',
          '--input',
          'Earth orbits the Sun',
          '--format',
          'markdown',
        ],
        {
          log(message) {
            messages.push(message);
          },
          error(message) {
            errors.push(message);
          },
        }
      );
      expect(exit).toBe(0);
      expect(errors.length).toBe(0);
      expect(messages.join('\n')).toContain('Earth orbits the Sun');
      expect(messages.join('\n')).toContain('cite-or-quote');
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it('exposes HTTP /uniqueness and /uniquness endpoints', async () => {
    if (!localServerTestsEnabled) {
      return;
    }

    const realFetch = globalThis.fetch;
    globalThis.fetch = (url, options) => {
      const parsed = new URL(String(url));
      if (parsed.hostname === '127.0.0.1') {
        return realFetch(url, options);
      }
      return makeUniquenessFetch()(url, options);
    };

    const started = await startServer();
    try {
      const base = `http://127.0.0.1:${started.port}`;
      const jsonResponse = await realFetch(
        `${base}/uniquness?input=${encodeURIComponent('Earth orbits the Sun.')}`
      );
      const markdownResponse = await realFetch(
        `${base}/uniqueness?input=${encodeURIComponent(
          'Earth orbits the Sun.'
        )}&format=markdown`
      );
      const payload = await jsonResponse.json();
      const markdown = await markdownResponse.text();

      expect(jsonResponse.status).toBe(200);
      expect(payload.statements[0].suggestedAction).toBe('cite-or-quote');
      expect(markdownResponse.headers.get('content-type')).toContain(
        'text/markdown'
      );
      expect(markdown).toContain('cite-or-quote');
    } finally {
      await stopServer(started.server);
      globalThis.fetch = realFetch;
    }
  });

  it('documents the HTTP route and exposes the web page shell', async () => {
    const [readme, html, app] = await Promise.all([
      readFile('README.md', 'utf8'),
      readFile('web/index.html', 'utf8'),
      readFile('web/app.js', 'utf8'),
    ]);

    expect(readme).toContain('/uniqueness');
    expect(html).toContain('id="nav-uniqueness"');
    expect(html).toContain('id="page-uniqueness"');
    expect(app).toContain("uniquness: 'uniqueness'");
  });
});
