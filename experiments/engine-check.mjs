// Mock localStorage for Node
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
};

const {
  ENGINES,
  engineLabel,
  nextEngine,
  loadEnginePreference,
  persistEnginePreference,
  overlayWasmAnalysis,
  getWasmCore,
  WASM_ANALYSIS_FIELDS,
} = await import('../web/engine.js');

console.log('ENGINES:', ENGINES);
console.log('default pref:', loadEnginePreference());
persistEnginePreference('wasm');
console.log('after persist wasm:', loadEnginePreference());
console.log('labels:', engineLabel('js'), '/', engineLabel('wasm'));
console.log('nextEngine js->', nextEngine('js'), ' wasm->', nextEngine('wasm'));

// Overlay test
const js = {
  status: 'js',
  result: { value: 1 },
  alternatives: ['a'],
  opposite: 'o',
  formalization: { level: 1 },
};
const wa = {
  status: 'wasm',
  result: { value: 2 },
  formalization: { level: 3 },
  linksNetwork: { id: 'n' },
  resultLink: 'r',
  selectedInterpretation: { kind: 'k' },
};
const merged = overlayWasmAnalysis(js, wa);
console.log('overlay merged:', JSON.stringify(merged));
console.log(
  'aux preserved (alternatives, opposite):',
  merged.alternatives,
  merged.opposite
);
console.log(
  'headline from wasm (status, result.value, level):',
  merged.status,
  merged.result.value,
  merged.formalization.level
);

// Real wasm core analyze
const core = await getWasmCore();
const real = core.analyzeStatement('Earth orbits the Sun', 0);
const realMerged = overlayWasmAnalysis(
  { alternatives: ['x'], dependencies: [] },
  real
);
console.log(
  'real merged result.correctness:',
  realMerged.result.correctness,
  'level:',
  realMerged.formalization.level,
  'aux alt kept:',
  realMerged.alternatives
);
console.log('WASM_ANALYSIS_FIELDS:', WASM_ANALYSIS_FIELDS);
