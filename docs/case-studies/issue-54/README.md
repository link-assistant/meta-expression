# Issue 54 Case Study: Formal AI Compatibility

Issue: https://github.com/link-assistant/meta-expression/issues/54
PR: https://github.com/link-assistant/meta-expression/pull/55

## Summary

Issue 54 asks this repository to become a dependable Rust and JavaScript
foundation for `link-assistant/formal-ai`, especially around formalization,
translation, naturalization/deformalization, customization hooks, and trace
metadata.

The issue is intentionally broad. This PR now covers the shared compatibility
contract with exact upstream corpus tracking plus focused executable tests and
code:

- A generated fixture records all 706 upstream Formal AI test case identities
  from 61 test files at the pinned `formal-ai` commit.
- JavaScript formalization supports configurable rules before and after the
  core formalizer.
- JavaScript parses and answers Formal AI translation prompts in English,
  Russian, Hindi, and Chinese using the same translation pipeline.
- JavaScript formalization publishes deterministic AST/CST linguistic metadata:
  words, symbols, noun phrases, verb phrases, subject, predicate, object, SVO
  relations, dependency-like links, and source span mappings.
- The Links Network includes linguistic fragment, dependency, and relation
  records so downstream Formal AI traces can point from text parts to formal
  parts.
- JavaScript translation supports configurable rules before translation, before
  naturalization/deformalization, after naturalization/deformalization, and
  after translation.
- Translation results expose `deformalization` as an alias of
  `naturalization`, including the CST.
- Translation semantic links carry source linguistic fragment references, so
  the semantic meta-language can preserve roles such as predicate across the
  formalize -> translate -> naturalize flow.
- Formalization now returns a `steps` trace so custom hooks are visible in the
  same style as translation traces.
- Rust exposes the matching small deterministic transformation primitive and a
  `deformalize_semantic_translation()` alias.
- Rust also exposes `extract_linguistic_metadata()` with the same deterministic
  baseline categories for Formal AI's Rust-side tests.
- Rust covers the deterministic Formal AI translation-via-links phrase corpus
  and common noun translations used by upstream tests.

## Captured Data

The tracked markdown files in this directory summarize the issue, PR comments,
formal-ai audit, implementation plan, exact upstream test corpus, and
verification evidence. If raw GitHub captures are regenerated locally,
`docs/case-studies/issue-54/data/` remains available as an ignored scratch
location for large generated artifacts.

The `formal-ai` repository was studied at:

```text
e1467d531534af582a2f457e69695ac6861131b8
2026-05-23T23:02:47+00:00
chore: release v0.107.0
```

Relevant upstream tests and specifications:

| Area                                       | `formal-ai` reference                                               | Local coverage added                                                                |
| ------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Exact upstream corpus                      | All `.rs`, `.js`, and `.mjs` files under `tests/`                   | `js/tests/fixtures/formal-ai-test-corpus.json`, `issue-54-formal-ai-corpus.test.js` |
| Translation via links                      | `tests/unit/specification/translation_via_links.rs`                 | `js/tests/integration/issue-54.test.js`, `rust/tests/unit/issue54_formal_ai.rs`     |
| Prompt translation regressions             | `issue-210`, `issue-218`, `issue-221`, `issue-230`                  | Formal AI prompt parser plus JS/Rust glossary phrase tests                          |
| Natural translation surface                | `issue_230_russian_compositional_translation_handles_search_phrase` | Translation naturalization/deformalization alias assertions                         |
| Formalize, summarize, deformalize pipeline | `tests/unit/specification/summarization_pipeline.rs`                | Rust naturalize/deformalize alias, JS hook surface, source linguistic metadata      |
| Traceable symbolic answers                 | `tests/unit/formal_ai.rs`                                           | Hook steps plus linguistic CST/AST relations are recorded with source spans         |

## Implemented Solution

The new JS transformation-rule helper accepts three lightweight hook shapes:

- function rules, called with `(value, context)`;
- object rules with `apply(value, context)`;
- declarative text rules with `pattern`, `replacement`, and optional `flags`;
- declarative object rules with `assign` for post-processing result metadata.

Hooks are optional and the default behavior remains zero-configuration. When a
hook changes a value and tracing is enabled, the pipeline records a
`custom-transformation-rule` step with the phase, rule id, and before/after
summary.

Formalization also includes a zero-configuration deterministic linguistic layer.
Issue 70 promotes that layer to an explicit parser-backed metadata flow:
outputs keep exact source spans and stable ids while adding parser CST,
provenance, and version fields without breaking consumers.

Rust support mirrors the deterministic contract: text replacement rules apply
in order, semantic translation naturalization can be addressed through the
`deformalize_` alias, and `extract_linguistic_metadata()` exposes the same
parser-aware structural categories used by the JS CST.

## Verification

Focused checks used during development:

```bash
node --test js/tests/integration/issue-54.test.js js/tests/integration/issue-54-linguistic-metadata.test.js js/tests/integration/issue-54-formal-ai-corpus.test.js
cargo test --manifest-path rust/Cargo.toml --test unit issue54 --verbose
```

Full local verification is listed in the PR body after final test runs.

See also:

- [Requirements](./REQUIREMENTS.md)
- [Formal AI Test Cases](./FORMAL-AI-TEST-CASES.md)
- [Solution Plan](./SOLUTION-PLAN.md)
- [Online Research](./ONLINE-RESEARCH.md)
