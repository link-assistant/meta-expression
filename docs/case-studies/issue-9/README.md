# Issue 9 Case Study: More Improvements to Support Our Vision

Issue: https://github.com/link-assistant/meta-expression/issues/9
PR: https://github.com/link-assistant/meta-expression/pull/10

## Summary

The issue requests a substantial expansion of the meta-expression prototype:

1. Every example must have an explicit opposite/negation example.
2. The web prototype must show 4 random examples by default and provide a
   `show all` action that lists every example. Clicking an example pastes it
   into the input field.
3. The interpretations panel must include `alternatives` - more precise
   rephrasings of the original statement that the user can adopt.
4. The left side of the workspace must list `dependencies`, `definitions`,
   `confirmations`, and `refutations` for the selected interpretation. Each
   confirmation/refutation should be quoted with a link to its source.
5. The right pane currently named `Links Network` must be renamed to
   `Reasoning Steps`. Steps should be ordered by an explicit reasoning
   strategy. Multiple strategies must be selectable so meta-strategies can be
   discovered later.
6. The user must select exactly one interpretation; downstream reasoning
   operates on that selection.
7. Reasoning steps must start by mapping the largest possible phrases to
   Wikidata Q/P ids (longest-match disambiguation). Sub-phrase Q/P matches go
   into the interpretation list. Every Wikidata/Wikipedia request must be
   cached in `localStorage` so the cache survives page reloads.
8. Compile the case study under `docs/case-studies/issue-9/` with all data,
   requirements analysis, and implementation plan.

## Captured Data

| File                                                                               | Purpose                                                                                                                         |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [`data/issue-9.json`](./data/issue-9.json)                                         | Original issue body and metadata                                                                                                |
| [`data/issue-9-comments.json`](./data/issue-9-comments.json)                       | Issue comments captured through GitHub API                                                                                      |
| [`data/pr-10.json`](./data/pr-10.json)                                             | Draft pull request metadata                                                                                                     |
| [`data/pr-10-conversation-comments.json`](./data/pr-10-conversation-comments.json) | PR conversation comments                                                                                                        |
| [`data/pr-10-review-comments.json`](./data/pr-10-review-comments.json)             | PR inline review comments                                                                                                       |
| [`data/pr-10-reviews.json`](./data/pr-10-reviews.json)                             | PR reviews                                                                                                                      |
| [`assets/web-after.png`](./assets/web-after.png)                                   | Web prototype - default `Earth orbits the Sun` view after the fix                                                               |
| [`assets/web-moon-orbit.png`](./assets/web-moon-orbit.png)                         | Web prototype - `Moon orbits the Sun` shows alternatives, dependencies, definitions, confirmations, and ordered reasoning steps |
| [`assets/web-moon-negated.png`](./assets/web-moon-negated.png)                     | Web prototype - `Moon does not orbit the Sun` shows the negated claim refuted with the same Wikidata chain                      |
| [`assets/web-evidence-first.png`](./assets/web-evidence-first.png)                 | Web prototype - same statement re-ordered with the `Evidence first` strategy                                                    |

## Requirement Matrix

