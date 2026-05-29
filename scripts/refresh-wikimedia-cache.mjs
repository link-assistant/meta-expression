#!/usr/bin/env node

/**
 * Refresh the committed Wikimedia API cache used by the translation quality
 * gate and the web app.
 *
 * Issue #128 asks that "we cache requests/responses to APIs ... Cache should be
 * in data folder and in .lino format, as we usually do", and that merging to
 * main keeps that cache fresh so the next test run (and the web app) replays
 * offline instead of hitting the network.
 *
 * This script consolidates the per-URL JSON snapshots recorded under
 * `js/tests/fixtures/wikimedia-snapshots/` into a single deterministic
 * `js/data/wikimedia-cache.lino` document. It performs no network access, so it
 * is safe to run in CI; the recorders (`record-issue-43-articles.mjs`,
 * `record-issue-96-articles.mjs`) are what add fresh API payloads.
 *
 * Usage:
 *   node scripts/refresh-wikimedia-cache.mjs            # write the cache
 *   node scripts/refresh-wikimedia-cache.mjs --check    # fail if out of date
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  loadSnapshotMap,
  serializeSnapshotLino,
  writeSnapshotLino,
} from '../js/src/formalize-snapshots.js';

const here = dirname(fileURLToPath(import.meta.url));
const snapshotsDir = resolve(
  here,
  '..',
  'js',
  'tests',
  'fixtures',
  'wikimedia-snapshots'
);
const cachePath = resolve(here, '..', 'js', 'data', 'wikimedia-cache.lino');

async function main() {
  const check = process.argv.includes('--check');
  const snapshots = await loadSnapshotMap(snapshotsDir);
  const next = serializeSnapshotLino(snapshots);
  if (check) {
    let current = '';
    try {
      current = await readFile(cachePath, 'utf8');
    } catch {
      current = '';
    }
    if (current !== next) {
      process.stderr.write(
        `Wikimedia .lino cache is out of date. Run:\n` +
          `  node scripts/refresh-wikimedia-cache.mjs\n` +
          `and commit ${cachePath}.\n`
      );
      process.exit(1);
    }
    process.stdout.write(
      `Wikimedia .lino cache is up to date (${snapshots.size} entries).\n`
    );
    return;
  }
  await writeSnapshotLino(cachePath, snapshots);
  process.stdout.write(`Wrote ${snapshots.size} entries to ${cachePath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
