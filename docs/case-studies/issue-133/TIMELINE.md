# Issue 133 - Timeline

## 2026-06-04

- Read issue #133 and PR #134 metadata with GitHub CLI.
- Downloaded issue comments, PR comments, PR reviews, recent CI run metadata,
  and the failed JS workflow log.
- Confirmed the branch was `issue-133-a2575051275f`.
- Reproduced the live failure for `Hawaii is a state.` and saved
  `live-translation-before.json`.
- Identified the failed CI root cause: no active changeset targeting
  `meta-expression`.
- Added failing regression tests in `js/tests/integration/issue-133.test.js`
  and updated issue-50 expectations for the new Translate default/UI contract.
- Implemented source-order, link-target, semantic-lexicon URL, word-context,
  and Translate UI fixes.
- Saved passing focused and related test logs.
- Captured the live after-state in `live-translation-after.json`.
- Downloaded Wikidata and Russian Wikipedia research artifacts.
- Wrote this case study and added a changeset.
- Downloaded the fresh post-push parity failure log and updated the Rust mirror
  modules/tests identified by CI.
