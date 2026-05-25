# Implementation status

> Last synced: 2026-05-25 (issue #58). Method: full source read + green
> `npm test` baseline, recorded in
> [`docs/case-studies/issue-58/CODE-AUDIT.md`](./case-studies/issue-58/CODE-AUDIT.md).

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

| Surface                                                                                                     | Status  | Notes                           |
| ----------------------------------------------------------------------------------------------------------- | ------- | ------------------------------- |
| Library (`analyzeStatement`, `formalizeTextWith`, `translateTextWith`, `checkText`, `searchTextUniqueness`) | done    | `js/src/index.js` and friends   |
| CLI (`analyze`/`formalize`/`translate`/`check`/`fact-check`/`uniqueness`)                                   | done    | `js/src/cli.js`                 |
| Microservice                                                                                                | done    | `js/src/server.js`              |
| Static web prototype (7 pages)                                                                              | done    | `web/`                          |
| Rust core (`doublets` encoding, C ABI)                                                                      | partial | no `wasm-bindgen` packaging yet |

## Vision pillars

| Pillar                         | Req                   | Status      | Where it stands today                                                                                                  | Plan / tracking issue                            |
| ------------------------------ | --------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Formalize **any** text         | R10, R45, R51, R58.10 | partial     | Fixture/keyword-driven (`knownRealWorldClaims`); arbitrary text falls back to partial/unknown; AST/CST baseline exists | Generalize the formalizer → #64                  |
| Transform formal expressions   | R52, R58.11           | partial     | Function/object/declarative hooks with trace steps; no general rewrite engine                                          | Links Notation rewrite engine → #65              |
| Naturalize (deformalize)       | R50, R53, R58.12      | partial     | `naturalization` + `deformalization` alias + CST over a rule-table slice                                               | Generalize to arbitrary expressions → #66        |
| Reason about any statement     | R23, R25, R58.13      | partial     | Arithmetic + template inference + self-reference; no entailment/contradiction engine                                   | Reasoning engine via RML → #67                   |
| Calculate probability          | R17, R18, R58.14      | partial     | Weighted evidence → bounded `correctness`/`signedConfidence`                                                           | Reproducible probability via RML → #68           |
| Full computability             | R8, R14, R58.15       | not started | Arithmetic-only evaluator (`evaluateArithmeticExpression`)                                                             | Integrate `relative-meta-logic` → #69 (umbrella) |
| Extract all reasoning metadata | R51, R58.16           | partial     | Parser-free AST/CST + dependency baseline; roles/provenance/versions incomplete                                        | Complete metadata → #70                          |

## Foundation blockers (fix first)

| Blocker                                                     | Req              | Audit | Status      | Issue |
| ----------------------------------------------------------- | ---------------- | ----- | ----------- | ----- |
| Package identity is the template placeholder (`my-package`) | R57, R58.17      | F1    | not fixed   | #60   |
| No `wasm-bindgen` / WASM build                              | R5, R58.18       | F2    | not started | #61   |
| Official `links-notation` / `lino-arguments` not adopted    | R6, R7, R58.19   | F4    | not started | #62   |
| Durable `doublets` storage + Unicode sequences              | R29, R30, R58.20 | —     | not started | #63   |

## Competitor parity

| Item                                                              | Req              | Audit | Status                                   | Issue |
| ----------------------------------------------------------------- | ---------------- | ----- | ---------------------------------------- | ----- |
| Comparison matrices (`COMPARISON-*.md`)                           | R37, R58.21      | —     | done, dated 2026-05-12 (refresh planned) | #71   |
| Execute competitor + formal-ai (706-case) corpora as parity tests | R47, R56, R58.22 | F6    | tracked, not executed                    | #72   |

## Foundation for formal-ai

| Item                                                   | Req    | Status      | Issue |
| ------------------------------------------------------ | ------ | ----------- | ----- |
| OpenAI-shaped, Lino-native compatibility contract      | R58.23 | not started | #73   |
| No-regression acceptance gate as algorithms generalize | R58.24 | not started | #74   |

## How to keep this page in sync

When a pillar or blocker changes state, update its row here, flip the matching
`Status` marker in [`ROADMAP.md`](./ROADMAP.md), and adjust the requirement's
"Current status" in [`REQUIREMENTS.md`](./REQUIREMENTS.md). The audit method
(full source read + green `npm test`) is reproducible from
[`docs/case-studies/issue-58/`](./case-studies/issue-58/).
