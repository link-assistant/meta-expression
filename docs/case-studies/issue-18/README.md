# Case Study: Issue #18 - Add `/preferences` Section

> Source: <https://github.com/link-assistant/meta-expression/issues/18>
> Branch: `issue-18-f441191a8b86`
> Pull request: <https://github.com/link-assistant/meta-expression/pull/25>

## Executive Summary

Issue #18 asks for local preference profiles: basic personal beliefs, derived
belief controls, context selection for real and fictional worlds, local
persistence, Links Notation import/export, and updated requirements.

This PR ships the first complete prototype slice:

- A `/preferences` web section with worldview, religion, context, and Links
  Notation controls.
- A reusable `src/preferences.js` profile model with normalization,
  serialization, parsing, visibility rules, and evidence generation.
- Analysis integration so active preferences affect Analyse and Compare
  correctness calculations as explicit `preference`, `derived-preference`, and
  `context` evidence.
- Tests for profile round-tripping, conditional religion controls, atheist
  derived refutations, and Star Wars context evidence.

## Captured Data

| Path                                                                               | Purpose                                  |
| ---------------------------------------------------------------------------------- | ---------------------------------------- |
| [`data/issue-18.json`](./data/issue-18.json)                                       | Issue body and metadata                  |
| [`data/issue-18-comments.json`](./data/issue-18-comments.json)                     | Issue comments snapshot                  |
| [`data/pr-25.json`](./data/pr-25.json)                                             | Pull request metadata                    |
| [`data/pr-25-review-comments.json`](./data/pr-25-review-comments.json)             | Inline review comments                   |
| [`data/pr-25-conversation-comments.json`](./data/pr-25-conversation-comments.json) | PR conversation comments                 |
| [`data/pr-25-reviews.json`](./data/pr-25-reviews.json)                             | PR review records                        |
| [`data/recent-merged-prs.json`](./data/recent-merged-prs.json)                     | Recent merged PRs used for style context |
| [`data/preferences-code-search.txt`](./data/preferences-code-search.txt)           | Related code search results              |
| [`data/npm-n3.txt`](./data/npm-n3.txt)                                             | Current N3 package facts                 |
| [`data/npm-rdf-ext.txt`](./data/npm-rdf-ext.txt)                                   | Current rdf-ext package facts            |
| [`data/npm-rdfjs-data-model.txt`](./data/npm-rdfjs-data-model.txt)                 | Current RDF/JS data model package facts  |

## Outcome

The implementation keeps the repository's local-first prototype shape. It does
not add a new dependency yet because the existing Links Notation codec already
covers the profile interchange format needed for this slice. RDF/JS-style
libraries remain good candidates once preferences graduate from profile files
to interoperable datasets.

See also:

- [`REQUIREMENTS.md`](./REQUIREMENTS.md)
- [`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md)
- [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md)
