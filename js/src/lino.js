/**
 * Indented Links Notation (.lino) codec.
 *
 * Matches the shape used by link-foundation/lino-objects-codec and
 * link-foundation/links-notation: an identifier on the first line,
 * indented `key value` pairs underneath, and nested blocks via deeper
 * indentation. Round-trips with `parseLino` / `serializeLino` so
 * configuration, overrides, and cache entries can stay close to JSON in
 * shape while reading like links rather than punctuation noise.
 *
 * Example:
 *
 *     overrides
 *       entry
 *         phrase "Genshin Impact"
 *         entityId "Q70626251"
 *         label "Genshin Impact"
 *         kind "entity"
 *         source "wikidata"
 *
 * Lines starting with `//` (after whitespace) are treated as comments
 * and discarded by the parser. Strings are quoted; bare tokens that
 * look like numbers / true / false / null are decoded to their typed
 * value. Unicode escapes (\uXXXX, \u{XXXXX}) are supported in quoted
 * strings — mirroring the unicode-sequence handling in link-cli.
 */

import { Parser as LinksNotationParser } from 'links-notation';

const QUOTE = '"';
const officialLinksParser = new LinksNotationParser();

/**
 * Parse an indented .lino document into a JS value.
 *
 * - Top-level identifier with no children → that identifier (string).
 * - Top-level identifier with children → object/list per child shape.
 * - Multiple top-level identifiers → ordered array of parsed entries.
 *
 * @param {string} text
 * @returns {unknown}
 */
export function parseLino(text) {
  const source = stripComments(String(text ?? ''));
  if (!source.trim()) {
    return null;
  }
  if (looksLikeOfficialLinksNotation(source)) {
    const parsed = parseOfficialLinksNotation(source);
    if (parsed.ok) {
      return parsed.value;
    }
  }
  return parseLegacyLino(source);
}

function parseOfficialLinksNotation(text) {
  try {
    const links = officialLinksParser.parse(text);
    return { ok: true, value: materializeOfficialLinks(links) };
  } catch {
    return { ok: false, value: null };
  }
}

function materializeOfficialLinks(links) {
  if (!Array.isArray(links) || links.length === 0) {
    return null;
  }
  const values = links.map(materializeOfficialLink);
  return values.length === 1 ? values[0] : values;
}

function materializeOfficialLink(link) {
  const values = Array.isArray(link?.values)
    ? link.values.map(materializeOfficialLink)
    : [];
  if (link?.id !== null && link?.id !== undefined) {
    const key = String(decodeToken(link.id));
    if (values.length === 0) {
      return decodeToken(link.id);
    }
    return {
      [key]: values.length === 1 ? values[0] : values,
    };
  }
  if (values.length === 0) {
    return null;
  }
  return values.length === 1 ? values[0] : values;
}

function looksLikeOfficialLinksNotation(text) {
  return text
    .split('\n')
    .some((line) => looksLikeOfficialLinksLine(line.trim()));
}

function looksLikeOfficialLinksLine(line) {
  if (!line) {
    return false;
  }
  if (line.startsWith('(') && line.endsWith(')')) {
    return true;
  }
  return hasUnquotedColon(line);
}

function hasUnquotedColon(line) {
  let quote = null;
  let escaped = false;
  for (const char of line) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === QUOTE || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === ':') {
      return true;
    }
  }
  return false;
}

function parseLegacyLino(text) {
  const lines = text.split('\n');
  const stack = [];
  const root = { indent: -1, children: [], identifier: null, parent: null };
  stack.push(root);

  for (const rawLine of lines) {
    if (!rawLine.trim()) {
      continue;
    }
    const indent = leadingSpaces(rawLine);
    const content = rawLine.slice(indent);
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    const node = parseLineContent(content);
    node.indent = indent;
    node.children = [];
    node.parent = parent;
    parent.children.push(node);
    stack.push(node);
  }

  if (root.children.length === 0) {
    return null;
  }
  if (root.children.length === 1) {
    return materializeNode(root.children[0]);
  }
  return root.children.map(materializeNode);
}

function leadingSpaces(line) {
  let count = 0;
  while (count < line.length && line[count] === ' ') {
    count += 1;
  }
  return count;
}

function stripComments(text) {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('//')) {
        return '';
      }
      return line;
    })
    .join('\n');
}

function parseLineContent(content) {
  const tokens = tokenizeLino(content);
  if (tokens.length === 0) {
    return { identifier: null, value: null };
  }
  if (tokens.length === 1) {
    return { identifier: decodeToken(tokens[0]), value: undefined };
  }
  // identifier followed by inline value(s).
  const [identifier, ...rest] = tokens;
  if (rest.length === 1) {
    return { identifier: decodeToken(identifier), value: decodeToken(rest[0]) };
  }
  return {
    identifier: decodeToken(identifier),
    value: rest.map(decodeToken),
  };
}

