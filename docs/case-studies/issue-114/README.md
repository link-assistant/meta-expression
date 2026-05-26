# Issue 114 Case Study

Issue #114 promotes the competitor cases from issue #26 and the parity wiring
from issues #72 and #74 into a measured recurring quality gate.

## Outcome

- `js/tests/fixtures/competitor-quality-gates.json` records the harvested
  competitor datasets, enabled/deferred case counts, and measured pass rates.
- `js/tests/integration/issue-114-competitor-quality-gates.test.js` executes
  every enabled competitor case and checks the recorded scores.
- `npm run test:competitor-gates` runs the issue-specific gate locally.
- `npm run test:acceptance` and `.github/workflows/js.yml` run the same gate in
  the standing no-regression CI path.
- `docs/COMPARISON-CONCEPTS.md` and `docs/COMPARISON-FEATURES.md` now cite the
  measured 2026-05-26 scores.

## Measured Scores

As of 2026-05-26, the competitor gate reports 26/26 enabled cases passing and
26/36 total harvested cases executable, for 72.2% executable coverage.

| Dataset                             | Enabled pass score | Executable coverage |
| ----------------------------------- | ------------------ | ------------------- |
| Arithmetic kernel                   | 10/10              | 10/10               |
| Wikidata structured facts           | 7/7                | 7/7                 |
| Wikidata P570 liveness              | 4/4                | 4/4                 |
| Self-reference and paradoxes        | 3/3                | 3/3                 |
| NL to logic and triple extraction   | deferred           | 0/4                 |
| Disputed-truth corpora              | deferred           | 0/4                 |
| Uniqueness and paraphrase           | 1/1                | 1/2                 |
| Knowledge representation round-trip | 1/1                | 1/2                 |
