# Issue 54 Case Study: Formal AI Compatibility Hooks

Issue: https://github.com/link-assistant/meta-expression/issues/54
PR: https://github.com/link-assistant/meta-expression/pull/55

## Summary

Issue 54 asks this repository to become a dependable Rust and JavaScript
foundation for `link-assistant/formal-ai`, especially around formalization,
translation, naturalization/deformalization, customization hooks, and trace
metadata.

The issue is intentionally broad. This PR imports the immediately reusable
compatibility contract into focused tests and code:

- JavaScript formalization supports configurable rules before and after the
  core formalizer.
- JavaScript translation supports configurable rules before translation, before
  naturalization/deformalization, after naturalization/deformalization, and
  after translation.
- Translation results expose `deformalization` as an alias of
  `naturalization`, including the CST.
- Formalization now returns a `steps` trace so custom hooks are visible in the
  same style as translation traces.
- Rust exposes the matching small deterministic transformation primitive and a
  `deformalize_semantic_translation()` alias.

## Captured Data

Raw issue, PR, and comment captures are stored under
`docs/case-studies/issue-54/data/`. That folder is intentionally ignored for
large generated artifacts; the tracked markdown files summarize the findings.

The `formal-ai` repository was studied at:

```text
3d9cd564934d23e80aadf539d0c8fdb5694df076
2026-05-22T21:23:24+00:00
chore: release v0.105.0
```

Relevant upstream tests and specifications:

| Area                                       | `formal-ai` reference                                               | Local coverage added                                                            |
| ------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Translation via links                      | `tests/unit/specification/translation_via_links.rs`                 | `js/tests/integration/issue-54.test.js`, `rust/tests/unit/issue54_formal_ai.rs` |
| Natural translation surface                | `issue_230_russian_compositional_translation_handles_search_phrase` | Translation naturalization/deformalization alias assertions                     |
| Formalize, summarize, deformalize pipeline | `tests/unit/specification/summarization_pipeline.rs`                | Rust naturalize/deformalize alias and JS hook surface                           |
| Traceable symbolic answers                 | `tests/unit/formal_ai.rs`                                           | Hook steps are recorded with phase and rule id                                  |

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

Rust support is intentionally smaller but compatible with the deterministic
contract: text replacement rules apply in order, and semantic translation
naturalization can be addressed through the `deformalize_` alias.

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
