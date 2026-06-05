# Issue 133 - Root Causes

## RC1 - Virtual overrides overwrote the source-backed `Q35657` URL

The base semantic lexicon already contained the correct Russian Wikipedia URL
for `Q35657`. During runtime lexicon assembly,
`mergeVirtualConcepts()` merged `virtual-source-overrides` over the base entry.
The virtual entry's `sourceUrl` was a Wikidata URL, and `mergeConcept()` allowed
that incoming URL to replace the base concept URL.

Effect: `resolveConceptForm('Q35657', 'ru')` returned
`https://www.wikidata.org/wiki/Q35657`, so immediate semantic-lexicon
translation rendered `штат` as a Wikidata link.

Fix: preserve an existing base concept URL when merging virtual concepts, while
still accepting an incoming URL for new concepts.

## RC2 - Translate still defaulted to Wikidata in non-UI entry points

`createConfig()` in Formalize defaulted links to Wikipedia, but
`createTranslateConfig()` defaulted `linkTargetMode` to Wikidata. The CLI and
server Translate paths also explicitly supplied `target ?? 'wikidata'`.

Effect: Translate reports and API calls could disagree with the formalize
default and with the issue's desired Wikipedia-first target behavior.

Fix: default Translate, CLI, and server target mode to Wikipedia. Explicit
`wikidata` still maps to Wikidata and `local` / `local-viewer` still maps to the
local entity viewer.

## RC3 - Default source order put virtual overrides before Wiktionary

`createDefaultSourceTiers()` and the web source list used:

```text
Wikipedia, Wikidata, Virtual overrides, Wiktionary
```

The issue requires Wiktionary before virtual overrides so source-backed lexical
definitions/translations have priority over local fallback data.

Fix: reorder default source tiers, empty source specs, and the Translate source
list to `Wikipedia, Wikidata, Wiktionary, Virtual overrides`.

## RC4 - Broader contexts were computed but not exposed per word

The formalizer already computed `bigContexts` via bounded transitive graph
traversal. `buildWordContexts()` only rendered direct `contextLabels` from each
candidate, so the UI/debug log hid the broader shared evidence.

Fix: pass `bigContexts.all` into `buildWordContexts()` and attach matching
entries to each candidate as `broadContexts`. When the traversal fetch already
loads a context node, keep that node's label for readable output.

## RC5 - Article translation lived as a secondary control

The article URL input was rendered below the translation result, while the text
textarea remained the primary active input. The issue requested a top-level
choice where text and article translation are separate modes.

Fix: add `Text` and `Wikipedia article` modes at the top of Translate, hide the
inactive panel, and make the primary Translate button run the selected mode.

## RC6 - CI failed because the placeholder PR had no changeset

The downloaded JS workflow log failed in
`js/tests/unit/package-identity.test.js` because there was no active
`.changeset/*.md` file targeting `meta-expression`.

Fix: add `.changeset/issue-133-translate-defaults.md`.
