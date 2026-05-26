import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';
import {
  WRITING_ASSISTANT_OPERATIONS,
  checkGrammar,
  createWritingAssistantSurface,
} from '../../src/index.js';
import { parseCliArguments, runCliAsync } from '../../src/cli.js';
import { createMetaExpressionServer } from '../../src/server.js';

const fixtures = JSON.parse(
  readFileSync(
    new URL('../fixtures/issue-113/grammar-fixtures.json', import.meta.url),
    'utf8'
  )
);

describe('issue 113 - grammar checking surface', () => {
  it('detects seeded grammatical-error fixtures per supported language with suggested corrections', () => {
    expect(fixtures.supportedLanguages.sort()).toEqual([
      'en',
      'hi',
      'ru',
      'zh',
    ]);
    const regionalEnglish = checkGrammar('The Moon orbit the Sun', {
      language: 'en-US',
    });
    expect(regionalEnglish.language).toBe('en');
    expect(regionalEnglish.issues.map((issue) => issue.code)).toContain(
      'subject-verb-agreement'
    );

    for (const fixture of fixtures.errorFixtures) {
      const result = checkGrammar(fixture.text, {
        language: fixture.language,
      });
      const detail = `${fixture.language}: ${fixture.text}`;

      expect(`${detail} status ${result.status}`).toBe(
        `${detail} status checked`
      );
      expect(`${detail} surface ${result.surface}`).toBe(
        `${detail} surface grammar`
      );
      expect(`${detail} issues ${result.summary.issueCount}`).not.toBe(
        `${detail} issues 0`
      );
      expect(result.html).toContain('data-grammar-issue="true"');
      expect(result.markdown).toContain('Grammar check found');
      expect(result.linksNotation).toContain('grammar');

      for (const expected of fixture.expectedIssues) {
        const issue = result.issues.find(
          (candidate) =>
            candidate.code === expected.code &&
            candidate.category === expected.category &&
            candidate.suggestions.some(
              (suggestion) => suggestion.text === expected.suggestion
            )
        );
        expect(`${detail} ${expected.code}`).toBe(
          `${detail} ${issue?.code ?? 'missing'}`
        );
      }
    }
  });

  it('reports clean text with no grammar issues in every supported language', () => {
    for (const fixture of fixtures.cleanFixtures) {
      const result = checkGrammar(fixture.text, {
        language: fixture.language,
      });

      expect(result.summary.issueCount).toBe(0);
      expect(result.issues).toEqual([]);
      expect(result.markdown).toContain('No grammar issues found.');
    }
  });

  it('exposes grammar checking through CLI and HTTP surfaces', async () => {
    const parsed = parseCliArguments([
      'grammar',
      '--input',
      'The Moon orbit the Sun',
      '--from',
      'en',
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
    const exitCode = await runCliAsync(
      ['grammar', '--input', 'The Moon orbit the Sun', '--from', 'en'],
      output
    );
    const cliPayload = JSON.parse(output.logs[0]);
    const started = await startServer();

    try {
      const response = await fetch(
        `http://127.0.0.1:${started.port}/grammar?sourceLanguage=en&input=${encodeURIComponent(
          'The Moon orbit the Sun'
        )}`
      );
      const servicePayload = await response.json();

      expect(parsed.command).toBe('grammar');
      expect(exitCode).toBe(0);
      expect(cliPayload.surface).toBe('grammar');
      expect(cliPayload.issues.map((issue) => issue.code)).toContain(
        'subject-verb-agreement'
      );
      expect(response.status).toBe(200);
      expect(servicePayload.surface).toBe('grammar');
      expect(servicePayload.summary.issueCount).toBeGreaterThan(0);
    } finally {
      await stopServer(started.server);
    }
  });

  it('exposes grammar suggestions through the embedded writing assistant surface', async () => {
    const calls = [];
    const surface = createWritingAssistantSurface({
      services: {
        checkGrammar(input, options) {
          calls.push({
            operation: WRITING_ASSISTANT_OPERATIONS.GRAMMAR,
            input,
          });
          return checkGrammar(input, options);
        },
      },
    });

    const result = await surface.grammar('The Moon orbit the Sun', {
      options: { language: 'en' },
    });

    expect(calls).toEqual([
      {
        operation: WRITING_ASSISTANT_OPERATIONS.GRAMMAR,
        input: 'The Moon orbit the Sun',
      },
    ]);
    expect(result.operation).toBe(WRITING_ASSISTANT_OPERATIONS.GRAMMAR);
    expect(result.suggestions.map((suggestion) => suggestion.kind)).toContain(
      'grammar-issue'
    );
  });
});

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createMetaExpressionServer({
      cacheRoot: '.cache/issue-113-test',
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
