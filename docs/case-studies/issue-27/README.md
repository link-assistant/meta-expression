# Case Study: Statement Uniqueness Search

**Issue:** [link-assistant/meta-expression#27](https://github.com/link-assistant/meta-expression/issues/27)

**Pull request:** [#32](https://github.com/link-assistant/meta-expression/pull/32)

## Problem

The issue asks for a new `/uniquness` section that estimates, for each
detected statement, how likely it is that the same or similar statement already
exists in another public work. The intended workflow is to search statements
literally, then suggest either using a quote/citation or changing the wording
when prior public matches are found.

The issue title contains a typo (`uniquness`), so the implementation uses the
correct `/uniqueness` spelling and keeps `/uniquness` as a compatibility alias.

## Collected Data

| File                                                                     | Purpose                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [`data/issue-27.json`](./data/issue-27.json)                             | Raw issue payload                                            |
| [`data/issue-comments.json`](./data/issue-comments.json)                 | Issue comments, empty at capture time                        |
| [`data/pr-32.json`](./data/pr-32.json)                                   | Current PR metadata                                          |
| [`data/wikimedia-cors.headers.txt`](./data/wikimedia-cors.headers.txt)   | Wikimedia CORS probe headers from 2026-05-10                 |
| [`data/wikimedia-cors.body.json`](./data/wikimedia-cors.body.json)       | Wikimedia search response sample                             |
| [`data/openalex-cors.headers.txt`](./data/openalex-cors.headers.txt)     | OpenAlex CORS probe headers from 2026-05-10                  |
| [`data/openalex-cors.body.json`](./data/openalex-cors.body.json)         | OpenAlex works response sample                               |
| [`data/crossref-cors.headers.txt`](./data/crossref-cors.headers.txt)     | Crossref CORS probe headers from 2026-05-10                  |
| [`data/crossref-cors.body.json`](./data/crossref-cors.body.json)         | Crossref works response sample                               |
| [`data/duckduckgo-cors.headers.txt`](./data/duckduckgo-cors.headers.txt) | DuckDuckGo Instant Answer CORS probe headers from 2026-05-10 |
| [`data/duckduckgo-cors.body.json`](./data/duckduckgo-cors.body.json)     | DuckDuckGo Instant Answer response sample                    |

## Requirements

See [`REQUIREMENTS.md`](./REQUIREMENTS.md) for the full acceptance matrix. The
implementation covers the new library API, CLI command, HTTP route, static web
page, compatibility aliases, tests, and this case-study folder.

## Solution

- Added `searchTextUniqueness()` and source adapters for Wikimedia, OpenAlex,
  Crossref, and DuckDuckGo Instant Answer.
- Added CLI commands `uniqueness` and `uniquness`.
- Added HTTP routes `GET/POST /uniqueness` and `GET/POST /uniquness`.
- Added a static web **Uniqueness** page with statement highlighting, summary
  metrics, source matches, Markdown, and Links Notation output.
- Added page-report capture so browser bug reports include uniqueness input,
  status, rendered output, matches, Markdown, and Links Notation.
- Added issue #27 regression coverage in
  [`tests/issue-27.test.js`](../../../tests/issue-27.test.js).

## Verification

Expected local checks:

```bash
npm test
npm run check
scripts/check-file-line-limits.sh
```

For visual review, serve the app and open `#/uniqueness`:

```bash
python3 -m http.server 4173
```

The final browser screenshot is stored at
[`docs/screenshots/issue-27/uniqueness-page.png`](../../screenshots/issue-27/uniqueness-page.png).

## Related Notes

- [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md) summarizes API capabilities,
  CORS probes, and search limitations.
- [`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md) records considered approaches and
  the selected implementation plan.
