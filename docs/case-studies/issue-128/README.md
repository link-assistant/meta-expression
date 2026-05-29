# Issue 128 Case Study

Issue: https://github.com/link-assistant/meta-expression/issues/128

PR: https://github.com/link-assistant/meta-expression/pull/129

## Summary

A bug report filed from the Translate page (`web/#/translate`) on `v0.9.0`
(commit `8b336fb`, build time `2026-05-28T10:16:32Z`) translating the sentence
**"Hawaii is a state."** from English to Russian, with all three sources
(Wikipedia, Wikidata, Wiktionary) enabled. The translation itself was correct
(`Гавайи это штат.`), but the report bundled several presentation and
infrastructure problems:

1. **The version never increases.** The deployed app was stuck on `v0.9.0` "for
   a long time", and the debug log printed `App version: unknown`.
2. **Two report sections waste space.** The generated issue carries a
   `## Report Notes` and a `## Reproduction Steps` block that add no diagnostic
   value and crowd out the room available in the URL-bounded report.
3. **English shows no Wikipedia link.** The Russian output links
   `Гавайи` to `ru.wikipedia.org`, but the English formalization links `Hawaii`
   only to `wikidata.org/wiki/Q782` — "I think we should show a link to
   wikipedia, if we have it".
4. **Links notation should merge the entity definition** — show everything that
   matched the term across Wikipedia, Wikidata, and Wiktionary so the sources
   cross-reference each other and help disambiguate.
5. **Links notation should show the selected contexts** — in priority order
   (highest probability first), with the exact probability we computed and how
   many source words share each context, in both the formalization and the
   translation.
6. **The quality gate must run on the top-most-viewed articles** and, when
   merged to main, **refresh an API request/response cache** so the same test
   (and the web app) replays offline and faster next time. "Cache should be in
   data folder and in .lino format, as we usually do."
7. **Compile this case study** and do a deep analysis (timeline, requirements,
   root causes, solution plans, online research).

This folder reconstructs the timeline, enumerates every requirement, performs
root-cause analysis backed by the captured debug log, proposes solution plans,
and records the online/library research that informed the fix.

## Files

- [`data/issue.json`](data/issue.json) — the raw issue body + metadata as
  captured from the GitHub API.
- [`data/debug-log.md`](data/debug-log.md) — the debug log embedded in the issue
  body, preserved verbatim as research data.
- [`REQUIREMENTS.md`](REQUIREMENTS.md) — the complete, numbered requirement list
  distilled from the issue body.
- [`TIMELINE.md`](TIMELINE.md) — reconstructed sequence of events.
- [`ROOT-CAUSES.md`](ROOT-CAUSES.md) — per-problem root-cause analysis with
  evidence quoted from the debug log.
- [`SOLUTION-PLAN.md`](SOLUTION-PLAN.md) — solution plan for each requirement and
  what this PR actually changed.
- [`ONLINE-RESEARCH.md`](ONLINE-RESEARCH.md) — existing components, libraries,
  and external facts considered.

## Reproduction

The smallest reproduction is the sentence itself, captured as automated tests in
`js/tests/integration/issue-128.test.js` (Wikipedia link, merged definition, and
contexts in both the formalization and translation links notation) and
`js/tests/integration/issue-128-cache.test.js` (the `.lino` API cache round-trip,
freshness, and an offline replay of "Hawaii is a state."). To reproduce the
original report end-to-end, paste `Hawaii is a state.` into the Translate page
(`en` → `ru`, all three sources enabled), pick the **Wikipedia** link target, and
inspect the formalization links notation and the copied debug log.
