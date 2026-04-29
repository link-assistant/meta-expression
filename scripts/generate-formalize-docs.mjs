#!/usr/bin/env node
// Generates docs/FORMALIZE.md from JSDoc blocks in src/formalize*.js.
//
// Usage:
//   node scripts/generate-formalize-docs.mjs           # write docs/FORMALIZE.md
//   node scripts/generate-formalize-docs.mjs --check   # exit 1 if stale
//
// Parses JSDoc comments immediately preceding `export function`,
// `export async function`, `export const`, and `export {}` declarations and
// renders them as Markdown. Intentionally hand-rolled (no jsdoc dependency)
// so the build stays zero-install on a clean clone.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import prettier from 'prettier';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

const sources = [
  {
    path: 'src/formalize.js',
    title: 'Pipeline & rendering',
    summary:
      'High-level entry points (`formalizeText`, `formalizeTextWith`), tokenization, n-gram generation, and link/markdown/HTML rendering.',
  },
  {
    path: 'src/formalize-sources.js',
    title: 'Knowledge-graph sources',
    summary:
      'Pluggable resolvers for Wikidata, WordNet (Wiktionary opensearch), and Fandom wikis. `parseSourceSpec` accepts the human-readable spec used by the CLI / web UI.',
  },
  {
    path: 'src/formalize-overrides.js',
    title: 'Lazy overrides',
    summary:
      'Repository-level (`docs/formalize/overrides.lino`, JSON accepted as legacy fallback) and user-level overrides that pin a phrase to a specific entity, bypassing live lookups.',
  },
  {
    path: 'src/formalize-contexts.js',
    title: 'Big-context aggregation',
    summary:
      'Walks `instance of` / `subclass of` / `part of` chains to surface broad worlds (Math, Geography, Star Wars, Genshin Impact, …) the input touches.',
  },
  {
    path: 'src/formalize-cache.js',
    title: 'Persistent cache',
    summary:
      'Filesystem cache used by the HTTP server. Each entry is written atomically as a binary doublets blob (`payload.bin`, the same shape used by `linksplatform/doublets-rs` / `link-foundation/link-cli`) plus a Links Notation echo (`payload.lino`) for cross-validation.',
  },
  {
    path: 'src/lino.js',
    title: 'Links Notation codec',
    summary:
      'Pure JS parser/serializer for indented Links Notation (`.lino`). Used for the repository overrides file, cache echo files, and any future configuration we want to keep in link-graph form rather than JSON.',
  },
  {
    path: 'src/doublets.js',
    title: 'Doublets binary store',
    summary:
      'In-memory port of the link primitives used by `linksplatform/doublets-rs` / `link-foundation/link-cli`. Encodes arbitrary JS values as chains of `(index source target)` doublets — strings via unicode-sequence chains — and serializes the resulting graph as a flat `Uint8Array` blob ready for a future WebAssembly bridge.',
  },
];

// Match a single JSDoc block (no nested `*/`) immediately followed by an
// `export` declaration. The inner group `((?:\*(?!\/)|[^*])*)` consumes any
// character except a `*/` terminator so the regex never bridges across two
// JSDoc blocks (which would leak source code into the rendered docs).
const exportPattern =
  /\/\*\*((?:\*(?!\/)|[^*])*)\*\/\s*export\s+(?:(async)\s+)?(function|const|class)\s+([A-Za-z0-9_$]+)/g;

function readSource(path) {
  return readFile(join(repoRoot, path), 'utf8');
}

function parseJsdoc(block) {
  const lines = block
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/, '').replace(/^\s*\*\s*$/, ''));
  const description = [];
  const params = [];
  let returns = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('@param')) {
      const match = line.match(
        /^@param\s+\{([^}]+)\}\s+(\[?[A-Za-z0-9_.$]+\]?)\s*(.*)$/
      );
      if (match) {
        params.push({
          type: match[1].trim(),
          name: match[2],
          description: match[3].replace(/^[—-]\s*/, '').trim(),
        });
      }
      continue;
    }
    if (line.startsWith('@returns') || line.startsWith('@return')) {
      const match = line.match(/^@returns?\s+\{([^}]+)\}\s*(.*)$/);
      if (match) {
        returns = { type: match[1].trim(), description: match[2].trim() };
      }
      continue;
    }
    if (line.startsWith('@')) {
      continue;
    }
    description.push(line);
  }

  while (description.length && description[0].trim() === '') {
    description.shift();
  }
  while (
    description.length &&
    description[description.length - 1].trim() === ''
  ) {
    description.pop();
  }

  return { description: description.join('\n').trim(), params, returns };
}

