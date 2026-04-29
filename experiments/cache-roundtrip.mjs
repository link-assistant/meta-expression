// Reproduces the formalize-cache write+read roundtrip to verify
// that payloadsAgree accepts the freshly written entry.
import { mkdtemp, rm } from 'node:fs/promises';
import { readCacheEntry, writeCacheEntry } from '../src/formalize-cache.js';

const root = await mkdtemp('cache-roundtrip-');
try {
  const payload = {
    text: 'Hawaii',
    phrases: [{ text: 'Hawaii', size: 1 }],
    markdown: '[Hawaii](url)',
    html: '<a>Hawaii</a>',
    linksNotation: '(stuff)',
    linksNetwork: { nodes: [], links: [] },
    linkTargetMode: 'wikipedia',
    _cache: { hit: 'miss' },
    interpretations: [],
  };
  const formalizeLino = '(formalize: 0)';
  await writeCacheEntry(root, 'abc123', payload, formalizeLino);
  const got = await readCacheEntry(root, 'abc123');
  if (!got) {
    console.error('FAIL: readCacheEntry returned null');
    process.exit(1);
  }
  console.log('OK', Object.keys(got.json));
  console.log('lino preview:', got.lino.slice(0, 120));
} finally {
  await rm(root, { recursive: true, force: true });
}
