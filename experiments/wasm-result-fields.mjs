import { loadWasmCore } from '../js/src/wasm-core.js';
const wasm = await loadWasmCore();
for (const input of [
  'Earth orbits the Sun',
  '1 + 1 = 2',
  'Paris is the capital of France',
  'hello world foo bar',
]) {
  try {
    const wa = wasm.analyzeStatement(input, 0);
    console.log(`\n### ${input}`);
    console.log('result keys:', Object.keys(wa.result).sort().join(', '));
    console.log(
      'has supportingEvidence:',
      Array.isArray(wa.result.supportingEvidence),
      'has refutingEvidence:',
      Array.isArray(wa.result.refutingEvidence)
    );
    console.log(
      'formalization keys:',
      Object.keys(wa.formalization).sort().join(', ')
    );
    console.log('has unknowns:', Array.isArray(wa.formalization.unknowns));
    console.log(
      'selectedInterpretation kind:',
      wa.selectedInterpretation?.kind
    );
  } catch (e) {
    console.log(`\n### ${input} -> THREW: ${e.message}`);
  }
}
