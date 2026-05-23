import { readFile } from 'node:fs/promises';
import { translateTextWith } from '../src/translate.js';
import { extractFirstStatement } from '../src/translation-quality.js';

const data = JSON.parse(
  await readFile(
    new URL('../tests/fixtures/issue-43/articles.json', import.meta.url),
    'utf8'
  )
);

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    json() {
      return Promise.resolve({});
    },
  });
}

for (const article of data.articles) {
  const languages = article.languages;
  const [source, target] = languages;
  const sourceExtract = article.pages[source]?.extract ?? '';
  const targetExtract = article.pages[target]?.extract ?? '';
  const sentence = extractFirstStatement(sourceExtract);
  if (!sentence) {
    console.log(`-- ${article.enTitle}: no statement`);
    continue;
  }
  console.log(`\n=== ${article.enTitle} (${source} → ${target}) ===`);
  console.log(`SRC:  ${sentence}`);
  let translated;
  try {
    translated = await translateTextWith(sentence, {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: source,
      targetLanguage: target,
      now: () => 0,
    });
  } catch (error) {
    console.log(`ERR: ${error.message}`);
    continue;
  }
  console.log(`OUT:  ${translated.plainText}`);
  const targetFirst = extractFirstStatement(targetExtract);
  console.log(`TGT:  ${targetFirst}`);
}
