# Issue 133 - Requirements

## R1 - Link `Q35657` to Russian Wikipedia by default

For `Hawaii is a state.` translated from English to Russian, the target
`штат` must link to the Russian Wikipedia article for `Q35657`
(`Штат США`) instead of the Wikidata entity page.

Status: done. Covered by `js/tests/integration/issue-133.test.js` and
`live-translation-after.json`.

## R2 - Default source priority

Both default source construction and the Translate page default order must be:

```text
Wikipedia, Wikidata, Wiktionary, Virtual overrides
```

Status: done. `createDefaultSourceTiers`, empty `parseSourceSpec`, and the
Translate source list use this order.

## R3 - Default link targets

The Translate default link-target mode must be Wikipedia with Wikidata fallback.
Explicit `wikidata` and local-viewer modes must still work through API, CLI,
and server entry points.

Status: done. `translateTextWith`, CLI, server, and semantic-lexicon target URL
resolution now share the same mode semantics.

## R4 - Replace link-target radios

The Translate link-target radio group must become one unchecked checkbox:
"replace wikidata links with our own viewer".

Status: done. `web/index.html` exposes `#translate-local-viewer-links`; the
checked state maps to `FORMALIZE_LINK_TARGETS.LOCAL`, otherwise Wikipedia.

## R5 - Broader word context UI

Word context reporting must show broader chains, not only direct claims. For
the reported sentence, Hawaii and state should expose their shared
transitive context evidence.

Status: done. `buildWordContexts` now accepts aggregated broad contexts and
reports candidate-level `broadContexts`. The UI/debug log renders these compactly.

## R6 - Article translation as top input mode

Wikipedia article translation must be near the top of the Translate page as a
subtab/radio-style input mode. The user should input either free text or an
article URL/title, never both as active inputs.

Status: done. The Translate page now has `Text` and `Wikipedia article` modes
with mutually hidden panels. The primary Translate button runs the selected mode.

## R7 - Case study and online research

The investigation must preserve issue details, CI logs, reproductions, online
research, root causes, and solution notes.

Status: done. This folder contains the captured GitHub metadata, CI logs, live
before/after JSON, Wikimedia research artifacts, and analysis documents.

## R8 - CI release readiness

The PR must include a changeset so the package-identity test and release tooling
recognize the active package change.

Status: done. `.changeset/issue-133-translate-defaults.md` covers the patch.

## R9 - Semantic-lexicon translations still prefer live Wikipedia sitelinks

When a local semantic-lexicon concept supplies the translated surface form but
does not already have a target-language Wikipedia URL, Translate must still
check the target-language Wikidata entity before rendering the link. If a
target-language Wikipedia sitelink exists, the default link target must use it
instead of the local concept's Wikidata source URL.

Status: done. `js/tests/integration/issue-133.test.js` covers `Q99`
(`California` -> `Калифорния`) and asserts that the output links to Russian
Wikipedia instead of `https://www.wikidata.org/wiki/Q99`.
