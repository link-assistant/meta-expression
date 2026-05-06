# Solution plan for issue #21

This plan mirrors the requirements list in [`REQUIREMENTS.md`](./REQUIREMENTS.md).
File paths are anchored to the repository root.

## Phase 1 — Resolver tier upgrade

Touches: `src/formalize-sources.js`, `src/formalize.js`,
`src/formalize-overrides.js`.

1. Add a `createWikipediaSource()` factory next to the existing
   `createWikidataSource()` and `createWordNetSource()`. It uses the
   `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops|extracts&titles=…&exintro=1&explaintext=1`
   endpoint to discover the pages backing the n-gram. The returned
   candidate carries the `wikibase_item` from `pageprops` so the next layer
   (Wikidata) can pick up `claims` for context aggregation.
2. Promote `createWordNetSource()` from a hint provider to a true resolver:
   when Wiktionary returns an entry but neither Wikipedia nor Wikidata did,
   emit a candidate whose `entity.id` is `wikt:<lemma>` and whose
   `linkTarget` is the Wiktionary page. The doublets and lino encoders
   already accept arbitrary string ids, so no schema change is needed.
3. Source ordering inside `searchNgramCandidates()` becomes
   `wikipedia > wikidata > wordnet > fandom > overrides-short-circuit`.
4. Add a `formsLookup()` helper that, when a phrase fails the cheap label
   match, queries `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=<phrase>&type=form`
   plus `wbgetentities ids=L… props=forms` so verbs like _formalize_
   surface their lexeme parents.

Tests: `tests/issue-21-resolver-tiers.test.js` mocks the Wikipedia,
Wikidata and Wiktionary endpoints via the existing `makeFetch(routes)`
fixture pattern.

## Phase 2 — Context aggregation across all candidates

Touches: `src/formalize-contexts.js`, `src/formalize.js`.

1. `aggregateBigContexts(phrases)` currently walks the chosen candidate per
   phrase. Change it to walk **every** candidate of every phrase, weighted
   by the candidate's score relative to the phrase total.
2. `aggregateContexts()` (small contexts) gets the same treatment.
3. Expose the new flag `phrase.candidates[i].contextLabels` on the wire so
   the UI can render category chips inside the dropdown.

Tests: extend `tests/issue-15.test.js` patterns with multi-candidate
fixtures and assert that the dominant Big-context wins even when each
phrase's top candidate disagrees.

## Phase 3 — UI redesign

Touches: `web/index.html`, `web/app.js`, `web/styles.css`.

1. Replace the buttons inside `#formalize-contexts` and
   `#formalize-big-contexts` with `<input type="checkbox">` controls; the
   first 5 boxes start `checked`.
2. On change, re-run `applyContextLens` against the cached pipeline result
   instead of re-fetching from the network.
3. Render each phrase link with a hidden `<div class="phrase-tooltip">`
   sibling. Tooltip becomes visible on `mouseenter`/`focusin` and is
   dismissed on `mouseleave`/`focusout`/`keydown(Escape)`.
4. Tooltip layout: top half = description + chips for `contextLabels`;
   bottom half = `<select>` of candidates (label + score) + free-form
   `<input pattern="^[QPL]\d+$">`. Choosing a candidate or submitting an
   id calls `applyManualOverride(phrase, qid)` which both updates the local
   render and appends an entry to the overrides textarea.
5. Manual overrides inserted from the tooltip get the `kind: "manual"` tag
   so they can be distinguished from repo overrides.

Tests: new Playwright spec under `examples/playwright/issue-21-tooltip.spec.js`
exercises hover, dropdown selection, and manual id entry.

## Phase 4 — Snapshot cache and offline tests

Touches: `src/formalize-cache.js` (extend with snapshot mode),
`src/formalize-sources.js` (route through the resolver), new
`src/formalize-snapshots.js`, `package.json` scripts.

1. Add a `createSnapshotResolver({root, mode})` helper. `mode` is one of
   `replay-only` (CI default), `record-missing` (developer default) or
   `record-all` (force refresh).
2. Snapshots live under `.cache/formalize/snapshots/<source>/<sha1>.{bin,lino}`
   so the dual-format guarantee from `formalize-cache.js` carries over.
3. Add `npm run formalize:record-snapshots` to refresh snapshots from the
   live API and `npm run test:snapshots` (used in CI) to assert against the
   recorded set with no network access.

Tests: `tests/issue-21-snapshots.test.js` boots a fixture HTTP server,
issues a record pass, then re-runs in replay mode with a guard that any
fetch attempt throws.

## Phase 5 — First-party examples

Touches: `docs/case-studies/issue-21/SAMPLE-STATEMENTS.md`, possibly
`scripts/formalize-self.js`.

1. Harvest statements from `README.md`, `docs/REQUIREMENTS.md`,
   `docs/ROADMAP.md`, and recent issue titles. Store them in
   `SAMPLE-STATEMENTS.md` with the expected dominant context.
2. Add a one-shot script that runs the formalizer against every sample and
   writes the formalized markdown to
   `docs/case-studies/issue-21/formalized/<slug>.md`.
3. CI optionally runs the script in replay mode to detect drift.

## Phase 6 — Documentation & PR hygiene

1. Update `docs/REQUIREMENTS.md` to add the new resolver-priority and
   snapshot-cache contracts.
2. Update PR #22 with before/after screenshots, a `.lino` snapshot
   snippet, and a checklist mapped to R21.x ids.

## Existing libraries surveyed

See [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md) for full notes; the short
list:

- **`wikibase-sdk`** (npm) — typed Wikidata API helper. Considered for
  candidate scoring but rejected: pulls in an extra runtime dep for an
  endpoint we already speak natively.
- **`nodeJS-wikipedia`** / **`wikipedia` (npm)** — convenient summary
  fetcher. Reused only as a documentation reference; we keep our own thin
  client so we can route through the snapshot layer.
- **`@wikimedia/codex`** — design system for tooltips/popovers. Useful
  inspiration; we will keep our own DOM to avoid a 200KB dep.
- **`nock`** / **`msw`** — HTTP mocking libraries. We already have a
  hand-rolled `makeFetch()` fixture; sticking with it keeps tests
  dependency-free.
