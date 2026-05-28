/**
 * Issue #126 PR follow-up: the web prototype must let users select between the
 * JavaScript engine (js/src) and the Rust core compiled to WebAssembly
 * (rust/src -> rust/pkg). This test pins the wiring (markup + app.js routing),
 * the engine module's pure helpers, and that the Rust core genuinely produces
 * the headline analysis while JavaScript-only panels survive the overlay.
 */

import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'test-anywhere';
import { analyzeStatement } from '../../src/index.js';
import { loadWasmCore } from '../../src/wasm-core.js';

const webUrl = (file) => new URL(`../../../web/${file}`, import.meta.url);

async function readWeb(file) {
  return readFile(webUrl(file), 'utf8');
}

// engine.js touches globalThis.localStorage; provide an in-memory shim so the
// module's persistence helpers can be exercised under Node.
function withMemoryStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
  return store;
}

describe('issue 126 - JS/Rust engine selector in the web UI', () => {
  it('renders a global engine selector and a result-band engine badge', async () => {
    const html = await readWeb('index.html');
    expect(html).toContain('id="engine-select"');
    expect(html).toContain('id="engine-badge"');
    expect(html).toContain('data-i18n="engine.label"');
  });

  it('wires app.js to route the analysis through the selected engine', async () => {
    const app = await readWeb('app.js');
    expect(app).toContain("from './engine-ui.js'");
    expect(app).toContain('setupEngineRuntime');
    expect(app).toContain('enginePage.analyze');
    expect(app).toContain('enginePage.refreshBadge');

    // The engine runtime module owns the JS/Rust routing and overlay.
    const engineUi = await readWeb('engine-ui.js');
    expect(engineUi).toContain("from './engine.js'");
    expect(engineUi).toContain('overlayWasmAnalysis');
    expect(engineUi).toContain('analyzeStatement');
  });

  it('routes the Compare page through the selected engine too', async () => {
    // The Compare page must honour the global engine choice "in all places",
    // so app.js injects the engine runtime's analyze() into setupComparePage.
    const app = await readWeb('app.js');
    expect(app).toContain('analyze: (statement, options) =>');
    expect(app).toContain('enginePage.analyze(statement, 0, options)');

    // compare-ui.js accepts an injectable analyze() and uses it for each claim,
    // defaulting to the JavaScript engine so it still works standalone.
    const compareUi = await readWeb('compare-ui.js');
    expect(compareUi).toContain('analyze = (statement, options) =>');
    expect(compareUi).toContain('analysis = analyze(claim, {');
  });

  it('localizes the engine controls in every shipped locale', async () => {
    const { SUPPORTED_LOCALES, translate } =
      await import('../../../web/i18n.js');
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of [
        'engine.label',
        'engine.activeJs',
        'engine.activeWasm',
        'engine.loading',
        'engine.fallback',
      ]) {
        // translate() falls back to the key itself when a string is missing.
        expect(translate(locale, key)).not.toBe(key);
      }
    }
  });

  it('exposes pure engine-preference helpers backed by storage', async () => {
    withMemoryStorage();
    const engine = await import('../../../web/engine.js');
    expect(engine.ENGINES).toEqual(['js', 'wasm']);
    expect(engine.loadEnginePreference()).toBe('js');
    engine.persistEnginePreference('wasm');
    expect(engine.loadEnginePreference()).toBe('wasm');
    engine.persistEnginePreference('not-an-engine');
    expect(engine.loadEnginePreference()).toBe('js');
    expect(engine.engineLabel('js')).toBe('JavaScript');
    expect(engine.engineLabel('wasm')).toBe('Rust (WASM)');
    expect(engine.nextEngine('js')).toBe('wasm');
    expect(engine.nextEngine('wasm')).toBe('js');
  });

  it('overlays the Rust headline onto a JS analysis without losing aux panels', async () => {
    withMemoryStorage();
    const { overlayWasmAnalysis, WASM_ANALYSIS_FIELDS } =
      await import('../../../web/engine.js');
    const jsAnalysis = {
      status: 'js-status',
      result: { value: 0.1 },
      formalization: { level: 0 },
      alternatives: ['keep me'],
      dependencies: ['keep me too'],
      opposite: 'keep this',
      reasoningSteps: [{ id: 'js-step' }],
    };
    const wasmAnalysis = {
      status: 'wasm-status',
      selectedInterpretation: { kind: 'k' },
      formalization: { level: 3 },
      result: { value: 0.74 },
      resultLink: 'result-1',
      linksNetwork: { id: 'net' },
    };
    const merged = overlayWasmAnalysis(jsAnalysis, wasmAnalysis);
    for (const field of WASM_ANALYSIS_FIELDS) {
      if (wasmAnalysis[field] !== undefined) {
        expect(merged[field]).toEqual(wasmAnalysis[field]);
      }
    }
    expect(merged.alternatives).toEqual(['keep me']);
    expect(merged.dependencies).toEqual(['keep me too']);
    expect(merged.opposite).toBe('keep this');
    expect(merged.reasoningSteps).toEqual([{ id: 'js-step' }]);
  });

  it('produces a Rust-computed headline that matches the JavaScript engine', async () => {
    withMemoryStorage();
    const { overlayWasmAnalysis } = await import('../../../web/engine.js');
    const core = await loadWasmCore();
    const statement = 'Earth orbits the Sun';
    const jsAnalysis = analyzeStatement(statement, {
      interpretationIndex: 0,
      selectedBy: 'web',
    });
    const wasmAnalysis = core.analyzeStatement(statement, 0);
    const merged = overlayWasmAnalysis(jsAnalysis, wasmAnalysis);

    // The headline now comes from Rust and stays in parity with JavaScript.
    expect(merged.status).toBe(jsAnalysis.status);
    expect(merged.formalization.level).toBe(jsAnalysis.formalization.level);
    expect(merged.result.correctness).toBe(jsAnalysis.result.correctness);
    // The JavaScript-only enrichment survives for the auxiliary UI panels.
    expect(Array.isArray(merged.alternatives)).toBe(true);
    expect(Array.isArray(merged.definitions)).toBe(true);
  });
});
