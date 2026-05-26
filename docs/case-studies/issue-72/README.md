# Issue 72 Case Study

Issue #72 converts the issue #26 competitor catalogue and the Formal AI corpus
from documentation-only tracking into executable parity coverage.

## Upstream Pin

The issue text mentioned `link-assistant/formal-ai` v0.112.0, but the current
latest release when this branch was prepared was:

```text
v0.123.0
39530ef2e71f787561f9252b72032eb81e329c3e
2026-05-26T00:48:52+00:00
chore: release v0.123.0
```

The regenerated fixture at `js/tests/fixtures/formal-ai-test-corpus.json`
contains 750 upstream test cases from 69 files: 569 Rust tests and 181
JavaScript/Playwright tests.

## Local Coverage

- `js/tests/integration/issue-26-comparable-fixtures.test.js` now executes the
  documented competitor-style fact-checking, uniqueness, and LinksPlatform
  examples where local behavior exists, with explicit skips for unsupported
  external services or missing datasets.
- `js/tests/integration/issue-72-parity.test.js` requires every Formal AI
  upstream test identity to have either a local assertion or an explicit skip
  reason.
- `js/tests/integration/issue-54-formal-ai-corpus.test.js` pins the refreshed
  release metadata and corpus counts.

The parity gate keeps unsupported upstream categories visible instead of
silently treating the corpus fixture as passive documentation.
