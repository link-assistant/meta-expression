# Requirements derived from issue #58

Issue #58 is a meta-planning request. Each requirement below is atomic and
testable. The numbering (`R58.x`) is local to this case study; the
project-wide [`docs/REQUIREMENTS.md`](../../REQUIREMENTS.md) keeps the
`R1..R57` series.

The issue body is archived at [`data/issue-58-body.md`](./data/issue-58-body.md).

## A. Process deliverables (this PR)

- **R58.1** Collect issue data into `docs/case-studies/issue-58/` — the raw
  issue snapshot, body, the full issue list, and the full PR list.
- **R58.2** Produce a deep case-study analysis: `README.md`,
  `REQUIREMENTS.md` (this file), `SOLUTION-PLAN.md`, `ONLINE-RESEARCH.md`,
  `CODE-AUDIT.md`, and `ISSUE-PLAN.md`.
- **R58.3** Search online for additional facts and data about competitors,
  the formal-ai north star, and candidate components/libraries; record the
  log in `ONLINE-RESEARCH.md`.
- **R58.4** List each requirement from the issue (this file) and propose a
  solution plan per requirement (`SOLUTION-PLAN.md`).
- **R58.5** Survey known existing components/libraries that solve a similar
  problem or can help (`ONLINE-RESEARCH.md` §Library survey).

## B. Documentation sync (must come first, per the issue)

> "First make sure we update our documentation to fully track the progress of
> implementation of all the requirements ... everything in docs is in sync
> with actual state of the code."

- **R58.6** Audit every canonical doc against the source and record drift
  ([`CODE-AUDIT.md`](./CODE-AUDIT.md)).
- **R58.7** Refresh `docs/ROADMAP.md`: replace the stale "Current Slice"
  (still describing PR #6) and add a status marker to every phase.
- **R58.8** Extend `docs/REQUIREMENTS.md` to cover the formal-ai era
  (issues #43/#48/#50/#52/#54/#56): add `R50–R57` and widen the source list.
- **R58.9** Add a single progress tracker that maps the vision to the open
  plan (`docs/IMPLEMENTATION-STATUS.md`) and link it from `README.md`.

## C. The vision to be planned as issues

> "create all the issues that needs to be fully implemented, to fully
> implement our vision."

Each algorithmic pillar from the issue becomes a tracked plan:

- **R58.10** **Formalize any text** — generalize formalization beyond the
  fixture/keyword-driven path so arbitrary text reaches a structured-meaning
  links network with extracted metadata (the central unmet goal, audit F5).
- **R58.11** **Transform formal expressions** — promote the transformation
  hooks into a real rewrite/normalization engine over Links Notation.
- **R58.12** **Naturalize (deformalize)** — generalize naturalization from
  the rule-table slice to arbitrary formal expressions back to text.
- **R58.13** **Reason about any formal statement** — add a reasoning engine
  (entailment, contradiction, dependency) beyond arithmetic and templates.
- **R58.14** **Calculate probability** — produce reproducible probability for
  statements from visible evidence and belief configuration.
- **R58.15** **Full computability of each and every statement** — integrate a
  general computation/logic engine (`relative-meta-logic`), not the
  arithmetic-only evaluator (audit F3).
- **R58.16** **Extract all metadata required for any other reasoning step** —
  complete linguistic AST/CST, dependency, role, provenance, and version
  metadata for every statement.

## D. Foundation fixes (blockers — plan first)

> "If you see any critical problems in our code, that blocks our vision from
> execution, we should plan to fix them first."

- **R58.17** Fix package identity so the project is "available as a tool in
  itself": `package.json` name/description/repository still hold template
  placeholders (`my-package`, template repo URL) while docs tell users to
  `import … from 'meta-expression'` (audit F1).
- **R58.18** Add a `wasm-bindgen` / WASM build so the web app can call the
  Rust core and reach the React+WASM target (R5/Phase 2, audit F2).
- **R58.19** Adopt the official `links-notation` parser/formatter dependency
  (R7) and `lino-arguments` in the CLI (R6, audit F4) rather than the
  hand-rolled `lino.js`.
- **R58.20** Move durable state into `doublets`-backed storage with Unicode
  sequences (R29/R30) so reasoning state survives save/load.

## E. Competitor parity

> "Check all competitors, plan for all missing features, take all the same
> tests for them and so on."

- **R58.21** Refresh `docs/COMPARISON-CONCEPTS.md` / `docs/COMPARISON-FEATURES.md`
  and plan an issue per missing feature surfaced by the matrices.
- **R58.22** Execute the upstream formal-ai corpus (706 cases, currently only
  _tracked_ as a fixture) as real parity tests, plus the canonical fixtures
  harvested from competitors in issue #26 (audit F6, "take all the same tests").

## F. Foundation for formal-ai, and a tool in itself

> "this project can be a solid foundation for ... formal-ai, but also
> available as a tool in itself."

- **R58.23** Keep the OpenAI-shaped formalize/transform/naturalize/reason
  surface stable across library, CLI, service, web, and Rust so formal-ai can
  depend on it; track the compatibility contract.
- **R58.24** Generalize and smarten the existing algorithms while preserving
  everything already supported (no regressions): all `R1–R57` acceptance
  examples must keep passing as the engine becomes more general.

## G. Output of this issue

> "As the result I need to have issues created in this repository to represent
> the full plan to make it actually happen."

- **R58.25** Create the GitHub issues that represent the full plan: one
  tracking epic plus child issues for foundation fixes, each algorithmic
  pillar, infrastructure, and competitor parity. Cross-link them from
  [`ISSUE-PLAN.md`](./ISSUE-PLAN.md).
