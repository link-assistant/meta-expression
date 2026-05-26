// Extract exact reference-translation strings from rust/src so they can be
// moved verbatim into rust/data/reference-translations.json. Byte-fidelity is
// guaranteed because we parse the existing Rust literals directly.
import { readFileSync, writeFileSync } from 'node:fs';

const issue52 = readFileSync(
  new URL('../rust/src/issue52.rs', import.meta.url),
  'utf8'
);
const lib = readFileSync(
  new URL('../rust/src/lib.rs', import.meta.url),
  'utf8'
);

function concatConst(src, name) {
  const re = new RegExp(`const ${name}: &str = concat!\\(([\\s\\S]*?)\\);`);
  const body = src.match(re)[1];
  const parts = [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  return parts.join('');
}

function phraseBlock(src, name) {
  const re = new RegExp(
    `const ${name}: &\\[PhraseMapping\\] = &\\[([\\s\\S]*?)\\n\\];`
  );
  const body = src.match(re)[1];
  const phrases = [
    ...body.matchAll(
      /phrase\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,?\s*\)/g
    ),
  ].map((m) => ({ source: m[1], target: m[2], meaningId: m[3] }));
  return phrases;
}

function stopwords(src) {
  const re = /let stopwords: &\[&str\] = &\[([\s\S]*?)\];/;
  const body = src.match(re)[1];
  return [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
}

const data = {
  description:
    'Curated offline translation fixtures and linguistic metadata for the Rust engine. These are case-study reference data (issues #35 and #52) and stopword/grammar metadata, kept out of rust/src so the Rust source carries no hardcoded source<->target translation literals. Mirrors the policy enforced for js/src.',
  matchStopwords: stopwords(lib),
  examplesGenitiveTriggerRu: 'примеры',
  issue35: {
    hawaii: 'Гавайи',
    state: 'штат',
    copula: 'это',
    ruSourceKey: 'гавайи это штат',
  },
  issue52: {
    russianText: concatConst(issue52, 'ISSUE52_RUSSIAN_TEXT'),
    englishRoundTripText: concatConst(
      issue52,
      'ISSUE52_ENGLISH_ROUND_TRIP_TEXT'
    ),
    enRuPhrases: phraseBlock(issue52, 'EN_RU_PHRASES'),
    ruEnPhrases: phraseBlock(issue52, 'RU_EN_PHRASES'),
  },
};

const out = new URL(
  '../rust/data/reference-translations.json',
  import.meta.url
);
writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log('stopwords:', data.matchStopwords.length);
console.log(
  'enRuPhrases:',
  data.issue52.enRuPhrases.length,
  'ruEnPhrases:',
  data.issue52.ruEnPhrases.length
);
console.log('russianText.length:', data.issue52.russianText.length);
console.log('roundTrip.length:', data.issue52.englishRoundTripText.length);
