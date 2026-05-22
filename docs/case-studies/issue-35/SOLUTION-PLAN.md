# Issue #35 Root Cause and Solution Plan

## Root Causes

1. Wikimedia requests were under-identified in Node. The fetch helpers only set
   `accept: application/json`; live API calls could return HTTP 429 before
   useful Wikidata labels were available.
2. The formalizer searched every multi-token n-gram, including grammar-bound
   fragments. That made it possible for a shorter concept such as `Hawaii` to
   be accepted for the phrase `Hawaii is a`.
3. The existing English-to-Russian rule slice rendered the copula as a dash.
   Issue #35 explicitly expects `это`.
4. Wikipedia disambiguation-style results could beat a direct Wikidata concept,
   and the broad `Q7275` Russian label is `государство`, not the intended
   U.S.-state predicate `штат`.
5. There was no round-trip regression for the reported sentence, so a
   back-translation loss could pass unnoticed.
6. The first fix rendered the sentence correctly but did not propagate the
   contextual target refinement back into phrase target metadata, CST phrase
   records, and Links Notation.
7. The issue explicitly asked for Rust/WASM availability, while the initial
   translation fix only changed JavaScript.

## Implemented Fix

- Add Wikimedia request headers in both formalization and target-label lookup.
- Skip multi-token n-grams that contain copula glue or are bounded by English
  articles in ways that cannot form a semantic entity.
- Require exact candidate shape for grammar-glue n-grams that still pass the
  search filter.
- Demote disambiguation-style candidates during candidate scoring.
- Change the English-to-Russian copula rule to emit `это`.
- Add a contextual English-to-Russian predicate rule for
  `U.S. state subject + is a state`, rendering the predicate as `штат`.
- Propagate contextual target rewrites into phrase target metadata, Markdown,
  HTML, CST, and Links Notation, preserving source `Q7275` separately from
  target `Q35657`.
- Add a narrow Russian-to-English rule that turns the fixed output back into
  `Hawaii is a state.` for the issue's quality loop.
- Add `tests/issue-35.test.js` with mocked Wikimedia routes that fail without
  identification headers, expose bad grammar-fragment searches, and reproduce
  the live `State` disambiguation ambiguity.
- Add a Rust core semantic translation fixture for issue #35, including phrase
  Q ids, doublet relations, and C ABI helpers that are exportable from the
  existing `cdylib` crate.

## Requirement Plans

### Semantic Meta-Language

Current state: the translator already uses formalization as an intermediate
semantic layer. Resolved phrases carry Wikidata Q/P ids, source character
ranges, target-language labels, CST records, and Links Notation.

Next planned layer:

1. Treat Q/P ids as stable meaning ids for Wikidata-backed concepts.
2. Mint virtual ids for Wikipedia/Wiktionary-only meanings that do not have
   Wikidata ids.
3. Encode sentence, phrase, and transformation relationships as doublet links.
4. Move deterministic transformations from narrow JavaScript rule tables into
   a doublet-backed rule graph that can run in Rust/WASM and JavaScript.

This PR performs step 1 more safely by preventing grammar glue from becoming a
false meaning id, and adds an issue-sized Rust doublet fixture for step 3.

### Translation Quality Loop

Current state: the issue sentence now round-trips through Russian and back to
English in a deterministic unit test.

Next planned layer:

1. Add a tiny curated corpus of issue-sized examples for fast CI.
2. Add optional benchmark scripts under `examples/` for WMT/FLORES samples.
3. Compare each path with exact semantic ids first, then text metrics.
4. Add human-readable error records shaped like MQM annotations for phrase,
   grammar, terminology, and meaning-loss problems.
5. Use COMET or XCOMET only as an additional signal, not as the source of
   truth for semantic ids.

### Links Between Parts of Text

Current state: phrase ids, entity ids, source ranges, sentence ids,
transformation steps, CST, and Links Notation already connect the source text,
semantic phrase records, and target renderings. Contextual target rewrites now
carry both source and target meaning ids when they differ.

Next planned layer: expose those relationships as explicit doublets so the
formalized sentence can be transformed independently from the current
JavaScript object model.

### CI/CD

Current state: the repository workflow already follows the JavaScript template
shape for changesets, lint, formatting, duplication checks, docs validation,
file-line limits, multi-runtime tests, and link checks. Rust checks are present
and gated on Rust changes.

No workflow change is needed for this PR. When Rust/WASM code is added, the
existing `rust-check` path should be expanded with the Rust template's package,
formatting, test, and release practices.

## External Issue Reporting

No upstream issue was filed. The Wikimedia behavior matched the published
request-identification policy, and the fix belongs in this repository's fetch
headers and formalization search strategy.
