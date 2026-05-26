# Requirements for issue #71

> Last checked: 2026-05-26.

## R71.1 Re-check competitor facts

Every competitor listed in `docs/COMPARISON-CONCEPTS.md` must be re-checked
against public project or vendor pages for:

- license or ownership posture,
- free, paid, quote-based, or unavailable pricing,
- capability overlap with meta-expression.

## R71.2 Re-date comparison matrices

`docs/COMPARISON-CONCEPTS.md` and `docs/COMPARISON-FEATURES.md` must both carry
`Last checked: 2026-05-26`.

## R71.3 Preserve an audit trail

The refresh must have an issue-specific research log at
`docs/case-studies/issue-71/ONLINE-RESEARCH.md`. The original issue #26 log
remains the baseline.

## R71.4 File child issues for missing features

Each competitor-derived missing feature must be tracked by a focused GitHub
issue and linked from `docs/case-studies/issue-71/MISSING-FEATURES.md`.

## R71.5 Keep the matrix maintainable

The feature matrix must link to the missing-feature ledger so future updates can
distinguish shipped meta-expression advantages from parity gaps.

## R71.6 Add a documentation regression

A unit test must fail when the comparison docs are stale, the issue-71 research
log is missing, or the missing-feature ledger is removed.
