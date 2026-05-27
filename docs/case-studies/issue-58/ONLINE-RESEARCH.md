# Online research for issue #58

> Evaluated 2026-05-25 on branch `issue-58-4fd21cb80249`.

Issue #58 instructs us to "search online for additional facts and data" and to
"check known existing components/libraries that solve similar problems or can
help in solutions." This log records what was checked, the source, and the
verdict that feeds [`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md) and
[`ISSUE-PLAN.md`](./ISSUE-PLAN.md).

## A. The formal-ai north star

| Fact                   | Value                                                                                                            | Source                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Tagline                | "100% symbolic, logical, and data driven formal language processor"                                              | `gh repo view link-assistant/formal-ai` |
| Latest release         | `v0.112.0` (Rust), published 2026-05-25                                                                          | GitHub Releases                         |
| Primary representation | Links Notation (`.lino`); every interface exports/imports self-contained Lino memory                             | README                                  |
| Pipeline               | Formalization → Summarization → Deformalization (naturalization)                                                 | README                                  |
| Interfaces             | Rust library, CLI, OpenAI-compatible HTTP (`/v1/chat/completions`, `/v1/responses`), Telegram bot, WASM web demo | README                                  |
| No neural networks     | Deterministic symbolic reasoning only                                                                            | VISION.md                               |
| File hygiene           | `.lino` files kept under 1500 lines                                                                              | README                                  |

**Implication for meta-expression.** formal-ai already ships the
OpenAI-shaped surface and a WASM web demo. For meta-expression to be its
"solid foundation," our formalize/transform/naturalize/reason surface must be
stable, Lino-native, and WASM-buildable (R58.18, R58.23). The upstream test
corpus we track is pinned at `v0.107.0` (issue #54); the project is now at
`v0.112.0`, so the parity fixture is already drifting (feeds R58.22).

## B. `relative-meta-logic` (the intended computation engine, R8/R58.15)

| Fact            | Value                                                                                                               | Source            |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Repository      | `link-foundation/relative-meta-logic`, updated 2026-05-24                                                           | `gh search repos` |
| Tagline         | "A prototype for logic framework that can reason about anything relative to given probability of input statements." | GitHub            |
| Implementations | JavaScript/Node **and** Rust, both on the official `links-notation` parser, identical test suites                   | README            |
| Logic model     | Many-valued: binary → fuzzy; configurable truth range (`[0,1]` or `[-1,1]`), configurable valence                   | README            |
| JS API          | `evaluate()`, `whnf()`, `nf()`, `runTactics()`, `rewrite()`, `simplify()`                                           | README            |
| Rust API        | `whnf()`, `nf()`, `run_tactics()`, `run_tactics_with_options()`                                                     | README            |
| Extras          | CLI, LSP, export to Lean 4 and Rocq; structured diagnostics (`E001` + source spans)                                 | README            |
| npm/crates      | Not yet published to npm (`npm view relative-meta-logic` → 404); consume via git or workspace                       | npm registry      |

**Implication.** RML is a near-perfect fit for R8/R58.15: its truth-range and
valence model lines up with our `correctness` (0..1) and `signedConfidence`
(-1..+1) metrics, and its `evaluate()`/`rewrite()`/`simplify()` cover both
transformation (R58.11) and probability (R58.14). It is dual JS+Rust like us.
Because it is not on npm yet, the adoption issue must plan for a git/workspace
dependency and an adapter that keeps our local arithmetic evaluator as a
fallback (matches the existing R8 "Plan" column).

## C. Links ecosystem packages (foundation fixes R58.19)

| Package                    | Latest                                                | Note                                                                               | Verdict                                                                     |
| -------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `links-notation` (npm)     | `0.13.0` — "Links Notation parser for JavaScript"     | Official parser; we ship a hand-rolled `js/src/lino.js` instead (R7, audit drift). | **adopt** — replace/​back `lino.js` with it; RML and formal-ai both use it. |
| `lino-arguments` (npm)     | `0.3.0` — "Links Notation Environment (lenv) + yargs" | CLI config via Lino; currently unused (R6, audit F4).                              | **adopt** — plan CLI migration.                                             |
| `doublets` (crates.io)     | `0.3.0`, updated 2026-04-18                           | Already a Rust dependency for relation-link encoding.                              | **keep** — extend to durable storage (R29/R30).                             |
| `wasm-bindgen` (crates.io) | `0.2.122`                                             | Not yet a dependency; needed for the React+WASM target (R5, audit F2).             | **adopt** — plan WASM packaging.                                            |

## D. Competitor parity (R58.21 / R58.22)

The competitor set is already enumerated in
[`docs/COMPARISON-CONCEPTS.md`](../../COMPARISON-CONCEPTS.md) and
[`docs/COMPARISON-FEATURES.md`](../../COMPARISON-FEATURES.md) (last checked
2026-05-12), covering seven clusters: automated fact-checking, knowledge
graphs/reasoning, formal verification/logic, NL→logic/entity linking,
uniqueness/plagiarism, AI writing assistants, and graph/links knowledge
representation. The canonical fixtures harvested from those competitors live in
[`docs/case-studies/issue-26/TEST-CASES.md`](../issue-26/TEST-CASES.md).

Two parity gaps stand out for planning:

1. **The harvested competitor fixtures and the 706-case formal-ai corpus are
   tracked but not executed as a parity gate** (audit F6). "Take all the same
   tests for them" means running them, not just recording their identities.
2. **The matrices are dated 2026-05-12 and the corpus is pinned to formal-ai
   `v0.107.0`** while upstream is at `v0.112.0` — both need a refresh and a
   per-missing-feature issue.

## E. Reference systems consulted for the algorithmic pillars

These are not proposed dependencies; they are prior art consulted to keep the
pillar issues concrete (formalization, reasoning, probability):

- **Z3 / SMT-LIB**, **Lean 4**, **Rocq (Coq)** — targets RML already exports to;
  define the "fully computable expression" bar for R58.15.
- **Wolfram Alpha**, **Metamath** — canonical computable-answer corpora already
  cited in issue #26 fixtures.
- **Wikidata / Wikipedia / Wiktionary** — the live evidence and lexical sources
  we already use; the generalization issue (R58.10) extends from the current
  P36/P397/P398/P570 templates to scoped WDQS.

Sources:

- [link-assistant/formal-ai](https://github.com/link-assistant/formal-ai)
- [link-foundation/relative-meta-logic](https://github.com/link-foundation/relative-meta-logic)
- [links-notation on npm](https://www.npmjs.com/package/links-notation)
- [lino-arguments on npm](https://www.npmjs.com/package/lino-arguments)
- [doublets on crates.io](https://crates.io/crates/doublets)
- [wasm-bindgen on crates.io](https://crates.io/crates/wasm-bindgen)
