/**
 * Tests for the JS <-> Rust parity guardrail (scripts/check-js-rust-parity.mjs).
 *
 * The guardrail keeps the two engines from drifting apart: when a pull request
 * touches one side of a mirrored module pair it must touch the other side too
 * (issue #126 PR follow-up). These tests drive the checker through its public
 * `--changed` injection so they exercise the real manifest and real paired
 * files without needing a git history.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'test-anywhere';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const checker = join(rootDir, 'scripts/check-js-rust-parity.mjs');
const manifest = JSON.parse(
  readFileSync(join(rootDir, 'scripts/js-rust-parity.json'), 'utf8')
);

function runChecker(changed, { env } = {}) {
  const args = [checker];
  if (changed !== undefined) {
    args.push('--changed', changed);
  }
  return spawnSync('node', args, {
    cwd: rootDir,
    encoding: 'utf8',
    env: env ?? process.env,
  });
}

function combined(result) {
  return `${result.stdout}\n${result.stderr}`;
}

describe('JS <-> Rust parity guardrail', () => {
  it('declares at least the issue #126 context module pair', () => {
    const ids = manifest.pairs.map((pair) => pair.id);
    expect(ids.includes('formalize-contexts')).toBe(true);
  });

  it('validates manifest paths and passes when no diff is available', () => {
    // Force the "no pull-request diff available" branch deterministically.
    // On `pull_request`, CI checks out a synthetic merge commit, so the checker
    // would otherwise resolve a diff via `git diff HEAD^1 HEAD^2` and report
    // "parity holds" instead. Point git at a non-existent GIT_DIR and strip the
    // CI diff-hint env vars so no diff can be resolved and the checker falls
    // back to validating manifest paths only — regardless of the host's git
    // state (local working copy vs. CI merge commit).
    const env = { ...process.env, GIT_DIR: join(rootDir, 'no-such-git-dir') };
    delete env.GITHUB_BASE_SHA;
    delete env.GITHUB_HEAD_SHA;
    delete env.PARITY_CHANGED_FILES;
    const result = runChecker(undefined, { env });
    expect(result.status).toBe(0);
    expect(combined(result).includes('validated manifest paths only')).toBe(
      true
    );
  });

  it('passes when both sides of a pair change together', () => {
    const result = runChecker(
      'js/src/formalize-contexts.js,rust/src/formalize_contexts.rs'
    );
    expect(result.status).toBe(0);
    expect(combined(result).includes('parity holds')).toBe(true);
  });

  it('fails when only the JavaScript side changes', () => {
    const result = runChecker('js/src/formalize-contexts.js');
    expect(result.status).toBe(1);
    const output = combined(result);
    expect(output.includes('parity violation')).toBe(true);
    expect(output.includes('rust/src/formalize_contexts.rs')).toBe(true);
  });

  it('fails when only the Rust side changes', () => {
    const result = runChecker('rust/src/semantic_lexicon.rs');
    expect(result.status).toBe(1);
    const output = combined(result);
    expect(output.includes('parity violation')).toBe(true);
    expect(output.includes('js/src/semantic-lexicon.js')).toBe(true);
  });

  it('ignores changes outside every mirrored pair', () => {
    const result = runChecker('README.md,web/app.js');
    expect(result.status).toBe(0);
    expect(combined(result).includes('parity holds')).toBe(true);
  });

  it('ships a manifest whose every path exists on disk', () => {
    // The checker exits non-zero with a "do not exist" message if any manifest
    // path is missing; the no-diff run above already asserts a clean exit, so
    // here we assert the manifest shape the checker depends on.
    for (const pair of manifest.pairs) {
      expect(Array.isArray(pair.js) && pair.js.length > 0).toBe(true);
      expect(Array.isArray(pair.rust) && pair.rust.length > 0).toBe(true);
    }
  });
});