| ID  | Requirement                                                                               | Status | Notes                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Every example has an opposite/negation example.                                           | Done   | Each example carries an `opposite` field referencing its inverse. Tests assert all examples have opposites.                                                         |
| Q2  | Many more examples than before.                                                           | Done   | Examples expanded from 8 to 24+. Categories cover calculator, evidence, question, logic, and self-reference.                                                        |
| Q3  | Show 4 random examples by default; `show all` reveals the full list.                      | Done   | Web UI renders four random examples per page load and exposes a `Show all` toggle. Refresh re-randomizes.                                                           |
| Q4  | Click on an example pastes it into the input field.                                       | Done   | Example buttons populate the statement input and trigger analysis.                                                                                                  |
| Q5  | Provide alternatives - more precise rephrasings - alongside interpretations.              | Done   | `Moon orbits the Sun` proposes `Moon orbits Earth, which orbits the Sun` as a more precise alternative.                                                             |
| Q6  | List dependencies on the left (e.g. `Moon exists`, `Sun exists`, `orbit defined as ...`). | Done   | Left workspace section renders dependencies surfaced by the analyzer.                                                                                               |
| Q7  | List definitions of each part on the left.                                                | Done   | Left workspace section renders Wikidata-backed definitions for each phrase.                                                                                         |
| Q8  | List confirmations (quoted, linked) on the left.                                          | Done   | Each evidence item produces a quoted `confirmation` with a source link.                                                                                             |
| Q9  | List refutations (quoted, linked) on the left.                                            | Done   | Refutations rendered the same way as confirmations.                                                                                                                 |
| Q10 | Rename the right section to `Reasoning Steps`.                                            | Done   | Header, ARIA label, and serialization all use `reasoning steps`.                                                                                                    |
| Q11 | Reasoning steps execute in order based on a chosen reasoning strategy.                    | Done   | Strategies are first-class: `disambiguation-first`, `evidence-first`, `formalization-first`. The selected strategy decides ordering.                                |
| Q12 | Support as many reasoning strategies as possible (foundation for meta-strategies).        | Done   | Strategy registry exposes multiple strategies; the registry is the contract that meta-strategies will compose.                                                      |
| Q13 | Selecting one interpretation drives the rest of the reasoning.                            | Done   | Existing `selectedInterpretation` continues to gate formalization; UI now displays the selected interpretation prominently and disables others.                     |
| Q14 | Disambiguation phase first maps longest possible phrases to Q/P ids.                      | Done   | New disambiguation strategy enumerates n-grams largest-first; longer matches win and become the primary interpretation. Sub-phrase matches join the candidate list. |
| Q15 | Real Wikidata/Wikipedia requests are cached in `localStorage`.                            | Done   | Browser cache wraps the live evidence client with a `localStorage`-backed `Map` so requests survive reload.                                                         |
| Q16 | Collect case study under `docs/case-studies/issue-9/`.                                    | Done   | This document and the `data/` and `assets/` folders.                                                                                                                |

## Existing Components Reused

- [`link-assistant/human-language`](https://github.com/link-assistant/human-language) - Reference for n-gram, longest-match Wikidata disambiguation, and IndexedDB caching.
- Internal `wikimedia-evidence.js` already covers entity search and parent-body chain traversal. We reuse it for confirmations/refutations and extend it with cache injection.
- Existing `analyzeStatement()` pipeline is extended rather than rewritten so MVP guarantees (R10-R20) keep holding.

## Reasoning Strategies

The prototype now exposes three named strategies:

| Strategy ID            | Description                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `disambiguation-first` | Map the largest possible phrases to Wikidata Q/P ids first, then formalize, then evaluate evidence. |
| `evidence-first`       | Look up evidence first to detect contradictions early, then disambiguate and formalize.             |
| `formalization-first`  | Try to formalize the statement before resolving evidence; useful for arithmetic-style statements.   |

Strategies are stored in a small registry (`reasoningStrategies`) so future
meta-strategies can compose them.

## Implementation Plan (executed in this PR)

1. Extend the prepared example list with opposites and additional cases. Add a
   helper `getRandomExamples(count, seed)` for the web prototype.
2. Surface `alternatives` from `analyzeStatement()` based on known claim
   templates and disambiguation hints.
3. Add `dependencies`, `definitions`, `confirmations`, and `refutations`
   helpers and render them in a new left-panel section.
4. Rename the right panel to `Reasoning Steps`. Add a strategy selector and
   reorder steps according to the selected strategy.
5. Add a longest-match Wikidata phrase disambiguator that produces extra
   interpretation candidates and seeds the disambiguation reasoning step.
6. Persist the live evidence cache in `localStorage` through a thin
   storage-backed `Map` wrapper.
7. Update tests and add new ones for opposites, alternatives, dependencies,
   strategy ordering, and persistent cache.
8. Add a changeset describing the user-facing improvements.

## Deferred / Out of Scope

- Wiring a Rust/WASM core for the new disambiguator (tracked in R5).
- Persisting the entire links network in IndexedDB (tracked in R29).
- LLM-driven candidate interpretations (tracked in R11/R12).
- Full meta-strategy synthesis - the strategy registry is the foundation
  required before meta-strategies can be implemented.
