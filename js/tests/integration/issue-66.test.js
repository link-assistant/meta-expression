import { describe, expect, it } from 'test-anywhere';
import {
  analyzeStatement,
  deformalizeExpressionWith,
  naturalizeExpressionWith,
} from '../../src/index.js';
import { runCliAsync } from '../../src/cli.js';
import { createMetaExpressionServer } from '../../src/server.js';

const formalClaim =
  '(claim: subject (OpenAI) predicate (creates) object (useful tools))';

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createMetaExpressionServer({
      cacheRoot: '.cache/issue-66-test',
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

describe('issue 66 - generalized naturalization', () => {
  it('naturalizes arbitrary partial formal expressions with CST and deformalization alias', async () => {
    const analysis = analyzeStatement('OpenAI creates useful tools');
    const result = await naturalizeExpressionWith(
      analysis.formalization.expression
    );

    expect(result.plainText).toBe('OpenAI creates useful tools');
    expect(result.naturalization.targetText).toBe(result.plainText);
    expect(result.deformalization).toBe(result.naturalization);
    expect(result.cst.naturalization).toBe(result.naturalization);
    expect(result.cst.deformalization).toBe(result.naturalization);
    expect(result.cst.units.map((unit) => unit.role)).toEqual([
      'subject',
      'predicate',
      'object',
    ]);
  });

  it('renders Links Notation claims through naturalization and deformalization aliases', async () => {
    const result = await naturalizeExpressionWith(formalClaim, {
      afterDeformalizationRules: {
        id: 'prefer-specific-object',
        pattern: 'useful tools',
        replacement: 'developer tools',
      },
    });
    const alias = await deformalizeExpressionWith(formalClaim);

    expect(result.plainText).toBe('OpenAI creates developer tools');
    expect(result.naturalization.targetText).toBe(result.plainText);
    expect(result.linksNotation).toContain(
      '(naturalization: target (OpenAI creates developer tools)'
    );
    expect(result.steps.map((step) => step.rule)).toContain(
      'prefer-specific-object'
    );
    expect(alias.plainText).toBe('OpenAI creates useful tools');
    expect(alias.deformalization).toBe(alias.naturalization);
  });

  it('exposes naturalization through the CLI', async () => {
    const messages = [];
    const errors = [];
    const exit = await runCliAsync(
      ['naturalize', '--input', formalClaim, '--format', 'json'],
      {
        log: (line) => messages.push(line),
        error: (line) => errors.push(line),
      }
    );

    expect(exit).toBe(0);
    expect(errors.length).toBe(0);
    const payload = JSON.parse(messages[0]);
    expect(payload.plainText).toBe('OpenAI creates useful tools');
    expect(payload.deformalization.targetText).toBe(payload.plainText);
  });

  it('serves POST /naturalize and /deformalize aliases', async () => {
    if (!localServerTestsEnabled) {
      return;
    }
    let started = null;
    try {
      started = await startServer();
      const naturalize = await fetch(
        `http://127.0.0.1:${started.port}/naturalize`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ input: formalClaim }),
        }
      );
      expect(naturalize.status).toBe(200);
      const naturalized = await naturalize.json();
      expect(naturalized.plainText).toBe('OpenAI creates useful tools');

      const naturalizeGet = await fetch(
        `http://127.0.0.1:${started.port}/naturalize?input=${encodeURIComponent(
          formalClaim
        )}`
      );
      expect(naturalizeGet.status).toBe(200);
      const naturalizedGet = await naturalizeGet.json();
      expect(naturalizedGet.sourceLanguage).toBe('links-notation');

      const deformalize = await fetch(
        `http://127.0.0.1:${started.port}/deformalize?format=links`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ input: formalClaim }),
        }
      );
      expect(deformalize.status).toBe(200);
      expect(await deformalize.text()).toContain(
        '(naturalization: target (OpenAI creates useful tools)'
      );
    } finally {
      if (started) {
        await stopServer(started.server);
      }
    }
  });
});
