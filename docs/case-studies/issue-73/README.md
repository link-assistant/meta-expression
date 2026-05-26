# Issue 73 Case Study

Issue: <https://github.com/link-assistant/meta-expression/issues/73>
Pull request: <https://github.com/link-assistant/meta-expression/pull/97>

## Summary

Issue #73 tracks the OpenAI-shaped, Lino-native compatibility contract that
lets `link-assistant/formal-ai` depend on meta-expression without treating
prototype behavior as accidental API. The implemented artifact is
[`../../FORMAL_AI_COMPATIBILITY.md`](../../FORMAL_AI_COMPATIBILITY.md).

## Upstream Pin

The latest formal-ai release checked for this contract was:

```text
v0.123.0
39530ef2e71f787561f9252b72032eb81e329c3e
2026-05-26T00:48:52Z
chore: release v0.123.0
```

GitHub reported the release as `[Rust] 0.123.0`, published at
`2026-05-26T00:50:47Z`.

## Contract Coverage

The contract records:

- contract principles for OpenAI-shaped boundaries, Lino-native exchange,
  WASM-buildable Rust/WASM surfaces, additive evolution, and explicit unknowns;
- a surface matrix for Library, CLI, Microservice, Static web, and Rust;
- operation contracts for formalize, transform, naturalize, reason, translate,
  probability, and evidence;
- the release-tracking workflow for future formal-ai releases;
- verification anchors in JavaScript and Rust tests;
- formal-ai app-specific areas that are intentionally outside the shared
  meta-expression contract.

## Reproducer

`js/tests/unit/documentation.test.js` now requires the contract document, the
latest formal-ai release pin, the operation names, the five public surfaces, and
README/requirements cross-links. Before this PR, that test failed because
`docs/FORMAL_AI_COMPATIBILITY.md` did not exist.

## Verification

Focused check:

```bash
node --test js/tests/unit/documentation.test.js
```

Broader checks are recorded in the pull request body after final local
verification.
