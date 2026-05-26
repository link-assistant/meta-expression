// Demonstrates the reference-alignment quality check used by the issue-96
// reference-quality CI/CD gate. For every top-2025 article it translates the
// English lead paragraph into Russian and scores the machine output against the
// human-written Russian Wikipedia lead, printing the exactly-matched Russian
// vocabulary plus precision / recall / F1. This is the offline measurement that
// backs the thresholds asserted in
// js/tests/integration/issue-96-reference-quality.test.js.
//
// Run with: node experiments/probe-issue-96.mjs
import { readFileSync } from 'node:fs';
import {
  extractFirstParagraph,
  translateTextWith,
  assessReferenceAlignment,
} from '../js/src/index.js';

function offlineFetch() {
  return Promise.resolve({
    ok: true,
    status: 200,
    json() {
      return Promise.resolve({});
    },
  });
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../js/tests/fixtures/issue-96/articles.json', import.meta.url),
    'utf8'
  )
);

const cyrillic = /[Ѐ-ӿ]+/;
let totalOverlap = 0;
let matchedArticles = 0;

for (const article of fixture.articles) {
  const paragraph = extractFirstParagraph(article.pages.en.extract);
  const human = article.pages.ru?.extract || '';
  if (!human) {
    console.log(article.enTitle, 'no ru reference');
    continue;
  }
  const result = await translateTextWith(paragraph, {
    fetch: offlineFetch,
    sourceLanguage: 'en',
    targetLanguage: 'ru',
    now: () => 0,
  });
  const alignment = assessReferenceAlignment(result.plainText, human, {
    script: cyrillic,
  });
  totalOverlap += alignment.overlap;
  if (alignment.overlap >= 1) {
    matchedArticles += 1;
  }
  console.log(
    `${article.enTitle.padEnd(28)} overlap=${alignment.overlap} ` +
      `machineCyr=${alignment.machineTokenCount} ` +
      `prec=${alignment.precision.toFixed(2)} ` +
      `recall=${alignment.recall.toFixed(3)} f1=${alignment.f1.toFixed(3)}`
  );
  console.log(`   matched: [${alignment.matched.join(', ')}]`);
}

console.log('---');
console.log('TOTAL matched cyrillic tokens:', totalOverlap);
console.log(
  'Articles with >=1 match:',
  matchedArticles,
  '/',
  fixture.articles.length
);
