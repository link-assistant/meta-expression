# Requirements derived from issue #21

Each requirement is atomic, testable, and references the file(s) it touches.
The numbering (R21.x) is local to this case study; the global REQUIREMENTS
document keeps the project-wide R1..R38 series.

## A. Disambiguation pipeline

- **R21.1** Resolve every phrase against **Wikipedia first**, fall back to
  **Wikidata**, then **Wiktionary**. Currently Wiktionary is only used as a
  search-only WordNet fallback (`src/formalize-sources.js`); promote it to a
  full resolver tier.
- **R21.2** When a phrase has no exact label match, look up Wikidata
  **forms** of lexeme entries so verbs like _formalize_ resolve to
  `Q115492965` ("to formalize").
- **R21.3** When all three sources fail (function words like _the_ in some
  registers), still emit a Wiktionary link rather than dropping the word.
- **R21.4** A phrase resolution must keep **all alternatives**, not just the
  winner. The candidate list is what powers both the in-place dropdown and
  the context aggregation.

## B. Context graph

- **R21.5** For each candidate, fetch its `P910` (topic's main category),
  `P31` (instance of), `P279` (subclass of), `P361` (part of), `P136`
  (genre), `P425` (field of work), `P106` (occupation) values up to depth 2
  (BFS). This already exists in `src/formalize-contexts.js`; widen its input
  set so it walks **every** candidate, not only the chosen one.
- **R21.6** Aggregate context counts across candidates with frequency × depth
  weighting (depth 1 = 1.0, depth 2 = 0.5, etc.).
- **R21.7** Surface the top **five** big-contexts as **autoselected
  checkboxes**; allow the user to toggle them on/off. Toggling rescores
  every phrase via `applyContextLens`.
- **R21.8** Surface the top contexts (small-context band) as **checkboxes**
  too, replacing the current "buttons that act like radio buttons".

## C. Per-word UI

- **R21.9** Each rendered phrase link must accept a hover that shows a
  tooltip with **two stacked panes**:
  - Top pane (read-only): description + category chips.
  - Bottom pane (interactive): dropdown of alternative candidates plus a
    free-form input that accepts a Q/P id.
- **R21.10** Manual Q/P id entry must persist as an **override** for that
  phrase in the current Formalize session and round-trip through the
  overrides textarea (Links Notation).
- **R21.11** Tooltip must be keyboard-accessible (focus-trap and Esc to
  close) for accessibility parity with the existing buttons.

## D. Caching, snapshots, and tests

- **R21.12** All Wikimedia traffic must go through a layered resolver:
  `overrides → snapshot cache → live API`. Each layer is independently
  toggleable.
- **R21.13** When the live API tier is hit, the response must be persisted
  as a `.lino` snapshot under `.cache/formalize/snapshots/<source>/<id>.lino`
  (paired with a `.bin` doublets blob) so subsequent runs (including CI)
  serve it offline.
- **R21.14** A new `npm run` target replays cached snapshots and **never**
  hits the network in CI.
- **R21.15** Tests must exercise the full pipeline (search →
  candidate score → context aggregation → context lens) against recorded
  snapshots so changes to scoring break tests deterministically.
- **R21.16** A snapshot recording mode (env or CLI flag) re-records all
  snapshots from the live API in a single pass for maintainers.

## E. First-party formalization examples

- **R21.17** `docs/case-studies/issue-21/SAMPLE-STATEMENTS.md` lists
  statements harvested from this repo (issue titles, requirement bullets,
  ROADMAP slices) with the expected dominant Big-context.
- **R21.18** A docs target (`npm run docs:formalize` or sibling) feeds those
  samples through the pipeline and writes the formalized result back into
  the case study.

## F. Documentation & PR hygiene

- **R21.19** Update `docs/REQUIREMENTS.md` so the new contracts (Wikipedia
  priority, snapshot cache layer, top-5 checkboxes) are reflected at the
  project level.
- **R21.20** PR #22 description includes screenshots of the before/after
  Formalize panel and a snippet of the recorded `.lino` snapshot used by
  tests.
