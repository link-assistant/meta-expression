# Implementation status

> Last synced: 2026-05-26 (issue #58, after the foundation/pillar/parity batch
> #60–#74 and #87–#96 and the semantic-interlingua rewrite #96 / PR #107
> merged into `main`). Method: full source read + green `npm test` baseline,
> recorded in
> [`docs/case-studies/issue-58/CODE-AUDIT.md`](./case-studies/issue-58/CODE-AUDIT.md)
> and updated in
> [`docs/case-studies/issue-58/NEXT-BATCH.md`](./case-studies/issue-58/NEXT-BATCH.md).

This is the single page that answers "are the docs in sync with the code, and
how far are we from the vision?" It maps the
[vision](https://github.com/link-assistant/meta-expression/issues/58) — _full
computability of every statement and the ability to formalize any text and
extract all metadata_, so the project is a foundation for
[formal-ai](https://github.com/link-assistant/formal-ai) and a tool in itself —
onto the requirement matrix ([`REQUIREMENTS.md`](./REQUIREMENTS.md)) and the
roadmap ([`ROADMAP.md`](./ROADMAP.md)).

Legend: **done** · **partial** · **not started**.

## Public surfaces (shipped)

| Surface                                                                                                     | Status | Notes                                                        |
| ----------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| Library (`analyzeStatement`, `formalizeTextWith`, `translateTextWith`, `checkText`, `searchTextUniqueness`) | done   | `js/src/index.js` and friends                                |
| CLI (`analyze`/`formalize`/`translate`/`check`/`fact-check`/`uniqueness`)                                   | done   | `js/src/cli.js`, official `lino-arguments` parser (#62)      |
| Microservice                                                                                                | done   | `js/src/server.js`                                           |
| Static web prototype (7 pages)                                                                              | done   | `web/`                                                       |
| Rust core (`doublets` encoding, C ABI, `wasm-bindgen` package)                                              | done   | `rust/pkg/` ships generated WASM bindings + JS wrapper (#61) |

## Vision pillars

The first batch (issues #64–#70) shipped a working slice of every pillar; the
remaining work is **generalization and quality**, planned as the next batch
(see [Next batch](#next-batch-issue-58-follow-up)).

| Pillar                         | Req                   | Status  | Where it stands today                                                                                                      | First-batch issue | Next-batch tracking |
| ------------------------------ | --------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------- |
| Formalize **any** text         | R10, R45, R51, R58.10 | partial | Generalized formalizer reaches structured meaning links beyond the keyword path; full explicit linguistic metadata pending | #64 (done)        | R58.30 → #112       |
| Transform formal expressions   | R52, R58.11           | partial | Links Notation rewrite engine applies declarative rules with trace steps                                                   | #65 (done)        | R58.29 → #111       |
| Naturalize (deformalize)       | R50, R53, R58.12      | partial | `naturalize.js` round-trips the semantic meta-language; arbitrary-expression coverage grows with the interlingua           | #66 (done)        | R58.33 → #115       |
| Reason about any statement     | R23, R25, R58.13      | partial | `formal-reasoning.js` adds entailment/contradiction/dependency over the RML adapter                                        | #67 (done)        | R58.33 → #115       |
| Calculate probability          | R17, R18, R58.14      | partial | `probability.js` produces reproducible bounded `correctness`/`signedConfidence` from visible evidence                      | #68 (done)        | —                   |
| Full computability             | R8, R14, R58.15       | partial | `relative-meta-logic-adapter.js` routes computable expressions to RML, arithmetic fallback otherwise                       | #69 (done)        | —                   |
| Extract all reasoning metadata | R51, R58.16           | partial | Parser-backed AST/CST + dependency/role/provenance baseline; full implicit→explicit linguistic detail pending              | #70 (done)        | R58.30 → #112       |

## Foundation blockers (all fixed)

| Blocker                                                  | Req              | Audit | Status | Issue | Next-batch follow-up       |
| -------------------------------------------------------- | ---------------- | ----- | ------ | ----- | -------------------------- |
| Package identity was the template placeholder            | R57, R58.17      | F1    | done   | #60   | —                          |
| `wasm-bindgen` / WASM build                              | R5, R58.18       | F2    | done   | #61   | doublets-web R58.28 → #110 |
| Official `links-notation` / `lino-arguments` not adopted | R6, R7, R58.19   | F4    | done   | #62   | —                          |
| Durable `doublets` storage + Unicode sequences           | R29, R30, R58.20 | —     | done   | #63   | doublets-rs R58.27 → #109  |

## Algorithmic pillar generalization (first batch)

| Pillar issue                                        | Req    | Audit | Status |
| --------------------------------------------------- | ------ | ----- | ------ |
| Generalize formalization → structured meaning links | R58.10 | F5    | done   |
| Links Notation rewrite engine                       | R58.11 | —     | done   |
| Generalize naturalization                           | R58.12 | —     | done   |
| Reasoning engine (entailment/contradiction)         | R58.13 | —     | done   |
| Reproducible probability                            | R58.14 | —     | done   |
| `relative-meta-logic` integration (umbrella)        | R58.15 | F3    | done   |
| Complete reasoning metadata                         | R58.16 | —     | done   |

## Competitor parity

| Item                                                              | Req              | Audit | Status                        | Issue |
| ----------------------------------------------------------------- | ---------------- | ----- | ----------------------------- | ----- |
| Comparison matrices (`COMPARISON-*.md`)                           | R37, R58.21      | —     | done, refreshed 2026-05-26    | #71   |
| Execute competitor + formal-ai (706-case) corpora as parity tests | R47, R56, R58.22 | F6    | done                          | #72   |
| ClaimReview / Schema.org import/export                            | R58.21           | —     | done                          | #87   |
| Evidence provenance as JSON-LD / PROV-O                           | R58.21           | —     | done                          | #88   |
| OpenIE / AMR / SRL formalization providers                        | R58.10           | —     | done                          | #89   |
| Document-level originality reports                                | R58.21           | —     | done                          | #90   |
| Literature-review evidence workflows                              | R58.21           | —     | done                          | #91   |
| Scoped SPARQL + graph-store interchange                           | R29, R58.21      | —     | done                          | #92   |
| Formal proof / solver artifact adapters                           | R58.13           | —     | done                          | #93   |
| Browser + editor writing-assistant surfaces                       | R58.21           | —     | done (grammar quality → #113) | #94   |

## Semantic interlingua (issue #96 / PR #107)

| Item                                                               | Req         | Status | Notes                                                                           |
| ------------------------------------------------------------------ | ----------- | ------ | ------------------------------------------------------------------------------- |
| Id-keyed semantic interlingua (`js/data/semantic-lexicon.json`)    | R53, R58.10 | done   | 328 concepts across en/hi/ru/zh; no source↔target language-pair tables in `src` |
| Guard tests against hardcoded direct-pair translations (JS + Rust) | R58.24      | done   | `issue-96-no-hardcoded-translations.test.js`; Rust fixtures moved out of `src`  |
| Paragraph-level human-reference translation quality gate           | R54         | done   | `issue-96` paragraph gate over the most-viewed-2025 articles                    |

## Foundation for formal-ai

| Item                                                   | Req    | Status | Issue |
| ------------------------------------------------------ | ------ | ------ | ----- |
| OpenAI-shaped, Lino-native compatibility contract      | R58.23 | done   | #73   |
| No-regression acceptance gate as algorithms generalize | R58.24 | done   | #74   |

## Next batch (issue #58 follow-up)

The 2026-05-26 feedback on PR #59 asks us to push translation quality higher
with a fully reconstructed intermediate semantic meta language, eliminate
hardcoded data, and back the meta language with real
[`doublets-rs`](https://github.com/linksplatform/doublets-rs) /
[`doublets-web`](https://github.com/linksplatform/doublets-web). These are
planned as the next batch of issues; see
[`docs/case-studies/issue-58/NEXT-BATCH.md`](./case-studies/issue-58/NEXT-BATCH.md)
for the full analysis.

| Next-batch item                                                                 | Req    | Status      | Issue |
| ------------------------------------------------------------------------------- | ------ | ----------- | ----- |
| Unified on-demand Wikipedia/Wikidata/Wiktionary data source with cached merge   | R58.26 | not started | #108  |
| Adopt real `doublets-rs` as the canonical Rust meta-language store              | R58.27 | not started | #109  |
| Adopt `doublets-web` as the browser meta-language store                         | R58.28 | not started | #110  |
| Eliminate hardcoded data; rule-based automatic overrides with >50% usage policy | R58.29 | not started | #111  |
| Full explicit linguistic metadata + complete interlingua reconstruction         | R58.30 | not started | #112  |
| Multi-language grammar checking (Grammarly-class)                               | R58.31 | not started | #113  |
| Competitor dataset quality gates (their tests/datasets in CI)                   | R58.32 | not started | #114  |
| Highest-quality translation umbrella via the reconstructed interlingua          | R58.33 | not started | #115  |

## How to keep this page in sync

When a pillar, blocker, or next-batch item changes state, update its row here,
flip the matching `Status` marker in [`ROADMAP.md`](./ROADMAP.md), and adjust
the requirement's "Current status" in [`REQUIREMENTS.md`](./REQUIREMENTS.md).
The audit method (full source read + green `npm test`) is reproducible from
[`docs/case-studies/issue-58/`](./case-studies/issue-58/).
