# Case Study: Issue #21 — Perfecting Context Detection in the Formalize Pipeline

> Source: <https://github.com/link-assistant/meta-expression/issues/21>
> Branch: `issue-21-12a11b28b6e5`
> Pull request: <https://github.com/link-assistant/meta-expression/pull/22>
> Raw issue body archived to [`data/issue-21-body.md`](./data/issue-21-body.md).

## 1. Executive summary

The Formalize tab links each phrase to a Wikidata entity, but does not yet
**explain** why one entity was chosen over another, and it cannot reason
across alternatives. The issue asks us to:

1. For every interpretation alternative of a word (e.g. _reasoning_ →
   `Q1156402` / `Q484284` / `Q1151406` / `Q3478658`), gather the categories
   and worlds each alternative lives in, then present that as **shared
   context hints** instead of `No shared contexts inferred.`
2. Use those shared hints as **soft preselections** so disambiguating one
   word raises the prior probability of the same world for the next word.
3. Add a **hover tooltip with two surfaces** to every formalized word: the
   top half shows description + categories; the bottom half is an editor
   (dropdown of search hits + free-form Q/P id input).
4. Fix concrete failures the issue lists:
   - _reasoning_ should expose all five known senses, not just one.
   - _formalize_ should resolve to `Q115492965` (it has “to formalize” as a
     form).
   - _the_ should still resolve through Wiktionary even though Wikipedia and
     Wikidata have no useful entry for it.
5. Promote disambiguation priority to **Wikipedia → Wikidata → Wiktionary**.
6. Make every Wikipedia/Wikidata/Wiktionary call go through a **layered
   resolver**: overrides → on-disk cache (.lino snapshots) → live API; same
   layers are reusable in CI so the test suite does not hammer Wikimedia.
7. Use the repository’s own issues, requirements and ROADMAP entries as
   first-party formalization examples; eventually we should be able to fully
   formalize every statement we write.
8. Compile this case study under `docs/case-studies/issue-21/` with a deep
   analysis, a complete requirements list, proposed solution plans, an
   external research note, and links to candidate libraries.

## 2. Why now (motivation)

The screenshot embedded in the issue shows the Analyse view for
_reasoning_ with five distinct interpretations but no contextual stitching:
each word is disambiguated in isolation. As a result:

- A statement that mixes computer-science terms and astronomy terms gets the
  same context-blind treatment a single word would.
- The user has no way to recover from a misclassification without retyping
  the whole statement.
- Stop-words are silently dropped, which is friendly to the parser but
  confuses anyone who expected a one-to-one link rendering.

A working context layer is also a prerequisite for the next ROADMAP slice
(automatic formalization-level detection), because confidence and
correctness scoring both depend on a stable interpretation graph.

## 3. Source material

| Path | Purpose |
| --- | --- |
| [`data/issue-21.json`](./data/issue-21.json) | `gh issue view --json` snapshot for reproducibility |
| [`data/issue-21-body.md`](./data/issue-21-body.md) | Plain-markdown copy of the issue body |
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Numbered, atomic requirements derived from the issue |
| [`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md) | Per-requirement solution plan with file pointers |
| [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md) | External evidence + library survey |
| [`SAMPLE-STATEMENTS.md`](./SAMPLE-STATEMENTS.md) | First-party statements harvested from this repo |
| [`_archived-misplaced/`](./_archived-misplaced/) | The folder that previously lived here, kept for audit |

## 4. Interpretation example used throughout this study

The issue calls out _reasoning_ as the canonical disambiguation problem:

| QID | Wikidata label | Why it matters |
| --- | --- | --- |
| [Q1156402](https://www.wikidata.org/wiki/Q1156402) | reasoning (philosophy) | The default sense, "use of reason to draw inferences" |
| [Q484284](https://www.wikidata.org/wiki/Q484284) | automated reasoning | Computer-science sense; via P910 → Category:Automated reasoning (Q2555318 → Q52701496) |
| [Q1151406](https://www.wikidata.org/wiki/Q1151406) | reasoning system | Engineering sense |
| [Q3478658](https://www.wikidata.org/wiki/Q3478658) | reasoning (cognitive process) | Psychology sense |

The shared category between several of these is **automated reasoning** /
**logic**, so we expect those to win the “Big context” election when a
statement also mentions _computer_, _algorithm_, or _formalize_.

## 5. Outcome (what shipping this fixes)

- Every formalized phrase carries a **why-this-entity** payload (description,
  categories, alternative QIDs, source).
- The Formalize tab’s **Contexts** and **Big-context categories** surfaces
  become checkboxes with the top five preselected; toggling a checkbox
  re-ranks every phrase that overlaps with that context.
- The **Wikipedia → Wikidata → Wiktionary** chain runs once per phrase, so
  function words like _the_ stop disappearing from the linked output.
- Word-form lookups (e.g. _formalize_) succeed via Wikidata’s `forms`
  collection.
- The on-disk dual-format cache (`.cache/formalize/<key>/payload.{bin,lino}`)
  is reusable as **test snapshots**: tests load real recorded responses
  instead of hitting Wikimedia.
- The repository’s own issues and requirements are reused as smoke
  examples, which means regressions in disambiguation get caught against
  data we already maintain.
