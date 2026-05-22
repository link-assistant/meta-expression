# Issue #41 Solution Plan

## Implemented in This PR

1. Capture the issue, PR, comments, related code search, live before state, and
   focused failing test logs under `docs/case-studies/issue-41/data`.
2. Reproduce the bad output with mocked Wikimedia responses:
   `Найти синонимы или` resolves to Q4616 and `примеры согласования` resolves
   to Q2523390 when snippet-only evidence is trusted.
3. Tighten formalization candidate acceptance:
   - direct label, match text, or alias equality is accepted,
   - label/match prefix evidence is accepted for multi-token phrases,
   - non-Latin single-token candidates require direct evidence,
   - Russian glue words such as `или` block bad phrase boundaries.
4. Add Russian-to-English lexical fallback entries for the reported phrase
   class.
5. Add a Russian genitive phrase rule for `примеры X` -> `examples of X`.
6. Verify the fix against issue #41 and adjacent Translate/formalization tests.

## Follow-Up Work

1. Move glossary data out of code into a repository/user override format so
   users can extend lexical translations without JavaScript changes.
2. Add source-specific confidence fields to candidates so snippet-only hits can
   still be shown as weak alternatives instead of being silently discarded.
3. Add language-specific stop-word sets rather than extending the shared set in
   place.
4. Add a broader Russian-to-English morphology pass for common genitive and
   plural forms.
5. Split the architecture and CI/CD requests from the issue body into dedicated
   issues or PRs:
   - JavaScript package layout under `js/src`,
   - Rust package layout under `rust/src`,
   - wasm-first web execution,
   - separate `js.yml` and `rust.yml` workflows,
   - cache policy changes for IndexedDB/localStorage.

## Risk Notes

The formalization change intentionally reduces aggressive linking. That can
leave more phrases unresolved or glossary-translated, but it avoids presenting
full-text snippet coincidences as precise entity meanings.
