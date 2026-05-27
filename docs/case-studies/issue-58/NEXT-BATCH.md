# Issue #58 — next batch (quality and the reconstructed meta-language)

> Source feedback: [PR #59 comment, 2026-05-26][fb] (konard).
> This file continues [`README.md`](./README.md) and [`ISSUE-PLAN.md`](./ISSUE-PLAN.md):
> the first batch (#60–#74, #87–#96) shipped; this is the second batch planned
> from the 2026-05-26 feedback.

[fb]: https://github.com/link-assistant/meta-expression/pull/59#issuecomment-4547765004

## 1. What shipped since the original plan

The original issue-58 plan opened #60–#74; competitor-parity surfaced #87–#94;
the translation-quality work landed as #96 / PR #107. All are merged on `main`:

- **Foundation (#60–#63):** package identity is `meta-expression`; a
  `wasm-bindgen` package ships in `rust/pkg/`; the official `links-notation`
  (`^0.13.0`) and `lino-arguments` (`^0.3.0`) dependencies are adopted; durable
  `doublets`-backed portable case data round-trips ids, references, roles,
  scalars, provenance, versions, and Unicode-sequence strings.
- **Pillars (#64–#70):** generalized formalization, a Links Notation rewrite
  engine, generalized naturalization, entailment/contradiction/dependency
  reasoning, reproducible probability, a `relative-meta-logic` adapter, and
  parser-backed AST/CST metadata.
- **Parity (#71, #72, #87–#94):** refreshed comparison matrices; the 706-case
  formal-ai corpus executed as a parity gate; ClaimReview, JSON-LD/PROV-O,
  OpenIE/AMR/SRL, originality reports, literature-review workflows, scoped
  SPARQL + graph-store interchange, proof/solver adapters, and writing-assistant
  surfaces.
- **Interlingua (#96 / PR #107):** translation routes source-form → concept id
  → target-form through `js/data/semantic-lexicon.json` (328 concepts across
  en/hi/ru/zh). No source↔target language-pair tables remain in `js/src` or
  `rust/src`; guard tests enforce this and Rust fixtures moved to `rust/data/`.

The canonical docs (`ROADMAP.md`, `REQUIREMENTS.md`, `IMPLEMENTATION-STATUS.md`)
were re-synced to this state in the same PR that adds this file.

## 2. The feedback, distilled

The 2026-05-26 comment asks us to keep raising **translation quality** through
the intermediate semantic meta language, and sets seven concrete directions:

1. Fully support `doublets-rs` and `doublets-web` as the means to contain and
   operate the meta language (as Links Notation and/or binary links).
2. Use **no hardcoded data in code**; reduce decorated/overridden data; unify
   access to per-term APIs by merging Wikipedia, Wikidata, and Wiktionary into a
   single virtual source — **merged on demand, not bulk-loaded** — and cache
   both the original requests/responses and the merged result in Links Notation
   / binary links, recording exactly what merged from where, how, and to what.
3. Prefer **rule-based, automatic** overrides; allow per-concept overrides only
   when a concept is used in **more than 50%** of formalizations / naturalizations
   / translations.
4. **Collect all metadata at the formalization stage** and reconstruct the meta
   language fully for each source text, so translation does not rely on the
   source text; make everything implicit explicit (which word points to what,
   which noun/verb phrase relates to which, all linguistic detail).
5. Add **grammar checking** (Grammarly-class) in all supported languages.
6. Take best practices from competitors; keep a deep comparison; use their
   tests and **test datasets** to improve quality.
7. **Quality first**, optimizations later.

## 3. Current state vs. the gap

| Area                | Current state (on `main`)                                                                                   | Gap the feedback targets                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Term data access    | `wikimedia-evidence.js` / `wikimedia-translation.js` hit Wikidata/Wikipedia separately; no Wiktionary merge | One virtual per-term source merging Wikipedia + Wikidata + Wiktionary on demand, cached with merge trace |
| Meta-language store | Hand-rolled JS doublets (`js/src/doublets.js`); Rust `doublets` crate used only for encoding helpers        | Real `doublets-rs` (Rust) and `doublets-web` (browser, npm) as the store/operator of the meta language   |
| Lexicon provenance  | 328 concepts: 143 `wiktionary`, 1 `wikidata`, **181 `curated-seed`**, **3 `override`** (hand-written data)  | Derive seed/override data from the unified source; only rule-based automatic overrides; >50% policy      |
| Linguistic metadata | Parser-backed AST/CST with SVO + dependency-like links; English-centric, partial roles                      | Full explicit reconstruction for every source text in every supported language                           |
| Grammar checking    | `check.js` does fact-checking, not grammar                                                                  | Grammarly-class grammar checking across all supported languages                                          |
| Competitor datasets | 706-case formal-ai corpus executed; comparison matrices refreshed                                           | Competitor **test datasets** wired as recurring CI quality gates                                         |

Concrete counts (reproduce with `grep -c '"source"' js/data/semantic-lexicon.json`):
`curated-seed` 181, `wiktionary` 143, `wikidata` 1, `override` 3.
`rust/data/reference-translations.json` (305 lines) holds offline fixtures +
stopwords moved out of `rust/src` by #96.

Upstream facts (checked 2026-05-26):

- `doublets-rs` publishes the **`doublets`** crate (v0.3.0) with `unit::Store` /
  `split::Store`, the `Links` / `Doublets` traits, `create/update/delete/each`,
  and file-mapped persistent storage. The repo already depends on it for
  encoding; the next batch promotes it to the durable store.
- `doublets-web` is the WebAssembly/npm binding (`doublets-web`) exposing
  `Link`, `LinksConstants`, `UnitedLinks` for in-browser doublets storage.

## 4. Next-batch requirements and plan

Each maps to one child issue under epic #58. Ordering: data + storage
foundation first (they back everything), then the no-hardcoded-data policy, then
the linguistic-quality pillars, then grammar and competitor gates, with the
translation umbrella tracking overall quality.

### R58.26 — Unified on-demand Wikipedia/Wikidata/Wiktionary data source

- **Plan:** a `term-data-source` module that, given a term, resolves and merges
  Wikidata (structured), Wikipedia (text/summary), and Wiktionary (lexical) on
  demand. Cache the original requests/responses and the merged record as Links
  Notation / binary links, recording merge provenance (source → field → merged
  value, with retrieval time). Never bulk-load.
- **Acceptance:** a single `getTerm(term)` returns a merged record with
  per-field provenance; repeated calls hit the cache; the merged record is
  emitted as Links Notation and round-trips.

### R58.27 — `doublets-rs` as the canonical Rust meta-language store

- **Plan:** replace the hand-rolled encoding path with the real `doublets`
  crate `unit::Store`/`split::Store` for the meta language and the unified-data
  cache; keep the Links Notation echo for inspection.
- **Acceptance:** Rust stores/loads meta-language links and cached term data
  through `doublets`; parity tests match the JS shapes.

### R58.28 — `doublets-web` as the browser meta-language store

- **Plan:** load `doublets-web` in the web app for the same binary-links model
  via WASM, replacing the hand-rolled JS store in the browser.
- **Acceptance:** the web app reads/writes the meta language and cache through
  `doublets-web`; a Playwright smoke test exercises store/load.

### R58.29 — No hardcoded data; rule-based automatic overrides

- **Plan:** derive `curated-seed`/`override` lexicon entries and Rust reference
  data from the unified source (R58.26); convert remaining overrides to
  rule-based, automatic transformations; gate per-concept overrides behind a
  measured **>50% usage** policy with a test that fails on hand-written
  per-term data below the threshold.
- **Acceptance:** `source: "curated-seed"`/`"override"` counts trend to zero
  except concepts proven to appear in >50% of formalizations/naturalizations/
  translations; a policy test enforces the threshold.

### R58.30 — Full explicit linguistic metadata at formalization

- **Plan:** at formalization, reconstruct the meta language completely for each
  source text and record every implicit relation explicitly — coreference
  (which word refers to what), noun-phrase/verb-phrase attachment, agreement,
  tense/aspect/mood, and all dependency relations — in every supported language,
  so translation reads only from the meta language.
- **Acceptance:** for each acceptance example, the meta language alone (without
  the source string) regenerates the source and drives translation; a test
  asserts no translation path reads the raw source text.

### R58.31 — Multi-language grammar checking (Grammarly-class)

- **Plan:** a `grammar` surface that flags agreement, word-order, article, and
  punctuation issues across all supported languages using the explicit meta
  language; expose it in library/CLI/service/web.
- **Acceptance:** seeded grammatical-error fixtures per language are detected
  with suggested corrections; clean text reports no issues.

### R58.32 — Competitor dataset quality gates

- **Plan:** import competitor test datasets (beyond the 706-case corpus) and run
  them as recurring CI quality gates; extend `COMPARISON-*.md` with measured
  scores.
- **Acceptance:** competitor datasets run in CI with tracked pass rates; the
  comparison docs cite the measured numbers and dates.

### R58.33 — Highest-quality translation umbrella

- **Plan:** umbrella tracking translation/naturalization quality driven purely
  by the reconstructed interlingua (R58.30) and unified data (R58.26); graduate
  skip-listed articles to `matched`. Quality first; optimizations later.
- **Acceptance:** the paragraph-level quality gate (#96) improves measurably as
  the children land; no regressions in the #74 acceptance gate.

## 5. Issue catalogue (second batch)

| Issue | Title                                                                              | Req    | Depends on       |
| ----- | ---------------------------------------------------------------------------------- | ------ | ---------------- |
| #108  | Unified on-demand Wikipedia/Wikidata/Wiktionary term data source with cached merge | R58.26 | —                |
| #109  | Adopt real `doublets-rs` as the canonical Rust meta-language store                 | R58.27 | —                |
| #110  | Adopt `doublets-web` as the browser meta-language store                            | R58.28 | #109             |
| #111  | Eliminate hardcoded data; rule-based automatic overrides with >50% usage policy    | R58.29 | #108             |
| #112  | Full explicit linguistic metadata + complete interlingua reconstruction            | R58.30 | #108, #111       |
| #113  | Multi-language grammar checking (Grammarly-class)                                  | R58.31 | #112             |
| #114  | Competitor dataset quality gates                                                   | R58.32 | —                |
| #115  | Highest-quality translation umbrella via the reconstructed interlingua             | R58.33 | #108, #112, #113 |

These eight issues were created on 2026-05-26 and are cross-linked from the
epic checklist on
[#58](https://github.com/link-assistant/meta-expression/issues/58).
