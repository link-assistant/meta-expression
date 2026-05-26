import { describe, expect, it } from 'test-anywhere';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, relative, resolve } from 'node:path';
import { verifyWebModuleGraph } from '../../../scripts/verify-web-module-graph.mjs';

describe('issue 110 - doublets-web browser store', () => {
  it('keeps the doublets-web browser store in the static module graph', async () => {
    const result = await verifyWebModuleGraph({
      root: new URL('../../../', import.meta.url),
      entries: ['../js/src/browser-doublets-web.js'],
    });

    expect(result.invalidImports).toEqual([]);
    expect(result.contentTypeProblems).toEqual([]);
    expect(
      result.modules.some((moduleUrl) =>
        moduleUrl.endsWith('/node_modules/doublets-web/doublets_web_bg.js')
      )
    ).toBe(true);
    expect(
      result.modules.some((moduleUrl) =>
        moduleUrl.endsWith('/node_modules/doublets-web/doublets_web_bg.wasm')
      )
    ).toBe(true);
  });

  it('stores and loads portable meta-language links in a browser', async () => {
    const playwright = await tryLoadPlaywright();
    if (!playwright) {
      return;
    }
    const server = await startStaticServer(resolve('.'));
    let browser = null;
    try {
      browser = await playwright.chromium.launch();
    } catch (error) {
      if (isMissingBrowserError(error)) {
        return;
      }
      throw error;
    }
    try {
      const page = await browser.newPage();
      await page.goto(`${server.origin}/web/`);
      const result = await page.evaluate(async () => {
        const {
          decodeFromDoubletsWeb,
          encodeAsDoubletsWeb,
          loadPortableCaseFromDoubletsWeb,
          savePortableCaseToDoubletsWeb,
        } = await import('../js/src/browser-doublets-web.js');
        const linksNetwork = {
          id: 'issue-110-browser',
          kind: 'links-network',
          version: 1,
          beliefSystem: {
            id: 'test',
            name: 'Test',
            probabilityStrategy: 'weighted-support-ratio',
            sourceWeights: {},
          },
          links: [
            {
              id: 'statement-1',
              role: 'statement',
              references: [],
              version: 1,
              value: { text: 'Doublets-web stores browser links.' },
              provenance: {
                sourceType: 'test',
                method: 'playwright-smoke',
                sourceUrl: null,
                retrievedAt: '2026-05-26T00:00:00.000Z',
              },
            },
          ],
        };
        const saved = await savePortableCaseToDoubletsWeb(
          { linksNetwork },
          {
            caseId: 'issue-110-browser',
            exportedAt: '2026-05-26T00:00:00.000Z',
          }
        );
        const loaded = await loadPortableCaseFromDoubletsWeb(saved);
        const cacheSnapshot = [
          ['Q42', { label: 'Douglas Adams', source: 'wikidata' }],
        ];
        const cached = await encodeAsDoubletsWeb(cacheSnapshot);
        const decodedCache = await decodeFromDoubletsWeb(cached.binary);
        return {
          bytes: saved.binary.byteLength,
          cacheLabel: decodedCache[0][1].label,
          implementation: saved.portable.storage.implementation,
          text: loaded.linksNetwork.links[0].value.text,
        };
      });

      expect(result.bytes).toBeGreaterThan(0);
      expect(result.cacheLabel).toBe('Douglas Adams');
      expect(result.implementation).toBe('doublets-web');
      expect(result.text).toBe('Doublets-web stores browser links.');
    } finally {
      await browser?.close();
      await server.close();
    }
  });
});

async function tryLoadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    return null;
  }
}

function isMissingBrowserError(error) {
  return /Executable doesn't exist|browserType\.launch/u.test(
    error instanceof Error ? error.message : String(error)
  );
}

function startStaticServer(root) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const filePath = resolvePath(root, url.pathname);
      const body = await readFile(filePath);
      response.writeHead(200, {
        'content-type': contentType(filePath),
      });
      response.end(body);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('not found');
    }
  });
  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolveServer({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise((resolveClose) => server.close(resolveClose)),
      });
    });
  });
}

function resolvePath(root, pathname) {
  const requested = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const filePath = join(root, normalize(decodeURIComponent(requested)));
  if (relative(root, filePath).startsWith('..')) {
    throw new Error('Path escapes static root.');
  }
  return filePath;
}

function contentType(path) {
  const extension = extname(path);
  if (extension === '.html') {
    return 'text/html';
  }
  if (extension === '.js') {
    return 'text/javascript';
  }
  if (extension === '.json') {
    return 'application/json';
  }
  if (extension === '.wasm') {
    return 'application/wasm';
  }
  return 'application/octet-stream';
}
