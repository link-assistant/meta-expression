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

## Phase 3 — Add a term-level translator

Create `src/translate.js` with `translateTextWith()`:

- normalize source and target languages,
- formalize source text,
- fetch target-language labels/descriptions/sitelinks with Wikidata
  `wbgetentities`,
- render plain text, Markdown, HTML, Links Notation, and a translation CST,
- emit variables/questions for unresolved terms.

This keeps the first slice deterministic and small while leaving grammar-aware
rewriting to the next Links Notation transformation layer.

## Phase 4 — Wire product surfaces

Expose the translator from:

- `src/index.js` for library users,
- `src/cli.js` as `meta-expression translate`,
- `src/server.js` as `GET/POST /translate`,
- `web/index.html` and `web/translate-ui.js` as `#/translate`.

## Phase 5 — Documentation and release hygiene

Update canonical requirements, README usage, generated formalize docs, and the
issue case study. Add a changeset because the public API and CLI grow.

## Deferred Work

- Sentence-level translation and word-order rules.
- User-editable Links Notation transformation rules.
- Parser-backed CST rewriting with first-party Links Notation tooling.
- Snapshot-backed multilingual integration examples beyond the `Q782` minimal
  regression.
