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
5. Generalize the same coverage rule across existing Translate tests.
   - Add a shared test helper for source formalization, semantic meta language,
     and target naturalization coverage.
   - Apply it to issue 16, 35, 37, 39, 41, 43, and 48 test coverage.
   - Use source/semantic-only checks for intentionally unresolved translation
     cases.
6. Preserve nearby behavior.
   - Update the issue 35 test to distinguish Wikidata links from lexical
     fallback links.
   - Link the Russian-to-English copula rule token `is` through the same
     lexical target mechanism used by other rule-inserted tokens.
   - Keep existing issue 41, issue 35, and issue 16 Translate tests passing.

## Verification Status

The focused regression passed in `data/targeted-tests-final.log`.

Full local checks passed and are recorded in:

- `data/npm-test.log`
- `data/npm-check.log`
- `data/coverage-suite-before-rule-token-fix.log`
- `data/coverage-suite-after-format.log`
- `data/npm-test-after-coverage-helper.log`
- `data/npm-check-final-coverage-helper.log`
- `data/cargo-fmt-check.log`
- `data/cargo-clippy.log`
- `data/cargo-test.log`
- `data/cargo-doc-test.log`
- `data/cargo-build-release.log`
- `data/check-mjs-syntax.log`
- `data/check-file-line-limits.log`
- `data/git-diff-check.log`
- `data/secretlint.log`
