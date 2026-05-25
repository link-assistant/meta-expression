# Solution Plan

## Completed

1. Captured the GitHub issue and reporter gist into this case-study folder.
2. Reproduced the issue with a focused failing regression test.
3. Split slash-separated fallback terms at tokenization time.
4. Preserved slash punctuation during Translate sentence rendering.
5. Added targeted English-to-Russian glossary entries for issue-56 prose.
6. Replaced disabled question placeholders with actionable options.
7. Added a reusable source-priority UI helper used by Formalize and Translate.
8. Added a verbose Translate debug log payload.
9. Added a patch changeset.

## Verification

- Before-fix regression: `regression-before.log`
- After-fix focused regression: `regression-after-focused.log`
- Fixed deterministic sample: `translation-after.json`

Full local and CI verification are tracked in the pull request.
