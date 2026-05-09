# Solution Plan

## Options Considered

### Option 1: Copy Calculator Reporting Helper

Copying calculator's `reportIssue.ts` would provide mature report formatting,
but it is TypeScript and calculator-specific. Meta-expression has five distinct
pages with different state models, so a direct copy would still need extensive
adaptation.

### Option 2: Add a Generic Page-State Reporter

Create a small web helper that collects current page state, formats Markdown,
and builds the GitHub issue URL. This matches calculator's pattern while keeping
state collection close to the static app.

Selected because it is low-risk, page-aware, testable without browser
authentication, and works with the existing static Pages deployment.

### Option 3: Use GitHub Issue Templates Only

Issue templates could standardize prompts, but they cannot capture dynamic page
state such as current formalization output, translation CST, or preference
profile.

Rejected as a standalone solution.

### Option 4: Create Issues Through GitHub API

The GitHub REST API could avoid long URLs and submit issues directly, but a
public GitHub Pages app cannot safely hold a write token.

Rejected for the static app.

## Implementation Steps

1. Add a global report issue link in the top navigation.
2. Keep the Analyse page report link, but route it through the shared reporting
   helper.
3. Add `web/page-report.js` with pure URL/body helpers and DOM state collectors.
4. Add `web/app-version.js` to load build metadata from `app-version.json`, with
   a local `package.json` fallback.
5. Update the Pages build step to write `_site/web/app-version.json`.
6. Add tests for body/URL generation, metadata loading, static wiring, and
   workflow wiring.
7. Replace the stale issue-29 case study with the correct analysis and captured
   data.

## Verification Plan

1. Run `npm test` for the full Node test suite.
2. Run `npm run check` for lint, formatting, duplication, and generated docs.
3. Serve the app locally and manually verify that Report Issue opens a
   prefilled GitHub issue URL on each page.
4. Review the PR diff and update PR #30 with implementation and test details.
