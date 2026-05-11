# Requirements derived from issue #26

Each requirement is atomic, testable, and references the file(s) it
touches. The numbering (R26.x) is local to this case study; the
project-wide REQUIREMENTS document keeps the R1..R49 series.

## A. Concept comparison surface

- **R26.1** Publish `docs/COMPARISON-CONCEPTS.md` listing every project
  meta-expression takes inspiration from or competes with, grouped by
  concept (fact-checking, automated reasoning, formal logic,
  NL→logic, uniqueness, AI assistants, knowledge representation).
- **R26.2** Each entry records: name, 1-line description, license
  (open-source vs proprietary), free/freemium/paid status, exact
  pricing in USD when known, project URL, and the concept(s) it
  covers.
- **R26.3** The doc starts with a `lastChecked` front-matter line and a
  short methodology section explaining how data was harvested.

## B. Feature comparison surface

- **R26.4** Publish `docs/COMPARISON-FEATURES.md` keyed on every
  meta-expression public feature surface (library, CLI, microservice,
  static web; `analyze`, `formalize`, `translate`, `check`,
  `uniqueness`, preference profiles, Links Notation, Doublets storage,
  React/WASM target).
- **R26.5** The matrix columns are the comparable projects identified
  in [`R26.1`](#a-concept-comparison-surface). Cells use the legend
  `✓` (supported), `≈` (partial/adjacent), `—` (not applicable),
  `✗` (explicitly absent).
- **R26.6** The doc cross-links to [`COMPARISON-CONCEPTS.md`](../../COMPARISON-CONCEPTS.md)
  and to the related case study folder for traceability.

## C. Canonical test-case harvest

- **R26.7** Publish `docs/case-studies/issue-26/TEST-CASES.md` listing
  every harvested fixture as a row: source project, input, expected
  output (per project), and what meta-expression should produce
  (`correctness` band, provenance fields).
- **R26.8** At least one fixture is added per comparable system that
  exposes a canonical example, so we can cite the same example in
  pricing/feature discussions.
- **R26.9** A new test file `tests/issue-26-comparable-fixtures.test.js`
  exercises the subset of fixtures that meta-expression already
  supports, and asserts the rest with a deferred-skip pattern that
  documents the gap.

## D. Case study deliverables

- **R26.10** `docs/case-studies/issue-26/README.md` mirrors the layout of
  issue-21 (executive summary, motivation, source material, outcome,
  cross-references).
- **R26.11** `docs/case-studies/issue-26/REQUIREMENTS.md` (this file)
  enumerates R26.x.
- **R26.12** `docs/case-studies/issue-26/SOLUTION-PLAN.md` proposes a
  plan per requirement, each linked to the comparable case-study
  precedents (issue-7, issue-21).
- **R26.13** `docs/case-studies/issue-26/ONLINE-RESEARCH.md` captures the
  raw research log including pricing pages and license URLs.
- **R26.14** `docs/case-studies/issue-26/data/issue-26.json` and
  `issue-26-body.md` archive the raw issue snapshot.

## E. Component/library survey

- **R26.15** [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md) §D includes a
  library survey table with at least one row per category (a library
  considered as a dependency for the corresponding meta-expression
  feature). Each row records license, last-checked version, and a
  reuse verdict (`adopt`, `defer`, `reject`) with rationale.

## F. Documentation & PR hygiene

- **R26.16** Update `docs/REQUIREMENTS.md` to add R49.x entries (or
  follow-up) so the new comparison surfaces are reflected at the
  project level. (Deferred to follow-up PR if the surface stays under
  `docs/` and no API contract changes.)
- **R26.17** PR #33 description links to the four new docs, the test
  file, and the case study.
- **R26.18** PR #33 description includes a checklist mapped to R26.x
  ids and the canonical examples each new fixture is meant to cover.