/**
 * Tokenize a single .lino content line into a sequence of raw tokens.
 * Quoted strings are kept as a single token (with the quotes preserved
 * so `decodeToken` can detect them).
 *
 * @param {string} content
 * @returns {string[]}
 */
export function tokenizeLino(content) {
  const tokens = [];
  let index = 0;
  while (index < content.length) {
    const char = content[index];
    if (char === ' ' || char === '\t') {
      index += 1;
      continue;
    }
    if (char === QUOTE) {
      const { token, next } = readQuoted(content, index);
      tokens.push(token);
      index = next;
      continue;
    }
    const { token, next } = readBare(content, index);
    tokens.push(token);
    index = next;
  }
  return tokens;
}

function readQuoted(content, start) {
  let index = start + 1;
  let buffer = '';
  while (index < content.length) {
    const char = content[index];
    if (char === '\\') {
      const next = content[index + 1];
      if (next === 'u') {
        const { codePoint, length } = readUnicodeEscape(content, index + 1);
        buffer += String.fromCodePoint(codePoint);
        index += length + 1;
        continue;
      }
      buffer += unescapeSimple(next);
      index += 2;
      continue;
    }
    if (char === QUOTE) {
      return { token: `${QUOTE}${buffer}${QUOTE}`, next: index + 1 };
    }
    buffer += char;
    index += 1;
  }
  return { token: `${QUOTE}${buffer}${QUOTE}`, next: index };
}

function readUnicodeEscape(content, start) {
  // start points at the 'u'.
  if (content[start + 1] === '{') {
    let end = start + 2;
    let hex = '';
    while (end < content.length && content[end] !== '}') {
      hex += content[end];
      end += 1;
    }
    return { codePoint: parseInt(hex, 16) || 0, length: end - start + 1 };
  }
  const hex = content.slice(start + 1, start + 5);
  return { codePoint: parseInt(hex, 16) || 0, length: 5 };
}

function unescapeSimple(char) {
  switch (char) {
    case 'n':
      return '\n';
    case 't':
      return '\t';
    case 'r':
      return '\r';
    case QUOTE:
      return QUOTE;
    case '\\':
      return '\\';
    default:
      return char ?? '';
  }
}

function readBare(content, start) {
  let index = start;
  while (index < content.length) {
    const char = content[index];
    if (char === ' ' || char === '\t') {
      break;
    }
    index += 1;
  }
  return { token: content.slice(start, index), next: index };
}

/**
 * Decode a raw token into its typed value:
 *   - "quoted" → string with escapes resolved
 *   - true/false/null → booleans / null
 *   - finite numeric literals → number
 *   - everything else → bare string token (e.g. an identifier)
 *
 * @param {string} token
 * @returns {string|number|boolean|null}
 */
export function decodeToken(token) {
  if (typeof token !== 'string') {
    return token;
  }
  if (token.length >= 2 && token.startsWith(QUOTE) && token.endsWith(QUOTE)) {
    return token.slice(1, -1);
  }
  if (token === 'true') {
    return true;
  }
  if (token === 'false') {
    return false;
  }
  if (token === 'null') {
    return null;
  }
  if (token === '') {
    return '';
  }
  if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(token)) {
    const num = Number(token);
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return token;
}

function materializeNode(node) {
  if (node.children.length === 0) {
    if (node.value === undefined) {
      return node.identifier;
    }
    if (Array.isArray(node.value)) {
      return [node.identifier, ...node.value];
    }
    return { [String(node.identifier)]: node.value };
  }
  // Distinguish "list of homogeneous children" from "object with named keys".
  const childIds = node.children.map((child) => child.identifier);
  const allUniformList =
    childIds.every((id) => id === '-' || id === childIds[0]) &&
    node.children.every((child) => child.value === undefined);
  if (
    childIds.every((id) => id === '-') &&
    node.children.length > 0 &&
    childIds.length > 0
  ) {
    return node.children.map(materializeChildAsItem);
  }
  // Object form: each child becomes a key.
  const seen = new Map();
  for (const child of node.children) {
    const key = String(child.identifier);
    const value = materializeChildValue(child);
    if (seen.has(key)) {
      const previous = seen.get(key);
      seen.set(key, [
        ...(Array.isArray(previous) ? previous : [previous]),
        value,
      ]);
    } else {
      seen.set(key, value);
    }
  }
  if (node.identifier === null) {
    return Object.fromEntries(seen);
  }
  if (allUniformList) {
    return Object.fromEntries(seen);
  }
  return Object.fromEntries(seen);
}

