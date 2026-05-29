# Issue 128 — Root-Cause Analysis

Each problem is traced to a concrete cause, with evidence quoted from
[`data/debug-log.md`](data/debug-log.md) and [`data/issue.json`](data/issue.json).

## RC1 — The Translate debug log always printed "App version: unknown"

**Symptom.** The captured log opens with:

```text
Translate debug log
UI: web/#/translate
App version: unknown
```

even though the environment block of the same report says `Version: v0.9.0
(8b336fb)` and `Build source: github-pages`.

**Cause.** Two independent issues share the "version" symptom:

1. **Display.** `describeAppVersion()` in `web/translate-ui.js` only consulted a
   `<meta name="app-version">` tag and a `globalThis.__APP_VERSION__` global,
   neither of which the GitHub Pages build populates. The deployed build writes
   `web/app-version.json` (consumed elsewhere by `web/app-version.js`), but the
   Translate debug log never read it, so it fell through to the literal
   `'unknown'`.
2. **Release pipeline.** Separately, the published `package.json` version had not
   moved off `0.9.0`. That defect — the `release` job in
   `.github/workflows/js.yml` being gated entirely behind the unset
   `NPM_PUBLISH_ENABLED` variable, so the changeset version-bump never ran — was
   diagnosed and fixed under issue #126 (RC5 there). The remaining requirement is
   to make sure each PR ships a changeset so the now-working pipeline has
   something to bump.

**Fix.** `setupTranslatePage` calls `loadAppVersionInfo()` once at startup and
`describeAppVersion()` now formats that resolved info with `formatAppVersion()`,
falling back to the meta tag/global only until the JSON resolves. This PR also
adds a changeset (`.changeset/issue-128-links-notation.md`, `minor`) so the next
merge to `main` raises the number.

## RC2 — The report carries non-diagnostic "Notes" / "Reproduction Steps"

**Symptom.** The issue body ends with:

```text
## Report Notes
- Omitted generated diagnostic sections to keep the GitHub issue URL within …

## Reproduction Steps
1. Open https://link-assistant.github.io/meta-expression/web/#/translate
2. Switch to the Translate page
3. Use the page until the issue occurs
4. Click Report Issue
```

The reporter notes these "can be removed, giving more space for other data."

**Cause.** `web/page-report.js` actively generated both blocks:
`createReproductionSteps()` produced the four boilerplate steps, and
`compactReportNotice()` / `omittedDiagnosticHeadings()` produced the
space-consuming "Report Notes" notice whenever the URL had to be shortened.

**Fix.** Removed `createReproductionSteps`, `compactReportNotice`, and
`omittedDiagnosticHeadings`, dropped the `reproductionSteps`/`notices` plumbing,
and stopped emitting both headings from `createPageIssueReport`. The report now
goes straight from the diagnostic sections to `## Description`.

## RC3 — English phrases linked to Wikidata, Russian phrases to Wikipedia

**Symptom.** The formalized English links `Hawaii` to a Wikidata entity:

```text
[Hawaii](https://www.wikidata.org/wiki/Q782 "Q782")
```

while the translated Russian links `Гавайи` to a Wikipedia article:

```text
[Гавайи](https://ru.wikipedia.org/wiki/%D0%93%D0%B0%D0%B2%D0%B0%D0%B9%D0%B8 "Q782")
```

**Cause.** The Translate page's **Link target** radio defaulted to `wikidata`,
so the English markdown used the Wikidata entity URL. The translation path
already preferred a language-specific Wikipedia article (resolved from the
Wikidata sitelinks), which is why only the Russian side showed a Wikipedia link.

**Fix.** The default radio is now **Wikipedia (fallback Wikidata)**
(`web/index.html`, with relabelled i18n strings). English phrases resolve to
their `en.wikipedia.org` article from the entity's sitelinks when one exists, and
fall back to the Wikidata entity otherwise — symmetric with the Russian output.

## RC4 — Links notation did not merge the matched senses

**Symptom.** The debug log lists multiple candidate senses per word —

```text
Word: Hawaii
  ✓ Hawaii [Q782] (score 51) — instance of: Q35657
  • Hawaii [Q68740] (score 51) — instance of: Q1161185, part of: Q192626
  • Hawaii [Q18703903] (score 39) — …
```

— but the links notation emitted only the single selected entity per phrase,
with no way to cross-reference what Wikipedia, Wikidata, and Wiktionary each
matched.

**Cause.** `renderLinksNotation` rendered one line per phrase from
`phrase.entity` alone; the candidate list (`phrase.candidates`) and the
per-source links were never projected into the notation.

