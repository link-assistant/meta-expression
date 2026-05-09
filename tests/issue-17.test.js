import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'test-anywhere';
import { checkText } from '../src/index.js';
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
    expect(result.statements[0].correctness).toBeGreaterThan(0.98);
    expect(result.statements[0].wrongness).toBeLessThan(0.02);
    expect(result.statements[0].color.hue).toBeGreaterThan(115);
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
    expect(payload.statements[0].correctness).toBeGreaterThan(0.98);
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
