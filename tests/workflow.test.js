import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'test-anywhere';

const releaseWorkflow = readFileSync('.github/workflows/release.yml', 'utf8');

function getJobBlock(jobName) {
  const start = releaseWorkflow.indexOf(`\n  ${jobName}:\n`);
  if (start === -1) {
    return '';
  }

  const nextJob = releaseWorkflow
    .slice(start + 1)
    .search(/\n[ ]{2}[a-zA-Z0-9_-]+:\n/);
  if (nextJob === -1) {
    return releaseWorkflow.slice(start);
  }

  return releaseWorkflow.slice(start, start + 1 + nextJob);
}

describe('release workflow publishing boundaries', () => {
  it('deploys the static web prototype through GitHub Pages', () => {
    const buildPages = getJobBlock('build-pages');
    const deployPages = getJobBlock('deploy-pages');

    expect(buildPages.includes('actions/configure-pages@v5')).toBe(true);
    expect(buildPages.includes('actions/upload-pages-artifact@v4')).toBe(true);
    expect(buildPages.includes('cp -R web src _site/')).toBe(true);
    expect(deployPages.includes('actions/deploy-pages@v4')).toBe(true);
  });

  it('keeps Pages deployment independent from npm release publication', () => {
    const deployPages = getJobBlock('deploy-pages');

    expect(deployPages.includes('needs: [build-pages]')).toBe(true);
    expect(deployPages.includes('release')).toBe(false);
  });

  it('requires an explicit repository variable before automatic npm publishing', () => {
    const release = getJobBlock('release');

    expect(release.includes("vars.NPM_PUBLISH_ENABLED == 'true'")).toBe(true);
  });
});
