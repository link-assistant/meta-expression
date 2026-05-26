import { createServer } from 'node:http';
import { URL, fileURLToPath } from 'node:url';
import {
  analyzeStatement,
  analyzeStatementWithLiveEvidence,
  exportEvidenceJsonLd,
  exportEvidenceProvJsonLd,
  naturalizeExpressionWith,
  serializeLinksNotation,
} from './index.js';
import { formalizeTextWith, FORMALIZE_LINK_TARGETS } from './formalize.js';
import { translateTextWith } from './translate.js';
import { checkText, checkTextWithLiveEvidence } from './check.js';
import { exportClaimReviewJsonLd } from './claim-review.js';
import { searchTextUniqueness } from './uniqueness.js';
import { parseSourceSpec } from './formalize-sources.js';
import { loadRepoOverrides, loadUserOverrides } from './formalize-overrides.js';
import {
  cacheKey,
  readCacheEntry,
  resolveCacheRoot,
  writeCacheEntry,
} from './formalize-cache.js';

export function createMetaExpressionServer(options = {}) {
  const cacheRoot = resolveCacheRoot(options);
  const liveCache = new Map();
  return createServer(async (request, response) => {
    try {
      await routeRequest(request, response, { cacheRoot, liveCache });
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
  const server = createMetaExpressionServer(options);

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

async function routeRequest(request, response, ctx) {
  const host = request.headers.host ?? '127.0.0.1';
  const url = new URL(request.url ?? '/', `http://${host}`);

  if (request.method === 'GET') {
    await routeGetRequest(url, response, ctx);
    return;
  }

  if (request.method === 'POST') {
    await routePostRequest(url, request, response, ctx);
    return;
  }

  sendNotFound(response);
}

async function routeGetRequest(url, response, ctx) {
  switch (url.pathname) {
    case '/health':
      sendJson(response, 200, { ok: true });
      return;
    case '/analyze':
      await sendAnalysis(response, ...analyzeParamsFromSearch(url));
      return;
    case '/formalize':
      await sendFormalize(response, formalizeParamsFromSearch(url), ctx);
      return;
    case '/translate':
      await sendTranslate(response, translateParamsFromSearch(url), ctx);
      return;
    case '/naturalize':
    case '/deformalize':
      await sendNaturalize(response, naturalizeParamsFromSearch(url));
      return;
    case '/check':
    case '/fact-check':
      await sendCheck(response, checkParamsFromSearch(url), ctx);
      return;
    case '/uniqueness':
    case '/uniquness':
      await sendUniqueness(response, uniquenessParamsFromSearch(url));
      return;
    default:
      sendNotFound(response);
  }
}

async function routePostRequest(url, request, response, ctx) {
  const body = await readRequestBody(request);
  const payload = body ? JSON.parse(body) : {};

  switch (url.pathname) {
    case '/analyze':
      await sendAnalysis(response, ...analyzeParamsFromPayload(payload));
      return;
    case '/formalize':
      await sendFormalize(response, formalizeParamsFromPayload(payload), ctx);
      return;
    case '/translate':
      await sendTranslate(response, translateParamsFromPayload(payload), ctx);
      return;
    case '/naturalize':
    case '/deformalize':
      await sendNaturalize(response, naturalizeParamsFromPayload(payload, url));
      return;
    case '/check':
    case '/fact-check':
      await sendCheck(response, checkParamsFromPayload(payload), ctx);
      return;
    case '/uniqueness':
    case '/uniquness':
      await sendUniqueness(response, uniquenessParamsFromPayload(payload));
      return;
    default:
      sendNotFound(response);
  }
}

function analyzeParamsFromSearch(url) {
  return [
    url.searchParams.get('input') ?? '',
    url.searchParams.get('format') ?? 'json',
    Number(url.searchParams.get('select') ?? 0),
    url.searchParams.get('live') === 'true',
  ];
}

function analyzeParamsFromPayload(payload) {
  return [
    payload.input ?? '',
    payload.format ?? 'json',
    payload.interpretationIndex ?? 0,
    payload.live === true,
  ];
}

function formalizeParamsFromSearch(url) {
  return {
    input: url.searchParams.get('input') ?? '',
    format: url.searchParams.get('format') ?? 'json',
    sourcesSpec: url.searchParams.get('sources') ?? '',
    target: url.searchParams.get('target') ?? 'wikipedia',
    maxNgramSize: numberParam(url.searchParams.get('maxNgram')),
    overrideFile: url.searchParams.get('override') ?? '',
    noRepoOverrides: url.searchParams.get('noRepoOverrides') === 'true',
  };
}

function formalizeParamsFromPayload(payload) {
  return {
    input: payload.input ?? '',
    format: payload.format ?? 'json',
    sourcesSpec: payload.sources ?? '',
    target: payload.target ?? 'wikipedia',
    maxNgramSize: payload.maxNgramSize,
    overrideFile: payload.overrideFile ?? '',
    noRepoOverrides: payload.noRepoOverrides === true,
    overrides: payload.overrides,
    providerOutputs: payload.providerOutputs ?? [],
  };
}

function translateParamsFromSearch(url) {
  return {
    ...formalizeParamsFromSearch(url),
    sourceLanguage:
      url.searchParams.get('from') ??
      url.searchParams.get('sourceLanguage') ??
      '',
    targetLanguage:
      url.searchParams.get('to') ??
      url.searchParams.get('targetLanguage') ??
      '',
  };
}

function translateParamsFromPayload(payload) {
  return {
    ...formalizeParamsFromPayload(payload),
    sourceLanguage: payload.from ?? payload.sourceLanguage,
    targetLanguage: payload.to ?? payload.targetLanguage,
  };
}

function naturalizeParamsFromSearch(url) {
  return {
    input: url.searchParams.get('input') ?? '',
    format: url.searchParams.get('format') ?? 'json',
    sourceLanguage:
      url.searchParams.get('from') ??
      url.searchParams.get('sourceLanguage') ??
      '',
    targetLanguage:
      url.searchParams.get('to') ??
      url.searchParams.get('targetLanguage') ??
      '',
  };
}

function naturalizeParamsFromPayload(payload, url) {
  return {
    input: payload.input ?? '',
    format:
      payload.format ??
      url.searchParams.get('format') ??
      url.searchParams.get('f') ??
      'json',
    sourceLanguage: payload.from ?? payload.sourceLanguage,
    targetLanguage: payload.to ?? payload.targetLanguage,
  };
}

function checkParamsFromSearch(url) {
  return {
    input: url.searchParams.get('input') ?? '',
    format: url.searchParams.get('format') ?? 'json',
    live: url.searchParams.get('live') === 'true',
    evidenceScoring: evidenceScoringFromSearch(url),
    sourceUrl:
      url.searchParams.get('sourceUrl') ?? url.searchParams.get('source') ?? '',
  };
}

function checkParamsFromPayload(payload) {
  return {
    input: payload.input ?? '',
    format: payload.format ?? 'json',
    live: payload.live === true,
    evidenceScoring: payload.evidenceScoring,
    preferenceProfile: payload.preferenceProfile,
    sourceUrl: payload.sourceUrl ?? payload.source ?? '',
  };
}

function uniquenessParamsFromSearch(url) {
  return {
    input: url.searchParams.get('input') ?? '',
    format: url.searchParams.get('format') ?? 'json',
    limit: numberParam(url.searchParams.get('limit')),
  };
}

function uniquenessParamsFromPayload(payload) {
  return {
    input: payload.input ?? '',
    format: payload.format ?? 'json',
    limit: payload.limit,
  };
}

function evidenceScoringFromSearch(url) {
  const scoring = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (!key.startsWith('score.')) {
      continue;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      scoring[key.slice('score.'.length)] = parsed;
    }
  }
  return scoring;
}

function sendNotFound(response) {
  sendJson(response, 404, {
    error: 'Not found',
    routes: [
      'GET /health',
      'GET /analyze?input=...',
      'POST /analyze',
      'GET /formalize?input=...',
      'POST /formalize',
      'GET /translate?input=...',
      'POST /translate',
      'GET /naturalize?input=...',
      'POST /naturalize',
      'GET /deformalize?input=...',
      'POST /deformalize',
      'GET /check?input=...',
      'POST /check',
      'GET /fact-check?input=...',
      'POST /fact-check',
      'GET /uniqueness?input=...',
      'POST /uniqueness',
      'GET /uniquness?input=...',
    ],
  });
}

async function sendAnalysis(
  response,
  input,
  format,
  interpretationIndex,
  live
) {
  const options = {
    interpretationIndex,
    selectedBy: 'service',
  };
  const analysis = live
    ? await analyzeStatementWithLiveEvidence(input, options)
    : analyzeStatement(input, options);

  if (isProvOFormat(format)) {
    sendLinkedDataJson(response, 200, exportEvidenceProvJsonLd(analysis));
    return;
  }
  if (isJsonLdFormat(format)) {
    sendLinkedDataJson(response, 200, exportEvidenceJsonLd(analysis));
    return;
  }
  if (format === 'links' || format === 'lino') {
    response.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
    });
    response.end(serializeLinksNotation(analysis.linksNetwork));
    return;
  }

  sendJson(response, 200, analysis);
}

async function sendFormalize(response, params, ctx) {
  if (!params.input) {
    sendJson(response, 400, { error: 'Missing input parameter.' });
    return;
  }
  const key = cacheKey(params);
  const fromDisk = await readCacheEntry(ctx.cacheRoot, key);
  if (fromDisk) {
    return emitFormalizeResponse(response, params.format, fromDisk.json, {
      cacheKey: key,
      cacheHit: 'disk',
      lino: fromDisk.lino,
    });
  }
  const sources = params.sourcesSpec
    ? parseSourceSpec(params.sourcesSpec)
    : undefined;
  const repoOverrides = params.noRepoOverrides ? [] : await loadRepoOverrides();
  const userOverrides = Array.isArray(params.overrides)
    ? params.overrides
    : params.overrideFile
      ? await loadUserOverrides(params.overrideFile)
      : [];
  const linkTargetMode = resolveLinkTargetParam(params.target);
  const result = await formalizeTextWith(params.input, {
    fetch: globalThis.fetch?.bind(globalThis),
    cache: ctx.liveCache,
    linkTargetMode,
    sources,
    overrides: [...repoOverrides, ...userOverrides],
    maxNgramSize: params.maxNgramSize,
    providerOutputs: params.providerOutputs,
  });
  const stored = await writeCacheEntry(
    ctx.cacheRoot,
    key,
    result,
    result.linksNotation
  );
  emitFormalizeResponse(response, params.format, result, {
    cacheKey: key,
    cacheHit: 'miss',
    lino: result.linksNotation,
    binPath: stored.binPath,
    linoPath: stored.linoPath,
  });
}

async function sendTranslate(response, params, ctx) {
  if (!params.input) {
    sendJson(response, 400, { error: 'Missing input parameter.' });
    return;
  }
  const sources = params.sourcesSpec
    ? parseSourceSpec(params.sourcesSpec, {
        language: params.sourceLanguage ?? 'en',
      })
    : undefined;
  const repoOverrides = params.noRepoOverrides ? [] : await loadRepoOverrides();
  const userOverrides = Array.isArray(params.overrides)
    ? params.overrides
    : params.overrideFile
      ? await loadUserOverrides(params.overrideFile)
      : [];
  const linkTargetMode = resolveLinkTargetParam(params.target ?? 'wikidata');
  const result = await translateTextWith(params.input, {
    fetch: globalThis.fetch?.bind(globalThis),
    cache: ctx.liveCache,
    sourceLanguage: params.sourceLanguage,
    targetLanguage: params.targetLanguage,
    linkTargetMode,
    sources,
    overrides: [...repoOverrides, ...userOverrides],
    maxNgramSize: params.maxNgramSize,
  });
  emitTranslateResponse(response, params.format, result);
}

async function sendNaturalize(response, params) {
  if (!params.input) {
    sendJson(response, 400, { error: 'Missing input parameter.' });
    return;
  }
  const result = await naturalizeExpressionWith(params.input, {
    sourceLanguage: params.sourceLanguage,
    targetLanguage: params.targetLanguage,
  });
  emitNaturalizeResponse(response, params.format, result);
}

async function sendCheck(response, params, ctx) {
  if (!params.input) {
    sendJson(response, 400, { error: 'Missing input parameter.' });
    return;
  }
  const options = {
    fetch: globalThis.fetch?.bind(globalThis),
    cache: ctx.liveCache,
    evidenceScoring: params.evidenceScoring,
    preferenceProfile: params.preferenceProfile,
  };
  const result = params.live
    ? await checkTextWithLiveEvidence(params.input, options)
    : checkText(params.input, options);
  emitCheckResponse(response, params.format, result, {
    sourceUrl: params.sourceUrl,
  });
}

async function sendUniqueness(response, params) {
  if (!params.input) {
    sendJson(response, 400, { error: 'Missing input parameter.' });
    return;
  }
  const result = await searchTextUniqueness(params.input, {
    fetch: globalThis.fetch?.bind(globalThis),
    limit: params.limit,
  });
  emitUniquenessResponse(response, params.format, result);
}

function resolveLinkTargetParam(token) {
  const normalized = String(token ?? '').toLowerCase();
  if (normalized === 'wikidata') {
    return FORMALIZE_LINK_TARGETS.WIKIDATA;
  }
  if (normalized === 'local' || normalized === 'local-viewer') {
    return FORMALIZE_LINK_TARGETS.LOCAL;
  }
  return FORMALIZE_LINK_TARGETS.WIKIPEDIA;
}

function numberParam(raw) {
  if (raw === null || raw === undefined || raw === '') {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function emitFormalizeResponse(response, format, payload, meta) {
  if (format === 'links' || format === 'lino') {
    response.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
      'x-formalize-cache': meta.cacheHit,
      'x-formalize-cache-key': meta.cacheKey,
    });
    response.end(meta.lino);
    return 0;
  }
  if (format === 'markdown' || format === 'md') {
    response.writeHead(200, {
      'content-type': 'text/markdown; charset=utf-8',
      'x-formalize-cache': meta.cacheHit,
      'x-formalize-cache-key': meta.cacheKey,
    });
    response.end(payload.markdown);
    return 0;
  }
  if (format === 'html') {
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'x-formalize-cache': meta.cacheHit,
      'x-formalize-cache-key': meta.cacheKey,
    });
    response.end(payload.html);
    return 0;
  }
  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'x-formalize-cache': meta.cacheHit,
    'x-formalize-cache-key': meta.cacheKey,
  });
  response.end(
    JSON.stringify(
      { ...payload, _cache: { hit: meta.cacheHit, key: meta.cacheKey } },
      null,
      2
    )
  );
  return 0;
}

