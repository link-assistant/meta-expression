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

## Review Requirements

- The fix must not rely on issue-specific local glossary entries.
- Lexical translations should be backed by real Wikimedia sources:
  Wikipedia/Wikidata for linked entities, and Wiktionary translation entries
  for lexical terms.
- Supported Formal AI target languages must be tested consistently, not only
  `en -> ru`.
- CI must fail when a supported target language is added without corresponding
  issue-56 lexical translation fixture coverage.
- The Translate UI must describe source drag/drop priority and each translation
  strategy clearly enough for reviewers to understand the behavior being tested.

## Acceptance Tests Added

- `js/tests/integration/issue-56.test.js` verifies slash tokenization and bad
  encoded slash URLs.
- The same test verifies slash-separated issue text never produces slash
  variable questions or encoded slash URLs during translation.
- The same test verifies source-backed Wiktionary translation for every
  supported Formal AI target language.
- The same test verifies linked Wikidata entities stay ahead of lexical
  Wiktionary and local fallback translations.
- The same test verifies issue-56 lexical fixture coverage for every supported
  Formal AI target language.
- The same test verifies issue-56 vocabulary is not kept in the local fallback
  glossary.
- The same test verifies generated questions have selected actionable options.
- The same test verifies source-priority controls and the Translate debug log
  are present in the web UI.
- The same test verifies supported Formal AI languages are present in both
  Translate language selectors and the UI includes strategy/source descriptions.
