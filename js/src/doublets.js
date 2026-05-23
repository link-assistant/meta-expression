/**
 * Doublets binary store — JS port of the link primitives used by
 * linksplatform/doublets-rs and link-foundation/link-cli, exposed as
 * the canonical binary backend for caching and configuration.
 *
 * A doublet is the smallest associative unit:
 *
 *     index  source  target
 *
 * `0` is reserved as the null link. Strings and arbitrary scalars are
 * indexed via a unicode-sequence table where each character (full
 * codepoint) becomes a leaf link, and longer strings are encoded as a
 * chain of doublets — exactly the technique link-cli uses to store
 * arbitrary text as link data.
 *
 * The store is small and self-contained on purpose so it can drop
 * straight into a WebAssembly bridge later: every operation works on a
 * flat `Uint32Array` view and can be persisted as a single binary blob
 * (`serializeDoublets`) plus a links-notation echo (`toLinksNotation`).
 */

const NULL_LINK = 0;
const STRING_TAG = 0x10000000; // marks "this index is a unicode-sequence root".
const NUMBER_TAG = 0x20000000;
const BOOL_TAG = 0x30000000;
const ARRAY_TAG = 0x40000000;
const OBJECT_TAG = 0x50000000;

/**
 * @typedef {{ index: number, source: number, target: number }} Doublet
 */

/**
 * Create an in-memory doublet store. The same shape would be backed by
 * a memory-mapped Uint32Array under doublets-rs / wasm.
 *
 * @returns {{
 *   create: (source: number, target: number) => number,
 *   each: () => Doublet[],
 *   size: () => number,
 *   storeString: (value: string) => number,
 *   readString: (rootIndex: number) => string,
 *   storeValue: (value: unknown) => number,
 *   readValue: (rootIndex: number) => unknown,
 *   serialize: () => Uint8Array,
 *   restore: (binary: Uint8Array) => void,
 *   toLinksNotation: () => string,
 *   reset: () => void,
 * }}
 */
