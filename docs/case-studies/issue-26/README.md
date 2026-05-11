# Case Study: Issue #26 — Survey similar projects, harvest test cases, close the feature gap

> Source: <https://github.com/link-assistant/meta-expression/issues/26>
> Branch: `issue-26-2cbee1cb1be5`
> Pull request: <https://github.com/link-assistant/meta-expression/pull/33>
> Raw issue body archived to [`data/issue-26-body.md`](./data/issue-26-body.md).

## 1. Executive summary

Issue #26 asks for three deliverables that together let us position the
project in the wider ecosystem and reduce its feature gap without diluting
the existing scope:

1. **Concept comparison** of similar projects (open-source and proprietary,
   free and paid, with prices when paid) — published at
   [`docs/COMPARISON-CONCEPTS.md`](../../COMPARISON-CONCEPTS.md).
2. **Feature comparison** of the same set of projects as a tabular matrix
   keyed on every public meta-expression capability — published at
   [`docs/COMPARISON-FEATURES.md`](../../COMPARISON-FEATURES.md).
3. **A first-party catalogue of canonical test cases** harvested from the
   docs and code of those projects, with known inputs and expected
   outputs so that they can be folded into our test suite to lower the
   feature gap — collected under
   [`TEST-CASES.md`](./TEST-CASES.md) and exercised by a new test file
   `tests/issue-26-comparable-fixtures.test.js`.

The issue further mandates this case study under
`docs/case-studies/issue-26/`, with: (a) a complete requirements list, (b)
proposed solution plans per requirement, (c) external research drawing on
docs and code of similar projects, and (d) a survey of existing
components/libraries that could close any gap.

## 2. Why now (motivation)

Meta-expression currently ships nine deterministic example statements
([`src/examples.js`](../../../src/examples.js)) and a roadmap that anchors
each feature on Wikidata, Wikipedia, and Wiktionary. The set is enough for
internal acceptance testing but it is too narrow to:

- Show maintainers and reviewers _which_ widely-cited claim corpora the
  prototype already exercises (e.g. Politifact "Pants on Fire" hits,
  Wolfram Alpha computable knowledge, Z3 SMT canonical examples).
- Demonstrate where we already match the closest commercial systems
  (Consensus.app's `signedConfidence`, Perplexity's citation surface,
  Wolfram Alpha's computable kernel) and where the documented roadmap
  intentionally lags (full NLU, large-scale optimization).
- Catch silent regressions when a comparable system updates its public
  baseline.

The two comparison docs and the harvested fixture set together prove the
prototype's claims are grounded against a survey of _real_ peers, and the
new test file converts those claims into automated assertions that fail
loudly if the prototype regresses.

## 3. Source material

| Path                                                           | Purpose                                                                                 |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [`data/issue-26.json`](./data/issue-26.json)                   | `gh issue view --json` snapshot for reproducibility                                     |
| [`data/issue-26-body.md`](./data/issue-26-body.md)             | Plain-markdown copy of the issue body                                                   |
| [`REQUIREMENTS.md`](./REQUIREMENTS.md)                         | Numbered, atomic requirements derived from the issue                                    |
| [`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md)                       | Per-requirement solution plan with file pointers                                        |
| [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md)                   | External evidence: per-project data, pricing, license, provenance, evaluated 2026-05-11 |
| [`TEST-CASES.md`](./TEST-CASES.md)                             | Canonical first-party-ready test cases harvested from comparable systems                |
| [`../../COMPARISON-CONCEPTS.md`](../../COMPARISON-CONCEPTS.md) | Concept comparison published under `docs/`                                              |
| [`../../COMPARISON-FEATURES.md`](../../COMPARISON-FEATURES.md) | Feature comparison published under `docs/`                                              |

## 4. Scope decisions

- **Comparable projects** are scoped to the seven categories meta-expression
  already touches: automated fact checking, knowledge graphs / reasoning
  systems, formal verification / logic, NL→logic / entity linking,
  uniqueness/plagiarism, AI writing/fact-check assistants, and
  graph/links knowledge representation. Generic LLM chatbots and search
  engines are listed only when they expose a fact-check or
  evidence-attaching surface (e.g. Perplexity citations).
- **Pricing data** is captured at one point in time (2026-05-11). Pricing
  changes are tracked by re-running the research; the comparison docs
  carry the `lastChecked` date in the front matter so drift is visible.
- **Test cases** are restricted to inputs that comparable systems publish
  with a deterministic expected output (e.g. Metamath `2p2e4`, Wolfram
  Alpha "capital of France", Z3 `(= (+ 1 1) 2)`). Disputed-truth claims
  are still added but their assertions check the _shape_ (correctness
  band, evidence link, provenance) rather than a binary truth label.
- **Library survey** is split between dependencies we already have
  (Wikidata, Wikipedia, Wiktionary, doublets) and candidates we explicitly
  rejected (see [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md) §D).

## 5. Outcome (what shipping this fixes)

- Reviewers can answer _“how does meta-expression compare to project X?”_
  with two single-page references.
- The harvested test corpus runs against the existing analysis/check
  pipelines, so regressions in the canonical examples surface as CI
  failures rather than silent drift.
- The case study folder gives future contributors a template for handling
  similar “survey & close the gap” issues (#7 already followed it for
  best-practices/formatters; #26 extends the same template to product
  surface).

## 6. Cross-references

- [`docs/REQUIREMENTS.md`](../../REQUIREMENTS.md): R36 (per-issue case
  study) and R37 (component/library search before implementation) anchor
  this work in the project-wide contract.
- [`docs/ROADMAP.md`](../../ROADMAP.md): Phase 8 (interpretation and
  refinement) and Phase 10 (Wikipedia text evidence) are the explicit
  destinations where the harvested fixtures plug back into the roadmap.
- [`docs/case-studies/issue-7/`](../issue-7/): precedent for in-repo
  comparison documents (formatter & best-practice surveys).
- [`docs/case-studies/issue-21/ONLINE-RESEARCH.md`](../issue-21/ONLINE-RESEARCH.md):
  precedent for an online-research log scoped to a single issue.
