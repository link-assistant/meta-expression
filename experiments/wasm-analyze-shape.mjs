import { loadWasmCore } from '../js/src/wasm-core.js';
import { analyzeStatement, createStatementDraft } from '../js/src/index.js';

const wasm = await loadWasmCore();
const input = 'Earth orbits the Sun';

const wa = wasm.analyzeStatement(input, 0);
const ja = analyzeStatement(input, {
  interpretationIndex: 0,
  selectedBy: 'web',
});

console.log('=== WASM analyze top-level keys ===');
console.log(Object.keys(wa).sort().join(', '));
console.log('=== JS analyze top-level keys ===');
console.log(Object.keys(ja).sort().join(', '));

for (const k of [
  'alternatives',
  'dependencies',
  'definitions',
  'confirmations',
  'refutations',
  'opposite',
  'reasoningSteps',
  'reasoningStrategy',
  'linksNetwork',
  'formalization',
  'result',
]) {
  console.log(`\n--- ${k} ---`);
  console.log('wasm:', JSON.stringify(wa[k])?.slice(0, 200));
  console.log('js  :', JSON.stringify(ja[k])?.slice(0, 200));
}

console.log('\n=== WASM createStatementDraft keys ===');
const wd = wasm.createStatementDraft(input);
console.log(Object.keys(wd).sort().join(', '));
console.log(
  'interpretations[0]:',
  JSON.stringify(wd.interpretations?.[0])?.slice(0, 300)
);
const jd = createStatementDraft(input);
console.log(
  'js interpretations[0]:',
  JSON.stringify(jd.interpretations?.[0])?.slice(0, 300)
);