// eslint-disable-next-line max-lines-per-function
export function createDoubletStore() {
  /** @type {Doublet[]} */
  let links = [{ index: NULL_LINK, source: NULL_LINK, target: NULL_LINK }];
  /** @type {Map<string, number>} */
  let stringIndex = new Map();

  function create(source, target) {
    const index = links.length;
    links.push({ index, source, target });
    return index;
  }

  function each() {
    return links.slice(1);
  }

  function size() {
    return links.length - 1;
  }

  function storeCodePoint(codePoint) {
    return create(STRING_TAG, codePoint);
  }

  function storeString(value) {
    const text = String(value ?? '');
    if (stringIndex.has(text)) {
      return stringIndex.get(text);
    }
    if (text.length === 0) {
      const empty = create(STRING_TAG, NULL_LINK);
      stringIndex.set(text, empty);
      return empty;
    }
    let head = NULL_LINK;
    for (const char of text) {
      const code = char.codePointAt(0) ?? 0;
      const point = storeCodePoint(code);
      head = create(head, point);
    }
    const root = create(STRING_TAG, head);
    stringIndex.set(text, root);
    return root;
  }

  function readString(rootIndex) {
    const root = links[rootIndex];
    if (!root || root.source !== STRING_TAG) {
      return '';
    }
    const codes = [];
    let cursor = root.target;
    while (cursor !== NULL_LINK) {
      const link = links[cursor];
      if (!link) {
        break;
      }
      const point = links[link.target];
      if (!point || point.source !== STRING_TAG) {
        break;
      }
      codes.unshift(point.target);
      cursor = link.source;
    }
    return String.fromCodePoint(...codes);
  }

  function storeValue(value) {
    if (value === null || value === undefined) {
      return create(NULL_LINK, NULL_LINK);
    }
    if (typeof value === 'boolean') {
      return create(BOOL_TAG, value ? 1 : 0);
    }
    if (typeof value === 'number') {
      // Encode as IEEE-754 bits split into two uint32 raw payloads. We
      // create three doublets: hi-half, lo-half, header. The header is
      // tagged with NUMBER_TAG so readValue knows how to decode it.
      const view = new DataView(new ArrayBuffer(8));
      view.setFloat64(0, value, true);
      const lo = view.getUint32(0, true);
      const hi = view.getUint32(4, true);
      const hiLink = create(NULL_LINK, hi);
      const loLink = create(hiLink, lo);
      return create(NUMBER_TAG, loLink);
    }
    if (typeof value === 'string') {
      return storeString(value);
    }
    if (Array.isArray(value)) {
      let head = NULL_LINK;
      for (const item of value) {
        const child = storeValue(item);
        head = create(head, child);
      }
      return create(ARRAY_TAG, head);
    }
    if (typeof value === 'object') {
      let head = NULL_LINK;
      for (const [key, entry] of Object.entries(value)) {
        const keyIndex = storeString(key);
        const valueIndex = storeValue(entry);
        const pair = create(keyIndex, valueIndex);
        head = create(head, pair);
      }
      return create(OBJECT_TAG, head);
    }
    return create(NULL_LINK, NULL_LINK);
  }

  // eslint-disable-next-line complexity
  function readValue(rootIndex) {
    const root = links[rootIndex];
    if (!root) {
      return null;
    }
    if (root.source === NULL_LINK && root.target === NULL_LINK) {
      return null;
    }
    if (root.source === STRING_TAG) {
      return readString(rootIndex);
    }
    if (root.source === BOOL_TAG) {
      return root.target === 1;
    }
    if (root.source === ARRAY_TAG) {
      const items = [];
      let cursor = root.target;
      while (cursor !== NULL_LINK) {
        const link = links[cursor];
        if (!link) {
          break;
        }
        items.unshift(readValue(link.target));
        cursor = link.source;
      }
      return items;
    }
    if (root.source === OBJECT_TAG) {
      const out = {};
      const entries = [];
      let cursor = root.target;
      while (cursor !== NULL_LINK) {
        const link = links[cursor];
        if (!link) {
          break;
        }
        const pair = links[link.target];
        if (!pair) {
          break;
        }
        const key = readString(pair.source);
        const value = readValue(pair.target);
        entries.unshift([key, value]);
        cursor = link.source;
      }
      for (const [key, value] of entries) {
        out[key] = value;
      }
      return out;
    }
    if (root.source === NUMBER_TAG) {
      const loLink = links[root.target];
      if (!loLink) {
        return 0;
      }
      const hiLink = links[loLink.source];
      const lo = loLink.target >>> 0;
      const hi = hiLink ? hiLink.target >>> 0 : 0;
      const view = new DataView(new ArrayBuffer(8));
      view.setUint32(0, lo, true);
      view.setUint32(4, hi, true);
      return view.getFloat64(0, true);
    }
    return null;
  }

  function serialize() {
    const buffer = new ArrayBuffer(links.length * 12);
    const view = new DataView(buffer);
    for (let i = 0; i < links.length; i += 1) {
      const link = links[i];
      view.setUint32(i * 12, link.index >>> 0, true);
      view.setUint32(i * 12 + 4, link.source >>> 0, true);
      view.setUint32(i * 12 + 8, link.target >>> 0, true);
    }
    return new Uint8Array(buffer);
  }

  function restore(binary) {
    const buffer =
      binary.buffer.byteLength === binary.byteLength
        ? binary.buffer
        : binary.slice().buffer;
    const view = new DataView(buffer);
    const total = Math.floor(view.byteLength / 12);
    links = [];
    stringIndex = new Map();
    for (let i = 0; i < total; i += 1) {
      links.push({
        index: view.getUint32(i * 12, true),
        source: view.getUint32(i * 12 + 4, true),
        target: view.getUint32(i * 12 + 8, true),
      });
    }
    if (links.length === 0) {
      links.push({ index: NULL_LINK, source: NULL_LINK, target: NULL_LINK });
    }
  }

  function toLinksNotation() {
    const lines = [`(doublets: ${links.length - 1})`];
    for (let i = 1; i < links.length; i += 1) {
      const link = links[i];
      lines.push(`(${link.index}: ${link.source} ${link.target})`);
    }
    return lines.join('\n');
  }

  function reset() {
    links = [{ index: NULL_LINK, source: NULL_LINK, target: NULL_LINK }];
    stringIndex = new Map();
  }

  return {
    create,
    each,
    size,
    storeString,
    readString,
    storeValue,
    readValue,
    serialize,
    restore,
    toLinksNotation,
    reset,
  };
}

/**
 * Encode a JS value into a binary doublets blob. Convenience wrapper for
 * cache writers that just want round-trippable bytes.
 *
 * @param {unknown} value
 * @returns {{ binary: Uint8Array, rootIndex: number, store: ReturnType<typeof createDoubletStore> }}
 */
export function encodeAsDoublets(value) {
  const store = createDoubletStore();
  const rootIndex = store.storeValue(value);
  return { binary: store.serialize(), rootIndex, store };
}

/**
 * Decode a binary doublets blob produced by `encodeAsDoublets` back to a JS
 * value. The root index defaults to the last created link, matching how
 * `encodeAsDoublets` returns it.
 *
 * @param {Uint8Array} binary
 * @param {number} [rootIndex]
 * @returns {unknown}
 */
export function decodeFromDoublets(binary, rootIndex) {
  const store = createDoubletStore();
  store.restore(binary);
  const total = store.size();
  return store.readValue(rootIndex ?? total);
}

export const DOUBLET_TAGS = Object.freeze({
  NULL: NULL_LINK,
  STRING: STRING_TAG,
  NUMBER: NUMBER_TAG,
  BOOL: BOOL_TAG,
  ARRAY: ARRAY_TAG,
  OBJECT: OBJECT_TAG,
});
