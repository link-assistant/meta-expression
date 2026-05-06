/**
 * Recorder for Wikimedia API snapshots used by the offline tests.
 *
 * Runs the formalize pipeline against the real network in OVERLAY mode
 * with a pre-existing snapshot directory. Every miss is fetched live and
 * persisted to `tests/fixtures/wikimedia-snapshots/<sha1>.json` so the
 * unit tests can replay the same payloads without hitting the network.
 *
 * Usage:
 *   node examples/record-wikimedia-snapshots.js
 *
 * The script is idempotent — re-running only fetches new endpoints.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { formalizeTextWith } from '../src/index.js';
import {
  SNAPSHOT_MODES,
  createSnapshotLayer,
} from '../src/formalize-snapshots.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(
  here,
  '..',
  'tests',
  'fixtures',
  'wikimedia-snapshots'
);

const phrases = ['Hawaii', 'formalize', 'the'];

const layer = await createSnapshotLayer({
  dir: fixturesDir,
  mode: SNAPSHOT_MODES.OVERLAY,
  fetchImpl: globalThis.fetch,
});

for (const phrase of phrases) {
  process.stdout.write(`Recording snapshots for "${phrase}"…\n`);
  const result = await formalizeTextWith(phrase, {
    fetch: layer.fetch,
    cache: layer.cache,
    maxNgramSize: Math.min(3, phrase.split(/\s+/).length),
    now: () => 0,
  });
  process.stdout.write(
    `  -> ${result.phrases.length} phrase result(s); ` +
      `snapshots on disk: ${layer.snapshots.size}\n`
  );
}

process.stdout.write(`\nWrote snapshots to ${fixturesDir}\n`);