function materializeChildAsItem(child) {
  if (child.children.length === 0) {
    return child.value === undefined ? child.identifier : child.value;
  }
  return materializeNode(child);
}

function materializeChildValue(child) {
  if (child.children.length === 0) {
    if (child.value === undefined) {
      return null;
    }
    return child.value;
  }
  return materializeNode(child);
}

/**
 * Serialize a JS value into indented .lino. Always produces deterministic
 * key ordering (insertion order is preserved, matching JSON.stringify).
 *
 * Top-level rules:
 *   - string/number/boolean/null → bare scalar line
 *   - array → list under a synthetic root (each item indented as `-`)
 *   - object → root identifier when caller passes `{ rootIdentifier }`,
 *     otherwise a flat block of `key value` lines.
 *
 * @param {unknown} value
 * @param {{ rootIdentifier?: string, indent?: number }} [options]
 * @returns {string}
 */
export function serializeLino(value, options = {}) {
  const indent = options.indent ?? 2;
  const lines = [];
  if (options.rootIdentifier) {
    lines.push(escapeIdentifier(options.rootIdentifier));
    appendValue(lines, value, indent, indent);
    return `${lines.join('\n')}\n`;
  }
  appendValue(lines, value, 0, indent);
  return `${lines.join('\n')}\n`;
}

// eslint-disable-next-line complexity
function appendValue(lines, value, currentIndent, step) {
  if (value === null || value === undefined) {
    lines.push(`${' '.repeat(currentIndent)}null`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      // empty list — emit nothing under the parent.
      return;
    }
    for (const item of value) {
      const pad = ' '.repeat(currentIndent);
      if (item === null || item === undefined) {
        lines.push(`${pad}- null`);
        continue;
      }
      if (isScalar(item)) {
        lines.push(`${pad}- ${encodeScalar(item)}`);
        continue;
      }
      lines.push(`${pad}-`);
      appendValue(lines, item, currentIndent + step, step);
    }
    return;
  }
  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      const pad = ' '.repeat(currentIndent);
      if (entry === null || entry === undefined) {
        lines.push(`${pad}${escapeIdentifier(key)} null`);
        continue;
      }
      if (isScalar(entry)) {
        lines.push(`${pad}${escapeIdentifier(key)} ${encodeScalar(entry)}`);
        continue;
      }
      if (Array.isArray(entry) && entry.length === 0) {
        lines.push(`${pad}${escapeIdentifier(key)}`);
        continue;
      }
      lines.push(`${pad}${escapeIdentifier(key)}`);
      appendValue(lines, entry, currentIndent + step, step);
    }
    return;
  }
  lines.push(`${' '.repeat(currentIndent)}${encodeScalar(value)}`);
}

function isScalar(value) {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function encodeScalar(value) {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return quoteString(String(value));
}

function quoteString(value) {
  let out = QUOTE;
  for (const char of value) {
    const code = char.codePointAt(0);
    if (char === '\\') {
      out += '\\\\';
    } else if (char === QUOTE) {
      out += '\\"';
    } else if (char === '\n') {
      out += '\\n';
    } else if (char === '\t') {
      out += '\\t';
    } else if (char === '\r') {
      out += '\\r';
    } else if (code < 0x20) {
      out += `\\u${code.toString(16).padStart(4, '0')}`;
    } else {
      out += char;
    }
  }
  out += QUOTE;
  return out;
}

function escapeIdentifier(value) {
  const str = String(value);
  if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(str)) {
    return str;
  }
  return quoteString(str);
}

/**
 * Convenience: parse an array-of-entries .lino document into a flat array.
 * Accepts both indented `entries` block and an inline list at the root.
 *
 * @param {string} text
 * @returns {unknown[]}
 */
export function parseLinoEntries(text) {
  const parsed = parseLino(text);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.entries)) {
      return parsed.entries;
    }
    // single-entry document: { entry: {...} } or already an entry object.
    if (parsed.entry) {
      return Array.isArray(parsed.entry) ? parsed.entry : [parsed.entry];
    }
    return [parsed];
  }
  return [];
}

/**
 * Convenience: serialize a list of entries as `entries:` block. Used for
 * overrides files so the document is always rooted under a stable name.
 *
 * @param {unknown[]} entries
 * @param {{ rootIdentifier?: string }} [options]
 * @returns {string}
 */
export function serializeLinoEntries(entries, options = {}) {
  const root = options.rootIdentifier ?? 'overrides';
  return serializeLino(
    { entries: Array.isArray(entries) ? entries : [] },
    {
      rootIdentifier: root,
    }
  );
}
