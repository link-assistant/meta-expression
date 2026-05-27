# Solution plan for issue #58

This plan proposes a solution for each requirement in
[`REQUIREMENTS.md`](./REQUIREMENTS.md). Because issue #58 is a _planning_
issue, "solution" here means two things:

1. the documentation-sync work delivered **in this PR** (groups A/B), and
2. the GitHub issues to be **created** so the vision is fully tracked
   (groups C–G), catalogued in [`ISSUE-PLAN.md`](./ISSUE-PLAN.md).

File paths are anchored to the repository root.

## Phase 1 — Case-study deliverables (R58.1–R58.5)

Touches: `docs/case-studies/issue-58/**`.

1. Capture raw data with `gh` into `data/`: `issue-58.json`,
   `issue-58-body.md`, `all-issues.json`, `all-prs.json`. _(done)_
2. Write `CODE-AUDIT.md` from a full read of the sources plus a green
   `npm test` baseline. _(done)_
3. Write `REQUIREMENTS.md`, `ONLINE-RESEARCH.md` (with the library survey),
   this `SOLUTION-PLAN.md`, and `ISSUE-PLAN.md`, then `README.md` to tie them
   together.

Verification: the files exist and cross-link; `scripts/check-file-line-limits.sh`
exempts `docs/case-studies/`.

## Phase 2 — Documentation sync (R58.6–R58.9) — _delivered in this PR_

The issue is explicit that docs come first. This PR ships:

1. **`docs/ROADMAP.md`** — rewrite "Current Slice" to reflect everything
   shipped through issue #56 (formalize, translate, check, uniqueness,
   preferences, formal-ai hooks, naturalization, linguistic metadata, corpus
   tracking); add a one-line **Status** marker to each of the 10 phases
   (done / partial / not started); add a "Formal-AI Foundation Track" note.
2. **`docs/REQUIREMENTS.md`** — add the source issues #43/#48/#50/#52/#54/#56
   and append `R50–R57` for the formal-ai era (naturalization/deformalization,
   linguistic AST/CST metadata, transformation hooks, translation-quality
   gate, semantic-meta-language pipeline, upstream-corpus tracking, formal-ai
   prompt translation).
3. **`docs/IMPLEMENTATION-STATUS.md`** (new) — one progress tracker mapping the
   five vision pillars + foundation fixes to their requirement IDs, current
   state, and the planned issue. This is the single "are we in sync?" page.
4. **`README.md`** — add a pointer to `IMPLEMENTATION-STATUS.md`.

Verification: `npm run check` (lint + format + docs) and the existing
`documentation` tests stay green; no API contract changes.

## Phase 3 — Foundation-fix issues (R58.17–R58.20) — _planned first_

Per "fix critical problems first," these are filed as the highest-priority
children of the epic. Each maps to an audit finding (F1–F6):

| Plan                     | Requirement | Audit | Sketch                                                                                                                                                                                            |
| ------------------------ | ----------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package identity         | R58.17      | F1    | Set `package.json` `name`/`description`/`repository` to the real `meta-expression` values; retitle `CONTRIBUTING.md`; confirm `docs:formalize` import line works; verify `npm publish --dry-run`. |
| WASM build               | R58.18      | F2    | Add `wasm-bindgen` (0.2.122), a `wasm-pack`/`cargo` build script, and a thin JS wrapper; parity test JS vs WASM for the acceptance examples.                                                      |
| Official Links Notation  | R58.19      | F4    | Adopt `links-notation` (0.13.0) behind `lino.js`'s API; adopt `lino-arguments` (0.3.0) in the CLI; keep current output snapshots.                                                                 |
| Durable Doublets storage | R58.20      | —     | Map links/refs/roles/provenance/versions + Unicode sequences into `doublets`; save/load tests.                                                                                                    |

## Phase 4 — Algorithmic-pillar issues (R58.10–R58.16)

One epic-child per pillar, each building on the existing prototype rather than
replacing it (R58.24 — no regressions; all `R1–R57` acceptance examples keep
passing):

1. **Formalize any text (R58.10, F5).** Replace the fixture/keyword path
   (`knownRealWorldClaims`) with a general formalizer: tokenize → linguistic
   AST/CST → candidate meaning links → typed metadata, falling back to
   `PARTIAL_FORMAL_EXPRESSION` with explicit variables/questions (never silent
   guesses). Reuse the issue #54 linguistic-metadata baseline.
2. **Transform formal expressions (R58.11).** Promote the
   `transformation-rules.js` hooks into a rewrite engine over Links Notation;
   adopt RML's `rewrite()`/`simplify()` semantics.
3. **Naturalize / deformalize (R58.12).** Generalize the rule-table
   naturalizer to render arbitrary formal expressions back to text; keep the
   `deformalization` alias and CST.
4. **Reason about any statement (R58.13).** Add entailment/contradiction/
   dependency reasoning via RML `evaluate()`/`runTactics()`; keep self-
   reference undetermined.
5. **Calculate probability (R58.14).** Map RML's configurable truth range and
   valence onto `correctness`/`signedConfidence`; keep confidence bounded away
   from 0/100% for real-world claims; show every input.
6. **Full computability (R58.15, F3).** Integrate `relative-meta-logic` as the
   computation engine via an adapter; retain the arithmetic evaluator as a
   documented fallback. This is the umbrella for #2–#5.
7. **Extract all metadata (R58.16).** Complete the AST/CST + dependency + role
   - provenance + version metadata for every statement so downstream reasoning
     steps have what they need.

## Phase 5 — Competitor-parity issues (R58.21, R58.22)

1. Refresh `COMPARISON-CONCEPTS.md` / `COMPARISON-FEATURES.md` (re-date,
   re-check pricing) and open one issue per missing feature.
2. **Execute** the harvested competitor fixtures (issue #26 `TEST-CASES.md`)
   and the 706-case formal-ai corpus as real parity tests; re-pin the corpus
   from `v0.107.0` to the current upstream release.

## Phase 6 — Foundation-for-formal-ai issues (R58.23, R58.24)

1. Track the OpenAI-shaped formalize/transform/naturalize/reason compatibility
   contract (Lino-native, WASM-buildable) so formal-ai can depend on us.
2. A standing "no-regression" gate: the `R1–R57` acceptance examples and the
   parity corpus must stay green as algorithms generalize.

## Phase 7 — Epic + issue creation (R58.25) — _the output of this issue_

After the docs land, create the tracking epic and child issues described in
[`ISSUE-PLAN.md`](./ISSUE-PLAN.md), label them, and cross-link them under the
epic. The epic links back to this case study.

## Existing components/libraries surveyed

See [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md) §B–§C for full notes:

- **`relative-meta-logic`** (JS+Rust, git) — **adopt** as the computation /
  reasoning / probability engine (R58.13–R58.16).
- **`links-notation`** (npm 0.13.0) / **`lino-arguments`** (npm 0.3.0) —
  **adopt** to replace the hand-rolled parser and CLI arg handling.
- **`doublets`** (crates.io 0.3.0) — **keep**, extend to durable storage.
- **`wasm-bindgen`** (crates.io 0.2.122) — **adopt** for the WASM build.
