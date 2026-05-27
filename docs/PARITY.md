# JavaScript ↔ Rust Parity Map

`meta-expression` ships **two engines** that implement the same core logic:

- the **pure-JavaScript engine** under [`js/src/`](../js/src), which is the
  reference implementation and powers the CLI, the Node server, and the web
  prototype out of the box; and
- the **Rust core** under [`rust/src/`](../rust/src), compiled to WebAssembly
  with `wasm-bindgen` (`npm run build:wasm` → `rust/pkg/`) and loaded in the
  browser through [`js/src/wasm-core.js`](../js/src/wasm-core.js).

This document is the authoritative correspondence map between the two engines.
It records which files mirror each other, which pairs the CI guardrail forces
to change together, where the UI lets a reader pick an engine, and which
JavaScript modules are intentionally **not** mirrored yet (and why). It exists
because issue #126 showed how easy it is to fix a bug in one engine and forget
the other, leaving them silently out of sync.

## The Rust core surface

The Rust core is exposed to JavaScript through `wasm-bindgen` exports in
[`rust/src/wasm.rs`](../rust/src/wasm.rs) and wrapped by
[`js/src/wasm-core.js`](../js/src/wasm-core.js), which presents a small,
JSON-marshalled API:

| `createWasmCore()` method     | Rust export (`wasm.rs`)          | Backing module          |
| ----------------------------- | -------------------------------- | ----------------------- |
| `createStatementDraft`        | `createStatementDraftJson`       | `analysis.rs`           |
| `selectInterpretation`        | `selectInterpretationJson`       | `analysis.rs`           |
| `formalizeStatement`          | `formalizeStatementJson`         | `analysis.rs`           |
| `evaluateStatement`           | `evaluateStatementJson`          | `analysis.rs`           |
| `analyzeStatement`            | `analyzeStatementJson`           | `analysis.rs`           |
| `statementConfidence`         | `statementConfidence`            | `analysis.rs`           |
| `serializeLinksNotation`      | `serializeLinksNotation`         | `analysis.rs`           |
| `translateKnownSemanticText`  | `translateKnownSemanticTextJson` | `lib.rs` + `issue52.rs` |
| `naturalizeFormalExpression`  | `naturalizeFormalExpression`     | `formal_ai_support.rs`  |
| `deformalizeFormalExpression` | `deformalizeFormalExpression`    | `formal_ai_support.rs`  |

