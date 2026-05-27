import { analyzeStatement } from '../js/src/index.js';
import {
  ENGINES,
  engineLabel,
  getWasmCore,
  loadEnginePreference,
  overlayWasmAnalysis,
  persistEnginePreference,
} from './engine.js';

// Encapsulates the JavaScript/Rust engine selector for the analyse page: the
// engine <select>, the result-band badge, lazy WebAssembly loading, and routing
// a statement's headline analysis through the active engine.
//
// The JavaScript engine always runs (it supplies the auxiliary panels plus the
// belief/strategy effects). When "Rust (WASM)" is selected, the Rust core
// recomputes the headline fields and they overlay the JavaScript ones; any
// failure or a not-yet-loaded core gracefully falls back to JavaScript.
export function setupEngineRuntime({ translate, requestRerender }) {
  const engineSelect = document.querySelector('#engine-select');
  const engineBadge = document.querySelector('#engine-badge');

  let currentEngine = loadEnginePreference();
  let wasmCore = null;
  let wasmCoreFailed = false;
  let activeEngine = 'js';

  function refreshBadge() {
    if (engineSelect && engineSelect.value !== currentEngine) {
      engineSelect.value = currentEngine;
    }
    if (!engineBadge) {
      return;
    }
    const badgeKey = {
      wasm: 'engine.activeWasm',
      'js-fallback': 'engine.fallback',
      'js-loading': 'engine.loading',
      js: 'engine.activeJs',
    }[activeEngine];
    engineBadge.textContent = translate(badgeKey ?? 'engine.activeJs');
    engineBadge.dataset.engine = activeEngine;
  }

  async function ensureWasmCore() {
    if (wasmCore || wasmCoreFailed) {
      return;
    }
    try {
      wasmCore = await getWasmCore();
    } catch {
      wasmCoreFailed = true;
    }
    // Reflect the freshly loaded (or failed) engine state in the UI.
    refreshBadge();
    requestRerender();
  }

  // Builds the JavaScript analysis, then routes the headline through the active
  // engine. Returns a single analysis object for the analyse page to render.
  function analyze(statement, interpretationIndex, options = {}) {
    const jsAnalysis = analyzeStatement(statement, {
      interpretationIndex,
      ...options,
    });
    if (currentEngine !== 'wasm') {
      activeEngine = 'js';
      refreshBadge();
      return jsAnalysis;
    }
    if (!wasmCore) {
      activeEngine = wasmCoreFailed ? 'js-fallback' : 'js-loading';
      refreshBadge();
      return jsAnalysis;
    }
    try {
      const wasmAnalysis = wasmCore.analyzeStatement(
        statement,
        interpretationIndex
      );
      activeEngine = 'wasm';
      refreshBadge();
      return overlayWasmAnalysis(jsAnalysis, wasmAnalysis);
    } catch {
      activeEngine = 'js-fallback';
      refreshBadge();
      return jsAnalysis;
    }
  }

  if (engineSelect) {
    engineSelect.replaceChildren();
    for (const engine of ENGINES) {
      const option = document.createElement('option');
      option.value = engine;
      option.textContent = engineLabel(engine);
      if (engine === currentEngine) {
        option.selected = true;
      }
      engineSelect.append(option);
    }
    engineSelect.addEventListener('change', () => {
      currentEngine = engineSelect.value;
      persistEnginePreference(currentEngine);
      if (currentEngine === 'wasm') {
        void ensureWasmCore();
      }
      requestRerender();
    });
  }
  if (currentEngine === 'wasm') {
    void ensureWasmCore();
  }
  refreshBadge();

  return { analyze, refreshBadge };
}
