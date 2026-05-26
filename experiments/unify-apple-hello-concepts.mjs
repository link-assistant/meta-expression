// One-shot lexicon migration: collapse the directional-pair apple/hello
// concepts (lex:en:apple->hi, lex:ru:яблоко->en, ...) into two unified
// interlingua concepts keyed by a single real id that carry all four supported
// languages in both directions. This is the shape issue #96 asks for: one
// concept id (a Wikidata Q or a Wiktionary URL) mapping to per-language surface
// forms, so en/ru/hi/zh all route through the same intermediate meaning and
// every direction round-trips. Surface forms are the real ones attested by the
// live sources (Q89 labels were fetched from Wikidata; the hello forms are the
// translations already attested on en.wiktionary.org/wiki/hello).
//
// Run once, then `node scripts/build-lexicon-seed.mjs` to normalise/sort.
import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../js/data/semantic-lexicon.json', import.meta.url);
const lexicon = JSON.parse(readFileSync(path, 'utf8'));

const REMOVE = new Set([
  'lex:en:apple->hi',
  'lex:en:apple->ru',
  'lex:en:apple->zh',
  'lex:ru:яблоко->en',
  'lex:en:hello->hi',
  'lex:en:hello->ru',
  'lex:en:hello->zh',
  'lex:ru:привет->en',
]);

const unified = [
  {
    id: 'Q89',
    url: 'https://www.wikidata.org/wiki/Q89',
    entityId: 'Q89',
    source: 'wikidata',
    description: 'apple — fruit of the apple tree',
    labels: {
      en: ['apple'],
      ru: ['яблоко'],
      hi: ['सेब'],
      zh: ['苹果'],
    },
    primary: { en: 'apple', ru: 'яблоко', hi: 'सेब', zh: '苹果' },
  },
  {
    id: 'wikt:en:hello',
    url: 'https://en.wiktionary.org/wiki/hello',
    source: 'wiktionary',
    description: 'hello — a greeting',
    labels: {
      en: ['hello'],
      ru: ['привет'],
      hi: ['नमस्ते'],
      zh: ['你好'],
    },
    primary: { en: 'hello', ru: 'привет', hi: 'नमस्ते', zh: '你好' },
  },
];

const kept = lexicon.concepts.filter((concept) => !REMOVE.has(concept.id));
const removed = lexicon.concepts.length - kept.length;
lexicon.concepts = [...kept, ...unified];

writeFileSync(path, `${JSON.stringify(lexicon, null, 2)}\n`, 'utf8');
console.log(
  `Removed ${removed} directional concepts, added ${unified.length} unified concepts.`
);
