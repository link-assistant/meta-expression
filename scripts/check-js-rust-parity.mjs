#!/usr/bin/env node

// JS <-> Rust parity guardrail.
//
// The Rust core (rust/src) and the pure-JS engine (js/src) implement the same
// formalization/translation logic. Issue #126 showed how easy it is to fix a
// bug in one engine and forget the other, leaving them silently out of sync.
// This check enforces that, for every mirrored module pair declared in
// scripts/js-rust-parity.json, a pull request that touches one side also
// touches the other.
//
// What it does:
//   1. Loads the parity manifest and validates that every listed path exists
//      (so the manifest can never rot into pointing at deleted files).
//   2. Determines which files the pull request changed.
//   3. For each pair, fails if exactly one of {js side, rust side} changed.
//
// Changed-file detection (first match wins):
//   --changed a,b,c            explicit comma/space separated list (tests, CI)
//   PARITY_CHANGED_FILES env   same, as an environment variable
//   GITHUB_BASE_SHA + _HEAD_SHA  git diff BASE..HEAD (CI pull_request)
//   --base <ref>               git diff <ref>...HEAD
//   merge commit at HEAD       git diff HEAD^1 HEAD^2 (synthetic PR merge)
//   (otherwise)                no diff available -> validate existence only
//
// Exit code 0 = parity holds (or only existence was validated), 1 = violation.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');
const defaultManifestPath = join(scriptDir, 'js-rust-parity.json');

function parseArgs(argv) {
  const args = { manifest: defaultManifestPath, changed: null, base: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--changed') {
      args.changed = argv[(index += 1)];
    } else if (arg === '--base') {
      args.base = argv[(index += 1)];
    } else if (arg === '--manifest') {
      args.manifest = argv[(index += 1)];
    }
  }
  return args;
}

function splitList(value) {
  return value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function gitDiff(command) {
  try {
    return execSync(command, { cwd: repoRoot, encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.error(`Could not run: ${command}`);
    console.error(error.message);
    return null;
  }
}

function isMergeCommit() {
  try {
    const parents = execSync('git cat-file -p HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
    })
      .split('\n')
      .filter((line) => line.startsWith('parent ')).length;
    return parents > 1;
  } catch {
    return false;
  }
}

// Returns { files, source } where source describes how files were resolved, or
// { files: null } when no reliable pull-request diff is available.
function resolveChangedFiles(args) {
  if (args.changed) {
    return { files: splitList(args.changed), source: '--changed argument' };
  }
  if (process.env.PARITY_CHANGED_FILES) {
    return {
      files: splitList(process.env.PARITY_CHANGED_FILES),
      source: 'PARITY_CHANGED_FILES env',
    };
  }
  const baseSha = process.env.GITHUB_BASE_SHA;
  const headSha = process.env.GITHUB_HEAD_SHA;
  if (baseSha && headSha) {
    const files = gitDiff(`git diff --name-only ${baseSha} ${headSha}`);
    if (files) {
      return { files, source: `git diff ${baseSha}..${headSha}` };
    }
  }
  if (args.base) {
    const files = gitDiff(`git diff --name-only ${args.base}...HEAD`);
    if (files) {
      return { files, source: `git diff ${args.base}...HEAD` };
    }
  }
  if (isMergeCommit()) {
    const files = gitDiff('git diff --name-only HEAD^1 HEAD^2');
    if (files) {
      return { files, source: 'git diff HEAD^1 HEAD^2 (merge commit)' };
    }
  }
  return { files: null, source: 'none' };
}

function loadManifest(manifestPath) {
  const raw = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  if (!Array.isArray(manifest.pairs)) {
    throw new Error(`Manifest ${manifestPath} is missing a "pairs" array.`);
  }
  return manifest;
}

function validateManifestPaths(manifest) {
  const missing = [];
  for (const pair of manifest.pairs) {
    for (const side of ['js', 'rust']) {
      for (const file of pair[side] ?? []) {
        if (!existsSync(join(repoRoot, file))) {
          missing.push({ id: pair.id, file });
        }
      }
    }
  }
  return missing;
}

function sideTouched(files, changedSet) {
  return (files ?? []).filter((file) => changedSet.has(file));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let manifest;
  try {
    manifest = loadManifest(args.manifest);
  } catch (error) {
    console.error(`Failed to load parity manifest: ${error.message}`);
    process.exit(1);
  }

  console.log(
    `JS <-> Rust parity: ${manifest.pairs.length} mirrored module pair(s).`
  );

  const missing = validateManifestPaths(manifest);
  if (missing.length > 0) {
    console.error('\nParity manifest points at files that do not exist:');
    for (const entry of missing) {
      console.error(`  [${entry.id}] ${entry.file}`);
    }
    console.error(
      '\nUpdate scripts/js-rust-parity.json so every pair lists real files.'
    );
    process.exit(1);
  }

  const { files, source } = resolveChangedFiles(args);
  if (files === null) {
    console.log(
      'No pull-request diff available; validated manifest paths only. ' +
        'Parity co-change is enforced in CI on pull requests.'
    );
    process.exit(0);
  }

  console.log(`Changed files (${source}): ${files.length}`);
  const changedSet = new Set(files);
  const violations = [];
  for (const pair of manifest.pairs) {
    const jsTouched = sideTouched(pair.js, changedSet);
    const rustTouched = sideTouched(pair.rust, changedSet);
    if (jsTouched.length > 0 && rustTouched.length === 0) {
      violations.push({ pair, changed: 'JavaScript', need: 'Rust' });
    } else if (rustTouched.length > 0 && jsTouched.length === 0) {
      violations.push({ pair, changed: 'Rust', need: 'JavaScript' });
    }
  }

  if (violations.length > 0) {
    console.error('\nJS <-> Rust parity violation(s) detected:\n');
    for (const { pair, changed, need } of violations) {
      console.error(`  [${pair.id}] ${pair.description}`);
      console.error(
        `    Changed the ${changed} side but not the ${need} side.`
      );
      console.error(`    JavaScript: ${pair.js.join(', ')}`);
      console.error(`    Rust:       ${pair.rust.join(', ')}`);
      console.error('');
    }
    console.error(
      'Keep the engines in sync: change both sides of each mirrored pair, ' +
        'or update scripts/js-rust-parity.json if the mapping changed.'
    );
    process.exit(1);
  }

  console.log('JS <-> Rust parity holds for all mirrored module pairs.');
  process.exit(0);
}

main();
