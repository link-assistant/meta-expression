import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'test-anywhere';
import {
  formatAppVersion,
  loadAppVersionInfo,
} from '../../../web/app-version.js';
import {
  createPageIssueReport,
  createPageIssueReportUrl,
} from '../../../web/page-report.js';

describe('issue 29 - page issue reporting', () => {
  it('creates a GitHub issue URL with page state and version diagnostics', () => {
    const report = {
      pageId: 'formalize',
      pageLabel: 'Formalize',
      summary: 'Barack Obama was born in Hawaii.',
      environment: {
        Page: 'Formalize',
        Version: 'v0.9.0 (abc1234)',
        Commit:
          '[abc1234](https://github.com/link-assistant/meta-expression/commit/abc1234)',
        URL: 'https://link-assistant.github.io/meta-expression/web/#/formalize',
      },
      sections: [
        { heading: 'Text', code: 'Barack Obama was born in Hawaii.' },
        {
          heading: 'Options',
          lines: ['- **Link target**: wikipedia', '- **Sources**: wikidata'],
        },
        { heading: 'Links Notation', code: '(links-network example)' },
      ],
    };

    const url = createPageIssueReportUrl(report, {
      labels: 'bug,diagnostics',
    });
    const parsed = new URL(url);
    const body = parsed.searchParams.get('body') ?? '';

    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      'https://github.com/link-assistant/meta-expression/issues/new'
    );
    expect(parsed.searchParams.get('labels')).toBe('bug,diagnostics');
    expect(parsed.searchParams.get('title')).toBe(
      'Issue on Formalize page: Barack Obama was born in Hawaii.'
    );
    expect(body).toContain('## Environment');
    expect(body).toContain('**Version**: v0.9.0 (abc1234)');
    expect(body).toContain('## Text');
    expect(body).toContain('Barack Obama was born in Hawaii.');
    // Issue #128: Report Notes and Reproduction Steps sections were removed to
    // free up space for diagnostic data.
    expect(body).not.toContain('## Reproduction Steps');
    expect(body).not.toContain('## Report Notes');
  });

  it('renders markdown reports without requiring browser globals', () => {
    const body = createPageIssueReport({
      environment: { Page: 'Preferences', Version: '' },
      sections: [
        { heading: 'Links Notation', code: 'preferences\n  version 1' },
      ],
    });

    expect(body).toContain('**Page**: Preferences');
    expect(body).toContain('**Version**: unknown');
    expect(body).toContain('preferences\n  version 1');
    expect(body).toContain('<!-- Please describe what looked wrong');
  });

  it('loads GitHub Pages build metadata before falling back to package data', async () => {
    const info = await loadAppVersionInfo({
      fetch: async (url) => {
        if (url === './app-version.json') {
          return {
            ok: true,
            async json() {
              return {
                packageVersion: '0.9.0',
                commitSha: 'abcdef123456',
                source: 'github-pages',
              };
            },
          };
        }
        return { ok: false };
      },
    });

    expect(info.commitSha).toBe('abcdef123456');
    expect(formatAppVersion(info)).toBe('v0.9.0 (abcdef1)');
  });

  it('wires the static web app and Pages workflow for reporting', async () => {
    const html = await readFile(
      new URL('../../../web/index.html', import.meta.url),
      'utf8'
    );
    const app = await readFile(
      new URL('../../../web/app.js', import.meta.url),
      'utf8'
    );
    const workflow = await readFile(
      new URL('../../../.github/workflows/js.yml', import.meta.url),
      'utf8'
    );

    expect(html).toContain('id="report-issue-global"');
    expect(html).toContain('id="app-version"');
    expect(html).toContain('data-issue-report-link');
    expect(app).toContain('setupPageIssueReporting({');
    expect(workflow).toContain('_site/web/app-version.json');
    expect(workflow).toContain('commitSha: process.env.GITHUB_SHA');
  });
});
