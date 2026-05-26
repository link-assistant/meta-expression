# Issue 89: Candidate Formalization Providers

Issue: <https://github.com/link-assistant/meta-expression/issues/89>
PR: <https://github.com/link-assistant/meta-expression/pull/101>

## Summary

Issue 89 adds a candidate-only provider interface for OpenIE, AMR, SRL, entity
linking, and similar formalization adapters. Provider output can now be passed
to `formalizeTextWith()` through `providers` or to the HTTP `/formalize` route
through `providerOutputs`.

The deterministic formalizer still owns token coverage, entity selection,
contexts, interpretations, Markdown, and HTML. Provider records are attached as
`providerCandidates`, mirrored into the formalization CST, and emitted into the
Links Network for downstream selection or validation.

## Provider Contract

Provider adapters expose `extract(text, ctx)` and return candidate bundles with
any mix of:

- triples from OpenIE-style extraction;
- semantic role frames from SRL;
- entity-link candidates;
- graph records such as AMR strings or node/edge graphs.

Static fixtures can use `createFixtureFormalizationProvider(fixture)` to follow
the same async interface as live adapters.

## Truth Scoring Boundary

Unsupported or unselected provider output remains partial. `/formalize` records
it with:

- `status: "candidate"` unless the provider explicitly marks it selected or
  validated;
- `truthScoring.included: false`;
- `truthScoring.eligible: false` for plain candidates;
- no `supportingEvidence` or `refutingEvidence` fields in the formalize result.

Selected or validated provider records can be passed forward as structured
input for another stage, but `/formalize` still does not score them as truth
evidence. That keeps NLP/LLM extraction output out of belief calculations until
a downstream workflow validates it.

## Verification

Focused regression:

```bash
node --test js/tests/integration/issue-89.test.js
```
