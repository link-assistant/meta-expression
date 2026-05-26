import { translateTextWith } from '../js/src/index.js';

const en =
  'Links Platform planned as a system, that combines simple associative memory storage (Links) and transformation execution engine (Triggers). There will be an ability to program that system dynamically, due to the fact that all algorithms will be treated as data inside the storage.';

const res = await translateTextWith(en, {
  fetch: () =>
    Promise.resolve({
      ok: true,
      status: 200,
      json() {
        return Promise.resolve({});
      },
    }),
  sourceLanguage: 'en',
  targetLanguage: 'ru',
  now: () => 0,
});
console.log('PLAIN:', res.plainText);
console.log('QUESTIONS:', res.questions.length);
