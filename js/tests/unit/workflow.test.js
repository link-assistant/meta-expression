import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'test-anywhere';

const jsWorkflow = readFileSync('.github/workflows/js.yml', 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n');
const rustWorkflow = readFileSync('.github/workflows/rust.yml', 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n');

function getJobBlock(workflow, jobName) {
  const start = workflow.indexOf(`\n  ${jobName}:\n`);
  if (start === -1) {
    return '';
  }

  const nextJob = workflow.slice(start + 1).search(/\n[ ]{2}[a-zA-Z0-9_-]+:\n/);
  if (nextJob === -1) {
    return workflow.slice(start);
  }

  return workflow.slice(start, start + 1 + nextJob);
}

describe('js workflow publishing boundaries', () => {
  it('deploys the static web prototype through GitHub Pages', () => {
    const buildPages = getJobBlock(jsWorkflow, 'build-pages');
    const deployPages = getJobBlock(jsWorkflow, 'deploy-pages');

    expect(buildPages.includes('actions/configure-pages@v5')).toBe(true);
    expect(buildPages.includes('actions/upload-pages-artifact@v4')).toBe(true);
    expect(buildPages.includes('cp -R web _site/')).toBe(true);
    expect(buildPages.includes('cp -R js/src _site/js/')).toBe(true);
    expect(deployPages.includes('actions/deploy-pages@v4')).toBe(true);
  });

  it('keeps Pages deployment independent from npm release publication', () => {
    const deployPages = getJobBlock(jsWorkflow, 'deploy-pages');

    expect(deployPages.includes('needs: [build-pages]')).toBe(true);
    expect(deployPages.includes('release')).toBe(false);
  });

  it('requires an explicit repository variable before automatic npm publishing', () => {
    const release = getJobBlock(jsWorkflow, 'release');

    expect(release.includes("vars.NPM_PUBLISH_ENABLED == 'true'")).toBe(true);
  });

  it('runs JavaScript tests only on Bun and Linux', () => {
    const test = getJobBlock(jsWorkflow, 'test');

    expect(test.includes('name: Test (bun on ubuntu-latest)')).toBe(true);
    expect(test.includes('runs-on: ubuntu-latest')).toBe(true);
    expect(test.includes('oven-sh/setup-bun@v2')).toBe(true);
    expect(test.includes('bun test --timeout 30000')).toBe(true);
    expect(test.includes('matrix:')).toBe(false);
    expect(test.includes('windows-latest')).toBe(false);
    expect(test.includes('macos-latest')).toBe(false);
    expect(test.includes('Run tests (Node.js)')).toBe(false);
    expect(test.includes('Run tests (Deno)')).toBe(false);
  });
});

describe('rust workflow checks coverage', () => {
  it('runs lint and clippy on workspace', () => {
    const lint = getJobBlock(rustWorkflow, 'lint');

    expect(lint.includes('cargo fmt --all -- --check')).toBe(true);
    expect(
      lint.includes('cargo clippy --workspace --all-targets --all-features')
    ).toBe(true);
  });

  it('runs the full workspace test suite on Linux', () => {
    const test = getJobBlock(rustWorkflow, 'test');

    expect(test.includes('name: Test (ubuntu-latest)')).toBe(true);
    expect(test.includes('ubuntu-latest')).toBe(true);
    expect(test.includes('macos-latest')).toBe(false);
    expect(test.includes('windows-latest')).toBe(false);
    expect(test.includes('matrix:')).toBe(false);
    expect(
      test.includes(
        'cargo test --workspace --all-targets --all-features --verbose'
      )
    ).toBe(true);
    expect(test.includes('cargo test --workspace --doc --verbose')).toBe(true);
  });
});
