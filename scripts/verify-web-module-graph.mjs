import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const defaultRoot = pathToFileURL(`${process.cwd()}/`);
const defaultDocumentPath = 'web/index.html';
const javascriptContentTypes = [
  'application/javascript',
  'text/javascript',
  'application/ecmascript',
  'text/ecmascript',
];

export async function verifyWebModuleGraph(options = {}) {
  const rootUrl = normalizeRootUrl(options.root ?? defaultRoot);
  const documentUrl = new URL(
    options.documentPath ?? defaultDocumentPath,
    rootUrl
  );
  const document = await readText(documentUrl);
  const importMap = parseImportMap(document, documentUrl);
  const moduleEntries = [
    ...moduleScriptSources(document),
    ...(options.entries ?? []),
  ];
  const pending = unique(
    moduleEntries.map((entry) => new URL(entry, documentUrl).href)
  );
  const visited = new Map();
  const invalidImports = [];
  const contentTypeProblems = [];

  for (let index = 0; index < pending.length; index += 1) {
    const moduleUrl = new URL(pending[index]);
    if (visited.has(moduleUrl.href)) {
      continue;
    }
    const loaded = await readModule(moduleUrl);
    visited.set(moduleUrl.href, loaded);
    if (loaded.contentTypeProblem) {
      contentTypeProblems.push(loaded.contentTypeProblem);
    }
    if (
      moduleUrl.pathname.endsWith('.json') ||
      moduleUrl.pathname.endsWith('.wasm')
    ) {
      continue;
    }
    const imports = parseStaticImports(loaded.text);
    const workerEntries = parseModuleWorkerEntries(loaded.text);
    const resourceEntries = parseImportMetaResourceEntries(loaded.text);
    for (const specifier of [...imports, ...workerEntries]) {
      const resolvedImport = resolveBrowserImport(
        specifier,
        moduleUrl,
        importMap
      );
      if (resolvedImport.ok) {
        pending.push(resolvedImport.url.href);
      } else {
        invalidImports.push({
          importer: moduleUrl.href,
          specifier,
          reason: resolvedImport.reason,
        });
      }
    }
    for (const resource of resourceEntries) {
      pending.push(new URL(resource, moduleUrl).href);
    }
  }

  return {
    document: documentUrl.href,
    modules: [...visited.keys()].sort(),
    invalidImports,
    contentTypeProblems,
  };
}

function normalizeRootUrl(root) {
  if (root instanceof URL) {
    return ensureTrailingSlash(root);
  }
  const raw = String(root);
  if (/^https?:\/\//u.test(raw) || raw.startsWith('file://')) {
    return ensureTrailingSlash(new URL(raw));
  }
  return pathToFileURL(`${resolve(raw)}/`);
}

function ensureTrailingSlash(url) {
  const next = new URL(url.href);
  if (!next.pathname.endsWith('/')) {
    next.pathname = `${next.pathname}/`;
  }
  return next;
}

function parseImportMap(document, documentUrl) {
  const importMap = { imports: {} };
  const pattern =
    /<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/giu;
  for (const match of document.matchAll(pattern)) {
    const parsed = JSON.parse(match[1]);
    Object.assign(importMap.imports, parsed.imports ?? {});
  }
  return {
    imports: Object.fromEntries(
      Object.entries(importMap.imports).map(([specifier, target]) => [
        specifier,
        new URL(target, documentUrl),
      ])
    ),
  };
}

function moduleScriptSources(document) {
  const sources = [];
  const pattern = /<script\b[^>]*type=["']module["'][^>]*>/giu;
  for (const match of document.matchAll(pattern)) {
    const source = /\bsrc=["']([^"']+)["']/iu.exec(match[0])?.[1];
    if (source) {
      sources.push(source);
    }
  }
  return sources;
}

function parseStaticImports(source) {
  const imports = [];
  const patterns = [
    /\bimport\s+["']([^"']+)["']/gu,
    /\bimport\s+[^;]*?\s+from\s+["']([^"']+)["']/gu,
    /\bexport\s+[^;]*?\s+from\s+["']([^"']+)["']/gu,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      imports.push(match[1]);
    }
  }
  return unique(imports);
}

