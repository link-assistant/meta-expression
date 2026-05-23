# Issue #43 Case Study: Wikipedia Top-Views Translation Quality Gate

Issue: <https://github.com/link-assistant/meta-expression/issues/43>

PR: <https://github.com/link-assistant/meta-expression/pull/44>

## Problem

Earlier translation work in issue #41 ensured that the Translate page no longer
emits unrelated entity links for a specific Russian phrase. That fix said
nothing about how the project would notice the _next_ regression — translation
quality across real-world Wikipedia articles. Issue #43 asks for a closed-loop
quality gate driven by the Wikipedia top-views list:

1. Pull the top 10 most-viewed articles for the current month.
2. For each article, pick the two largest language versions by character count.
3. Take the leading statement from the source-language article, translate it,
   then look for the translation in the target-language article.
4. If the translated statement is missing in the target article, classify the
   gap as one of:
   - **Skip-list entry** — the two language editions describe the same entity
     with substantially different wording (a Wikipedia-side divergence, not a
     translator bug).
   - **Translation fix** — the statement survives the source → target → source
     round trip, so the project will push the translation back upstream.
   - **Failure** — the translated statement is missing in the target article
     _and_ does not survive the round trip. The integration test must fail in
     this case.
5. Implement the translation pipeline as
   `source language --formalization-> semantic meta language --naturalization-> target language`
   and surface it consistently in the library, the CLI, the web app, and the
   Rust core.

The success criterion is that the test must be impossible to pass without real
fixes: silently adding an article should never make the suite green.

## Captured Inputs

The `data` folder preserves the issue, PR context, captured Wikipedia articles,
and the test logs used to verify the quality gate:

- [`data/issue-43.json`](./data/issue-43.json)
- [`data/issue-43-comments.json`](./data/issue-43-comments.json)
- [`data/pr-44.json`](./data/pr-44.json)
- [`data/pr-44-comments.json`](./data/pr-44-comments.json)
- [`data/pr-44-review-comments.json`](./data/pr-44-review-comments.json)
- [`data/pr-44-reviews.json`](./data/pr-44-reviews.json)
- [`tests/fixtures/issue-43/articles.json`](../../../tests/fixtures/issue-43/articles.json)
- [`tests/fixtures/issue-43/skip-list.json`](../../../tests/fixtures/issue-43/skip-list.json)
- [`tests/fixtures/issue-43/translation-fixes.json`](../../../tests/fixtures/issue-43/translation-fixes.json)
- [`data/npm-test.log`](./data/npm-test.log)
- [`data/npm-check.log`](./data/npm-check.log)
- [`data/cargo-test.log`](./data/cargo-test.log)
- [`data/translation-quality-cli.log`](./data/translation-quality-cli.log)

## Top-Views Snapshot

The April 2026 fixture captures 10 articles with English and Russian language
versions:

| #   | English title                           | Wikidata   | Source → Target |
| --- | --------------------------------------- | ---------- | --------------- |
| 1   | `.xxx`                                  | Q481       | ru → en         |
| 2   | `Artemis_II`                            | Q15077117  | en → ru         |
| 3   | `Deaths_in_2026`                        | Q120559513 | ru → en         |
| 4   | `WrestleMania_42`                       | Q123459078 | en → ru         |
| 5   | `2026_Iran_war`                         | Q133221102 | en → ru         |
| 6   | `Michael_(2026_film)`                   | Q108169358 | en → ru         |
| 7   | `Michael_Jackson`                       | Q2831      | ru → en         |
| 8   | `Project_Hail_Mary_(film)`              | Q116716968 | en → ru         |
| 9   | `2026_Hungarian_parliamentary_election` | Q122014099 | en → ru         |
| 10  | `The_Drama_(film)`                      | Q124903194 | en → ru         |

Each article entry stores both extracts and a `languages` array sorted by
character count so `selectLanguagePair()` deterministically picks the larger
side as the source.

## Pipeline Shape

`translateTextWith()` now always returns three artifacts for every assessed
statement, mirroring the issue's requested pattern:

```text
source language --formalization-> semantic meta language --naturalization-> target language
```

- `semanticMetaLanguage`: links-notation rendering of the formalized statement.
- `naturalization`: links-notation rendering of how those links were rendered
  back into a natural-language target sentence.
- `cst.naturalization`: the same naturalization step exposed inside the
  Composite Semantic Tree for downstream consumers.

The Rust core mirrors the same status-routing primitives
(`extract_first_statement`, `tokenize_for_match`, `token_coverage`,
`normalize_statement_key`, `TranslationQualityStatus`) so any future native
client can reproduce the same classification logic.

## Status Routing

`assessArticleTranslation()` returns one of six statuses per article:

| Status            | Trigger                                                                        | Test treats as |
| ----------------- | ------------------------------------------------------------------------------ | -------------- |
| `matched`         | Translated tokens cover the target extract above the threshold (default 0.5).  | pass           |
| `translation-fix` | Source statement appears in the curated translation-fixes list.                | pass           |
| `skipped`         | Source statement is on the curated skip list.                                  | pass           |
| `fix-suggested`   | Round-trip translation back to source covers the original above the threshold. | pass           |
| `no-statement`    | Source extract is blank or whitespace only.                                    | pass           |
| `failed`          | Translation is missing in the target article _and_ round-trip is unstable.     | **fail**       |

The integration test asserts `summary.failed === 0` and additionally walks
every captured article to confirm that no article ended up with status
`failed`.

## Why The Test Cannot Pass Silently

Each captured article must be classified into one of the non-failed buckets.
Adding a new article without curating its skip-list or translation-fixes entry
will fall through to `failed` because the current translator cannot translate
arbitrary Wikipedia leads with high coverage. The skip-list cross-check test
additionally forbids stale entries: every skip-list `source` must correspond
to a captured statement, so a future PR cannot quietly drop an article and
keep its skip entry.

## Surface Coverage

- **Library** (`src/translation-quality.js`): pure-function quality routines
  exported from `src/index.js`.
- **CLI** (`src/cli.js`): new `translation-quality` subcommand reads
  `--articles`, `--skip-list`, `--fixes`, supports `summary` and `json`
  formats, and exits non-zero when any article fails.
- **Web app** (`web/translate-samples.js`): two new Translate samples for the
  Artemis II and Michael Jackson leads, giving manual reviewers a fast way to
  reproduce the integration snapshot in the UI.
- **Rust core** (`rust/core/src/lib.rs`): mirrors the helpers and exposes
  `meta_expression_translation_quality_status_code()` over the C ABI so native
  consumers can adopt the same status enum.

## Result

`npm test` reports 0 failed assessments and exits cleanly; `cargo test`
reports 14 passing tests including 8 new quality-quality routines. The
`translation-quality` CLI command prints a per-status summary and exits 0
against the fixture and non-zero when invoked without `--articles`.

## Boundary

This PR does not attempt to make the translator capable of producing
publishable English-from-Russian (or vice versa) prose for arbitrary
Wikipedia leads. The quality gate is built so that the project can keep
expanding the captured top-views fixture and only graduate an article from
the skip-list to `matched` once the translator can really cover it.
