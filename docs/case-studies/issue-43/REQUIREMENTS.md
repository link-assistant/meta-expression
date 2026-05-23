# Issue #43 Requirements Audit

## Reported Requirements

| Requirement                                                                                                     | Status      | Notes                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pull the top 10 most-viewed Wikipedia articles for the current month.                                           | Implemented | `tests/fixtures/issue-43/articles.json` records the April 2026 snapshot, captured deterministically so the integration test does not depend on live HTTP.                                                                             |
| For each article, pick the two biggest language versions by character count.                                    | Implemented | `selectLanguagePair()` (in `src/translation-quality.js`) sorts `article.languages` by recorded length and returns the largest as the source.                                                                                          |
| Take the first statement, translate to the target language, search the target article for it.                   | Implemented | `extractFirstStatement()` plus `assessArticleTranslation()` walk the pipeline once per article.                                                                                                                                       |
| If not found, allow skip-list (Wikipedia divergence) and translation-fixes (project-side fix to push upstream). | Implemented | `skipList` and `translationFixes` options consume curated entries; statuses `skipped` and `translation-fix` short-circuit before the failure path.                                                                                    |
| Mark as failure when not found and not round-trip stable.                                                       | Implemented | Status `failed` is the default when round-trip coverage stays below the threshold. The integration test asserts `summary.failed === 0`.                                                                                               |
| The integration test must be impossible to pass without real fixes.                                             | Implemented | Every captured article must be curated (skipped, fixed, or matched). The skip-list cross-check test rejects stale skip entries that no longer match any captured statement.                                                           |
| Implement translation as `source --formalization-> semantic meta language --naturalization-> target`.           | Implemented | `translateTextWith()` returns `semanticMetaLanguage`, `naturalization`, and the same naturalization step inside `cst.naturalization`. Asserted in `tests/issue-43.test.js`.                                                           |
| Update library.                                                                                                 | Implemented | `src/translation-quality.js` and re-exports through `src/index.js` and `src/index.d.ts`.                                                                                                                                              |
| Update CLI.                                                                                                     | Implemented | `translation-quality` subcommand in `src/cli.js` with `summary` and `json` formats.                                                                                                                                                   |
| Update web app.                                                                                                 | Implemented | `web/translate-samples.js` exposes the Artemis II and Michael Jackson leads as one-click Translate samples.                                                                                                                           |
| Mirror in Rust core.                                                                                            | Implemented | `rust/src/lib.rs` exposes `extract_first_statement`, `tokenize_for_match`, `token_coverage`, `normalize_statement_key`, the `TranslationQualityStatus` enum, and the `meta_expression_translation_quality_status_code` C ABI surface. |
| Tests at all levels: unit, integration, CLI, e2e.                                                               | Implemented | `tests/issue-43.test.js` covers unit helpers, status routing, CLI happy/sad paths, Wikipedia integration, and the skip-list cross-check. Rust unit tests under `rust/tests/unit/` cover the mirrored helpers.                         |
| Compile case study under `docs/case-studies/issue-43`.                                                          | Implemented | This document, `README.md`, `SOLUTION-PLAN.md`, `ONLINE-RESEARCH.md`, plus the captured data folder.                                                                                                                                  |
| Compare CI/CD with the AI-driven-development pipeline templates and adopt improvements.                         | Deferred    | The CI restructuring is larger than the quality gate and risks unrelated churn; tracked as follow-up work in `SOLUTION-PLAN.md`.                                                                                                      |
| Restructure repository into `js/src`, `rust/src`, wasm-first web, separate workflows.                           | Deferred    | Same rationale as issue #41: out of scope for the translation-quality fix and tracked as follow-up.                                                                                                                                   |
| Push translation fixes back to Wikipedia.                                                                       | Deferred    | The curated translation-fixes file is the staging area; the actual upstreaming process is left as a future workflow.                                                                                                                  |

## Verification Evidence

- `data/npm-test.log`: full Node test suite passing with 0 failed translation-quality assessments.
- `data/cargo-test.log`: Rust core unit tests passing including the 8 new translation-quality tests.
- `data/npm-check.log`: lint, formatting, duplication, and docs checks passing.
- `data/translation-quality-cli.log`: CLI summary output against the captured fixture.
- `tests/fixtures/issue-43/articles.json`: the deterministic top-views snapshot.
- `tests/fixtures/issue-43/skip-list.json`: curated Wikipedia divergence notes.
- `tests/fixtures/issue-43/translation-fixes.json`: curated translations the project intends to push back upstream.

## Deferred Work

CI workflow restructuring, repository layout, and the Wikipedia upstreaming
workflow are left for follow-up work as described in
[`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md). They are real requirements from the
issue body but they are independent of the quality gate, and bundling them
here would risk breaking unrelated releases.
