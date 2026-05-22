# Online and Repository Research

Captured on 2026-05-22 for issue #35.

## Wikimedia Request Identification

Wikimedia's User-Agent policy says automated clients should identify themselves
with a descriptive `User-Agent`, and browser JavaScript that cannot set that
header is encouraged to use `Api-User-Agent`.

Sources:

- <https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy/en>

Decision: use both headers where legal. Node-compatible runtimes send
`User-Agent`; every runtime sends `Api-User-Agent`. This matches the local
evidence in `data/wikidata-hawaii.headers.txt`, where an identified request for
Hawaii `Q782` returned HTTP 200.

## WMT Test Sets and Human Evaluation

WMT26's General Machine Translation task includes English -> Russian and
evaluates systems with humans across multiple domains, genres, and modalities.
It also lists prior WMT test sets, NTREX-128, and FLORES-200 as useful
development data.

Sources:

- <https://www2.statmt.org/wmt26/translation-task.html>
- <https://www2.statmt.org/wmt26/mteval-task.html>

Decision: WMT-style data is a good future integration target for regression
jobs, but the current PR should not add large external corpora to the package.
The immediate fix is a small deterministic regression test for the reported
sentence and its round trip.

## MQM

The MQM Council describes Multidimensional Quality Metrics as an analytic
translation-quality evaluation framework that applies to human, machine, and
AI-generated translation. MQM segments source and target text into aligned
translation units and annotates concrete errors rather than relying only on a
single aggregate score.

Sources:

- <https://themqm.org/>
- <https://themqm.org/introduction-to-tqe/an-overview/>

Decision: use MQM concepts for future human-readable error reporting: the
current translation trace already records phrase spans and transformation
steps, which are the data needed to attach future MQM-style accuracy,
fluency, terminology, or grammar findings.

## FLORES-200

The FLORES repository provides the FLORES-200 multilingual evaluation dataset
from the NLLB work. The NLLB paper reports evaluation across more than 40,000
translation directions using the human-translated FLORES-200 benchmark.

Sources:

- <https://github.com/facebookresearch/flores>
- <https://arxiv.org/abs/2207.04672>

Decision: FLORES-200 is the best fit for multilingual smoke and benchmark
coverage once the translator has a real grammar layer. It is not the right
first test fixture for this bug because issue #35 is a phrase-boundary and
request-identification regression.

## COMET and Automatic Metrics

COMET is an open-source neural framework for machine-translation evaluation.
Its current documentation includes reference-based, reference-free, and
explainable models, including XCOMET models that report error spans.

Sources:

- <https://github.com/Unbabel/COMET>

Decision: COMET can help rank target outputs in a future benchmark job, but it
should not replace deterministic unit tests for known semantic-label bugs. The
reported issue needs exact Q-id phrase boundaries and exact expected text.

## Existing Components and Libraries

Candidate helpers considered:

- Wikimedia Action API: already used directly through `fetch()`.
- `wikibase-sdk`: useful URL builder, but unnecessary for the small API surface.
- `sacrebleu`: useful for WMT/FLORES corpus-level scoring later.
- COMET: useful for future neural scoring and span-level diagnostics.
- doublet-rs/doublet-web: target substrate for the semantic meta-language
  layer, not needed for this narrow bug fix.
- Rust/WASM: appropriate for deterministic semantic records that should remain
  available outside the JavaScript runtime.

Decision: add no runtime dependency in this PR. The JavaScript fix stays inside
the existing formalize/translate fetch, CST, and rule-table architecture, while
the Rust core gets a narrow issue #35 semantic fixture and ABI-safe Q-id helper
functions.

## CI/CD Template Review

The package metadata still points at the JavaScript AI-driven development
pipeline template, and the captured `release.yml` already contains the relevant
best practices: change detection, changeset validation for code changes,
lint/format/duplication checks, documentation validation, file-line limits,
manual version-change protection, secret scanning, and Node/Bun/Deno tests
across Ubuntu, macOS, and Windows.

The Rust template is relevant for the issue's Rust/WASM work. The current
repository already has a `rust-check` job gated on Rust file changes, so the
new Rust core fixture is covered without a workflow change.

Captured data:

- [`data/js-template-repo.json`](./data/js-template-repo.json)
- [`data/js-template-tree.json`](./data/js-template-tree.json)
- [`data/rust-template-repo.json`](./data/rust-template-repo.json)
- [`data/rust-template-tree.json`](./data/rust-template-tree.json)
- [`data/release-workflow.txt`](./data/release-workflow.txt)
- [`data/links-workflow.txt`](./data/links-workflow.txt)
