import { createServer } from 'node:http';
import { URL, fileURLToPath } from 'node:url';
import { analyzeStatement, serializeLinksNotation } from './index.js';

export function createMetaExpressionServer() {
  return createServer(async (request, response) => {
    try {
      await routeRequest(request, response);
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export function startMetaExpressionServer(options = {}) {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 3000;
  const server = createMetaExpressionServer();

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort =
        typeof address === 'object' && address !== null ? address.port : port;
      server.off('error', reject);
      resolve({ server, host, port: actualPort });
    });
  });
}

async function routeRequest(request, response) {
  const host = request.headers.host ?? '127.0.0.1';
  const url = new URL(request.url ?? '/', `http://${host}`);

  if (request.method === 'GET') {
    routeGetRequest(url, response);
    return;
  }

  if (request.method === 'POST') {
    await routePostRequest(url, request, response);
    return;
  }

  sendNotFound(response);
}

function routeGetRequest(url, response) {
  if (url.pathname === '/health') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === '/analyze') {
    const input = url.searchParams.get('input') ?? '';
    const format = url.searchParams.get('format') ?? 'json';
    const interpretationIndex = Number(url.searchParams.get('select') ?? 0);
    sendAnalysis(response, input, format, interpretationIndex);
    return;
  }

  sendNotFound(response);
}

async function routePostRequest(url, request, response) {
  if (url.pathname !== '/analyze') {
    sendNotFound(response);
    return;
  }

  const body = await readRequestBody(request);
  const payload = body ? JSON.parse(body) : {};
  sendAnalysis(
    response,
    payload.input ?? '',
    payload.format ?? 'json',
    payload.interpretationIndex ?? 0
  );
}

function sendNotFound(response) {
  sendJson(response, 404, {
    error: 'Not found',
    routes: ['GET /health', 'GET /analyze?input=...', 'POST /analyze'],
  });
}

function sendAnalysis(response, input, format, interpretationIndex) {
  const analysis = analyzeStatement(input, {
    interpretationIndex,
    selectedBy: 'service',
  });

  if (format === 'links' || format === 'lino') {
    response.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
    });
    response.end(serializeLinksNotation(analysis.linksNetwork));
    return;
  }

  sendJson(response, 200, analysis);
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload, null, 2));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT ?? 3000);
  const started = await startMetaExpressionServer({ port });
  console.log(
    `meta-expression service listening on http://${started.host}:${started.port}`
  );
}
