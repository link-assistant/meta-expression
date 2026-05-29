# Issue 128 — Requirements

Every requirement extracted from the issue body
([`data/issue.json`](data/issue.json)), numbered for traceability. Each entry
notes the status in PR #129.

## R1 — Fix the version auto-bump (it shows "unknown")

> We still have 0.9.0 version for a long time for some reason auto bump does not
> work for our GitHub Pages app.

The debug log printed `App version: unknown`. Two distinct problems hide here:
the **display** of the version in the Translate debug log, and the **release
pipeline** that bumps `package.json`.

**Status: done (display) / verified (pipeline).** `web/translate-ui.js` now
resolves the deployed build via `loadAppVersionInfo()` / `formatAppVersion()`
(from `web/app-version.js`) and prints it in the debug log instead of the
placeholder. The release-pipeline gate that previously blocked the bump was
already corrected for issue #126 (decoupling the version bump from
`NPM_PUBLISH_ENABLED`); this PR adds the changeset that the fixed pipeline needs
to actually raise the number on the next merge to `main`. See
[`ROOT-CAUSES.md`](ROOT-CAUSES.md) RC1.

## R2 — Remove the "Report Notes" and "Reproduction Steps" sections

> These sections from issue reporting can be removed, giving more space for
> other data.

The `## Report Notes` and `## Reproduction Steps` blocks add no diagnostic value
and consume characters in the URL-length-bounded report.

**Status: done.** `web/page-report.js` no longer emits either section
(`createReproductionSteps`, `compactReportNotice`, and `omittedDiagnosticHeadings`
removed); the `notices`/`reproductionSteps` plumbing is gone.

## R3 — Show a Wikipedia link for English when one exists

> For ru we use Wikipedia link, but for en we don't have … I think we should
> show a link to wikipedia, if we have it.

English `Hawaii` linked only to `wikidata.org/wiki/Q782`, while Russian `Гавайи`
linked to `ru.wikipedia.org`.

**Status: done.** The Translate page's **Link target** now defaults to
**Wikipedia (fallback Wikidata)** (`web/index.html`, `web/i18n.js`), so English
phrases resolve to their `en.wikipedia.org` article from the Wikidata sitelinks
when one exists and fall back to the Wikidata entity otherwise. Verified by
`issue-128.test.js` → "renders an English Wikipedia link when the Wikipedia
target is selected (R3)".

## R4 — Merged entity definition in links notation

> when showing in links notation we should use merged entity definition, that
> should show everything that matched the term from wikipedia, wikidata, and
> wiktionary, so these can be used to cross reference each other and help with
> disambiguating words.

**Status: done.** `renderMergedDefinitionLines` / `mergeEntityDefinition` in
`js/src/formalize-renderers.js` emit, per phrase, a `…-definition` summary line
that unions the Wikidata / Wikipedia / Wiktionary links for the selected sense,
followed by one `…-sense-N` line per matched candidate (source, id, label, kind,
score, selected flag, link). Verified by `issue-128.test.js` → "exposes a merged
entity definition for each phrase (R4)".

## R5 — Show selected contexts in links notation (priority + probability)

> we should show in links notation version of formalization and translation
> which contexts was selected (with sequence/order of priority, where first
> context should have high probability). We should also show exact number of
> probability of context we calculated, based on how many words in the same
> context we have in source text.

**Status: done.** `renderContextLines` in `js/src/formalize-renderers.js` emits
one line per selected context, sorted by probability descending, carrying
`priority N`, the exact `probability` (one decimal percent), the `weight`, the
number of `words` sharing the context, and the shared words themselves. The same
lines are appended to the translation links notation via
`js/src/translation-renderers.js`. Verified by `issue-128.test.js` → "reports
selected contexts with priority and probability (R5)" and "carries the contexts
into the translation links notation (R5)".

## R6 — Quality gate on top articles + refreshable `.lino` API cache

> make sure we actually execute quality check on top most viewed articles, and
> when merged in main branch, that test should update the cache, so executing
> the same test in web app or next time will be faster, as we cache
> requests/responses to APIs … Cache should be in data folder and in .lino
> format, as we usually do.

**Status: done.** The quality gate over the top-viewed Wikipedia articles
already exists (`js/tests/e2e/issue-43-*`, `js/tests/integration/issue-96-*`,
asserting `summary.failed === 0` against curated fixtures). This PR adds the
**data-folder `.lino` API cache**: `js/data/wikimedia-cache.lino` consolidates
the recorded request/response snapshots into one deterministic
`cache > entries` document; `scripts/refresh-wikimedia-cache.mjs`
(`npm run cache:refresh` / `cache:check`, wired into `npm run check`) regenerates
it offline and fails CI on drift; `web/persistent-cache.js` seeds the web app's
in-memory cache from the deployed file so the web app replays offline too. The
GitHub Pages build already copies `js/data` into the published site. Verified by
`issue-128-cache.test.js`. See [`ROOT-CAUSES.md`](ROOT-CAUSES.md) RC6 and
[`SOLUTION-PLAN.md`](SOLUTION-PLAN.md).

## R7 — Compile this case study with deep analysis

> make sure we compile that data to ./docs/case-studies/issue-{id} … reconstruct
> timeline/sequence of events, list of each and all requirements …, find root
> causes …, and propose possible solutions and solution plans … (we should also
> check known existing components/libraries …, also make sure to search online
> for additional facts).

**Status: done.** This folder.

## R8 — Add debug output / verbose mode if data is insufficient

> If there is not enough data to find actual root cause, add debug output and
> verbose mode if not present, that will allow us to find root cause on next
> iteration.

**Status: done.** The root cause of R1's display bug was directly visible in the
captured log (`App version: unknown`), so no extra tracing was needed there. The
debug log already surfaces context detection and per-word candidates (added for
issue #126); the merged-definition and context lines (R4/R5) further expose how
each phrase was disambiguated, in both the UI links notation and any future
report.

## R9 — Report related issues to other repositories

> If issue related to any other repository/project, where we can report issues
> on GitHub, please do so. Each issue must contain reproducible examples,
> workarounds and suggestions for fix the issue in code.

**Status: assessed — none warranted.** See
[`ONLINE-RESEARCH.md`](ONLINE-RESEARCH.md). Every defect is in this repository
(version display, report generation, links-notation rendering, the cache
format); none traces to an upstream dependency or external data error.

## R10 — Apply the fix across the entire codebase

> double check to fully apply requirements to entire codebase, so if we have
> issue in multiple places, it should be fixed in all them.

**Status: done.** The links-notation renderers (`formalize-renderers.js`,
`translation-renderers.js`) are shared by every entry point (Formalize page,
Translate page, CLI, server), so the merged definition and context lines (R4/R5)
appear everywhere links notation is produced. The Formalize page already defaults
its link target to Wikipedia, so R3 needed changing only on the Translate page.
The report change (R2) lives in the single shared `page-report.js`.

## R11 — Do everything in one pull request (#129)

> Please plan and execute everything in this single pull request … until each
> and every requirement fully addressed, and everything is totally done.

**Status: in progress.** All work lands on branch `issue-128-41095a0f356d` /
PR #129, with a single changeset (`.changeset/issue-128-links-notation.md`).
