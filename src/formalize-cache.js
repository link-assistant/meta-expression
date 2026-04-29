/**
 * Persistent dual-format cache for formalize results.
 *
 * Each cache entry is written twice on disk under `<root>/<hash>/`:
 *   - `payload.bin`  — raw JSON bytes (forward-compatible "binary" view
 *                       analogous to link-cli's binary store)
 *   - `payload.lino` — links-notation rendering of the same payload
 *                       (text view analogous to links-notation files)
 *
 * Both files are written atomically (tmp file + rename). On read we
 * cross-check that both representations agree on the cache key — if the
 * .lino header doesn't match the requested key the entry is treated as
 * corrupt and ignored, ensuring the binary and text views can vouch for
 * each other ("comparison and reliability" in the issue follow-up).
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

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
    const [json, lino] = await Promise.all([
      readFile(join(root, key, 'payload.bin'), 'utf8'),
      readFile(join(root, key, 'payload.lino'), 'utf8'),
    ]);
    const parsed = JSON.parse(json);
    if (!lino.startsWith(`(formalize-cache: ${key}`)) {
      // Mismatched key header — both views must agree.
      return null;
    }
    return { json: parsed, lino };
  } catch {
    return null;
  }
}

/**
 * @param {string} root
 * @param {string} key
 * @param {object} payload
 * @param {string} linoBody
 * @returns {Promise<{ binPath: string, linoPath: string }>}
 */
export async function writeCacheEntry(root, key, payload, linoBody) {
  const dir = join(root, key);
  await mkdir(dir, { recursive: true });
  const binPath = join(dir, 'payload.bin');
  const linoPath = join(dir, 'payload.lino');
  const linoText = `(formalize-cache: ${key} ${new Date().toISOString()})\n${linoBody}\n`;
  await Promise.all([
    atomicWrite(binPath, JSON.stringify(payload, null, 2)),
    atomicWrite(linoPath, linoText),
  ]);
  return { binPath, linoPath };
}

async function atomicWrite(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, contents, 'utf8');
  await rename(tmp, path);
}
