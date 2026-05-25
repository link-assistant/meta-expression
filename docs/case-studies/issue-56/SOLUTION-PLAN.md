# Solution Plan

## Completed

1. Captured the GitHub issue and reporter gist into this case-study folder.
2. Reproduced the issue with a focused failing regression test.
3. Split slash-separated fallback terms at tokenization time.
4. Preserved slash punctuation during Translate sentence rendering.
5. Added source-backed Wiktionary lexical translation with target-page
   validation and debug trace records.
6. Kept linked Wikidata/Wikipedia entities ahead of lexical and local fallback
   translations.
7. Removed targeted English-to-Russian glossary entries for issue-56 prose.
8. Added all-supported-target-language fixture coverage for current Formal AI
   translation targets.
9. Replaced disabled question placeholders with actionable options.
10. Added a reusable source-priority UI helper used by Formalize and Translate.
11. Added Translate UI descriptions for source ordering and strategy behavior.
12. Added a verbose Translate debug log payload.
13. Added a patch changeset.

## Verification

- Before-fix regression: `regression-before.log`
- After-fix focused regression: `regression-after-focused.log`
- Fixed deterministic sample: `translation-after.json`
- Source-backed fixture regression: `node --test js/tests/integration/issue-56.test.js`

Full local and CI verification are tracked in the pull request.
