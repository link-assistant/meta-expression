---
'meta-expression': minor
---

Add persistent context-selection questions to the Translate page so ambiguous
words can be re-disambiguated by hand. Selecting a sense pins it via the new
`contextSelections` option, re-derives the English formalization, and re-runs
translation. The formalizer now rejects scholarly-article title fragments,
surfaces per-word context candidates (and a one-click copy-debug-log button)
for diagnosis, and the release workflow bumps the version and tags a GitHub
release on every push to main even when npm publishing is disabled.

The web prototype now lets readers select between the JavaScript and Rust
(WebAssembly) engines from a global engine selector, routing the Analyse and
Compare pages through the chosen engine with a graceful fallback to JavaScript.
The issue #126 context-decision logic is mirrored in the Rust core, and a new
CI parity guardrail (`npm run check:parity`) fails any pull request that changes
one side of a mirrored JS/Rust module pair without the other so the engines can
never silently drift apart. See `docs/PARITY.md` for the full correspondence
map.
