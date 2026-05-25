# Case Study: Issue #58 — Plan issues to implement our vision fully

> Source: <https://github.com/link-assistant/meta-expression/issues/58>
> Branch: `issue-58-4fd21cb80249`
> Pull request: <https://github.com/link-assistant/meta-expression/pull/59>
> Raw issue body archived to [`data/issue-58-body.md`](./data/issue-58-body.md).

## 1. Executive summary

Issue #58 is a **meta-planning** issue. It asks for two things, in order:

1. **First, sync the documentation with the code** — "make sure everything in
   docs is in sync with actual state of the code."
2. **Then, create all the issues** needed to fully implement the vision — "I
   need to have issues created in this repository to represent the full plan
   to make it actually happen."

The vision is _full computability of every statement_ and the _ability to
formalize any text and extract all metadata_ needed for downstream reasoning,
so that meta-expression is a "solid foundation for
[formal-ai](https://github.com/link-assistant/formal-ai), but also available
as a tool in itself." The algorithms to fully implement are: **formalize,
transform formal expressions, naturalize (deformalize), reason, and calculate
probability.** The issue also asks us to check competitors, plan for missing
features, take the same tests, and **fix critical foundation problems first**.

This PR delivers the documentation sync and the case-study analysis, then
opens the planned issues.

## 2. What this PR delivers

| Deliverable                                        | Where                                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Documentation sync (the issue's first requirement) | `docs/ROADMAP.md`, `docs/REQUIREMENTS.md`, new `docs/IMPLEMENTATION-STATUS.md`, `README.md` pointer |
| Code-vs-docs audit                                 | [`CODE-AUDIT.md`](./CODE-AUDIT.md)                                                                  |
| Requirements list                                  | [`REQUIREMENTS.md`](./REQUIREMENTS.md)                                                              |
| Per-requirement solution plan                      | [`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md)                                                            |
| Online research + library survey                   | [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md)                                                        |
| The catalogue of issues to create                  | [`ISSUE-PLAN.md`](./ISSUE-PLAN.md)                                                                  |
| Raw captured data                                  | [`data/`](./data/)                                                                                  |

## 3. Source material

| Path                                               | Purpose                                            |
| -------------------------------------------------- | -------------------------------------------------- |
| [`data/issue-58.json`](./data/issue-58.json)       | `gh issue view --json` snapshot                    |
| [`data/issue-58-body.md`](./data/issue-58-body.md) | Plain-markdown copy of the issue body              |
| [`data/all-issues.json`](./data/all-issues.json)   | Every issue (#1–#58) for "use all previous issues" |
| [`data/all-prs.json`](./data/all-prs.json)         | Every PR, to trace what shipped                    |

The green `npm test` baseline (76 + 154 + 41 subtests) was captured to the
repository's gitignored `ci-logs/` during the audit; see
[`CODE-AUDIT.md`](./CODE-AUDIT.md) §1.

## 4. The audit, in one paragraph

`npm test` is green (41 unit + 154 integration + 76 e2e subtests, 0 failures).
The code genuinely implements the library/CLI/service/web surfaces, four
formalization levels with an executable gate, exact arithmetic, bounded
`correctness`/`signedConfidence` metrics, live Wikimedia evidence,
`/formalize`, `/translate`, `/check`, `/uniqueness`, `/preferences`, a Links
Notation parser **and** serializer, linguistic AST/CST metadata, transformation
hooks, naturalization, formal-ai prompt translation, and a Rust core with
`doublets` encoding. Four documentation-drift items (D1–D4) and six foundation
problems (F1–F6) were found — see [`CODE-AUDIT.md`](./CODE-AUDIT.md). The drift
is fixed in this PR; the foundation problems become the first issues.

## 5. The plan, in one paragraph

The five algorithmic pillars are today either fixture/keyword-driven
(formalization), hook-only (transformation), or arithmetic-only (computation),
so none generalizes yet. The single biggest lever is adopting
[`relative-meta-logic`](https://github.com/link-foundation/relative-meta-logic)
(JS+Rust, many-valued logic with configurable truth range/valence) as the
computation/reasoning/probability engine, after first fixing the four
foundation blockers (package identity, WASM build, official `links-notation` /
`lino-arguments`, durable `doublets` storage). See
[`ISSUE-PLAN.md`](./ISSUE-PLAN.md) for the full epic + 15-child catalogue.

## 6. Cross-references

- [`docs/REQUIREMENTS.md`](../../REQUIREMENTS.md): project-wide `R1–R57`
  matrix; R36/R37 anchor the case-study-per-issue and library-survey practice.
- [`docs/ROADMAP.md`](../../ROADMAP.md): the 10 phases this plan re-grounds.
- [`docs/IMPLEMENTATION-STATUS.md`](../../IMPLEMENTATION-STATUS.md): the new
  single-page vision tracker added by this PR.
- [`docs/case-studies/issue-26/`](../issue-26/): competitor comparison +
  harvested fixtures reused for the parity issues.
- [`docs/case-studies/issue-54/`](../issue-54/): formal-ai compatibility +
  the 706-case corpus the parity issues will execute.
