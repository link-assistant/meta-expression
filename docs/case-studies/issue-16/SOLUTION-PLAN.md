# Issue #16 Solution Plan

## Phase 1 — Reproduce the requested contract

Add a failing test that expects `formalizeTextWith()` to expose a CST, verifies
Markdown can be regenerated from that CST, and checks a translation of
`Hawaii -> Гавайи` through Wikidata `Q782`.

Result: `tests/issue-16.test.js` covers CST, translation, variables, CLI, HTTP,
and web wiring.

## Phase 2 — Make `/formalize` emit reusable CST

Add a formalization CST builder after phrase selection. The CST keeps:

- original text and tokens,
- ordered phrase ids and token spans,
- selected entity id, label, description, kind, and URL,
- candidate summaries for future UI/rule work,
- context references already computed by the formalizer.

Use the CST as the source for `markdownFromFormalizationCst()` and for the
Links Notation payload so all three outputs stay aligned.

## Phase 3 — Add a sentence/text-level translator

Create `src/translate.js` with `translateTextWith()`:

- normalize source and target languages,
- formalize source text,
- fetch target-language labels/descriptions/sitelinks with Wikidata
  `wbgetentities`,
- segment the source into sentences and build text output from sentence
  translations,
- apply deterministic transformation rules where they are explicitly covered,
- render plain text, Markdown, HTML, Links Notation, and a translation CST,
- emit variables/questions for unresolved terms.

The first rule slice covers English-to-Russian article omission plus
`X is a Y` -> `X - Y` copula rewriting. The result also keeps phrase-level
records so later parser-backed Links Notation transformations can replace this
narrow rule table.

## Phase 4 — Add a traceable translation path

Record every translation step needed for inspection:

- input language selection,
- every Wikimedia API request/response made through the translator fetch path,
- formalization output,
- per-phrase translation status,
- sentence-level transformation rules,
- final text assembly.

Expose the trace in JSON/Links Notation and keep it collapsed by default in the
web UI.

## Phase 5 — Wire product surfaces

Expose the translator from:

- `src/index.js` for library users,
- `src/cli.js` as `meta-expression translate`,
- `src/server.js` as `GET/POST /translate`,
- `web/index.html` and `web/translate-ui.js` as `#/translate`, including
  formalized input and a collapsed translation-step trace.

## Phase 6 — Documentation and release hygiene

Update canonical requirements, README usage, generated formalize docs, and the
issue case study. Add a changeset because the public API and CLI grow.

## Deferred Work

- User-editable Links Notation transformation rules.
- Parser-backed CST rewriting with first-party Links Notation tooling.
- Snapshot-backed multilingual integration examples beyond the `Q782` minimal
  regression.
