import { loadWasmCore } from '../js/src/wasm-core.js';

// Engine selection for the web prototype.
//
// The repository ships two implementations of the same formalization pipeline:
// the pure-JavaScript engine (js/src) and the Rust core compiled to WebAssembly
// (rust/src -> rust/pkg, wrapped by js/src/wasm-core.js). This module lets the
// UI pick which engine actually computes a statement's headline result, with a
// graceful fallback to JavaScript whenever the WASM core cannot be loaded or
// does not implement an operation. The selection is persisted like the theme
// and locale preferences.

const engineStorageKey = 'meta-expression.engine.v1';

export const ENGINES = Object.freeze(['js', 'wasm']);

// Fixed product/technology names; intentionally not localized.
const ENGINE_LABELS = Object.freeze({
  js: 'JavaScript',
  wasm: 'Rust (WASM)',
});

// Fields the Rust WASM core's analyzeStatement reproduces with verified parity
// against the JavaScript engine (see js/tests/integration/issue-61-wasm.test.js).
// Auxiliary panels (alternatives, dependencies, definitions, confirmations,
// refutations, opposite, reasoning steps) are JavaScript-only enrichments and
// are preserved from the JS analysis when the Rust core supplies the headline.
export const WASM_ANALYSIS_FIELDS = Object.freeze([
  'status',
  'selectedInterpretation',
  'formalization',
  'result',
  'resultLink',
  'linksNetwork',
]);

export function loadEnginePreference() {
  try {
    const stored = globalThis.localStorage?.getItem(engineStorageKey);
    if (stored && ENGINES.includes(stored)) {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return 'js';
}

export function persistEnginePreference(engine) {
  try {
    globalThis.localStorage?.setItem(engineStorageKey, engine);
  } catch {
    // ignore storage errors
  }
}

export function engineLabel(engine) {
  return ENGINE_LABELS[engine] ?? ENGINE_LABELS.js;
}

export function nextEngine(current) {
  const index = ENGINES.indexOf(current);
  return ENGINES[(index + 1) % ENGINES.length];
}

let wasmCorePromise = null;

// Lazily loads (and memoizes) the Rust WASM core. Rejects if the core cannot be
// instantiated; callers fall back to the JavaScript engine on rejection.
export function getWasmCore() {
  wasmCorePromise ??= loadWasmCore();
  return wasmCorePromise;
}

// Returns a new analysis where the Rust core's headline fields replace the
// JavaScript ones, keeping every JavaScript-only auxiliary field intact.
export function overlayWasmAnalysis(jsAnalysis, wasmAnalysis) {
  const merged = { ...jsAnalysis };
  for (const field of WASM_ANALYSIS_FIELDS) {
    if (wasmAnalysis?.[field] !== undefined) {
      merged[field] = wasmAnalysis[field];
    }
  }
  return merged;
}
