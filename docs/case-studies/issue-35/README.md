# Issue #35 Case Study: Hawaii Translation Stability

Issue: <https://github.com/link-assistant/meta-expression/issues/35>

PR: <https://github.com/link-assistant/meta-expression/pull/36>

## Problem

`Hawaii is a state.` exposed two translation-quality failures:

- Formalization could attach `Q782` to a grammar fragment such as
  `Hawaii is a` instead of only the phrase `Hawaii`.
- English-to-Russian rendering used the previous narrow dash rule and could
  produce partial output instead of `Гавайи это штат.`
- With live default sources, Wikipedia's `State` disambiguation-style result
  and Wikidata's broad `Q7275` label could produce `Гавайи это государство.`
  instead of the U.S.-state predicate `штат`.

The local live reproduction also found a transport-level failure: Node `fetch`
requests to Wikimedia without a descriptive user agent were receiving HTTP 429,
which left translation with unresolved or source-language labels.

## Captured Inputs

The data folder stores the issue, PR, related code searches, workflow captures,
CI-template references, live reproductions, CI logs, and focused test logs:

- [`data/issue-35.json`](./data/issue-35.json)
- [`data/issue-35-body.md`](./data/issue-35-body.md)
- [`data/issue-35-comments.json`](./data/issue-35-comments.json)
- [`data/pr-36.json`](./data/pr-36.json)
- [`data/pr-36-comments.json`](./data/pr-36-comments.json)
- [`data/pr-36-review-comments.json`](./data/pr-36-review-comments.json)
- [`data/pr-36-reviews.json`](./data/pr-36-reviews.json)
- [`data/pr-36-diff-files.txt`](./data/pr-36-diff-files.txt)
- [`data/recent-merged-translation-prs.json`](./data/recent-merged-translation-prs.json)
- [`data/search-formalizeTextWith.json`](./data/search-formalizeTextWith.json)
- [`data/search-translateTextWith.json`](./data/search-translateTextWith.json)
- [`data/js-template-repo.json`](./data/js-template-repo.json)
- [`data/js-template-tree.json`](./data/js-template-tree.json)
- [`data/rust-template-repo.json`](./data/rust-template-repo.json)
- [`data/rust-template-tree.json`](./data/rust-template-tree.json)
- [`data/release-workflow.txt`](./data/release-workflow.txt)
- [`data/links-workflow.txt`](./data/links-workflow.txt)
- [`data/live-formalize-before.md`](./data/live-formalize-before.md)
- [`data/live-formalize-before.json`](./data/live-formalize-before.json)
- [`data/live-translate-before.md`](./data/live-translate-before.md)
- [`data/live-translate-before.json`](./data/live-translate-before.json)
- [`data/live-formalize-after.md`](./data/live-formalize-after.md)
- [`data/live-translate-after.md`](./data/live-translate-after.md)
- [`data/live-translate-after.json`](./data/live-translate-after.json)
- [`data/wikidata-hawaii.headers.txt`](./data/wikidata-hawaii.headers.txt)
- [`data/wikidata-hawaii.body.json`](./data/wikidata-hawaii.body.json)
- [`data/npm-ci.log`](./data/npm-ci.log)
- [`data/npm-test-before.log`](./data/npm-test-before.log)
- [`data/node-issue-35-test.log`](./data/node-issue-35-test.log)
- [`data/node-focused-test.log`](./data/node-focused-test.log)
- [`data/node-issue-35-target-consistency-before.log`](./data/node-issue-35-target-consistency-before.log)
- [`data/node-issue-35-target-consistency-after.log`](./data/node-issue-35-target-consistency-after.log)
- [`data/cargo-test-issue-35-rust-before.log`](./data/cargo-test-issue-35-rust-before.log)
- [`data/cargo-test-issue-35-rust-after.log`](./data/cargo-test-issue-35-rust-after.log)
- [`data/npm-ci-continue.log`](./data/npm-ci-continue.log)
- [`ci-logs/recent-runs.json`](./ci-logs/recent-runs.json)
- [`ci-logs/checks-and-release-26285529955.log`](./ci-logs/checks-and-release-26285529955.log)
- [`ci-logs/checks-and-release-26287486926.log`](./ci-logs/checks-and-release-26287486926.log)
- [`ci-logs/broken-link-checker-26287486920.log`](./ci-logs/broken-link-checker-26287486920.log)

Latest capture: there are no issue comments, five PR conversation comments, no
inline review comments, and no submitted PR reviews. The newest PR comment
requested a full requirements audit rather than a single inline code change.

## Timeline

1. Issue #35 reported that `Hawaii is a state.` could formalize as
   `[Hawaii is a](...) [state](...)` and translate only partially.
2. Local CLI reproduction before the fix showed unresolved live translation:
   `Hawaii - state.`
3. Request tracing isolated a Wikimedia access problem: Node `fetch` without an
   identifying agent returned 429, while an identified request for `Q782`
   returned 200.
4. Code inspection found that every n-gram was searched concurrently, including
   grammar-bound fragments such as `Hawaii is a`, `a state`, and `is a state`.
5. Existing tests documented the older `X is a Y -> X - Y` Russian rule, which
   conflicted with the issue's expected `X это Y` output.
6. Live after-output showed one more semantic ambiguity: `state` selected the
   broad `Q7275` target label `государство`, while the subject `Hawaii`
   supplies the narrower U.S.-state context.
7. The continuation audit found one consistency gap after the sentence output
   was fixed: sentence rendering used `штат`/`Q35657`, but phrase-level target
   metadata and Links Notation could still expose the broader
   `государство`/`Q7275` target.
8. CI investigation preserved the old failed run and the latest passing run.
   The old failure was a dependency-install failure on the placeholder commit;
   the latest checks for `a7a0b15` passed.

## Implemented Slice

- Wikimedia requests now send `Api-User-Agent` everywhere and `User-Agent` in
  Node-compatible runtimes.
- Formalization skips multi-token n-grams containing English or Russian copula
  glue and rejects article-bound fragments that cannot be semantic entities.
- Candidate filtering prevents grammar-glue n-grams from accepting shorter
  entity labels unless the candidate exactly matches the phrase shape.
- Disambiguation-style candidates are demoted so broad article pages do not
  outrank direct Wikidata concepts.
- English-to-Russian sentence rendering now emits `это` for the tested copula
  slice.
- The English-to-Russian rule slice uses the subject description to render
  `X is a state` as `X это штат` when `X` is a U.S. state.
- Rule-based target rewrites now propagate back into the phrase target object,
  CST, Markdown/HTML links, and Links Notation, preserving source concept
  `Q7275` while exposing the refined target concept `Q35657`.
- Russian-to-English rendering adds a narrow back-translation rule for this
  issue's round-trip quality check: `Гавайи это штат.` -> `Hawaii is a state.`
- `tests/issue-35.test.js` verifies identified Wikimedia calls, phrase
  boundaries, target Russian output, refined target ids, and round-trip
  stability.
- `rust` now contains a deterministic issue #35 semantic translation
  fixture, doublet relation records, and C ABI helpers for the involved Q ids.

## Boundary

This PR does not claim a general-purpose machine-translation engine. It fixes
the reported sentence and adds guardrails so the current semantic-label
translator does not overlink grammar fragments. The broader
doublet-backed semantic meta-language and dataset-scale quality loop are
specified in [`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md). The Rust implementation
added here is a narrow parity slice, not a replacement for the JavaScript
translation pipeline.
