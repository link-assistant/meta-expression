const defaultModuleUrl = new URL(
  '../../rust/pkg/meta_expression_core.js',
  import.meta.url
);
const defaultWasmUrl = new URL(
  '../../rust/pkg/meta_expression_core_bg.wasm',
  import.meta.url
);

let defaultCorePromise = null;

export function loadWasmCore(options = {}) {
  if (Object.keys(options).length === 0) {
    defaultCorePromise ??= loadWasmCoreInternal(options);
    return defaultCorePromise;
  }
  return loadWasmCoreInternal(options);
}

export function createWasmCore(wasmModule) {
  const module = wasmModule ?? {};
  const api = {
    createStatementDraft(input) {
      return parseJson(module.createStatementDraftJson(input));
    },
    selectInterpretation(input, interpretationIndex = 0) {
      return parseJson(
        module.selectInterpretationJson(input, interpretationIndex)
      );
    },
    formalizeStatement(input, interpretationIndex = 0) {
      return parseJson(
        module.formalizeStatementJson(input, interpretationIndex)
      );
    },
    evaluateStatement(input, interpretationIndex = 0) {
      return parseJson(
        module.evaluateStatementJson(input, interpretationIndex)
      );
    },
    analyzeStatement(input, interpretationIndex = 0) {
      return parseJson(module.analyzeStatementJson(input, interpretationIndex));
    },
    statementConfidence(input, interpretationIndex = 0) {
      return module.statementConfidence(input, interpretationIndex);
    },
    serializeLinksNotation(input, interpretationIndex = 0) {
      return module.serializeLinksNotation(input, interpretationIndex);
    },
    translateKnownSemanticText(input, sourceLanguage, targetLanguage) {
      return parseJson(
        module.translateKnownSemanticTextJson(
          input,
          sourceLanguage,
          targetLanguage
        )
      );
    },
  };

  for (const key of Object.keys(api)) {
    const exportName = `${key}${returnsJson(key) ? 'Json' : ''}`;
    if (typeof module[exportName] !== 'function') {
      throw new TypeError(`WASM core export is missing: ${exportName}`);
    }
  }

  return api;
}

async function loadWasmCoreInternal(options) {
  const wasmModule =
    options.module ??
    (await import(String(options.moduleUrl ?? defaultModuleUrl)));
  if (
    options.initialize !== false &&
    typeof wasmModule.default === 'function'
  ) {
    await wasmModule.default({
      module_or_path: await wasmInitInput(
        options.wasmBytes ?? options.wasmUrl ?? defaultWasmUrl
      ),
    });
  }
  return createWasmCore(wasmModule);
}

async function wasmInitInput(input) {
  if (isNodeRuntime() && input instanceof URL && input.protocol === 'file:') {
    const { readFile } = await import('node:fs/promises');
    return readFile(input);
  }
  return input;
}

function parseJson(value) {
  return JSON.parse(value);
}

function returnsJson(key) {
  return !['statementConfidence', 'serializeLinksNotation'].includes(key);
}

function isNodeRuntime() {
  return (
    typeof process !== 'undefined' &&
    process.versions &&
    typeof process.versions.node === 'string'
  );
}
