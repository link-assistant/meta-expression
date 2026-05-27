# Issue 126 — Requirements

Every requirement extracted from the issue body
([`data/issue.json`](data/issue.json)), numbered for traceability. Each entry
notes the status in PR #127.

## R1 — Real, persistent context-selection questions

> Questions still look fake, as if we don't have actual options collected. We
> might need add questions or question for context selection also, but all these
> should not disappear on user selection, they should just modify the
> formalization result, and if formalization result of english text changed,
> translation should re-execute.

- The Translate page must present questions whose options are _actually
  collected_ candidate senses.
- Answering a context-selection question must **not** remove it.
- Selecting an option must **modify the formalization** (pin that sense).
- If the English formalization changes, **translation must re-execute**.

**Status: done.** `contextQuestions` + `contextSelections` in
`js/src/formalize-contexts.js` / `formalize.js`; interactive UI in
`web/translate-ui.js`; tests in
`js/tests/integration/issue-126-context-selection.test.js`.

## R2 — Fix wrong context detection (scholarly-article pollution)

> For example [developing systems] was formalized as
> https://www.wikidata.org/wiki/Q41668433 (which is clearly in medical or
> specifically clinical trials context, not in anything AI related). So we
> clearly have wrong context detection …

- Common phrases must stop resolving to scholarly-article / paper titles.

**Status: done.** `isScholarlyPublicationCandidate` demotes publication
candidates; tests in `js/tests/integration/issue-126-context-detection.test.js`.

## R3 — Surface context-detection reasoning in UI and debug log

> we need to update our UI and debug log, to include information about how we
> detected possible contexts for each specific word, and which context was more
> likely from all the worlds, if we still don't have that mechanism we must
> implement it …

- Show, per word, the possible contexts that were detected.
- Show which context was most likely.

**Status: done.** `buildWordContexts` powers a per-word context panel and a
"Context detection" / "Word contexts" section in the debug log; the most-likely
context is printed too.

## R4 — One-click "copy debug log" button

> also add a button to copy debug log in one click, so the bug reporting will be
> simplified in the future

**Status: done.** `translate-copy-debug-log` button wired in `web/index.html` /
`web/translate-ui.js` / `web/i18n.js`.

## R5 — Debug log must contain the source text (and other useful data)

> Also make sure debug log contains source text, and also any other data, we
> might in the future for debug.

**Status: done.** Debug log now includes app version, source/target language,
status, **source text**, formalized markdown, translated markdown, context
detection, context-selection questions, translation steps (full JSON), and the
translation CST JSON.

## R6 — Fix the version bump on releases

> Also I notices the version bump is not working or version is not increasing on
> releases of each version of application. That must be fixed.

**Status: done.** The `release` job in `.github/workflows/js.yml` was entirely
gated by `NPM_PUBLISH_ENABLED`, which is unset, so the version-bump step never
ran. Decoupled version bump + GitHub release from npm publishing.

## R7 — Generalize to any language, keep all tests green

> our algorithm, should be able to formalize any English text, any Russian text
> and in any other language. We should focus on generalization of solution. If
> we need some architectural fixes, we can definitely do them, everything while
> keeping all previous test cases working …

- Architectural fixes are allowed; tests may be updated if it improves quality
  across all tests.

**Status: addressed.** The scholarly-article demotion and context-selection
mechanism are language-agnostic (they key off Wikidata claims/descriptions and
phrase start indices, not English-specific rules). All existing unit (56),
integration (290), and e2e (82) tests remain green.

## R8 — Compile a case study with deep analysis

> We need to download all logs and data related about the issue … compile that
> data to ./docs/case-studies/issue-{id} … reconstruct timeline/sequence of
> events, list of each and all requirements …, find root causes …, and propose
> possible solutions and solution plans … (we should also check known existing
> components/libraries …, also make sure to search online for additional facts).

**Status: done.** This folder.

## R9 — Add debug output / verbose mode if data is insufficient

> If there is not enough data to find actual root cause, add debug output and
> verbose mode if not present, that will allow us to find root cause on next
> iteration.

**Status: done.** The formalizer already records a `trace` of API
requests/responses and pipeline steps (default on); the debug log now surfaces
the per-word context candidates, scores, and publication flags that explain
each disambiguation decision.

## R10 — Report related issues to other repositories

> If issue related to any other repository/project, where we can report issues
> on GitHub, please do so. Each issue must contain reproducible examples,
> workarounds and suggestions for fix the issue in code.

**Status: assessed — see [`ONLINE-RESEARCH.md`](ONLINE-RESEARCH.md).** The
defects are in this repository's ranking/coverage logic, not in an upstream
dependency. Wikidata returning scholarly articles for `wbsearchentities` is
expected upstream behavior, not a bug, so there is no external issue to file;
the fix belongs in our candidate scoring.

## R11 — Apply the fix across the entire codebase

> double check to fully apply requirements to entire codebase, so if we have
> issue in multiple places, it should be fixed in all them.

**Status: done.** Scholarly-article detection and context selection live in the
shared `formalize-contexts.js` used by every entry point (`formalizeTextWith`,
`translateTextWith`, CLI, server, web). Exports added to `js/src/index.js`.

## R12 — Do everything in one pull request (#127)

**Status: in progress.** All work lands on branch `issue-126-e1ac50244d41` /
PR #127.
