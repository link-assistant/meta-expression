import * as doubletsWebBindings from '../../node_modules/doublets-web/doublets_web_bg.js';
import {
  createDoubletValueStore,
  deserializeDoubletLinks,
} from './doublets.js';
import {
  exportPortableCaseData,
  importPortableCaseData,
} from './durable-storage.js';

const portableCaseSchema = 'meta-expression.portable-case';
const portableCaseVersion = 1;
const defaultWasmUrl = new URL(
  '../../node_modules/doublets-web/doublets_web_bg.wasm',
  import.meta.url
);

let bindingPromise = null;

export async function loadDoubletsWeb(options = {}) {
  if (!bindingPromise) {
    bindingPromise = instantiateDoubletsWeb(options.wasmUrl ?? defaultWasmUrl);
  }
  try {
    await bindingPromise;
  } catch (error) {
    bindingPromise = null;
    throw error;
  }
  return doubletsWebBindings;
}

export async function createDoubletsWebStore(options = {}) {
  const bindings = await loadDoubletsWeb(options);
  return createDoubletValueStore(createDoubletsWebLinkStore(bindings));
}

export async function encodeAsDoubletsWeb(value, options = {}) {
  const store = await createDoubletsWebStore(options);
  const rootIndex = store.storeValue(value);
  return { binary: store.serialize(), rootIndex, store };
}

export async function decodeFromDoubletsWeb(binary, rootIndex, options = {}) {
  const store = await createDoubletsWebStore(options);
  store.restore(binary);
  return store.readValue(rootIndex ?? store.size());
}

export async function savePortableCaseToDoubletsWeb(input, options = {}) {
  const portable = exportPortableCaseData(input, options);
  portable.storage = {
    ...portable.storage,
    implementation: 'doublets-web',
  };
  const { binary, rootIndex, store } = await encodeAsDoubletsWeb(
    portable,
    options
  );

  return {
    format: portableCaseSchema,
    version: portableCaseVersion,
    binary,
    rootIndex,
    linksNotation: store.toLinksNotation(),
    portable,
  };
}

export async function loadPortableCaseFromDoubletsWeb(input, options = {}) {
  const binary = input instanceof Uint8Array ? input : input?.binary;
  if (!(binary instanceof Uint8Array)) {
    throw new TypeError(
      'Portable Doublets input must include Uint8Array bytes.'
    );
  }
  const decoded = await decodeFromDoubletsWeb(
    binary,
    input?.rootIndex,
    options
  );
  return importPortableCaseData(decoded);
}

async function instantiateDoubletsWeb(wasmUrl) {
  const imports = { './doublets_web_bg.js': doubletsWebBindings };
  const response = await fetch(wasmUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to load doublets-web WASM: HTTP ${response.status}`
    );
  }
  const { instance } = await instantiateWasm(response, imports);
  doubletsWebBindings.__wbg_set_wasm(instance.exports);
  instance.exports.__wbindgen_start?.();
}

async function instantiateWasm(response, imports) {
  const contentType = response.headers.get('content-type') ?? '';
  const webAssembly = globalThis.WebAssembly;
  if (webAssembly.instantiateStreaming && contentType.includes('wasm')) {
    return webAssembly.instantiateStreaming(response, imports);
  }
  const bytes = await response.arrayBuffer();
  return webAssembly.instantiate(bytes, imports);
}

function createDoubletsWebLinkStore(bindings) {
  let links = new bindings.UnitedLinks();
  let constants = links.constants;
  let snapshot = null;

  function create(source, target) {
    const index = links.create();
    links.update(index, source >>> 0, target >>> 0);
    snapshot = null;
    return index;
  }

  function each() {
    return [...snapshotLinks().values()].filter((link) => link.index !== 0);
  }

  function get(index) {
    return snapshotLinks().get(index);
  }

  function size() {
    return links.count();
  }

  function restore(binary) {
    reset();
    const records = deserializeDoubletLinks(binary)
      .filter((link) => link.index !== 0)
      .sort((left, right) => left.index - right.index);
    for (const record of records) {
      const index = links.create();
      if (index !== record.index) {
        throw new Error(
          `doublets-web restore expected link ${record.index}, created ${index}`
        );
      }
      links.update(index, record.source >>> 0, record.target >>> 0);
    }
    snapshot = null;
  }

  function reset() {
    links = new bindings.UnitedLinks();
    constants = links.constants;
    snapshot = null;
  }

  function snapshotLinks() {
    if (snapshot) {
      return snapshot;
    }
    const next = new Map([[0, { index: 0, source: 0, target: 0 }]]);
    const continuation = constants._continue;
    links.each((link) => {
      next.set(link.id, {
        index: link.id,
        source: link.from_id,
        target: link.to_id,
      });
      return continuation;
    });
    snapshot = next;
    return snapshot;
  }

  return {
    create,
    each,
    get,
    size,
    restore,
    reset,
  };
}