**Fix.** `renderMergedDefinitionLines` / `mergeEntityDefinition` add, per phrase,
a `…-definition` summary unioning the best Wikidata / Wikipedia / Wiktionary link
for the selected sense, plus one `…-sense-N` line per candidate (source, id,
label, kind, score, `selected` flag, link). The sources can now be
cross-referenced directly from the notation.

## RC5 — Links notation did not show the elected contexts numerically

**Symptom.** The debug log has a "Context detection" section
(`Most likely context: Q1161185 (17%)`) but the links notation carried no
machine-readable record of which contexts were elected, their priority order, or
the exact probability.

**Cause.** The formalizer computed `cst.contexts` (with weights/probabilities and
the phrases sharing each context) but `renderLinksNotation` never serialized
them, and `renderTranslationLinksNotation` did not carry them over from the
formalization.

**Fix.** `renderContextLines` emits one line per context, sorted by probability
descending, with `priority N`, the exact `probability` (`%.1f`), the `weight`,
the count of `words` sharing the context, and the shared words. The translation
links notation appends the same lines via `cst.formalization?.contexts`.

## RC6 — No data-folder `.lino` API cache for the quality gate / web app

**Symptom.** The quality gate over the top-viewed articles recorded its
Wikimedia API responses as one JSON file per URL under
`js/tests/fixtures/wikimedia-snapshots/`. There was no consolidated, committed
cache "in data folder and in .lino format", so the web app could not replay those
responses offline and the request-level cache was not surfaced for reuse.

**Cause.** The snapshot store (`js/src/formalize-snapshots.js`) only read/wrote
per-URL `<sha1>.json` blobs. The `.lino` codec (`js/src/lino.js`) was used for
overrides and manifests but not for an API cache, and it is lossy for empty
objects (`{}` → `null`), so a naïve dump of the JSON payloads would not
round-trip.

**Fix.** Store each API response as a verbatim JSON string inside a deterministic
`cache > entries` `.lino` document (`serializeSnapshotLino`), so deeply nested
payloads round-trip losslessly while the URL stays human-auditable. `loadSnapshotMap`
now reads `.lino` caches alongside the JSON snapshots;
`scripts/refresh-wikimedia-cache.mjs` regenerates `js/data/wikimedia-cache.lino`
offline and `--check` fails CI on drift; `web/persistent-cache.js` seeds the
in-memory cache from the deployed file on first load. See
[`SOLUTION-PLAN.md`](SOLUTION-PLAN.md) for the full design.

## RC7 — The predicate noun kept its generic sense instead of the licensed type (R12)

**Symptom.** For "Hawaii is a state." the formalizer selected the generic
federated-state concept `Q7275` for "state", even though Hawaii's own Wikidata
record asserts `instance of` (P31) → `Q35657` "U.S. state". The
[most-correct sense](https://en.wikipedia.org/wiki/U.S._state) was available but
not chosen. The Russian translation still reached "штат" only via a hardcoded
`english-us-state-predicate-to-russian-shtat` rule that pattern-matched the
English description "state of the United States" — a language-specific patch,
not a general algorithm.

**Cause.** Candidate selection scored each word in isolation. A bare predicate
noun ("state") has no local signal to prefer the specific class over the generic
one, and nothing in the pipeline used the copula relation
("_subject_ is a _predicate_") to let the subject's asserted type license the
predicate's sense. The translation layer compensated with the bespoke
US-state rule instead of fixing the meaning upstream.

**Fix.** A new `resolveCopulaTypes` pass runs in `formalizeTextWith` after entity
hydration (`js/src/formalize.js`). For each copula phrase it finds the nearest
contentful subject and predicate (bridging articles/glue), reads the subject's
hydrated `instance of` / `subclass of` context labels, and — when the predicate
noun is the head word of one of those types' names in _any_ language — promotes
the predicate to that type (`state` → `Q35657`, carrying the Wikipedia link and
a self-vote so the context election reports the shared class for R5). The pass
is fully language-neutral, so the Russian "Гавайи это штат" resolves to the same
`Q35657` without a per-language rule. The old
`applyRussianUsStatePredicateRule` and its helpers are deleted from
`js/src/translate.js`; `targetLabelFor` now prefers the interlingua's licensed
short surface form (`Q35657` → ru "штат") so the rendered word stays natural
while the link points at the canonical article. The Rust core and its curated
reference are flipped to `Q35657` for the resolved "state"/"штат" meaning in all
phrase positions, the obsolete predicate rule is dropped (rule count 3 → 2), and
the committed WASM is rebuilt for JS↔Rust parity.