function emitTranslateResponse(response, format, payload) {
  if (format === 'links' || format === 'lino') {
    response.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
    });
    response.end(payload.linksNotation);
    return 0;
  }
  if (format === 'markdown' || format === 'md') {
    response.writeHead(200, {
      'content-type': 'text/markdown; charset=utf-8',
    });
    response.end(payload.markdown);
    return 0;
  }
  if (format === 'html') {
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
    });
    response.end(payload.html);
    return 0;
  }
  sendJson(response, 200, payload);
  return 0;
}

function emitNaturalizeResponse(response, format, payload) {
  if (format === 'links' || format === 'lino') {
    response.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
    });
    response.end(payload.linksNotation);
    return 0;
  }
  if (format === 'markdown' || format === 'md') {
    response.writeHead(200, {
      'content-type': 'text/markdown; charset=utf-8',
    });
    response.end(payload.markdown);
    return 0;
  }
  if (format === 'html') {
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
    });
    response.end(payload.html);
    return 0;
  }
  sendJson(response, 200, payload);
  return 0;
}

function emitCheckResponse(response, format, payload, options = {}) {
  if (isClaimReviewFormat(format)) {
    sendJson(
      response,
      200,
      exportClaimReviewJsonLd(payload, {
        sourceUrl: options.sourceUrl,
      })
    );
    return 0;
  }
  if (isProvOFormat(format)) {
    sendLinkedDataJson(response, 200, exportEvidenceProvJsonLd(payload));
    return 0;
  }
  if (isJsonLdFormat(format)) {
    sendLinkedDataJson(response, 200, exportEvidenceJsonLd(payload));
    return 0;
  }
  if (format === 'links' || format === 'lino') {
    response.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
    });
    response.end(payload.linksNotation);
    return 0;
  }
  if (format === 'markdown' || format === 'md') {
    response.writeHead(200, {
      'content-type': 'text/markdown; charset=utf-8',
    });
    response.end(payload.markdown);
    return 0;
  }
  if (format === 'html') {
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
    });
    response.end(payload.html);
    return 0;
  }
  sendJson(response, 200, payload);
  return 0;
}

function isClaimReviewFormat(format) {
  return format === 'claim-review' || format === 'claimreview';
}

function isJsonLdFormat(format) {
  return (
    format === 'json-ld' ||
    format === 'jsonld' ||
    format === 'ld+json' ||
    format === 'evidence-json-ld'
  );
}

function isProvOFormat(format) {
  return (
    format === 'prov-o' ||
    format === 'provo' ||
    format === 'prov' ||
    format === 'prov-json-ld'
  );
}

function emitUniquenessResponse(response, format, payload) {
  if (format === 'links' || format === 'lino') {
    response.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
    });
    response.end(payload.linksNotation);
    return 0;
  }
  if (format === 'markdown' || format === 'md') {
    response.writeHead(200, {
      'content-type': 'text/markdown; charset=utf-8',
    });
    response.end(payload.markdown);
    return 0;
  }
  if (format === 'html') {
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
    });
    response.end(payload.html);
    return 0;
  }
  sendJson(response, 200, payload);
  return 0;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendLinkedDataJson(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/ld+json; charset=utf-8',
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