function renderEntry(entry) {
  const lines = [];
  const topLevelParams = entry.params.filter((p) => !p.name.includes('.'));
  const signature =
    entry.kind === 'function'
      ? `${entry.name}(${topLevelParams.map((p) => p.name.replace(/[[\]]/g, '')).join(', ')})`
      : entry.name;
  lines.push(`### \`${signature}\``);
  lines.push('');
  if (entry.description) {
    lines.push(entry.description);
    lines.push('');
  }
  if (entry.params.length) {
    lines.push('| Parameter | Type | Description |');
    lines.push('| --- | --- | --- |');
    for (const param of entry.params) {
      const safeType = param.type.replace(/\|/g, '\\|');
      lines.push(
        `| \`${param.name}\` | \`${safeType}\` | ${param.description || '—'} |`
      );
    }
    lines.push('');
  }
  if (entry.returns) {
    lines.push(
      `**Returns** \`${entry.returns.type}\`${entry.returns.description ? ` — ${entry.returns.description}` : ''}`
    );
    lines.push('');
  }
  return lines.join('\n');
}

async function buildSection(source) {
  const code = await readSource(source.path);
  const entries = [];
  let match;
  exportPattern.lastIndex = 0;
  while ((match = exportPattern.exec(code))) {
    const [, jsdoc, isAsync, kind, name] = match;
    const parsed = parseJsdoc(jsdoc);
    entries.push({
      name,
      kind,
      isAsync: Boolean(isAsync),
      ...parsed,
    });
  }

  const lines = [];
  lines.push(`## ${source.title}`);
  lines.push('');
  lines.push(`Source: [\`${source.path}\`](${relative('docs', source.path)})`);
  lines.push('');
  lines.push(source.summary);
  lines.push('');
  if (!entries.length) {
    lines.push('_No documented exports found._');
    lines.push('');
    return lines.join('\n');
  }
  for (const entry of entries) {
    lines.push(renderEntry(entry));
  }
  return lines.join('\n');
}

function buildHeader() {
  return `# Formalize library reference

> Auto-generated from JSDoc blocks in \`src/formalize*.js\` by
> [\`scripts/generate-formalize-docs.mjs\`](../scripts/generate-formalize-docs.mjs).
> Run \`npm run docs:formalize\` to regenerate this file. The CI check
> \`npm run docs:formalize:check\` fails if the committed output is stale.

## Overview

\`formalize\` turns free-form text into a sequence of phrases, each anchored
to a Wikidata Q/P (or another knowledge-graph) entity. Public surface:

- **Library**: \`import { formalizeTextWith, parseSourceSpec, … } from 'meta-expression';\`
- **CLI**: \`meta-expression formalize "Barack Obama was born in Hawaii."\`
- **HTTP**: \`POST /formalize\` (see \`src/server.js\`); responses are cached on
  disk in both JSON and Links Notation form for cross-validation.
- **Web demo**: \`web/index.html\` → Formalize tab.

See [\`docs/case-studies/issue-15/analysis.md\`](case-studies/issue-15/analysis.md)
for the design rationale and acceptance examples.

`;
}

async function buildDocument() {
  const sections = await Promise.all(sources.map(buildSection));
  const raw = buildHeader() + sections.join('\n');
  return prettier.format(raw, { parser: 'markdown' });
}

async function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');
  const outputPath = join(repoRoot, 'docs/FORMALIZE.md');
  const generated = await buildDocument();

  if (checkMode) {
    let existing = '';
    try {
      existing = await readFile(outputPath, 'utf8');
    } catch {
      existing = '';
    }
    if (existing.trim() !== generated.trim()) {
      console.error(
        'docs/FORMALIZE.md is stale. Run `npm run docs:formalize` to regenerate.'
      );
      process.exit(1);
    }
    console.log('docs/FORMALIZE.md is up to date.');
    return;
  }

  await writeFile(outputPath, generated, 'utf8');
  console.log(`Wrote ${relative(repoRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
