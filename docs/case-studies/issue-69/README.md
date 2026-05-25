# Issue 69: relative-meta-logic computability adapter

Issue: <https://github.com/link-assistant/meta-expression/issues/69>

## Requirement

Requirement R58.15 / R8 / R14 asks the prototype to move beyond the
arithmetic-only evaluator and use
[`relative-meta-logic`](https://github.com/link-foundation/relative-meta-logic)
where a statement is fully computable.

## Upstream API Audit

Inspected upstream on 2026-05-25:

- Repository: `link-foundation/relative-meta-logic`
- Commit: `155276abb6093dcfa5c6c0fe58a7dd05ee3e2c44`
- JS package path: `js/`
- JS package version: `0.19.0`
- npm status: `npm view relative-meta-logic` returns `E404`

The JS package exposes the functions needed by this adapter from
`js/src/rml-links.mjs`: `evaluate()`, `runTactics()`, `rewrite()`,
`simplify()`, `whnf()`, `nf()`, `Env`, and `evalNode()`.

The repository root does not currently contain a `package.json`, so npm cannot
install the Git repository directly as a normal dependency. The PR therefore
pins the inspected Git source as an optional peer dependency and accepts an
injected RML module through `relativeMetaLogic` / `rmlEngine` options. The local
arithmetic and formal-reasoning adapter remains the fallback.

## Mapping

The public `mapFormalizationToRelativeMetaLogicInput()` helper maps:

- arithmetic equality/question formalizations to RML arithmetic AST/program
  inputs,
- formal reasoning programs to RML program inputs,
- unsupported partial formalizations to explicit unknown/refinement output.

## Verification

`js/tests/integration/issue-69.test.js` covers the mapping, injected RML
arithmetic evaluation, local fallback behavior, and the pinned upstream source
metadata.
