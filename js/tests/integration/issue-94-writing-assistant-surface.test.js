import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';
import {
  WRITING_ASSISTANT_OPERATIONS,
  analyzeStatement,
  checkText,
  createMockWritingAssistantExtensionHarness,
  createWritingAssistantSurface,
} from '../../src/index.js';

const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../fixtures/issue-94/mock-extension-selection.json',
      import.meta.url
    ),
    'utf8'
  )
);

function createDelegatingServices(calls) {
  return {
    analyzeStatement(input, options) {
      calls.push({ operation: WRITING_ASSISTANT_OPERATIONS.ANALYZE, input });
      return analyzeStatement(input, options);
    },
    checkText(input, options) {
      calls.push({ operation: WRITING_ASSISTANT_OPERATIONS.CHECK, input });
      return checkText(input, options);
    },
    async formalizeTextWith(input) {
      calls.push({ operation: WRITING_ASSISTANT_OPERATIONS.FORMALIZE, input });
      return {
        status: 'completed',
        text: input,
        phrases: [
          {
            text: 'Moon',
            candidates: [
              {
                id: 'Q405',
                label: 'Moon',
                description: 'natural satellite of Earth',
                sourceUrl: 'https://www.wikidata.org/wiki/Q405',
                score: 1,
              },
            ],
          },
        ],
        linksNotation: '(formalize-result: fixture)',
        markdown: '[Moon](https://www.wikidata.org/wiki/Q405) orbits Earth.',
        html: '<a href="https://www.wikidata.org/wiki/Q405">Moon</a> orbits Earth.',
      };
    },
    async translateTextWith(input) {
      calls.push({ operation: WRITING_ASSISTANT_OPERATIONS.TRANSLATE, input });
      return {
        status: 'translated',
        text: input,
        linksNotation: '(translate-result: fixture)',
        markdown: 'Moon orbits Earth.',
        html: 'Moon orbits Earth.',
      };
    },
    async searchTextUniqueness(input) {
      calls.push({ operation: WRITING_ASSISTANT_OPERATIONS.UNIQUENESS, input });
      return {
        status: 'checked',
        text: input,
        statements: [
          {
            id: 'statement-1',
            text: input,
            suggestedAction: 'cite-or-quote',
            matches: [
              {
                id: 'match-1',
                sourceUrl: 'https://example.test/source/moon-earth',
                title: 'Moon and Earth fixture',
                score: 0.91,
                matchKind: 'exact-passage',
              },
            ],
          },
        ],
        linksNotation: '(uniqueness-result: fixture)',
      };
    },
  };
}

describe('issue 94 - browser/editor writing assistant surface', () => {
  it('delegates embedded operations to existing APIs and preserves guardrails', async () => {
    const calls = [];
    const surface = createWritingAssistantSurface({
      surface: 'editor-extension',
      services: createDelegatingServices(calls),
      now: () => fixture.report.timestamp,
    });

    const operations = [
      WRITING_ASSISTANT_OPERATIONS.ANALYZE,
      WRITING_ASSISTANT_OPERATIONS.CHECK,
      WRITING_ASSISTANT_OPERATIONS.FORMALIZE,
      WRITING_ASSISTANT_OPERATIONS.TRANSLATE,
      WRITING_ASSISTANT_OPERATIONS.UNIQUENESS,
    ];
    const results = [];

    for (const operation of operations) {
      results.push(
        await surface.run({
          operation,
          text: fixture.selection.text,
          context: fixture.selection,
          report: fixture.report,
          options: {
            sourceLanguage: 'en',
            targetLanguage: 'ru',
            limit: 1,
          },
        })
      );
    }

    expect(calls.map((call) => call.operation)).toEqual(operations);
    expect(calls.every((call) => call.input === fixture.selection.text)).toBe(
      true
    );
    expect(
      results.every((result) => result.exports.linksNotation.length > 0)
    ).toBe(true);
    expect(
      results.every(
        (result) =>
          result.guardrails.candidateSuggestionsExplicit === true &&
          result.guardrails.evidenceChecksAreStyleRewrites === false
      )
    ).toBe(true);

    const checkResult = results.find(
      (result) => result.operation === WRITING_ASSISTANT_OPERATIONS.CHECK
    );
    const evidenceSuggestion = checkResult.suggestions.find(
      (suggestion) => suggestion.kind === 'evidence-check'
    );
    expect(evidenceSuggestion.evidenceBacked).toBe(true);
    expect(evidenceSuggestion.styleRewrite).toBe(false);

    const formalizeResult = results.find(
      (result) => result.operation === WRITING_ASSISTANT_OPERATIONS.FORMALIZE
    );
    const candidateSuggestion = formalizeResult.suggestions.find(
      (suggestion) => suggestion.kind === 'candidate-formalization-link'
    );
    expect(candidateSuggestion.explicit).toBe(true);
    expect(candidateSuggestion.requiresUserSelection).toBe(true);
    expect(candidateSuggestion.evidenceBacked).toBe(false);
  });

  it('keeps prefilled report URLs and Links Notation exports in a mock extension harness', async () => {
    const harness = createMockWritingAssistantExtensionHarness({
      surface: 'browser-extension',
      now: () => fixture.report.timestamp,
    });
    const selection = harness.createSelection(
      fixture.selection.text,
      fixture.selection
    );

    const analysisResult = await harness.runSelection(
      WRITING_ASSISTANT_OPERATIONS.ANALYZE,
      selection,
      { report: fixture.report }
    );
    const reportUrl = new URL(analysisResult.exports.issueReportUrl);
    const reportBody = reportUrl.searchParams.get('body');

    expect(analysisResult.exports.linksNotation).toContain('(links-network');
    expect(reportBody).toContain(fixture.selection.text);
    expect(reportBody).toContain('## Links Notation');
    expect(reportBody).toContain(fixture.selection.pageUrl);
    expect(
      analysisResult.suggestions
        .filter((suggestion) => suggestion.kind === 'candidate-interpretation')
        .every(
          (suggestion) =>
            suggestion.explicit === true &&
            suggestion.styleRewrite === false &&
            suggestion.evidenceBacked === false
        )
    ).toBe(true);

    const checkResult = await harness.runSelection(
      WRITING_ASSISTANT_OPERATIONS.CHECK,
      selection,
      { report: fixture.report }
    );

    expect(checkResult.exports.linksNotation).toContain('check');
    expect(checkResult.exports.issueReportUrls.length).toBeGreaterThan(0);
    expect(
      checkResult.suggestions
        .filter((suggestion) => suggestion.kind === 'evidence-check')
        .every(
          (suggestion) =>
            suggestion.evidenceBacked === true &&
            suggestion.styleRewrite === false
        )
    ).toBe(true);

    const verifySelectionExports = harness.verifySelectionExports;
    const verification = await verifySelectionExports(
      WRITING_ASSISTANT_OPERATIONS.ANALYZE,
      selection,
      { report: fixture.report }
    );

    expect(verification.ok).toBe(true);
    expect(verification.linksNotation).toBe(true);
    expect(verification.issueReportUrl).toBe(true);
  });
});
