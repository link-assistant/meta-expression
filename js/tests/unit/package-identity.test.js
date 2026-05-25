import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'test-anywhere';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function activeChangesetFiles() {
  return readdirSync('.changeset')
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .map((file) => join('.changeset', file));
}

describe('package identity', () => {
  it('publishes the documented meta-expression package identity', () => {
    const packageJson = readJson('package.json');
    const packageLock = readJson('package-lock.json');

    expect(packageJson.name).toBe('meta-expression');
    expect(packageJson.description.includes('meta-expression')).toBe(true);
    expect(packageJson.repository.url).toBe(
      'git+https://github.com/link-assistant/meta-expression.git'
    );
    expect(packageJson.bugs.url).toBe(
      'https://github.com/link-assistant/meta-expression/issues'
    );
    expect(packageJson.homepage).toBe(
      'https://github.com/link-assistant/meta-expression#readme'
    );
    expect(packageLock.name).toBe(packageJson.name);
    expect(packageLock.packages[''].name).toBe(packageJson.name);
  });

  it('keeps project docs aligned with the published package name', () => {
    const contributing = readFileSync('docs/CONTRIBUTING.md', 'utf8');
    const formalizeDocs = readFileSync('docs/FORMALIZE.md', 'utf8');
    const formalizeGenerator = readFileSync(
      'scripts/generate-formalize-docs.mjs',
      'utf8'
    );

    expect(contributing.startsWith('# Contributing to meta-expression')).toBe(
      true
    );
    expect(formalizeDocs.includes("from 'meta-expression'")).toBe(true);
    expect(formalizeGenerator.includes("from 'meta-expression'")).toBe(true);
  });

  it('targets meta-expression in active changesets and release tooling', () => {
    const changesets = activeChangesetFiles()
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    const releaseScripts = [
      'scripts/create-manual-changeset.mjs',
      'scripts/format-release-notes.mjs',
      'scripts/merge-changesets.mjs',
      'scripts/publish-to-npm.mjs',
      'scripts/validate-changeset.mjs',
    ]
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(changesets.includes("'meta-expression':")).toBe(true);
    expect(changesets.includes('my-package')).toBe(false);
    expect(releaseScripts.includes('my-package')).toBe(false);
  });
});
