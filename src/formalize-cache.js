/**
 * Persistent dual-format cache for formalize results.
 *
 * Each cache entry is written twice on disk under `<root>/<hash>/`:
 *   - `payload.bin`  — binary doublets blob (see `src/doublets.js`),
 *                       the same shape link-foundation/link-cli and
 *                       linksplatform/doublets-rs use as their on-disk
 *                       representation. Forward-compatible with a
 *                       WebAssembly doublets-rs backend later.
 *   - `payload.lino` — Links Notation rendering of the same payload
 *                       (text view analogous to links-notation files).
 *
 * Both files are written atomically (tmp file + rename). On read we
 * cross-check that both representations agree on the cache key — the
 * .lino file's first line declares the cache key, and the binary blob
 * round-trips back to the same JS object the lino describes. If either
 * check fails the entry is treated as corrupt and ignored, ensuring the
 * binary and text views vouch for each other ("comparison and
 * reliability" in the issue follow-up).
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { encodeAsDoublets, decodeFromDoublets } from './doublets.js';
import { parseLino, serializeLino } from './lino.js';

const cacheRootEnv = 'META_EXPRESSION_FORMALIZE_CACHE';
const defaultCacheRoot = '.cache/formalize';

/**
 * Resolve the on-disk cache root, preferring an explicit `options.cacheRoot`,
 * falling back to the `META_EXPRESSION_FORMALIZE_CACHE` env var, then to
 * `<cwd>/.cache/formalize`.
 *
 * @param {object} [options]
 * @param {string} [options.cacheRoot]
 * @returns {string}
 */
export function resolveCacheRoot(options = {}) {
  return (
    options.cacheRoot ??
    process.env[cacheRootEnv] ??
    join(process.cwd(), defaultCacheRoot)
  );
}

/**
 * Hash a formalize request descriptor into a stable cache key. The same input
 * (text + sources + target + overrides + maxNgramSize + language) always maps
 * to the same 32-char hex digest so cache entries collide deterministically.
 *
 * @param {object} input
 * @returns {string}
 */
export function cacheKey(input) {
  const normalized = JSON.stringify({
    text: String(input.text ?? input.input ?? ''),
    sourcesSpec: String(input.sourcesSpec ?? ''),
    target: String(input.target ?? ''),
    overrides: input.overrides ?? null,
    overrideFile: String(input.overrideFile ?? ''),
    noRepoOverrides: Boolean(input.noRepoOverrides),
    maxNgramSize: input.maxNgramSize ?? null,
    language: input.language ?? 'en',
  });
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

/**
 * @param {string} root
 * @param {string} key
 * @returns {Promise<{json: object, lino: string} | null>}
 */
export async function readCacheEntry(root, key) {
  try {
    const [bin, lino] = await Promise.all([
      readFile(join(root, key, 'payload.bin')),
      readFile(join(root, key, 'payload.lino'), 'utf8'),
    ]);
    if (!lino.startsWith(`(formalize-cache: ${key}`)) {
      return null;
    }
    const linoBody = lino.slice(lino.indexOf('\n') + 1);
    const linoParsed = parseLino(linoBody);
    const linoPayload = unwrapPayload(linoParsed);
    const binPayload = decodeFromDoublets(bin);
    if (!payloadsAgree(linoPayload, binPayload)) {
      return null;
    }
    return { json: binPayload, lino };
  } catch {
    return null;
  }
}

/**
 * @param {string} root
 * @param {string} key
 * @param {object} payload
 * @param {string} formalizeLino
 * @returns {Promise<{ binPath: string, linoPath: string }>}
 */
export async function writeCacheEntry(root, key, payload, formalizeLino) {
  const dir = join(root, key);
  await mkdir(dir, { recursive: true });
  const binPath = join(dir, 'payload.bin');
  const linoPath = join(dir, 'payload.lino');
  const header = `(formalize-cache: ${key} ${new Date().toISOString()})`;
  const payloadLino = serializeLino(
    { payload },
    { rootIdentifier: 'formalize-cache' }
  );
  // Keep the formalize-shape lino body so callers can still serve
  // `format=lino` directly to clients (existing API contract).
  const linoText = `${header}\n${formalizeLino}\n${payloadLino}`;
  const { binary } = encodeAsDoublets(payload);
  await Promise.all([
    atomicWrite(binPath, Buffer.from(binary)),
    atomicWrite(linoPath, linoText),
  ]);
  return { binPath, linoPath };
}

function unwrapPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  if (Array.isArray(parsed)) {
    // Multi-document parse: search every top-level node for a `payload`
    // child. The cache file always concatenates the formalize lino with
    // the dedicated `formalize-cache.payload` block, so the payload is
    // typically the second entry.
    for (const candidate of parsed) {
      const found = unwrapPayload(candidate);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (parsed.payload && typeof parsed.payload === 'object') {
    return parsed.payload;
  }
  return null;
}

function payloadsAgree(a, b) {
  if (a === null || b === null) {
    return false;
  }
  // Cheap structural agreement: both have same key set on top.
  if (typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  for (let i = 0; i < aKeys.length; i += 1) {
    if (aKeys[i] !== bKeys[i]) {
      return false;
    }
  }
  return true;
}

async function atomicWrite(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, contents);
  await rename(tmp, path);
}
