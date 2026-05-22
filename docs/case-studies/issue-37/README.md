# Case Study: Issue 37 Translate Reporting and Grammar Phrases

**Issue:** [link-assistant/meta-expression#37](https://github.com/link-assistant/meta-expression/issues/37)

**Pull request:** [#38](https://github.com/link-assistant/meta-expression/pull/38)

## Problem

The Translate page generated a GitHub `issues/new` URL whose encoded `body`
contained full Links Notation, CST JSON, and step traces. Even for
`Hawaii is a state.`, the URL exceeded GitHub's request URI limit and GitHub
showed "Your request URL is too long."

The same report exposed two translation/formalization gaps:

1. Source formalization linked `is` and `a` separately instead of preferring the
   exact Wiktionary compound `is-a` when available.
2. The generated Russian rule token for `это` was rendered as plain text in the
   target Markdown instead of as a formalized Wiktionary link.

## Collected Data

| File                                                                               | Purpose                                               |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [`data/issue-37.json`](./data/issue-37.json)                                       | Raw issue payload.                                    |
| [`data/issue-37-comments.json`](./data/issue-37-comments.json)                     | Issue comments, empty at capture time.                |
| [`data/pr-38.json`](./data/pr-38.json)                                             | PR metadata before implementation.                    |
| [`data/pr-38-review-comments.json`](./data/pr-38-review-comments.json)             | Inline review comments, empty at capture time.        |
| [`data/pr-38-conversation-comments.json`](./data/pr-38-conversation-comments.json) | PR conversation comments, empty at capture time.      |
| [`data/pr-38-reviews.json`](./data/pr-38-reviews.json)                             | PR reviews, empty at capture time.                    |
| [`data/meta-expression-file-tree.txt`](./data/meta-expression-file-tree.txt)       | Repository file tree before implementation.           |
| [`data/calculator-reportIssue.ts`](./data/calculator-reportIssue.ts)               | Calculator reference report helper.                   |
| [`data/formal-ai-app.js.txt`](./data/formal-ai-app.js.txt)                         | Formal AI reference compact issue URL implementation. |
| [`data/wiktionary-is-a-definition.json`](./data/wiktionary-is-a-definition.json)   | Live Wiktionary REST data confirming `is-a`.          |
| [`data/wiktionary-eto-page.json`](./data/wiktionary-eto-page.json)                 | Live Wiktionary page metadata for Russian `это`.      |

## Timeline

1. `2026-05-22T13:05:26Z` - GitHub Pages build in the issue report produced
   version `v0.9.0 (1fb1696)`.
2. `2026-05-22T14:09:36Z` - The user clicked Report Issue on the Translate
   page for `Hawaii is a state.`.
3. The generated URL encoded the full report body, including Links Notation,
   Translation CST, and step traces.
4. GitHub rejected the URL as too long before opening the new issue form.
5. Issue #37 was opened manually at `2026-05-22T14:15:37Z` with the oversized
   URL and translation defects.

## Root Causes

1. `web/page-report.js` always serialized every collected section into the
   `body` query parameter. Translate diagnostics are useful for deep debugging,
   but CST and step payloads are too large for a one-click issue URL.
2. The formalizer skipped every multi-token stop-word n-gram. That prevented
   `is a` from being searched as `is-a` in Wiktionary, so the longest-match cover
   could only choose separate `is` and `a` tokens.
3. The English-to-Russian copula rule emitted a synthetic rule token with plain
   `markdown: 'это'`/`html: 'это'`. It was not represented as a Wiktionary-backed
   formalized token.

## Solution

- `createPageIssueReportUrl()` now tries the full report first and compacts the
  report when the encoded URL is too long. For Translate, compact reports keep
  original text, options/status, source formalization Markdown, target Markdown,
  translated text, questions, reproduction steps, and a note that generated
  diagnostics were omitted.
- The Translate page exposes its current result to page reporting, allowing the
  report to include exact source formalization Markdown instead of only rendered
  text content.
- Wiktionary lookup now supports explicit multi-token grammar compounds with
  page-title mappings, so `is a` probes `is-a` while preserving the displayed
  phrase text.
- The formalizer now searches supported stop-only multi-token n-grams through
  Wiktionary. The longest non-overlapping cover then prefers `is a` over
  separate `is` and `a` when the compound exists.
- The translator recognizes the `is a` grammar phrase and maps it to a linked
  Russian `это` rule token backed by `https://en.wiktionary.org/wiki/%D1%8D%D1%82%D0%BE`.

## Verification

Automated coverage lives in [`tests/issue-37.test.js`](../../../tests/issue-37.test.js):

- bounded Translate issue URLs keep required sections and omit oversized
  diagnostics;
- `is a` formalizes as `wikt:en:is-a#Noun:0`;
- `Hawaii is a state.` translates to `Гавайи это штат.` with linked `это` in
  Markdown and no unresolved questions.
