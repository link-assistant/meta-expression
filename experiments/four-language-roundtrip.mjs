import { translateTextWith } from '../js/src/index.js';
import {
  listDirectionalPairs,
  buildDirectionalGlossary,
} from '../js/src/semantic-lexicon.js';

const fetchStub = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json() {
      return Promise.resolve({});
    },
  });
async function tr(text, from, to) {
  const r = await translateTextWith(text, {
    fetch: fetchStub,
    sourceLanguage: from,
    targetLanguage: to,
    now: () => 0,
  });
  return { plain: r.plainText, q: r.questions.length };
}

console.log('Directional pairs in lexicon:', listDirectionalPairs());
for (const [from, to] of [
  ['en', 'ru'],
  ['en', 'hi'],
  ['en', 'zh'],
  ['ru', 'en'],
  ['hi', 'en'],
  ['zh', 'en'],
]) {
  const g = buildDirectionalGlossary(from, to);
  console.log(`glossary ${from}->${to}: ${Object.keys(g).length} entries`);
}
console.log('--- sample translations of "apple" ---');
for (const to of ['ru', 'hi', 'zh']) {
  console.log(`apple en->${to}:`, JSON.stringify(await tr('apple', 'en', to)));
}
