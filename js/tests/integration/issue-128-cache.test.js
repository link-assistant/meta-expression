import { describe, expect, it } from 'test-anywhere';
import { readFile } from 'node:fs/promises';
import { formalizeTextWith } from '../../src/index.js';
import {
  SNAPSHOT_MODES,
  createSnapshotCache,
  createSnapshotFetch,
  loadSnapshotLino,
  loadSnapshotMap,
  parseSnapshotLino,
  serializeSnapshotLino,
} from '../../src/formalize-snapshots.js';

// Issue #128 (R6): the API request/response cache must live "in data folder and
// in .lino format, as we usually do", refreshed on merge to main so the quality
// gate and the web app replay offline (faster) next time. These tests pin the
// lossless round-trip, the committed cache's freshness, and that the .lino cache
// alone is enough to formalize "Hawaii is a state." without any network access.

const cacheUrl = new URL('../../data/wikimedia-cache.lino', import.meta.url);
const snapshotsDir = new URL(
  '../fixtures/wikimedia-snapshots/',
  import.meta.url
).pathname;

describe('issue 128 - Wikimedia .lino API cache', () => {
  it('round-trips nested API payloads through the .lino codec losslessly', () => {
    const original = new Map([
      [
        'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q782',
        {
          entities: {
            Q782: {
              id: 'Q782',
              labels: { en: { value: 'Hawaii' } },
              aliases: {},
              claims: { P31: [{ mainsnak: { datavalue: { value: 1 } } }] },
            },
          },
        },
      ],
      ['https://en.wiktionary.org/api/rest_v1/page/definition/the', { en: [] }],
    ]);

    const restored = parseSnapshotLino(serializeSnapshotLino(original));
    expect(restored.size).toBe(original.size);
    for (const [url, value] of original) {
      expect(restored.get(url)).toEqual(value);
    }
  });

  it('serializes deterministically regardless of insertion order', () => {
    const forward = new Map([
      ['https://example.test/a', { v: 1 }],
      ['https://example.test/b', { v: 2 }],
    ]);
    const reverse = new Map([
      ['https://example.test/b', { v: 2 }],
      ['https://example.test/a', { v: 1 }],
    ]);
    expect(serializeSnapshotLino(forward)).toBe(serializeSnapshotLino(reverse));
  });

  it('keeps the committed data-folder cache in sync with the JSON snapshots', async () => {
    const snapshots = await loadSnapshotMap(snapshotsDir);
    if (snapshots.size === 0) {
      return; // fresh checkout without recorded fixtures
    }
    const committed = await readFile(cacheUrl, 'utf8');
    expect(committed).toBe(serializeSnapshotLino(snapshots));
  });

  it('replays "Hawaii is a state." from the .lino cache alone, offline', async () => {
    const snapshots = await loadSnapshotLino(cacheUrl.pathname);
    if (snapshots.size === 0) {
      return;
    }
    const cache = createSnapshotCache(snapshots);
    const fetch = createSnapshotFetch({
      mode: SNAPSHOT_MODES.REPLAY,
      snapshots,
    });

    const result = await formalizeTextWith('Hawaii is a state.', {
      fetch,
      cache,
      maxNgramSize: 1,
      now: () => 0,
    });

    const hawaii = result.phrases.find((phrase) => phrase.text === 'Hawaii');
    expect(hawaii).toBeTruthy();
    expect(hawaii.candidates.map((candidate) => candidate.id)).toContain(
      'Q782'
    );
  });
});
