# Issue 128 — Reconstructed Timeline

All timestamps come from [`data/issue.json`](data/issue.json) and the captured
[`data/debug-log.md`](data/debug-log.md).

1. **2026-05-28T10:16:32Z — Build deployed.** GitHub Pages publishes the
   Translate prototype at `v0.9.0`, commit `8b336fb`, ref `main`
   (`build source: github-pages`). This is the same `0.9.0` that had been live
   for several earlier builds — the version number never moved.

2. **2026-05-29T16:32:14Z — Reproduction captured.** The reporter translates
   `Hawaii is a state.` (`en` → `ru`, all three sources enabled). The Translate
   page records the status _"Translated 1 sentence (1/3 linked phrases, 1
   rule-resolved; 1 unresolved)."_ and produces the correct Russian
   `Гавайи это штат.`

3. **Symptoms visible in the captured data.**
   - The debug log opens with `App version: unknown` (RC1) even though the
     deployed build is `v0.9.0 (8b336fb)`.
   - The English formalization links `Hawaii` to
     `wikidata.org/wiki/Q782`, while the Russian result links `Гавайи` to
     `ru.wikipedia.org` — asymmetric link targets (RC3).
   - The report body carries `## Report Notes` and `## Reproduction Steps`
     sections that the reporter calls out as removable (RC2).
   - Three candidate senses are listed for `Hawaii` (Q782, Q68740, Q18703903)
     and for `state` (three Wiktionary senses), but the links notation does not
     merge them into a single cross-referenceable definition (RC4), nor does it
     show the elected context priority/probability numerically (RC5).

4. **2026-05-29 — Issue #128 filed.** Title: _"Issue on Translate page: Hawaii is
   a state."_ The body bundles the environment, input text, options, status,
   formalized markdown, translated result, questions, a (truncated) debug log,
   and a multi-part description enumerated in [`REQUIREMENTS.md`](REQUIREMENTS.md).

5. **2026-05-29 — Work begins on branch `issue-128-41095a0f356d` / PR #129.**
   The fix proceeds in two commits:
   - `b28b797` — Surface Wikipedia links, merged definitions, and contexts in
     links notation; remove the report sections; fix the version display
     (R1–R5, R10).
   - `10d9485` — Add the `.lino` Wikimedia API cache in the data folder, the
     refresh script, the freshness check, and web-app seeding (R6), plus this
     case study (R7).
