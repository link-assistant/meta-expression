import { readFile } from 'node:fs/promises';
import { describe, it, expect } from 'test-anywhere';
import { searchTextUniqueness } from '../../src/index.js';

const FIXTURE_PATH = 'js/tests/fixtures/issue-90-originality-document.json';

async function loadFixture() {
  return JSON.parse(await readFile(FIXTURE_PATH, 'utf8'));
}

function fixtureSource(matches) {
  return {
    id: 'issue-90-fixture',
    label: 'Issue 90 Fixture',
    async search(statement) {
      return matches.filter((match) => match.query === statement.query);
    },
  };
}

describe('issue 90 - document-level originality report', () => {
  it('returns source spans, strengths, exclusions, and document source groups', async () => {
    const fixture = await loadFixture();
    const result = await searchTextUniqueness(fixture.input, {
      sources: [fixtureSource(fixture.matches)],
      now: () => '2026-05-26T00:00:00.000Z',
    });

    expect(result.status).toBe('checked');
    expect(result.summary.total).toBe(4);
    expect(result.statements.length).toBe(4);
    expect(result.existingLikelihood).toBe(
      result.summary.averageExistingLikelihood
    );
    expect(result.uniqueness).toBe(result.summary.averageUniqueness);

    const report = result.originalityReport;
    expect(report.kind).toBe('document-originality-report');
    expect(report.matches.length).toBe(4);
    expect(report.matchedSources.length).toBeGreaterThanOrEqual(3);
    expect(report.exclusions.length).toBeGreaterThanOrEqual(1);
    expect(report.scoredMatchCount).toBe(3);
    expect(report.excludedMatchCount).toBe(1);

    const scored = report.matches.filter((match) => !match.excluded);
    expect(
      scored.filter((match) => match.matchKind === 'exact-passage').length
    ).toBeGreaterThanOrEqual(2);
    expect(
      scored.some(
        (match) =>
          match.matchKind === 'semantic-similarity' && match.strength >= 0.8
      )
    ).toBe(true);

    for (const match of report.matches) {
      expect(match.sourceUrl.startsWith('https://example.test/')).toBe(true);
      expect(match.strength).toBeGreaterThan(0);
      expect(match.matchStrength).toBe(match.strength);
      expect(match.sourceSpan.text.length).toBeGreaterThan(0);
      expect(
        fixture.input.slice(match.inputSpan.start, match.inputSpan.end)
      ).toBe(match.inputSpan.text);
    }

    const quoteMatch = report.matches.find((match) =>
      match.inputSpan.text.includes('Hawaii is a state')
    );
    expect(quoteMatch.excluded).toBe(true);
    expect(quoteMatch.exclusion.ruleId).toBe('quoted-text');
    expect(quoteMatch.exclusion.span.text).toContain('Hawaii is a state.');

    const [statementMatch] = result.statements[0].matches;
    expect(statementMatch.sourceUrl).toBe(
      'https://example.test/sources/mars-moons'
    );
    expect(statementMatch.matchStrength).toBe(statementMatch.score);
    expect(statementMatch.inputSpan.text).toBe(result.statements[0].text);
    expect(statementMatch.sourceSpan.text).toContain(
      'Mars has two small moons'
    );
  });
});
