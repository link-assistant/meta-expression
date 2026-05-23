# Issue 54 Case Study: Formal AI Compatibility

Issue: https://github.com/link-assistant/meta-expression/issues/54
PR: https://github.com/link-assistant/meta-expression/pull/55

## Summary

Issue 54 asks this repository to become a dependable Rust and JavaScript
foundation for `link-assistant/formal-ai`, especially around formalization,
translation, naturalization/deformalization, customization hooks, and trace
metadata.

The issue is intentionally broad. This PR now covers the shared compatibility
contract with focused tests and code:

- JavaScript formalization supports configurable rules before and after the
  core formalizer.
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

## Captured Data

Raw issue, PR, and comment captures are stored under
`docs/case-studies/issue-54/data/`. That folder is intentionally ignored for
large generated artifacts; the tracked markdown files summarize the findings.

The `formal-ai` repository was studied at:

```text
a4999861759ad688f55198b893af378f3da350df
2026-05-23T22:40:21+00:00
chore: release v0.106.0
```

Relevant upstream tests and specifications:

| Area                                       | `formal-ai` reference                                               | Local coverage added                                                            |
| ------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Translation via links                      | `tests/unit/specification/translation_via_links.rs`                 | `js/tests/integration/issue-54.test.js`, `rust/tests/unit/issue54_formal_ai.rs` |
| Natural translation surface                | `issue_230_russian_compositional_translation_handles_search_phrase` | Translation naturalization/deformalization alias assertions                     |
| Formalize, summarize, deformalize pipeline | `tests/unit/specification/summarization_pipeline.rs`                | Rust naturalize/deformalize alias, JS hook surface, source linguistic metadata  |
| Traceable symbolic answers                 | `tests/unit/formal_ai.rs`                                           | Hook steps plus linguistic CST/AST relations are recorded with source spans     |

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

Formalization now also adds a zero-configuration deterministic linguistic layer.
It is intentionally parser-free for this baseline: every output records exact
source spans and stable ids, and a later parser can enrich the same AST/CST
fields without breaking consumers.

Rust support mirrors the deterministic contract: text replacement rules apply
in order, semantic translation naturalization can be addressed through the
`deformalize_` alias, and `extract_linguistic_metadata()` exposes the same
structural categories used by the JS CST.

## Verification

Focused checks used during development:

```bash
node --test js/tests/integration/issue-54.test.js
cargo test --manifest-path rust/Cargo.toml --test unit issue54 --verbose
```

Full local verification is listed in the PR body after final test runs.

See also:

- [Requirements](./REQUIREMENTS.md)
- [Solution Plan](./SOLUTION-PLAN.md)
- [Online Research](./ONLINE-RESEARCH.md)
