# Issue 126 — Solution Plan

For each requirement (see [`REQUIREMENTS.md`](REQUIREMENTS.md)) this lists the
options considered and the option taken in PR #127.

## R1 — Persistent context-selection questions that re-run translation

**Options considered**

- _(A)_ Reuse the existing translation-variable question machinery and just stop
  consuming questions. Rejected: those questions are about target labels, not
  source-sense selection, and don't change the English formalization.
- _(B)_ Add a new first-class concept — context-selection questions — surfaced on
  the formalization result, with an input channel to pin a sense. **Taken.**

**Plan / implementation**

- `buildContextQuestions(phrases)` emits one `kind: 'context-selection'` question
  per word with >1 candidate, including the currently selected sense and all
  options. Questions are regenerated on every formalization, so they never
  "disappear".
- `normalizeContextSelections(input)` accepts a `Map`, array, or object keyed by
  phrase **start index** (UI-stable) or **phrase text** (API-friendly) → entity
  id.
- `applyContextSelections(phrases, selections)` re-picks the chosen candidate
  _after_ `applyContextLens`, so the user's choice beats both the score ranking
  and the lens.
- `formalizeTextWith` threads `contextSelections` through `createConfig` and
  exposes `contextQuestions` on the result; `translateTextWith` inherits it, so a
  new selection re-derives the English formalization and re-runs translation.
- UI: `web/translate-ui.js` keeps `ctx.contextSelections` across re-runs; clicking
  a sense calls `applyContextSelection` → `executeTranslate`. Questions render as
  `aria-pressed` buttons that pre-highlight the active sense.
- Tests: `js/tests/integration/issue-126-context-selection.test.js`.

## R2 — Reject scholarly-article candidates

**Options considered**

- _(A)_ Hard-code a blocklist of bad Q-ids. Rejected: doesn't generalize.
- _(B)_ Detect the _class_ of publications via description heuristics + `P31`
  claims and demote them. **Taken** — generalizes to any language and any paper.

**Plan / implementation**

- `isScholarlyPublicationCandidate` + `scholarlyInstanceIds` /
  `publicationDescriptionPattern` in `js/src/formalize-contexts.js`. Wired into
  candidate ranking so publications lose to everyday concepts unless the phrase
  is the verbatim title.
- Tests: `js/tests/integration/issue-126-context-detection.test.js`.

## R3 — Surface context detection in UI + debug log

- `buildWordContexts` exposes per-word candidates (id, label, description, score,
  selected, publication flag, detected context claims).
- UI renders a per-word context section; debug log prints "Context detection" +
  "Word contexts" + most-likely context.

## R4 — One-click copy debug log

- `translate-copy-debug-log` button in `web/index.html`; handler in
  `setupTranslateCopyButtons`; i18n keys `translate.copyDebug` (en + ru).

## R5 — Enrich debug log

- `formatDebugLog` includes app version, languages, status, **source text**,
  formalized markdown, translated markdown, context detection, context-selection
  questions, full step JSON, and CST JSON. Refactored with a `debugSection`
  helper to stay under the lint complexity threshold.

## R6 — Fix the version bump

- `.github/workflows/js.yml`: remove `NPM_PUBLISH_ENABLED` from the `release`
  job-level `if`; gate only the npm OIDC setup and `publish-to-npm` step with it;
  create the GitHub release + tag whenever a version was committed, using
  `steps.publish.outputs.published_version || steps.version.outputs.new_version`.
- A changeset (`.changeset/issue-126-context-selection.md`, `minor`) is added so
  the fixed workflow has something to bump on the next merge to `main`.

## R7 — Generalize, keep tests green

- All new logic keys off Wikidata claims/descriptions and phrase offsets, not
  English-specific rules, so it applies to any language.
- Verified: `test:unit` (56), `test:integration` (290, 10 skipped), `test:e2e`
  (82) all pass; no existing test was weakened.

## R8 / R9 — Case study + verbose mode

- This folder (R8). The formalizer's `trace` records API requests/responses and
  pipeline steps by default; the enriched debug log makes context decisions
  inspectable (R9).

## R10 — Upstream issues

- See [`ONLINE-RESEARCH.md`](ONLINE-RESEARCH.md): the defect is in our ranking,
  not an upstream dependency, so no external issue is warranted. Wikidata
  returning articles from `wbsearchentities` is documented, expected behavior.

## R11 — Apply across the codebase

- The shared `formalize-contexts.js` helpers are used by every entry point;
  exports added to `js/src/index.js`. No duplicate ranking logic exists
  elsewhere that needed the same fix.

## R12 — One PR

- All commits land on `issue-126-e1ac50244d41` / PR #127.
