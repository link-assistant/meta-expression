# Issue 112 - Explicit Interlingua Reconstruction

Issue: <https://github.com/link-assistant/meta-expression/issues/112>

## Summary

The formalization stage now emits a `sourceReconstruction` surface model inside
linguistic metadata. The model records ordered source units for tokens,
separators, and symbols, plus sentence-to-unit links, so consumers can rebuild
the source text without reading the raw `text` field.

The linguistic metadata also records explicit noun/verb phrase attachments,
subject-predicate agreement, token-level morphology, deterministic dependency
coverage for grammar tokens such as determiners, and simple pronoun
coreference chains.

## Regression

`js/tests/integration/issue-112-explicit-interlingua.test.js` poisons raw source
string fields after formalization and verifies translation still produces
`alpha beta -> альфа бета` from the reconstructed semantic meta language. The
same test verifies naturalization reads the semantic reconstruction when its
raw `text` field is poisoned.
