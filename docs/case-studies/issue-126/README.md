# Issue 126 Case Study

Issue: https://github.com/link-assistant/meta-expression/issues/126

PR: https://github.com/link-assistant/meta-expression/pull/127

## Summary

A bug report filed from the Translate page (`web/#/translate`) on `v0.9.0`
(commit `5679058`) translating the opening paragraph of an "Artificial
intelligence" article from English to Russian. The reporter raised several
intertwined problems:

1. **Formalization/translation quality is still bad** and the disambiguation
   **questions "look fake"** — answering one removes the question without
   changing the English formalization.
2. **Wrong context detection** — common phrases resolved to scholarly-article
   titles. The flagship example: `developing systems` →
   [Q41668433](https://www.wikidata.org/wiki/Q41668433) ("Developing systems
   for cost-effective auditing of clinical trials"), a 1997 clinical-trials
   paper with nothing to do with AI.
3. **No visibility** into how a word's context was chosen — neither the UI nor
   the debug log explained the decision.
4. **Bug reporting is hard** — there was no one-click "copy debug log" button
   and the debug log omitted the source text.
5. **The package version never increases on releases.**
6. The solution should **generalize** to any English, Russian, or other-language
   text while keeping all previous tests green.

This folder reconstructs the timeline, enumerates every requirement, performs
root-cause analysis backed by the captured debug log, proposes solution plans,
and records the online/library research that informed the fix.

## Files

- [`data/issue.json`](data/issue.json) — the raw issue body + metadata as
  captured from the GitHub API.
- [`data/debug-log.md`](data/debug-log.md) — the full 49k-line debug log linked
  from the issue (mirrored from the reporter's gist), preserved verbatim as
  research data.
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

The smallest reproduction is a genuine homonym, captured as an automated test in
`js/tests/integration/issue-126-context-selection.test.js` and the
scholarly-article rejection in
`js/tests/integration/issue-126-context-detection.test.js`. To reproduce the
original report end-to-end, paste the paragraph from `data/issue.json` into the
Translate page (`en` → `ru`, all three sources enabled) and inspect the per-word
context list and the copied debug log.

## Outcome (what this PR changed)

- Scholarly-article candidates (by Wikidata description or hydrated `P31`
  claims) are demoted so they no longer hijack everyday phrases.
- `formalizeTextWith` now exposes a persistent `contextQuestions` array and
  honors a `contextSelections` option; the Translate page renders the questions
  as interactive, non-disappearing controls that re-pin a sense, re-derive the
  English formalization, and re-run translation.
- The Translate page gained a per-word context panel, a one-click **Copy debug
  log** button, and the debug log now includes the source text, per-word context
  detection (candidates, scores, publication flags, most-likely context), and
  the context-selection questions.
- The release workflow was fixed so the version bump, commit, git tag, and
  GitHub release happen on every push to `main` even when npm publishing is
  disabled. Only the npm publish step remains opt-in.

See [`SOLUTION-PLAN.md`](SOLUTION-PLAN.md) for the mapping from each requirement
to the concrete change.
