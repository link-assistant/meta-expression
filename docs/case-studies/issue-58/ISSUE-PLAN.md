# Issue plan for issue #58

This is the catalogue of GitHub issues that represent "the full plan to make
it actually happen" (R58.25). Issue #58 itself becomes the tracking **epic**.

Ordering follows the issue's guidance: **foundation fixes first** (they block
the vision), then the algorithmic pillars, then parity and the formal-ai
foundation contract.

> The "Issue" column is filled in once the issues are created on GitHub.
> Labels are drawn from the repository's available set (`enhancement`,
> `bug`, `documentation`, `help wanted`). No milestones exist in the repo.

## Epic

| Issue      | Title                                     | Requirement  |
| ---------- | ----------------------------------------- | ------------ |
| #58 (this) | Plan issues to implement our vision fully | R58.1–R58.25 |

## Group 1 — Foundation fixes (do first)

| Issue | Title                                                                             | Req    | Audit | Labels             |
| ----- | --------------------------------------------------------------------------------- | ------ | ----- | ------------------ |
| #60   | Foundation: fix package identity so meta-expression is publishable as a tool      | R58.17 | F1    | bug, documentation |
| #61   | Foundation: add `wasm-bindgen` / WASM build so the web app can call the Rust core | R58.18 | F2    | enhancement        |
| #62   | Foundation: adopt official `links-notation` parser and `lino-arguments` CLI       | R58.19 | F4    | enhancement        |
| #63   | Foundation: durable `doublets`-backed storage with Unicode sequences              | R58.20 | —     | enhancement        |

## Group 2 — Algorithmic pillars

| Issue | Title                                                                                | Req    | Audit | Labels      |
| ----- | ------------------------------------------------------------------------------------ | ------ | ----- | ----------- |
| #64   | Pillar: generalize formalization so any text reaches structured meaning links        | R58.10 | F5    | enhancement |
| #65   | Pillar: transform formal expressions with a Links Notation rewrite engine            | R58.11 | —     | enhancement |
| #66   | Pillar: generalize naturalization (deformalization) for arbitrary formal expressions | R58.12 | —     | enhancement |
| #67   | Pillar: reason about any formal statement (entailment, contradiction, dependency)    | R58.13 | —     | enhancement |
| #68   | Pillar: calculate reproducible probability for any statement                         | R58.14 | —     | enhancement |
| #69   | Pillar: integrate `relative-meta-logic` for full computability (umbrella)            | R58.15 | F3    | enhancement |
| #70   | Pillar: extract all reasoning metadata (AST/CST, roles, provenance, versions)        | R58.16 | —     | enhancement |

## Group 3 — Competitor parity

| Issue | Title                                                                                 | Req    | Audit | Labels                     |
| ----- | ------------------------------------------------------------------------------------- | ------ | ----- | -------------------------- |
| #71   | Parity: refresh competitor comparison matrices and file one issue per missing feature | R58.21 | —     | documentation, enhancement |
| #72   | Parity: execute competitor + formal-ai (706-case) corpora as real parity tests        | R58.22 | F6    | enhancement                |

## Group 4 — Formal-AI foundation contract

| Issue | Title                                                                                 | Req    | Audit | Labels                     |
| ----- | ------------------------------------------------------------------------------------- | ------ | ----- | -------------------------- |
| #73   | Foundation-for-formal-ai: track the OpenAI-shaped, Lino-native compatibility contract | R58.23 | —     | documentation, enhancement |
| #74   | Quality gate: no-regression acceptance suite as algorithms generalize                 | R58.24 | —     | enhancement                |

## Notes

- Every child issue links back to epic #58 with `Part of #58` and cites its
  requirement id(s) and audit finding(s) from
  [`CODE-AUDIT.md`](./CODE-AUDIT.md).
- Foundation issues (#60–#63) are marked as blockers for the pillar issues
  that depend on them (e.g. #69 depends on #62; #61 unblocks the React+WASM
  app work in `docs/ROADMAP.md` Phase 9).
- The pillar umbrella #69 (`relative-meta-logic`) is the parent of the
  reasoning/transformation/probability children (#65, #67, #68) since RML
  supplies `rewrite()`, `evaluate()`, and the truth-range/valence model.
