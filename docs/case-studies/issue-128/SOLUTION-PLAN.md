# Issue 128 — Solution Plan

For each requirement (see [`REQUIREMENTS.md`](REQUIREMENTS.md)) this lists the
options considered and the option taken in PR #129.

## R1 — Version display + bump

**Options considered**

- _(A)_ Inject a `<meta name="app-version">` tag at build time and keep reading
  it. Rejected: the GitHub Pages build already emits `web/app-version.json`, and
  duplicating that into a meta tag adds a second source of truth.
- _(B)_ Read the existing `app-version.json` through the existing
  `loadAppVersionInfo()` helper. **Taken.**

**Plan / implementation**

- `web/translate-ui.js`: `setupTranslatePage` calls `loadAppVersionInfo()` once
  and stores the result; `describeAppVersion()` formats it with
  `formatAppVersion()`, falling back to the meta tag/global until the JSON
  resolves.
- Add `.changeset/issue-128-links-notation.md` (`minor`) so the
  already-fixed-for-#126 release pipeline has a changeset to bump on the next
  merge to `main`.

## R2 — Remove "Report Notes" / "Reproduction Steps"

- `web/page-report.js`: delete `createReproductionSteps`, `compactReportNotice`,
  `omittedDiagnosticHeadings`, and the `notices`/`reproductionSteps` plumbing;
  stop emitting both headings. Existing report tests updated to match.

## R3 — Wikipedia link for English

**Options considered**

- _(A)_ Always rewrite Wikidata URLs to Wikipedia. Rejected: not every entity
  has an article in the source language; the Wikidata entity is the correct
  fallback.
- _(B)_ Default the **Link target** to Wikipedia with a Wikidata fallback, reusing
  the sitelink resolution that the Russian output already used. **Taken.**

**Plan / implementation**

- `web/index.html`: the `translate-target` radio now defaults to `wikipedia`.
- `web/i18n.js`: relabel the options to "Wikipedia (fallback Wikidata)" /
  "Wikidata only" (en + ru) so the fallback behaviour is explicit.

## R4 — Merged entity definition in links notation

- `js/src/formalize-renderers.js`: `renderMergedDefinitionLines` emits a
  `…-definition` summary (union of Wikidata/Wikipedia/Wiktionary links for the
  selected sense) plus one `…-sense-N` line per candidate.
  `mergeEntityDefinition` + `wikipediaLinkFor` / `wiktionaryLinkFor` collapse the
  candidates into the best link per source family.

## R5 — Selected contexts in links notation

- `js/src/formalize-renderers.js`: `renderContextLines` sorts contexts by
  probability descending and emits `priority`, exact `probability`, `weight`,
  `words` count, and shared words.
- `js/src/translation-renderers.js`: append the same lines, sourced from
  `cst.formalization?.contexts`, to the translation links notation.

## R6 — Quality gate + `.lino` API cache

**Options considered**

- _(A)_ Dump the snapshot map straight through the generic `.lino` codec.
  Rejected: the codec is lossy for empty objects (`{}` → `null`), so nested
  Wikidata payloads would not round-trip.
- _(B)_ Store each response as a verbatim JSON string inside a `cache > entries`
  `.lino` document, keyed by URL + SHA-1, sorted, timestamp-free. **Taken** —
  lossless, human-auditable, and byte-for-byte deterministic so a git-diff
  freshness check is meaningful.

**Plan / implementation**

- `js/src/formalize-snapshots.js`: `serializeSnapshotLino` / `parseSnapshotLino`
  / `writeSnapshotLino` / `loadSnapshotLino`; `loadSnapshotMap` now reads `.lino`
  caches alongside the per-URL JSON snapshots (additive — issue #21 tests that
  read `<sha1>.json` keep working).
- `js/src/lino.js`: factor the browser-safe decoder into `parseLinoCacheEntries`
  so the same code seeds both the Node quality gate and the web app (no
  duplication for jscpd).
- `js/data/wikimedia-cache.lino`: the consolidated cache (21 entries), committed
  to the data folder; the GitHub Pages build already copies `js/data` into the
  published site, so it ships to the web app automatically.
- `scripts/refresh-wikimedia-cache.mjs` (+ `npm run cache:refresh` /
  `cache:check`, wired into `npm run check`): regenerates the cache offline and
  fails CI when it drifts from the recorded snapshots — this is how "merging to
  main keeps the cache fresh".
- `web/persistent-cache.js`: `seedFromDataCache` hydrates the in-memory cache
  from the deployed `.lino` on first load (when localStorage is empty), wrapping
  each response in the `{expiresAt, value}` envelope the evidence client expects.
- The quality gate over the top-viewed articles (`issue-43` e2e, `issue-96`
  integration) already runs and asserts `summary.failed === 0`.
- Tests: `js/tests/integration/issue-128-cache.test.js` (round-trip,
  determinism, committed-cache freshness, offline replay of "Hawaii is a state.").

## R7 / R8 — Case study + verbose mode

- This folder (R7). The version-display bug was directly visible in the captured
  log, so no new tracing was required; the merged-definition and context lines
  (R4/R5) further expose disambiguation decisions in the links notation (R8).

## R9 — Upstream issues

- See [`ONLINE-RESEARCH.md`](ONLINE-RESEARCH.md): every defect is in this
  repository, so no external issue is warranted.

## R10 — Apply across the codebase

- The renderers are shared by every entry point, so R4/R5 land everywhere links
  notation is produced; R2 lives in the single shared `page-report.js`; the
  Formalize page already defaulted to Wikipedia, so R3 only needed the Translate
  page.

## R11 — One PR

- All commits land on `issue-128-41095a0f356d` / PR #129 with a single changeset.
