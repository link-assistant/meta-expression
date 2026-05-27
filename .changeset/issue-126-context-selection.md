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
