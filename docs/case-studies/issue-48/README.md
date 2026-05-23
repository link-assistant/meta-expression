# Issue 48 Translation Coverage Case Study

Issue: https://github.com/link-assistant/meta-expression/issues/48

PR: https://github.com/link-assistant/meta-expression/pull/49

## Summary

Issue 48 asked for complete support of:

```text
source language -- formalize -> semantic meta language
semantic meta language -- naturalize -> target language
```

The three subissues showed that the Translate UI could report all phrases as
translated while the rendered source and target text still contained unlinked
words:

- #45 `Найти синонимы или примеры согласования`
- #46 `Перевести текст`
- #47 `Сравнить значения`

The root cause was that glossary-backed translations already produced semantic
lexical ids internally, but formalization did not create visible fallback
concepts for unresolved source tokens, and naturalization did not expose
linkable target units for glossary words or rule-inserted words.

## Fix

- Uncovered source tokens now become deterministic lexical concepts such as
  `lex:ru:найти`, with local concept viewer URLs.
- Glossary translations now render target lexical concepts such as
  `lex:en:find`.
- Naturalization now exposes `targetUnits` on both sentence-level results and
  the naturalization CST so reviewers can inspect the target-side concept graph.
- Rule-inserted naturalization tokens such as English `of` are also linked.
- The regression suite checks source formalization, semantic links, target
  naturalization, and round-trip stability for all three subissues.

## Evidence

Saved data:

- `data/issue-48.json`, `data/issue-45.json`, `data/issue-46.json`,
  `data/issue-47.json` contain the issue reports.
- `data/issue-48-regression-before.log` captures the failing regression before
  the implementation.
- `data/issue-48-after-results.json` captures the fixed formalization,
  semantic links, target units, markdown, and round-trip output.
- `data/targeted-tests-final.log` captures the passing focused test run.
- `data/npm-test.log` and `data/npm-check.log` capture the full JS test and
  quality checks.
- `data/cargo-fmt-check.log`, `data/cargo-clippy.log`, `data/cargo-test.log`,
  `data/cargo-doc-test.log`, and `data/cargo-build-release.log` capture the
  Rust workflow parity checks.
- `ONLINE-RESEARCH.md` records the external MT quality and competitor review.

## Verification

Focused command:

```sh
node --test js/tests/integration/issue-48.test.js js/tests/integration/issue-41.test.js js/tests/integration/issue-35.test.js js/tests/e2e/issue-16.test.js
```

Expected result: all focused tests pass.
