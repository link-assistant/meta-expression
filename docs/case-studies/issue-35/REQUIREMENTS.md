# Issue #35 Requirements

## R35.1 — Reproduce and preserve the reported failure

The case study must keep the issue body, PR state, comments, relevant searches,
live before-output, and investigation logs under `docs/case-studies/issue-35`.

Status: implemented. Raw artifacts are stored in [`data/`](./data/), including
the issue body, PR metadata, code searches, workflow captures, live CLI output,
Wikimedia HTTP evidence, CI logs, and before/after test logs.

## R35.2 — Keep semantic phrases separate from grammar glue

`Hawaii is a state.` must resolve `Hawaii` to `Q782` and `state` to `Q7275`
without linking `Hawaii is a`, `a state`, or `is a state`.

Status: implemented. Multi-token n-gram filtering and candidate shape checks
reject grammar-fragment matches. `tests/issue-35.test.js` pins the exact search
terms that must not be requested.

## R35.3 — Emit the expected Russian sentence

The fixed translation must produce `Гавайи это штат.` for the issue example.

Status: implemented. The English-to-Russian rule slice now emits
`english-copula-to-russian-eto`, and the U.S.-state predicate slice rewrites
the broad `Q7275` Russian label to `штат` when the subject is a U.S. state.
Issue #16 expectations and repository requirements were updated from the old
dash rendering.

## R35.4 — Identify Wikimedia API requests

Live Wikimedia calls must comply with Wikimedia request identification guidance
so formalization and translation do not fail due to avoidable 403/429 responses.

Status: implemented. Wikimedia fetch helpers send `Api-User-Agent` and, in
Node-compatible runtimes, `User-Agent`.

## R35.5 — Add a concrete round-trip stability check

The issue requests a loop of source -> target -> source -> target until the
translation stabilizes or loss is detected.

Status: implemented for the reported sentence. The new regression test checks
`Hawaii is a state.` -> `Гавайи это штат.` -> `Hawaii is a state.` using
semantic Q ids and a narrow Russian-to-English copula/article rule.

## R35.6 — Preserve links between text parts

The result must keep links between source phrase spans, target phrase labels,
sentence renderings, transformation steps, and formalization data.

Status: implemented and regression-tested. Translation output includes phrase
ids, source ranges, target labels, sentence records, transformation steps, CST,
and Links Notation. Rule-based target rewrites now update phrase target
metadata as well as sentence rendering, so the source `state` phrase remains
`Q7275` while the Russian target predicate is recorded as `штат`/`Q35657`.
The issue #35 tests assert formalization entity ids, target entity ids, and the
`targetId Q35657` Links Notation trace.

## R35.7 — Expand tests before and after the fix

The fix must have deterministic tests that reproduce the problem without live
network dependencies.

Status: implemented. `tests/issue-35.test.js` uses mocked Wikimedia responses
and fails if request identification is removed, if grammar-fragment searches
return, if a Wikipedia disambiguation page outranks the direct state concept,
if phrase target metadata drifts from sentence rendering, or if the target
output regresses. Rust unit tests cover the same issue-sized semantic mapping.

## R35.8 — Research translation-quality data and metrics

The case study must research WMT, MQM, FLORES, COMET, and related components.

Status: implemented in [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md). The
dataset-scale validation plan is documented but not executed in this narrow bug
fix.

## R35.9 — Compare CI/CD template practices

The issue asks to inspect the JavaScript and Rust AI-driven development
pipeline templates and reuse relevant practices.

Status: implemented as a repository/workflow review. Captures are stored in
`data/js-template-*.json`, `data/rust-template-*.json`,
`data/release-workflow.txt`, and `data/links-workflow.txt`. The current
workflow already includes the relevant JS-template practices for changesets,
lint/format, duplication, docs validation, file-line limits, multi-runtime
tests, and link checks.

## R35.10 — Plan the semantic meta-language architecture

The long-term architecture should be
`source language -> semantic meta language -> target language`, with distinct
meanings represented by Wikidata Q/P ids and later doublet links.

Status: partially implemented with a narrow parity slice. JavaScript remains
the main translation pipeline, but `rust/core` now includes a deterministic
issue #35 semantic translation record, source/target phrase Q ids, doublet
relations between sentence nodes and meanings, and C ABI helpers suitable for
WASM exports. The broader doublet-backed rule graph remains staged in
[`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md).
