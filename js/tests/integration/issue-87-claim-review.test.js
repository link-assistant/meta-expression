import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';
import {
  checkText,
  exportClaimReviewJsonLd,
  importClaimReviewJsonLd,
  parseClaimReviewJsonLd,
} from '../../src/index.js';
import { runCliAsync } from '../../src/cli.js';
import { createMetaExpressionServer } from '../../src/server.js';

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/claim-review/google-world-flat.json', import.meta.url),
    'utf8'
  )
);

describe('issue 87 - ClaimReview fact-check interchange', () => {
  it('imports a public ClaimReview JSON-LD example into evidence, verdict, source, and provenance fields', () => {
    const imported = importClaimReviewJsonLd(fixture.jsonLd, {
      retrievedAt: fixture.retrievedAt,
      sourceExampleUrl: fixture.source,
    });

    expect(imported.status).toBe('imported');
    expect(imported.format).toBe('schema.org/ClaimReview');
    expect(imported.claim.text).toBe('The world is flat');
    expect(imported.verdict.label).toBe('False');
    expect(imported.verdict.correctness).toBe(0);
    expect(imported.source.url).toBe(
      'https://example.com/news/science/worldisflat.html'
    );
    expect(imported.source.author.name).toBe('Example.com science watch');
    expect(imported.provenance.retrievedAt).toBe(fixture.retrievedAt);
    expect(imported.provenance.sourceExampleUrl).toBe(fixture.source);
    expect(imported.evidence.polarity).toBe('refute');
    expect(imported.evidence.sourceType).toBe('claim-review');
    expect(imported.evidence.situation).toBe('schema-org-claim-review');
    expect(imported.evidence.sourceUrl).toBe(imported.source.url);
    expect(imported.evidence.retrievedAt).toBe(fixture.retrievedAt);
    expect(imported.evidence.claim).toContain('False');
  });

  it('parses ClaimReview JSON-LD from an HTML script tag', () => {
    const html = `<script type="application/ld+json">${JSON.stringify(
      fixture.jsonLd
    )}</script>`;
    const imported = parseClaimReviewJsonLd(html, {
      retrievedAt: fixture.retrievedAt,
    });

    expect(imported.claim.text).toBe('The world is flat');
    expect(imported.verdict.ratingValue).toBe(1);
  });

  it('exports a checked statement as ClaimReview JSON-LD with claim, rating, source URL, and retrieval timestamp', () => {
    const checked = checkText('Earth orbits the Sun.');
    const jsonLd = exportClaimReviewJsonLd(checked, {
      authorName: 'meta-expression tests',
      sourceUrl: 'https://example.org/fact-checks/earth-orbits-sun',
      retrievedAt: '2026-05-26T12:00:00.000Z',
    });
    const roundTrip = importClaimReviewJsonLd(jsonLd, {
      retrievedAt: '2026-05-26T12:00:00.000Z',
    });

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('ClaimReview');
    expect(jsonLd.claimReviewed).toBe('Earth orbits the Sun.');
    expect(jsonLd.url).toBe('https://example.org/fact-checks/earth-orbits-sun');
    expect(jsonLd.sdDatePublished).toBe('2026-05-26T12:00:00.000Z');
    expect(jsonLd.reviewRating['@type']).toBe('Rating');
    expect(jsonLd.reviewRating.ratingValue).toBe(4);
    expect(jsonLd.reviewRating.alternateName).toBe('Mostly true');
    expect(roundTrip.verdict.label).toBe('Mostly true');
    expect(roundTrip.evidence.polarity).toBe('support');
  });

  it('keeps plain text /check behavior unchanged', () => {
    const result = checkText('Earth orbits the Sun. 1 + 1 = 1.');

    expect(result.status).toBe('checked');
    expect(result.statements.map((statement) => statement.text)).toEqual([
      'Earth orbits the Sun.',
      '1 + 1 = 1.',
    ]);
    expect(result.summary.correct).toBe(1);
    expect(result.summary.wrong).toBe(1);
    expect(result.markdown).toContain('Earth orbits the Sun.');
    expect(result.linksNotation).toContain('check');
  });

  it('supports ClaimReview JSON-LD as a /check export format in the CLI', async () => {
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
        'check',
        '--input',
        '1 + 1 = 1.',
        '--format',
        'claim-review',
        '--source',
        'https://example.org/fact-checks/arithmetic',
      ],
      output
    );
    const jsonLd = JSON.parse(output.logs[0]);

    expect(exitCode).toBe(0);
    expect(jsonLd['@type']).toBe('ClaimReview');
    expect(jsonLd.claimReviewed).toBe('1 + 1 = 1.');
    expect(jsonLd.reviewRating.alternateName).toBe('False');
    expect(jsonLd.url).toBe('https://example.org/fact-checks/arithmetic');
  });

  it('serves ClaimReview JSON-LD from HTTP /check while keeping default JSON check output', async () => {
    const started = await startServer();
    try {
      const base = `http://127.0.0.1:${started.port}`;
      const claimReviewResponse = await fetch(
        `${base}/check?input=${encodeURIComponent(
          'Earth orbits the Sun.'
        )}&format=claim-review&source=${encodeURIComponent(
          'https://example.org/fact-checks/http-earth-orbits-sun'
        )}`
      );
      const defaultResponse = await fetch(
        `${base}/check?input=${encodeURIComponent('Earth orbits the Sun.')}`
      );
      const claimReview = await claimReviewResponse.json();
      const defaultPayload = await defaultResponse.json();

      expect(claimReviewResponse.status).toBe(200);
      expect(claimReview['@type']).toBe('ClaimReview');
      expect(claimReview.url).toBe(
        'https://example.org/fact-checks/http-earth-orbits-sun'
      );
      expect(defaultPayload.status).toBe('checked');
      expect(defaultPayload.statements[0].text).toBe('Earth orbits the Sun.');
    } finally {
      await stopServer(started.server);
    }
  });
});

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createMetaExpressionServer({
      cacheRoot: '.cache/issue-87-test',
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
