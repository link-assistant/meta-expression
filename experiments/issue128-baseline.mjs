import {
  formalizeTextWith,
  translateTextWith,
  createWikipediaSource,
  createWikidataSource,
  createWiktionarySource,
} from '../js/src/index.js';

const sources = [
  createWikipediaSource({ language: 'en' }),
  createWikidataSource({ language: 'en' }),
  createWiktionarySource({ language: 'en' }),
];

const opts = { sources, linkTargetMode: 'wikipedia' };

console.log('===== FORMALIZE (en) =====');
const f = await formalizeTextWith('Hawaii is a state.', opts);
console.log('MARKDOWN:', f.markdown);
console.log('--- phrases ---');
for (const p of f.formalization?.phrases ?? f.phrases ?? []) {
  console.log(
    p.text,
    '->',
    p.entity?.id,
    p.entity?.label,
    '| candidates:',
    (p.candidates || []).map((c) => `${c.id}:${c.score}`).join(', ')
  );
}
console.log('===== TRANSLATE (en->ru) =====');
const t = await translateTextWith('Hawaii is a state.', {
  ...opts,
  targetLanguage: 'ru',
});
console.log('TRANSLATED MARKDOWN:', t.markdown);
console.log('STATUS:', t.status || t.summary);
