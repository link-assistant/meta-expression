#!/usr/bin/env node

/**
 * Maintenance tool for the semantic interlingua lexicon used as the
 * source-backed fallback in `js/src/translation-strategies.js`.
 *
 * The project must not store direct language-pair dictionaries (for example a
 * literal `en -> ru` map) inside `js/src`. Instead every lexical meaning is a
 * concept with a unique id (Wikidata Q, Wiktionary or Wikipedia URL) and a set
 * of per-language surface forms. Directional lookups (en->ru, ru->en, ...) are
 * derived at runtime by routing through those ids, never stored directly.
 *
 * `js/data/semantic-lexicon.json` is the canonical, version-controlled source
 * of that interlingua. This script normalises it: it refuses ad hoc
 * `js/data/lexicon-overrides.json` exceptions unless they carry the issue #111
 * >50% usage proof, recomputes derived metadata (language list, concept count),
 * and writes the concepts back in a stable, sorted order. It performs no
 * network access; `record-semantic-lexicon.mjs` is responsible for upgrading
 * individual concepts to verified `wiktionary`/`wikidata` provenance or tagging
 * generated fallbacks as `rule-derived`.
 *
 * The directional asymmetry of human language (an English imperative "add" maps
 * to Russian "добавьте", while a Russian infinitive "добавить" maps back to the
 * English bare form "add") is preserved exactly: a concept only licenses a
 * direction src->tgt when it carries an explicit `primary[tgt]` form.
 *
 * Usage:
 *   node scripts/build-lexicon-seed.mjs
 *
 * Output: js/data/semantic-lexicon.json
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import prettier from 'prettier';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', 'js', 'data');
const lexiconPath = resolve(dataDir, 'semantic-lexicon.json');
const overridesPath = resolve(dataDir, 'lexicon-overrides.json');
const usagePolicyThreshold = 0.5;

function mergeConcept(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    labels: { ...(existing.labels ?? {}), ...(incoming.labels ?? {}) },
    primary: { ...(existing.primary ?? {}), ...(incoming.primary ?? {}) },
  };
}

function usagePolicyAllows(concept) {
  const policy = concept?.usagePolicy;
  if (!policy || typeof policy !== 'object') {
    return false;
  }
  return ['formalizations', 'naturalizations', 'translations'].some((kind) => {
    const usage = policy[kind];
    const used = Number(usage?.used);
    const total = Number(usage?.total);
    return (
      Number.isFinite(used) &&
      Number.isFinite(total) &&
      total > 0 &&
      used / total > usagePolicyThreshold
    );
  });
}

function assertPolicyCompliantOverrides(overrides) {
  const violations = (overrides.concepts ?? [])
    .filter((override) => !usagePolicyAllows(override))
    .map((override) => override.id ?? '(missing id)');
  if (violations.length > 0) {
    throw new Error(
      'lexicon-overrides.json contains per-concept overrides without ' +
        `>50% usage proof: ${violations.join(', ')}`
    );
  }
}

function applyPolicyOverrides(concepts, overrides) {
  assertPolicyCompliantOverrides(overrides);
  for (const override of overrides.concepts ?? []) {
    if (!override.id) {
      continue;
    }
    const existing = concepts.get(override.id) ?? { id: override.id };
    concepts.set(
      override.id,
      mergeConcept(existing, { ...override, source: 'override' })
    );
  }
}

function sortConcepts(concepts) {
  return [...concepts.values()].sort((a, b) => a.id.localeCompare(b.id));
}

async function readJsonIfExists(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const lexicon = (await readJsonIfExists(lexiconPath)) ?? { concepts: [] };
  const overrides = (await readJsonIfExists(overridesPath)) ?? { concepts: [] };
  const concepts = new Map(
    (lexicon.concepts ?? []).map((concept) => [concept.id, concept])
  );
  applyPolicyOverrides(concepts, overrides);
  const sorted = sortConcepts(concepts);
  const languages = [
    ...new Set(sorted.flatMap((concept) => Object.keys(concept.labels ?? {}))),
  ].sort();
  const payload = {
    version: lexicon.version ?? 1,
    description:
      'Semantic interlingua lexicon. Each concept has a unique id, ' +
      'per-language surface forms, and source-backed or rule-derived ' +
      'provenance; directional translation is derived through ids, never ' +
      'stored as a direct language pair. Per-concept overrides must include ' +
      '>50% usage proof before this builder will merge them.',
    generatedBy: 'scripts/build-lexicon-seed.mjs',
    languages,
    conceptCount: sorted.length,
    concepts: sorted,
  };
  const formatted = await prettier.format(JSON.stringify(payload, null, 2), {
    parser: 'json',
    filepath: lexiconPath,
  });
  await writeFile(lexiconPath, formatted, 'utf8');
  const provenance = sorted.reduce((counts, concept) => {
    counts[concept.source] = (counts[concept.source] ?? 0) + 1;
    return counts;
  }, {});
  process.stdout.write(
    `Normalised ${sorted.length} concepts (${languages.join(', ')}) in ${lexiconPath}\n`
  );
  process.stdout.write(`Provenance: ${JSON.stringify(provenance)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
