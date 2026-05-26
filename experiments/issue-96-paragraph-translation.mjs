// Demonstrates the offline paragraph-translation pipeline used by the issue-96
// CI/CD gate. It loads the recorded top-2025 article fixture, translates the
// English lead paragraph of every article into each captured popular language,
// and asserts full source-side coverage with a deterministic replay.
//
// Run with: node experiments/issue-96-paragraph-translation.mjs
import { readFileSync } from 'node:fs';
import { extractFirstParagraph, translateTextWith } from '../js/src/index.js';
import {
  assertFormalizedSourceCoverage,
  assertSemanticMetaLanguageCoverage,
} from '../js/tests/helpers/translation-coverage.js';

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

let total = 0;
let failures = 0;
let maxSentences = 0;

for (const article of fixture.articles) {
  const paragraph = extractFirstParagraph(article.pages.en.extract);
  const targets = article.languages.filter((language) => language !== 'en');
  for (const target of targets) {
    total += 1;
    try {
      const result = await translateTextWith(paragraph, {
        fetch: offlineFetch,
        sourceLanguage: 'en',
        targetLanguage: target,
        now: () => 0,
      });
      assertFormalizedSourceCoverage(result, paragraph);
      assertSemanticMetaLanguageCoverage(result);
      if (result.naturalization?.type !== 'naturalization') {
        throw new Error('missing naturalization');
      }
      const replay = await translateTextWith(paragraph, {
        fetch: offlineFetch,
        sourceLanguage: 'en',
        targetLanguage: target,
        now: () => 0,
      });
      if (replay.plainText !== result.plainText) {
        throw new Error('non-deterministic rendering');
      }
      maxSentences = Math.max(maxSentences, result.sentences.length);
    } catch (error) {
      failures += 1;
      console.log(
        `FAIL ${article.enTitle} en->${target}: ${error.message.slice(0, 80)}`
      );
    }
  }
}

console.log(
  'combinations:',
  total,
  'failures:',
  failures,
  'maxSentences:',
  maxSentences
);
