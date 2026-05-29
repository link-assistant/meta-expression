import { serializeLino, parseLinoEntries } from '../js/src/lino.js';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dir = 'js/tests/fixtures/wikimedia-snapshots';
const names = (await readdir(dir)).filter((n) => n.endsWith('.json'));
const entries = [];
for (const name of names) {
  const parsed = JSON.parse(await readFile(join(dir, name), 'utf8'));
  if (!parsed?.url) {
    continue;
  }
  entries.push({
    url: parsed.url,
    recordedAt: parsed.recordedAt ?? '',
    response: JSON.stringify(parsed.value),
  });
}
console.log('entries:', entries.length);
const text = serializeLino({ entries }, { rootIdentifier: 'cache' });
console.log('serialized bytes:', text.length);
const back = parseLinoEntries(text);
console.log('parsed entries:', back.length);
let ok = 0,
  bad = 0;
for (const e of entries) {
  const match = back.find((b) => b.url === e.url);
  if (!match) {
    bad++;
    console.log('MISSING url', e.url);
    continue;
  }
  if (match.response !== e.response) {
    // compare structurally
    const a = JSON.stringify(JSON.parse(match.response));
    const b = JSON.stringify(JSON.parse(e.response));
    if (a !== b) {
      bad++;
      console.log('MISMATCH', e.url.slice(0, 60));
    } else {
      ok++;
    }
  } else {
    ok++;
  }
}
console.log('ok:', ok, 'bad:', bad);