function parseModuleWorkerEntries(source) {
  const entries = [];
  const pattern =
    /\bnew\s+Worker\s*\(\s*["']([^"']+)["']\s*,\s*\{[^}]*\btype\s*:\s*["']module["'][^}]*\}/gu;
  for (const match of source.matchAll(pattern)) {
    entries.push(match[1]);
  }
  return unique(entries);
}

function parseImportMetaResourceEntries(source) {
  const entries = [];
  const pattern =
    /\bnew\s+URL\s*\(\s*["']([^"']+\.(?:json|js|wasm))["']\s*,\s*import\.meta\.url\s*\)/gu;
  for (const match of source.matchAll(pattern)) {
    entries.push(match[1]);
  }
  return unique(entries);
}

function resolveBrowserImport(specifier, importerUrl, importMap) {
  if (specifier.startsWith('node:')) {
    return {
      ok: false,
      reason: 'Node built-in imports cannot load in browsers',
    };
  }
  const mapped = resolveImportMapSpecifier(specifier, importMap);
  if (mapped) {
    return { ok: true, url: mapped };
  }
  if (
    specifier.startsWith('./') ||
    specifier.startsWith('../') ||
    specifier.startsWith('/')
  ) {
    return { ok: true, url: new URL(specifier, importerUrl) };
  }
  if (/^[a-z][a-z0-9+.-]*:/iu.test(specifier)) {
    return { ok: true, url: new URL(specifier) };
  }
  return {
    ok: false,
    reason: 'Bare module specifier is missing from the import map',
  };
}

function resolveImportMapSpecifier(specifier, importMap) {
  if (importMap.imports[specifier]) {
    return importMap.imports[specifier];
  }
  const prefix = Object.keys(importMap.imports)
    .filter((key) => key.endsWith('/') && specifier.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  if (!prefix) {
    return null;
  }
  return new URL(specifier.slice(prefix.length), importMap.imports[prefix]);
}

async function readModule(url) {
  const loaded = await readTextWithMetadata(url);
  return {
    text: loaded.text,
    contentTypeProblem: contentTypeProblem(url, loaded.contentType),
  };
}

async function readText(url) {
  return (await readTextWithMetadata(url)).text;
}

async function readTextWithMetadata(url) {
  if (url.protocol === 'file:') {
    return {
      text: await readFile(fileURLToPath(url), 'utf8'),
      contentType: null,
    };
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url.href}: HTTP ${response.status}`);
  }
  return {
    text: await response.text(),
    contentType: response.headers.get('content-type') ?? '',
  };
}

function contentTypeProblem(url, contentType) {
  if (!contentType) {
    return null;
  }
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  if (
    url.pathname.endsWith('.js') &&
    !javascriptContentTypes.includes(normalized)
  ) {
    return {
      url: url.href,
      contentType,
      expected: 'JavaScript module content type',
    };
  }
  if (url.pathname.endsWith('.json') && normalized !== 'application/json') {
    return {
      url: url.href,
      contentType,
      expected: 'application/json',
    };
  }
  if (url.pathname.endsWith('.wasm') && normalized !== 'application/wasm') {
    return {
      url: url.href,
      contentType,
      expected: 'application/wasm',
    };
  }
  return null;
}

function unique(values) {
  return [...new Set(values)];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await verifyWebModuleGraph(args);
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `Verified ${result.modules.length} browser modules from ${result.document}`
    );
  }
  if (
    result.invalidImports.length > 0 ||
    result.contentTypeProblems.length > 0
  ) {
    for (const entry of result.invalidImports) {
      console.error(
        `${entry.importer} imports ${JSON.stringify(entry.specifier)}: ${entry.reason}`
      );
    }
    for (const entry of result.contentTypeProblems) {
      console.error(
        `${entry.url} served as ${entry.contentType}; expected ${entry.expected}`
      );
    }
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const parsed = { entries: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--root') {
      parsed.root = args[(index += 1)];
    } else if (arg === '--document') {
      parsed.documentPath = args[(index += 1)];
    } else if (arg === '--entry') {
      parsed.entries.push(args[(index += 1)]);
    } else if (arg === '--json') {
      parsed.json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
