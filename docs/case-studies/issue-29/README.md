# Case Study: Page-Aware Issue Reporting

**Issue:** [link-assistant/meta-expression#29](https://github.com/link-assistant/meta-expression/issues/29)

**Pull request:** [#30](https://github.com/link-assistant/meta-expression/pull/30)

## Problem

The static web prototype had a prefilled GitHub issue link only inside the
Analyse page. The issue asks for one-click reporting on every page so a user can
open a GitHub issue with the current page state already captured, then only add
what looked wrong and what they expected. The issue also asks for GitHub Pages
version tracking similar to
[link-assistant/calculator](https://github.com/link-assistant/calculator).

## Collected Data

| File                                                                                   | Purpose                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [`data/issue-29.json`](./data/issue-29.json)                                           | Raw issue payload                                  |
| [`data/issue-29-comments.json`](./data/issue-29-comments.json)                         | Issue comments, empty at capture time              |
| [`data/pr-30.json`](./data/pr-30.json)                                                 | Current PR metadata                                |
| [`data/pr-30-review-comments.json`](./data/pr-30-review-comments.json)                 | Inline review comments, empty at capture time      |
| [`data/pr-30-conversation-comments.json`](./data/pr-30-conversation-comments.json)     | PR conversation comments                           |
| [`data/calculator-reportIssue.ts`](./data/calculator-reportIssue.ts)                   | Reference implementation from calculator           |
| [`data/calculator-reportIssue.test.ts.txt`](./data/calculator-reportIssue.test.ts.txt) | Reference calculator tests                         |
| [`data/calculator-App.tsx.txt`](./data/calculator-App.tsx.txt)                         | Calculator app wiring for version and report issue |
| [`data/calculator-repo.json`](./data/calculator-repo.json)                             | Calculator repository metadata                     |
| [`data/meta-expression-file-tree.txt`](./data/meta-expression-file-tree.txt)           | File tree captured before implementation           |

## Requirements

See [`REQUIREMENTS.md`](./REQUIREMENTS.md) for the full requirement list and
acceptance checks. In short:

1. Every web page needs a report issue entry point.
2. The generated issue body must include page-critical state.
3. The issue body must include environment and version diagnostics.
4. GitHub Pages deployments must expose an exact build/version identifier.
5. The implementation needs tests and a documented case study.

## Root Cause

The existing `createIssueReportUrl()` helper was analysis-specific and the only
visible report link lived in the Analyse page's reasoning toolbar. Other pages
had no shared reporting surface, and the Pages artifact copied `web/` and `src/`
without creating deploy metadata that the browser could read.

## Solution

- Added a global top-navigation report link and marked report links with
  `data-issue-report-link`.
- Added `web/page-report.js` to collect active page state from Analyse, Compare,
  Formalize, Translate, and Preferences.
- Added `web/app-version.js` to load deployed `app-version.json` metadata, with
  a local package fallback when serving the repository root.
- Updated the Pages workflow to write `_site/web/app-version.json` with package
  version, commit SHA, ref, build time, and source.
- Added issue #29 tests for URL generation, markdown body generation, app
  version loading, static HTML wiring, and Pages workflow wiring.

## Verification

Automated coverage lives in [`tests/issue-29.test.js`](../../../tests/issue-29.test.js).
The expected local checks are:

```bash
npm test
npm run check
```

## Related Notes

- [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md) summarizes the reference
  implementation, GitHub issue URL parameters, native URL encoding support, and
  Pages deployment metadata options.
- [`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md) records considered solution paths and
  the selected implementation plan.
