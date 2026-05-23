# Issue #43 Solution Plan

## Implemented in This PR

1. **Snapshot the top-views fixture.** Capture the April 2026 top 10
   Wikipedia articles with their two largest language versions, persist them
   in `tests/fixtures/issue-43/articles.json`, and validate the shape with a
   dedicated test (`captures a top-10 fixture for April 2026 ...`).
2. **Add the quality assessment module.** Implement pure-function helpers in
   `src/translation-quality.js`:
   - `extractFirstStatement()` collapses a multi-paragraph extract into the
     first sentence, dropping parenthetical glosses.
   - `tokenizeForMatch()` provides Unicode-aware tokenization with shared
     English + Russian stop words.
   - `tokenCoverage()` computes the unique-token overlap ratio used as the
     match threshold.
   - `assessArticleTranslation()` routes a single article through the
     translation-fixes, skip-list, direct-coverage, and round-trip checks
     and returns a status-tagged result.
   - `assessArticleSet()` walks an article list and `summarizeAssessment()`
     reduces results to per-status counts.
3. **Wire the pipeline through `translateTextWith()`.** Assert in
   `tests/issue-43.test.js` that every assessed statement returns a
   `semantic-meta-language` artifact and a matching `naturalization` artifact
   exposed both at top level and inside `cst.naturalization`.
4. **Curate skip-list and translation-fixes.** Author 10 skip-list entries
   describing the real divergence between English and Russian Wikipedia
   leads, plus one translation-fix entry preserved from issue #41 so the
   quality gate cannot regress on the original fixture.
5. **Expose a CLI command.** Add `translation-quality` to `src/cli.js` with
   `--articles`, `--skip-list`, `--fixes`, `--match-threshold`, and `--format
(summary|json)`. Returns exit code 0 only when `summary.failed === 0`.
6. **Surface in the web app.** Add two new Translate samples (Artemis II
   lead, Russian Michael Jackson biographical lead) so the manual reviewer
   can reproduce the quality snapshot in the UI.
7. **Mirror in Rust core.** Add the same helpers (`extract_first_statement`,
   `strip_parenthetical_glosses`, `tokenize_for_match`, `token_coverage`,
   `normalize_statement_key`) plus the `TranslationQualityStatus` enum and
   the `meta_expression_translation_quality_status_code` C ABI surface.
   Cover them with 8 unit tests in `rust/core/src/lib.rs`.
8. **Compile the case study.** Capture issue/PR metadata, full test logs,
   CLI output, and write `README.md`, `REQUIREMENTS.md`, `SOLUTION-PLAN.md`,
   and `ONLINE-RESEARCH.md`.

## Why The Test Cannot Pass Silently

The integration test asserts `summary.failed === 0` against the captured
fixture. Today, every captured article ends up in one of the
`matched | skipped | translation-fix | fix-suggested | no-statement`
buckets because the curated lists were authored alongside the fixture.

For a future PR to add a new article without breaking the suite, it must:

- improve the translator until that article's leading statement covers the
  target extract (status `matched`), or
- prove that the source statement round-trips back to itself (status
  `fix-suggested`), or
- justify the divergence in `skip-list.json` (status `skipped`), or
- promise a curated translation that the project will push to Wikipedia
  (status `translation-fix`).

Each of those paths requires a human-reviewable change. The skip-list
cross-check additionally rejects stale skip entries, preventing the easy
hack of "skip the failing article, drop the article".

## Follow-Up Work

1. **CI parity** with the
   [`link-foundation/js-ai-driven-development-pipeline-template`](https://github.com/link-foundation/js-ai-driven-development-pipeline-template)
   and
   [`link-foundation/rust-ai-driven-development-pipeline-template`](https://github.com/link-foundation/rust-ai-driven-development-pipeline-template)
   templates: separate `js.yml` and `rust.yml` workflows, matrix coverage
   on Node/Bun/Deno, pages preview deploys, and Rust release pipelines.
2. **Repository restructuring** into `js/src`, `rust/src`, and a wasm-first
   web build that loads the Rust core through `wasm-bindgen`. Issue #43
   explicitly requests it, but it is independent of the quality gate.
3. **Live Wikipedia integration** — schedule a recurring job that refreshes
   `articles.json` from the live `pageviews.wmcloud.org` API and the
   MediaWiki extract endpoint. The test would then run against the fresh
   fixture so the quality bar tracks Wikipedia in real time.
4. **Upstream pipeline** — turn `translation-fixes.json` into actual
   Wikipedia edit suggestions (via the MediaWiki edit API or a manual edit
   queue) so the curated fixes leave the repository and improve Wikipedia.
5. **Translator expansion** — graduate articles from the skip list to
   `matched` by extending the lexical fallback, the semantic predicate
   library, and the naturalization rules. Each graduation must come with a
   reproducing test under `tests/issue-43.test.js`.
6. **Threshold tuning** — promote `--match-threshold` to a per-language-pair
   configuration once we have enough samples to see the distribution of
   coverage ratios.

## Risk Notes

- The skip-list approach can become a place to hide regressions. Mitigated
  by the cross-check that requires every skip entry to map onto a captured
  statement and by requiring a documented `reason` per entry.
- The round-trip check uses the same translator on both legs and can be
  fooled by symmetric mistakes (for example, dropping the same proper noun
  in both directions). The match threshold (0.5) is intentionally
  conservative to reduce false positives.
- The deterministic snapshot means the test does not catch upstream
  Wikipedia edits. The CI follow-up above is the planned mitigation.
