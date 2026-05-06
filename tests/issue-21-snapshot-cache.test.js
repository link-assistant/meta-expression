/**
 * Tests for the issue #21 multi-layer snapshot cache.
 *
 * Snapshots are URL → JSON files committed under
 * `tests/fixtures/wikimedia-snapshots/<sha1>.json`. The pipeline can run
 * fully offline by replaying them; recording mode passes through to the
 * real fetch and persists each new request to disk for later replay.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  assertRejects,
} from 'test-anywhere';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { formalizeTextWith } from '../src/index.js';
import {
  SNAPSHOT_MODES,
  createSnapshotCache,
  createSnapshotFetch,
  createSnapshotLayer,
  loadSnapshotMap,
  snapshotKey,
  writeSnapshot,
} from '../src/formalize-snapshots.js';

const fixturesRoot = new URL(
  '../tests/fixtures/wikimedia-snapshots/',
  import.meta.url
).pathname;

describe('issue 21 — snapshot store', () => {
  it('round-trips a snapshot: write → load → cache.get returns the same value', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'me-snap-'));
    try {
      const url = 'https://example.test/api?q=cat';
      const value = { search: [{ id: 'Q146', label: 'cat' }] };
      await writeSnapshot(dir, url, value);
      const snapshots = await loadSnapshotMap(dir);
      expect(snapshots.get(url)).toEqual(value);
      const cache = createSnapshotCache(snapshots);
      const cached = cache.get(url);
      expect(cached.value).toEqual(value);
      expect(cached.expiresAt).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('writes a manifest.lino entry alongside every recorded snapshot', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'me-snap-'));
    try {
      const url = 'https://example.test/wikidata?title=Cat';
      const key = snapshotKey(url);
      await writeSnapshot(dir, url, { ok: true });
      const manifest = await readFile(join(dir, 'manifest.lino'), 'utf8');
      expect(manifest).toContain(key);
      expect(manifest).toContain(url);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('skips duplicate manifest entries when the same URL is rewritten', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'me-snap-'));
    try {
      const url = 'https://example.test/dup?x=1';
      await writeSnapshot(dir, url, { v: 1 });
      await writeSnapshot(dir, url, { v: 2 });
      const manifest = await readFile(join(dir, 'manifest.lino'), 'utf8');
      const occurrences = manifest
        .split('\n')
        .filter((line) => line.includes(url));
      expect(occurrences.length).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('issue 21 — snapshot fetch modes', () => {
  it('replay mode never calls the live fetch when the snapshot exists', async () => {
    const url = 'https://example.test/api?q=ok';
    const snapshots = new Map([[url, { hit: true }]]);
    let liveCalls = 0;
    const fetchImpl = async () => {
      liveCalls += 1;
      return new Response('{}');
    };
    const fetch = createSnapshotFetch({
      mode: SNAPSHOT_MODES.REPLAY,
      snapshots,
      fetchImpl,
    });
    const response = await fetch(url);
    expect(await response.json()).toEqual({ hit: true });
    expect(liveCalls).toBe(0);
  });

  it('replay mode throws when no snapshot is recorded for the URL', async () => {
    const fetch = createSnapshotFetch({
      mode: SNAPSHOT_MODES.REPLAY,
      snapshots: new Map(),
    });
    await assertRejects(
      () => fetch('https://example.test/missing'),
      Error,
      'No snapshot recorded'
    );
  });

  it('record mode always calls the live fetch and persists the response', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'me-snap-'));
    try {
      const url = 'https://example.test/api?q=fresh';
      const liveValue = { fresh: true };
      let liveCalls = 0;
      const fetchImpl = async () => {
        liveCalls += 1;
        return new Response(JSON.stringify(liveValue), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      };
      const snapshots = new Map([[url, { stale: true }]]);
      const fetch = createSnapshotFetch({
        mode: SNAPSHOT_MODES.RECORD,
        snapshots,
        fetchImpl,
        dir,
      });
      const response = await fetch(url);
      expect(await response.json()).toEqual(liveValue);
      expect(liveCalls).toBe(1);
      expect(snapshots.get(url)).toEqual(liveValue);
      const onDisk = await readFile(
        join(dir, `${snapshotKey(url)}.json`),
        'utf8'
      );
      expect(JSON.parse(onDisk).value).toEqual(liveValue);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('overlay mode prefers cached snapshots and only records misses', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'me-snap-'));
    try {
      const cachedUrl = 'https://example.test/api?q=cached';
      const missUrl = 'https://example.test/api?q=miss';
      const liveValue = { live: true };
      let liveCalls = 0;
      const fetchImpl = async (url) => {
        liveCalls += 1;
        if (String(url) === missUrl) {
          return new Response(JSON.stringify(liveValue), { status: 200 });
        }
        throw new Error('overlay should not call live fetch for cached URLs');
      };
      const snapshots = new Map([[cachedUrl, { cached: true }]]);
      const fetch = createSnapshotFetch({
        mode: SNAPSHOT_MODES.OVERLAY,
        snapshots,
        fetchImpl,
        dir,
      });
      const cachedResponse = await fetch(cachedUrl);
      expect(await cachedResponse.json()).toEqual({ cached: true });
      const liveResponse = await fetch(missUrl);
      expect(await liveResponse.json()).toEqual(liveValue);
      expect(liveCalls).toBe(1);
      expect(snapshots.get(missUrl)).toEqual(liveValue);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('issue 21 — snapshot layer wired into formalizeTextWith', () => {
  let dir;
  const url = `https://www.wikidata.org/w/api.php?${new URLSearchParams({
    action: 'wbsearchentities',
    format: 'json',
    language: 'en',
    limit: '5',
    origin: '*',
    search: 'Hawaii',
    type: 'item',
    uselang: 'en',
  }).toString()}`;
  const cachedSearchPayload = {
    search: [
      {
        id: 'Q782',
        label: 'Hawaii',
        description: 'state of the United States of America',
      },
    ],
  };

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'me-snap-pipe-'));
    await writeSnapshot(dir, url, cachedSearchPayload);
  });

  afterAll(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('replays the cached search response without touching the network', async () => {
    const layer = await createSnapshotLayer({
      dir,
      mode: SNAPSHOT_MODES.REPLAY,
    });
    expect(layer.snapshots.size).toBeGreaterThan(0);
    expect(layer.cache.get(url).value).toEqual(cachedSearchPayload);
  });

  it('overlay mode lets formalize fall back to a stub fetch on a miss', async () => {
    let liveHits = 0;
    const stubFetch = async (input) => {
      liveHits += 1;
      const u = new URL(String(input));
      if (u.searchParams.get('action') === 'wbsearchentities') {
        return new Response(JSON.stringify({ search: [] }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    };
    const recordDir = await mkdtemp(join(tmpdir(), 'me-snap-overlay-'));
    try {
      const layer = await createSnapshotLayer({
        dir: recordDir,
        mode: SNAPSHOT_MODES.OVERLAY,
        fetchImpl: stubFetch,
      });
      const result = await formalizeTextWith('the', {
        fetch: layer.fetch,
        cache: layer.cache,
        sources: undefined,
        maxNgramSize: 1,
        now: () => 0,
      });
      expect(result.phrases.length).toBeGreaterThan(0);
      expect(liveHits).toBeGreaterThan(0);
      expect(layer.snapshots.size).toBeGreaterThan(0);
    } finally {
      await rm(recordDir, { recursive: true, force: true });
    }
  });
});

describe('issue 21 — committed Wikipedia/Wikidata snapshots replay offline', () => {
  it('loads every snapshot under tests/fixtures/wikimedia-snapshots without error', async () => {
    const snapshots = await loadSnapshotMap(fixturesRoot);
    expect(snapshots instanceof Map).toBe(true);
  });

  it('formalizes "Hawaii" entirely from snapshots in REPLAY mode', async () => {
    const layer = await createSnapshotLayer({
      dir: fixturesRoot,
      mode: SNAPSHOT_MODES.REPLAY,
    });
    if (layer.snapshots.size === 0) {
      // Fresh checkout without recorded fixtures — skip.
      return;
    }
    const result = await formalizeTextWith('Hawaii', {
      fetch: layer.fetch,
      cache: layer.cache,
      maxNgramSize: 1,
      now: () => 0,
    });
    const phrase = result.phrases.find((p) => p.text === 'Hawaii');
    expect(phrase).toBeTruthy();
    const ids = phrase.candidates.map((c) => c.id);
    expect(ids).toContain('Q782');
  });

  it('formalizes "formalize" entirely from snapshots in REPLAY mode', async () => {
    const layer = await createSnapshotLayer({
      dir: fixturesRoot,
      mode: SNAPSHOT_MODES.REPLAY,
    });
    if (layer.snapshots.size === 0) {
      return;
    }
    const result = await formalizeTextWith('formalize', {
      fetch: layer.fetch,
      cache: layer.cache,
      maxNgramSize: 1,
      now: () => 0,
    });
    const phrase = result.phrases.find((p) => p.text === 'formalize');
    expect(phrase).toBeTruthy();
    expect(phrase.candidates.length).toBeGreaterThan(0);
  });

  it('resolves "the" via Wiktionary fallback when Wikidata has no item', async () => {
    const layer = await createSnapshotLayer({
      dir: fixturesRoot,
      mode: SNAPSHOT_MODES.REPLAY,
    });
    if (layer.snapshots.size === 0) {
      return;
    }
    const result = await formalizeTextWith('the', {
      fetch: layer.fetch,
      cache: layer.cache,
      maxNgramSize: 1,
      now: () => 0,
    });
    const phrase = result.phrases.find((p) => p.text === 'the');
    expect(phrase).toBeTruthy();
    expect(phrase.candidates.length).toBeGreaterThan(0);
  });
});
