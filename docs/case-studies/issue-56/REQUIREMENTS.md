# Requirements

## Reported Requirements

- The reported English input should no longer produce mixed English/Russian
  output for known Formal AI technical vocabulary.
- `naturalization/deformalization` and `CST/AST` must not become single
  Wiktionary lookup pages when those slash pages do not exist.
- Source lookup priority should default to Wikipedia, then Wikidata, then
  Wiktionary.
- Source priority should be configurable on both Translate and Formalize pages.
- Translate questions should present real options with at least one selected
  option.
- Translation steps should include responses, not only requests.
- The issue report/debug data should be available as a copyable verbose log.
- Case-study research artifacts should be preserved under
  `docs/case-studies/issue-56`.

## Acceptance Tests Added

- `js/tests/integration/issue-56.test.js` verifies slash tokenization and bad
  encoded slash URLs.
- The same test verifies the reported issue text has no unresolved translation
  questions with an empty deterministic fetch fixture.
- The same test verifies generated questions have selected actionable options.
- The same test verifies source-priority controls and the Translate debug log
  are present in the web UI.
