import {
  parseLino,
  serializeLino,
  parseLinoEntries,
  serializeLinoEntries,
} from '../src/lino.js';

const sample = {
  entries: [
    {
      phrase: 'Genshin Impact',
      entityId: 'Q70626251',
      label: 'Genshin Impact',
      kind: 'entity',
      source: 'wikidata',
      description: '2020 action role-playing game by miHoYo',
      wikipediaUrl: 'https://en.wikipedia.org/wiki/Genshin_Impact',
      sourceUrl: 'https://www.wikidata.org/wiki/Q70626251',
      contextLabels: ['video game', 'role-playing game', 'Genshin Impact'],
    },
  ],
};

const lino = serializeLinoEntries(sample.entries);
console.log('--- serialized ---');
console.log(lino);

const parsed = parseLinoEntries(lino);
console.log('--- parsed ---');
console.log(JSON.stringify(parsed, null, 2));

console.log('--- nested round-trip ---');
const round = serializeLino(
  {
    cache: {
      key: 'abc',
      hits: 4,
      timestamp: '2026-04-29T15:00:00Z',
      payload: { phrases: [{ id: 'Q5', text: 'human' }] },
    },
  },
  { rootIdentifier: 'formalize-cache' }
);
console.log(round);
console.log(JSON.stringify(parseLino(round), null, 2));

console.log('--- unicode escape ---');
const greeting = serializeLino({ greeting: 'привет 🤖' });
console.log(greeting);
console.log(parseLino(greeting));
