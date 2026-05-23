# Solution Plan

## Baseline

The failing baseline is captured in `data/issue-48-regression-before.log`.

The observed failures were:

- Source formalization left reported words such as `Найти`, `Перевести`, and
  `Сравнить` without rendered links.
- Target markdown for all three subissues was plain text.
- The semantic meta language had lexical ids for glossary-backed phrases, but
  those ids were not reflected in the source formalization or target
  naturalization rendering.

## Implementation

1. Add deterministic lexical fallback entities in `formalize.js`.
   - Source token `Найти` becomes `lex:ru:найти`.
   - Fallback links use the local entity viewer URL with an encoded fragment.
2. Keep translation semantics conservative.
   - Glossary-backed lexical source concepts translate normally.
   - Unknown non-glossary lexical concepts still produce unresolved variables.
3. Link target naturalization output.
   - Glossary output receives target lexical ids such as `lex:en:find`.
   - Rule-inserted tokens such as `of` receive target lexical ids too.
   - `targetUnits` are exposed in sentence and naturalization structures.
4. Add regression coverage in `js/tests/integration/issue-48.test.js`.
   - Verify every source phrase has an entity and URL.
   - Verify every semantic link has an id and URL.
   - Verify every target unit has an id and URL.
   - Verify round-trip stability for all three reported phrases.
5. Preserve nearby behavior.
   - Update the issue 35 test to distinguish Wikidata links from lexical
     fallback links.
   - Keep existing issue 41, issue 35, and issue 16 Translate tests passing.

## Verification Status

The focused regression passed in `data/targeted-tests-final.log`.

Full local checks passed and are recorded in:

- `data/npm-test.log`
- `data/npm-check.log`
- `data/cargo-fmt-check.log`
- `data/cargo-clippy.log`
- `data/cargo-test.log`
- `data/cargo-doc-test.log`
- `data/cargo-build-release.log`
- `data/check-mjs-syntax.log`
- `data/check-file-line-limits.log`
- `data/git-diff-check.log`
- `data/secretlint.log`
