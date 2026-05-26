# Issue 70: Parser-Backed Reasoning Metadata

Issue: <https://github.com/link-assistant/meta-expression/issues/70>
PR: <https://github.com/link-assistant/meta-expression/pull/85>

## Summary

Issue 70 closes the follow-up from issue 54: the linguistic metadata layer is
no longer just an unnamed parser-free baseline. JavaScript and Rust now expose a
stable parser descriptor, parser CST, and provenance/version metadata on every
reasoning artifact while preserving the existing fragment, dependency,
relation, and AST fields.

The parser remains deterministic and zero-configuration. It currently covers
the same English structural categories as the prior baseline: words, symbols,
noun phrases, verb phrases, subject, predicate, object, SVO relations, and
dependency-style records. The important contract change is that downstream
reasoning can now tell which parser produced each artifact and which schema
version it used.

## Implemented Contract

- `extractLinguisticMetadata()` returns `parser`, `provenance`, and `cst`
  alongside the existing `ast`, `fragments`, `dependencies`, and `relations`.
- Every fragment, dependency, relation, and sentence AST node carries
  `version: 1` and parser provenance.
- The parser CST records source tokens, symbols, sentence spans, phrase ranges,
  dependency slots, relation type, and the fragment/dependency ids generated
  during materialization.
- Formalization Links Network entries keep the richer parser metadata in
  linguistic fragment/dependency/relation values.
- Rust `extract_linguistic_metadata()` exposes the matching parser descriptor,
  CST, provenance, and versioned artifacts.

## Compatibility

Existing CST consumers continue to use the same stable fields:

- fragment ids, roles, text, token/source spans, and phrase ids;
- dependency ids, relation names, head/dependent fragment ids;
- relation ids, subject/predicate/object fragment ids, text, and source spans;
- JavaScript AST document shape with `body`;
- Rust AST sentence vector.

The new fields are additive so consumers can adopt parser-aware behavior
incrementally.

## Verification

Focused regressions:

```bash
node --test js/tests/integration/issue-70.test.js
cargo test -p meta-expression-core --test unit issue70_reasoning_metadata
```

Broader repository checks are recorded in the PR body.
