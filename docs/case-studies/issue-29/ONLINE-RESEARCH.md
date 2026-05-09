# Online Research

## Calculator Reference

The calculator project keeps issue reporting in
`web/src/utils/reportIssue.ts`. The helper accepts page state, normalizes
environment data, includes input/result/Links Notation/alternative
interpretations/steps, and creates a GitHub `/issues/new` URL. Its app wiring
passes expression, result, WASM readiness, version, theme, language, URL, user
agent, and timestamp before opening the generated URL.

Captured files:

- [`data/calculator-reportIssue.ts`](./data/calculator-reportIssue.ts)
- [`data/calculator-reportIssue.test.ts.txt`](./data/calculator-reportIssue.test.ts.txt)
- [`data/calculator-App.tsx.txt`](./data/calculator-App.tsx.txt)

## GitHub Issue URLs

GitHub documents that issues can be opened from a URL query with parameters such
as `title`, `body`, and `labels`. It also warns that invalid parameters or
permissions can produce `404`, and URLs exceeding server limits can produce
`414`.

Source:
[GitHub Docs: Creating an issue from a URL query](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query)

Impact:
The implementation uses regular issue query parameters and keeps the report as
plain Markdown so GitHub can prefill the form without requiring browser-side
GitHub API authentication.

## URL Encoding

`URLSearchParams` is a baseline browser API for query string construction. MDN
documents that it percent-encodes values during serialization and encodes spaces
as `+`.

Source:
[MDN: URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)

Impact:
The implementation uses `URLSearchParams` instead of manual string escaping for
GitHub issue URLs.

## GitHub Pages Deployment Metadata

The `actions/deploy-pages` action exposes a `page_url` output and is designed
for Pages deployments using `pages: write` and `id-token: write` permissions.
The action also sets a `GITHUB_PAGES` environment variable during Pages
deployment.

Source:
[actions/deploy-pages README](https://github.com/actions/deploy-pages)

Impact:
The repo already deploys via GitHub Actions. The selected version-tracking
approach writes a small `app-version.json` into the Pages artifact before
upload, using `GITHUB_SHA`, `GITHUB_REF_NAME`, the package version, and build
time.

## Known Components Considered

| Component                      | Usefulness                                              | Decision                                                                                                          |
| ------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Calculator `reportIssue.ts`    | Proven local reference for prefilled GitHub issue URLs. | Reused the pattern, not the exact TypeScript implementation, because this app is plain JS and has multiple pages. |
| GitHub issue templates         | Good for static prompts and labels.                     | Not sufficient for dynamic page state; can be added later if needed.                                              |
| GitHub REST issue creation API | Could bypass URL length limits.                         | Not used because it would require authenticated API access from the public static app.                            |
| `URLSearchParams`              | Native safe query parameter serialization.              | Used.                                                                                                             |
