# Issue 94: Browser and Editor Writing Assistant Surfaces

Issue: <https://github.com/link-assistant/meta-expression/issues/94>
PR: <https://github.com/link-assistant/meta-expression/pull/106>

## Summary

Issue 94 adds a reusable writing-assistant integration surface for browser
extensions, editor extensions, document add-ins, and other embedded clients.
The surface is a thin wrapper around the existing library APIs:

- `analyzeStatement()` / `analyzeStatementWithLiveEvidence()`
- `checkText()` / `checkTextWithLiveEvidence()`
- `formalizeTextWith()`
- `translateTextWith()`
- `searchTextUniqueness()`

The wrapper returns a consistent operation envelope with the original result,
Links Notation export, issue-report URLs where applicable, embedded context,
capabilities, and guardrail metadata.

## Guardrails

The surface records the natural-language-first rules in
`WRITING_ASSISTANT_GUARDRAILS`:

- candidate interpretations and formalization links are explicit suggestions;
- candidate suggestions require selection and are not truth evidence;
- evidence-backed checks are marked as evidence checks;
- evidence-backed checks are never style rewrites;
- the core surface does not provide style rewrites by default.

These flags let browser and editor hosts render checks, candidates, and future
style rewrites as separate UI affordances.

## Harness

The regression harness lives in
[`js/tests/integration/issue-94-writing-assistant-surface.test.js`](../../../js/tests/integration/issue-94-writing-assistant-surface.test.js).
It uses
[`js/tests/fixtures/issue-94/mock-extension-selection.json`](../../../js/tests/fixtures/issue-94/mock-extension-selection.json)
to verify that an embedded selection can:

- run all five operations through delegated APIs;
- export Links Notation from the wrapper;
- create prefilled report URLs from the embedded page context;
- preserve candidate and evidence-check guardrail metadata.

## Verification

Focused regression:

```bash
node --test js/tests/integration/issue-94-writing-assistant-surface.test.js
```
