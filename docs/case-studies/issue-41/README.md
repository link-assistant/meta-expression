# Issue #41 Case Study: Russian Translate Full-Text Mismatch

Issue: <https://github.com/link-assistant/meta-expression/issues/41>

PR: <https://github.com/link-assistant/meta-expression/pull/42>

## Problem

The Translate page mapped:

```text
Найти синонимы или примеры согласования
```

from Russian to unrelated English entities:

```text
Marilyn Monroe two-person-rule
```

The root symptom was not target-language lookup. Translation was following bad
formalization links: full-text Wikipedia results whose snippets contained the
Russian words were accepted as the meaning of the phrase.

## Captured Inputs

The `data` folder preserves the issue, PR context, search context, live
reproductions, and test logs used for this fix:

- [`data/issue-41.json`](./data/issue-41.json)
- [`data/issue-41-comments.json`](./data/issue-41-comments.json)
- [`data/pr-42.json`](./data/pr-42.json)
- [`data/pr-42-comments.json`](./data/pr-42-comments.json)
- [`data/pr-42-review-comments.json`](./data/pr-42-review-comments.json)
- [`data/pr-42-reviews.json`](./data/pr-42-reviews.json)
- [`data/search-translateTextWith.json`](./data/search-translateTextWith.json)
- [`data/recent-merged-translation-prs.json`](./data/recent-merged-translation-prs.json)
- [`data/live-translate-before.json`](./data/live-translate-before.json)
- [`data/live-formalize-before.json`](./data/live-formalize-before.json)
- [`data/live-translate-after.json`](./data/live-translate-after.json)
- [`data/live-formalize-after.json`](./data/live-formalize-after.json)
- [`data/node-issue-41-before.log`](./data/node-issue-41-before.log)
- [`data/node-issue-41-after.log`](./data/node-issue-41-after.log)
- [`data/node-issue-39-after.log`](./data/node-issue-39-after.log)
- [`data/node-issue-35-after.log`](./data/node-issue-35-after.log)
- [`data/node-issue-37-after.log`](./data/node-issue-37-after.log)
- [`data/node-issue-21-context-after.log`](./data/node-issue-21-context-after.log)
- [`data/npm-test.log`](./data/npm-test.log)
- [`data/npm-check.log`](./data/npm-check.log)
- [`data/bun-test.log`](./data/bun-test.log)
- [`data/deno-test.log`](./data/deno-test.log)
- [`data/cargo-test.log`](./data/cargo-test.log)
- [`data/check-file-line-limits.log`](./data/check-file-line-limits.log)
- [`data/prettier-write.log`](./data/prettier-write.log)

## Timeline

1. Issue #41 was opened from the Translate page on May 22, 2026.
2. The report showed two linked phrases: `Найти синонимы или` -> Q4616 and
   `примеры согласования` -> Q2523390.
3. Local live reproduction showed the same failure class: Wikipedia full-text
   results with snippets containing the Russian words were accepted even when
   their titles were unrelated.
4. A focused failing test reproduced the bad output with deterministic mock
   Wikimedia responses.
5. The formalizer now requires direct title, label, match, or alias evidence
   before accepting multi-token search hits, and non-Latin single-token hits no
   longer pass on snippet evidence alone.
6. The translator gained a small reusable Russian-to-English glossary and a
   Russian genitive `примеры X` -> `examples of X` sentence rule.

## Root Causes

- MediaWiki `list=search` returns full-text search hits. Snippet-only matches
  are useful candidates, but they are not enough to claim that the page title is
  the phrase meaning.
- The candidate shape filter only protected English glue words. Russian `или`
  could appear at the edge of an accepted multi-token phrase.
- Russian-to-English translation had semantic-label handling but no lexical
  fallback for short imperative phrases whose words do not need entity linking.

## Result

The live after-capture now emits:

```text
Find synonyms or examples of agreement
```

with no unresolved questions and without the Marilyn Monroe / two-person-rule
links.

## Boundary

This PR does not turn the project into a general-purpose machine translation
engine. It improves the shared formalization guardrail that caused the bad links
and adds a reusable lexical slice for the reported Russian-to-English phrase
class.
