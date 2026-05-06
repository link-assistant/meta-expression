---
'my-package': minor
---

Issue #21 — perfect context detection in the Formalize pipeline. Adds an HTTP-level snapshot cache (`src/formalize-snapshots.js`) with REPLAY/RECORD/OVERLAY modes, persisting Wikipedia/Wikidata/Wiktionary responses to `tests/fixtures/wikimedia-snapshots/` (URL → SHA-1 keyed JSON plus a human-readable `manifest.lino`). Tests can now formalize "Hawaii", "formalize", and "the" entirely offline. The Formalize page gains a "Load repo sample" picker that runs the pipeline against repository content (README, docs, package.json, issue-21 examples), and the recorder script lives at `examples/record-wikimedia-snapshots.js` so the fixtures can be refreshed idempotently.
