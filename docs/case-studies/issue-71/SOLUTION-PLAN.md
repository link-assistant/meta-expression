# Solution plan for issue #71

> Last checked: 2026-05-26.

## 1. Reproduce the stale-doc failure

Add a documentation unit test that expects:

- issue-71 research and missing-feature files,
- 2026-05-26 `Last checked` dates in both comparison docs,
- a feature-matrix section for competitor-derived follow-up issues.

## 2. Refresh public competitor facts

Use the issue #26 matrix as the baseline, re-open the public vendor and project
URLs, and record only the changes or confirmations that matter for parity.

## 3. Update comparison docs

Re-date `COMPARISON-CONCEPTS.md` and `COMPARISON-FEATURES.md`, update pricing
rows that changed or could no longer be verified publicly, and link the new
research log.

## 4. File missing-feature issues

Translate the refreshed gaps into focused child issues. Reuse existing sibling
issues when they already own a gap, and avoid filing generic umbrella issues
when the competitor pressure points to a specific surface.

## 5. Verify

Run the documentation test, then the relevant repository checks for the files
touched by this PR. The PR is complete only when the test protects the refreshed
dates and ledger.
