import { describe, expect, it } from 'test-anywhere';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Architecture guard for issue #96 / PR #107.
//
// The project must never embed a direct source<->target translation dictionary
// in `js/src`. Every lexical translation is routed through the semantic
// interlingua: a source surface form is mapped to a language-neutral concept id
// and the target form is derived from `js/data/semantic-lexicon.json` at
// runtime. These tests fail loudly the moment code starts hardcoding foreign
// surface forms again, which is exactly how the old translation-strategies
// dictionaries crept in.

const srcDir = fileURLToPath(new URL('../../src/', import.meta.url));

// Unicode blocks for the non-Latin scripts the project translates. A direct
// en<->ru / en<->hi / en<->zh translation table cannot exist without embedding
// letters from one of these blocks, so their absence (outside comments) proves
// no such table lives in the source. Ranges are numeric so this guard file
// stays ASCII-only and never trips the very rule it enforces.
const NON_LATIN_RANGES = [
  [0x0400, 0x04ff], // Cyrillic
  [0x0900, 0x097f], // Devanagari
  [0x3040, 0x30ff], // Hiragana + Katakana
  [0x4e00, 0x9fff], // CJK unified ideographs
  [0xac00, 0xd7af], // Hangul syllables
];

function hasNonLatinLetter(text) {
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    for (const [start, end] of NON_LATIN_RANGES) {
      if (codePoint >= start && codePoint <= end) {
        return true;
      }
    }
  }
  return false;
}

// Files that legitimately contain non-Latin characters for reasons other than a
// translation table. Each entry must justify *why* the characters are not a
// source->target dictionary. Adding a new file here demands the same scrutiny:
// stopword lists, language-name aliases, and prompt grammars are fine; a word
// pair such as `'apple' -> '<russian word>'` is not.
const NON_LATIN_ALLOWLIST = new Map([
  [
    'formal-ai-prompts.js',
    'Maps non-Latin language *names* (e.g. the Russian/Hindi/Chinese words for "English") to ISO codes and parses non-Latin translation-prompt grammar. It is a prompt parser, not a source->target translation table.',
  ],
  [
    'formalize.js',
    'Russian stopword list used to tokenize formalized source text. Stopwords are filtered out, never translated.',
  ],
  [
    'translation-quality.js',
    'Bilingual stopword set used to score cross-language translation quality. Stopwords are not translations.',
  ],
]);

/**
 * Remove comments while preserving line numbers so violation reports stay
 * accurate. Block comments collapse to spaces (keeping their newlines); line
 * comments are dropped, but a `//` preceded by `:` (e.g. inside `https://`) is
 * left intact so URLs in string literals are not mistaken for comments.
 */
function stripComments(source) {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    match.replace(/[^\n]/g, ' ')
  );
  return withoutBlocks
    .split('\n')
    .map((line) => line.replace(/^\/\/.*$/, '').replace(/([^:])\/\/.*$/, '$1'))
    .join('\n');
}

function listSourceFiles() {
  return readdirSync(srcDir)
    .filter((name) => name.endsWith('.js'))
    .sort();
}

function nonLatinLines(source) {
  const offenders = [];
  stripComments(source)
    .split('\n')
    .forEach((line, index) => {
      if (hasNonLatinLetter(line)) {
        offenders.push({ line: index + 1, text: line.trim() });
      }
    });
  return offenders;
}

describe('issue 96 - no hardcoded translations in js/src', () => {
  it('keeps the lexical translation pipeline free of foreign surface forms', () => {
    const violations = [];
    for (const name of listSourceFiles()) {
      const source = readFileSync(`${srcDir}${name}`, 'utf8');
      const offenders = nonLatinLines(source);
      if (offenders.length === 0) {
        continue;
      }
      if (!NON_LATIN_ALLOWLIST.has(name)) {
        violations.push(
          `${name}: ${offenders.length} line(s) with non-Latin letters outside comments, e.g. ${offenders[0].line}: ${offenders[0].text}`
        );
      }
    }
    expect(violations).toEqual([]);
  });

  it('only allowlists files with a documented non-translation reason', () => {
    // Every allowlisted file must still exist and actually contain non-Latin
    // characters; stale allowlist entries are removed so the guard cannot rot.
    for (const [name, reason] of NON_LATIN_ALLOWLIST) {
      const source = readFileSync(`${srcDir}${name}`, 'utf8');
      expect(reason.length).toBeGreaterThan(20);
      expect(nonLatinLines(source).length).toBeGreaterThan(0);
    }
  });

  it('routes every lexicon read through the single interlingua module', () => {
    const readers = listSourceFiles().filter((name) =>
      readFileSync(`${srcDir}${name}`, 'utf8').includes('semantic-lexicon.json')
    );
    // The interlingua data file is the directional glossary. If any other source
    // file reads it directly, the single-source-of-truth invariant is broken and
    // ad-hoc translation tables can reappear.
    expect(readers).toEqual(['semantic-lexicon.js']);
  });

  it('builds the directional glossary only through the interlingua module', () => {
    const importers = listSourceFiles().filter((name) => {
      if (name === 'semantic-lexicon.js') {
        return false;
      }
      return readFileSync(`${srcDir}${name}`, 'utf8').includes(
        'buildDirectionalGlossary'
      );
    });
    // `buildDirectionalGlossary` is the only sanctioned way to turn the
    // interlingua into a source->target map, and only the strategy layer may use
    // it. A second importer would mean another component is assembling its own
    // glossary instead of deriving it from concept ids.
    expect(importers).toEqual(['translation-strategies.js']);
  });
});
