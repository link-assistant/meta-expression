# Issue 93: Proof and Solver Artifact Adapters

Issue: <https://github.com/link-assistant/meta-expression/issues/93>
PR: <https://github.com/link-assistant/meta-expression/pull/105>

## Summary

Issue 93 adds a library surface for importing external proof-assistant and
solver/query artifacts as provenance-bearing evidence. The initial adapters
normalize Lean 4 proof snippets and SMT-LIB solver results into a shared
`proof-solver-artifact-evidence` bundle.

The adapters do not execute Lean, Z3, Prolog, Datalog, Metamath, or other
external engines. They validate artifact shape, preserve the reported checker or
solver result, and emit bounded evidence items that can be supplied to
`analyzeStatement(..., { evidence })`.

## Guardrail

The data model records:

- the external format and system;
- the artifact text and reported outcome;
- adapter provenance and retrieval/check timestamps;
- `executionGate.issue === 72`;
- `truthScoring.absolute === false`.

This keeps issue #72 as the execution/parity-test gate while issue #93 owns the
adapter and evidence data model.

## Fixtures

Regression fixtures live in
[`js/tests/fixtures/issue-93/proof-solver-artifacts.json`](../../../js/tests/fixtures/issue-93/proof-solver-artifacts.json):

- Lean 4: `example : 1 + 1 = 2 := rfl`
- SMT-LIB: a negated arithmetic equality query with reported `unsat`

## Verification

Focused regression:

```bash
node --test js/tests/integration/issue-93-proof-solver-artifacts.test.js
```