`analyzeStatement(input, interpretationIndex)` returns only the **headline**
analysis fields — `status`, `selectedInterpretation`, `formalization`,
`result`, `resultLink`, and `linksNetwork`. The JavaScript-only enrichment used
by the auxiliary UI panels (`alternatives`, `dependencies`, `definitions`,
`confirmations`, `refutations`, `opposite`, `reasoningSteps`,
`reasoningStrategy`, plus belief/strategy effects) is **not** produced by Rust.
This is by design — see [Engine selection in the UI](#engine-selection-in-the-ui).

## Module correspondence map

Each row pairs a Rust module with the JavaScript module(s) implementing the same
logic. The **Co-change enforced** column marks pairs listed in
[`scripts/js-rust-parity.json`](../scripts/js-rust-parity.json), which the CI
guardrail forces to change together (see below).

| Rust module (`rust/src/`)    | JavaScript (`js/src/`)                                               | Scope                                                                                                                                           | Co-change enforced |
| ---------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `analysis.rs`                | `index.js`                                                           | Statement draft → interpretation → formalization → evaluation pipeline                                                                          | no¹                |
| `statement_formalization.rs` | `statement-formalization.js`                                         | Formal-expression construction and links-notation serialization                                                                                 | no¹                |
| `formalize_contexts.rs`      | `formalize-contexts.js`                                              | Issue #126 context decisions: scholarly-article rejection, per-word context breakdown, persistent context-selection questions, sense re-pinning | **yes**            |
| `semantic_lexicon.rs`        | `semantic-lexicon.js`                                                | Interlingua glossary derived from `js/data/semantic-lexicon.json`                                                                               | **yes**            |
| `formal_ai_support.rs`       | `naturalize.js`, `transformation-rules.js`, `linguistic-metadata.js` | Naturalize/deformalize formal expressions, text transformation rules, linguistic metadata extraction                                            | no¹                |
| `doublets_store.rs`          | `doublets.js`                                                        | Doublets (links) encode/decode and JSON-value round-tripping                                                                                    | no¹                |
| `wikimedia_plan.rs`          | `wikimedia-fetch.js`                                                 | Wikidata entity batching and cache-TTL planning                                                                                                 | no¹                |
| `issue52.rs`                 | `translate.js` (issue-52 corpus)                                     | Known semantic-translation sentences/relations for the issue-52 corpus                                                                          | no¹                |
| `reference_data.rs`          | `js/data/*.json`                                                     | Shared reference data (stopwords, issue-35 labels, genitive triggers)                                                                           | no¹                |
| `wasm.rs`                    | `wasm-core.js`                                                       | wasm-bindgen ↔ JS binding layer (the contract is pinned by tests)                                                                               | no²                |

¹ These pairs are mirrored and covered by the parity test corpus
(`js/tests/integration/issue-61-wasm.test.js`, `issue-72-parity.test.js`), but
are **not** yet in the co-change manifest. Adding them is tracked as future
work; the issue #126 follow-up added the two highest-risk pairs first.

² The binding layer is enforced structurally instead: `createWasmCore()` throws
if any expected export is missing, and the WASM integration test fails the build
if the surface drifts.

## CI guardrail: engines change together

[`scripts/check-js-rust-parity.mjs`](../scripts/check-js-rust-parity.mjs)
(`npm run check:parity`, part of `npm run check`) reads the manifest and, for
every declared pair, **fails any pull request that changes one side without the
other**. It determines the changed file set from (first match wins):

1. `--changed a,b,c` argument (used by tests),
2. `PARITY_CHANGED_FILES` environment variable,
3. `GITHUB_BASE_SHA` + `GITHUB_HEAD_SHA` (CI on `pull_request`),
4. `--base <ref>` → `git diff <ref>...HEAD`,
5. a merge commit at `HEAD` → `git diff HEAD^1 HEAD^2`.

When no pull-request diff is available it validates only that every manifest
path exists, so the manifest can never rot into pointing at deleted files. The
guardrail runs in CI on every pull request, so a future change to
`js/src/formalize-contexts.js` that forgets `rust/src/formalize_contexts.rs`
(or vice versa) is rejected before merge — the exact class of mistake issue #126
warned about.

### Adding a newly mirrored pair

1. Port the logic in **both** languages, keeping file/folder names aligned
   (`js/src/foo-bar.js` ↔ `rust/src/foo_bar.rs`).
2. Append a `{ id, description, js, rust }` entry to
   `scripts/js-rust-parity.json`.
3. Add a row to the [correspondence map](#module-correspondence-map) above.
4. Run `npm run check:parity` to confirm the manifest paths resolve.

## Engine selection in the UI

The web prototype lets a reader switch engines from a global **Engine**
selector in the top navigation (`#engine-select`, persisted in `localStorage`
under `meta-expression.engine.v1`). A result-band badge (`#engine-badge`)
reports the engine actually used for the current render: `JavaScript`,
`Rust (WASM)`, `loading Rust…`, or `JavaScript (Rust unavailable)`.

The JavaScript engine always runs — it supplies the auxiliary panels and the
belief/strategy effects. When **Rust (WASM)** is selected, the Rust core
recomputes the headline fields and they overlay the JavaScript ones via
`overlayWasmAnalysis` ([`web/engine.js`](../web/engine.js)); any failure or a
not-yet-loaded core falls back to JavaScript gracefully. The routing lives in
[`web/engine-ui.js`](../web/engine-ui.js) (`setupEngineRuntime`).

| Page        | Engine selectable | Reason                                                                                             |
| ----------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| **Analyse** | **yes**           | Uses `analyzeStatement`, which the Rust core mirrors at the headline-field granularity.            |
| **Compare** | **yes**           | Each claim is analysed with the same mirrored `analyzeStatement`; the engine runtime is injected.  |
| Check       | no (JS only)      | Drives the async Wikimedia evidence pipeline (`check.js`), which the Rust core does not mirror.    |
| Uniqueness  | no (JS only)      | Originality scoring over a corpus (`uniqueness.js`) has no Rust counterpart yet.                   |
| Formalize   | no (JS only)      | Renders the full multi-provider formalization tree (`formalize.js`) beyond the headline surface.   |
| Translate   | no (JS only)      | Network-bound disambiguation/translation pipeline; Rust mirrors only `translateKnownSemanticText`. |

"Engine selection in the UI in all places" therefore means **every page whose
primary operation the Rust core mirrors** (Analyse and Compare). Pages that
depend on JavaScript-only pipelines stay on JavaScript until those pipelines are
ported; when they are, add a row here and wire the engine runtime into the
page's setup the same way Analyse and Compare do.
