# Issue 126 — Root-Cause Analysis

Each problem is traced to a concrete cause, with evidence quoted from
[`data/debug-log.md`](data/debug-log.md).

## RC1 — Scholarly-article titles win the candidate ranking

**Symptom.** Common phrases resolve to paper titles. From the debug log's
"Questions" section (the "Use linked source label" line is the linked entity's
real Wikidata label):

```text
What ru label should represent Q113894124 for "Artificial intelligence (AI)"?
[ ] Use linked source label -> Artificial Intelligence (AI) in Cardiotocography (CTG) Interpretation

What ru label should represent Q41668433 for "developing systems"?
[ ] Use linked source label -> Developing systems for cost-effective auditing of clinical trials

What ru label should represent Q118765798 for "tasks requiring"?
[ ] Use linked source label -> tasks requiring miraculous speed

What ru label should represent Q7993544 for "which"?
[ ] Use linked source label -> WHO-convened Global Study of Origins of SARS-CoV-2

What ru label should represent Q46230901 for "solving human"?
[ ] Use linked source label -> Solving human β-cell development—what does the mouse say?
```

**Cause.** Wikidata stores millions of scholarly articles, journals, and books.
`wbsearchentities` matches their long titles against the phrase's words and
returns them eagerly, often with a higher match score than the everyday concept.
Nothing in the candidate ranking knew that a `scholarly article`
(`P31 → Q13442814`) is almost never the intended sense of a common phrase, so
the article won the cover.

**Fix.** `isScholarlyPublicationCandidate` (in `js/src/formalize-contexts.js`)
detects publications by the Wikidata description (regex for "scientific
article", "journal article", "preprint", …) and by hydrated `P31` claims
(`Q13442814` scholarly article, `Q737498` academic journal, `Q571` book, …).
Such candidates are demoted so they cannot hijack a phrase unless the user typed
the title verbatim.

## RC2 — The questions had no real, persistent options

**Symptom.** _"Questions still look fake … they should not disappear on user
selection."_ The "Questions" the page showed were _translation-variable_
questions (what target label to use), each with the fixed triplet `Keep …` /
`Use linked source label` / `Manual answer`. Answering one consumed it.

**Cause.** There was no notion of a _context-selection_ question — i.e. "which
sense of this word did you mean?" — that survives answering and rewrites the
formalization. The candidate senses were computed during covering but never
surfaced as selectable options, and there was no input channel to pin a sense.

**Fix.** `buildContextQuestions` surfaces every ambiguous word's candidate senses
as a persistent question; `normalizeContextSelections` + `applyContextSelections`
accept a `contextSelections` map (keyed by phrase start index or text) and
re-pick the chosen candidate _after_ the context lens, so the user's choice wins,
the English formalization changes, and `translateTextWith` re-runs downstream.

## RC3 — No visibility into context detection

**Symptom.** Neither the UI nor the debug log explained _why_ a word resolved
the way it did, so a wrong decision was impossible to diagnose from a report.

**Cause.** The per-phrase candidates, their scores, and their `instance of` /
`subclass of` context claims were computed internally but never exposed on the
result object.

**Fix.** `buildWordContexts` exposes, per word, every candidate with its id,
label, description, score, publication flag, selected flag, and detected context
claims. The Translate page renders this as a panel, and the debug log prints a
"Context detection" section plus the most-likely context.

## RC4 — Debug log was thin and hard to export

**Symptom.** The reporter had to paste a gist link; the debug log omitted the
source text.

**Cause.** The original `formatDebugLog` lacked the source text, app version, and
per-word context detail, and there was no copy button.

**Fix.** A `translate-copy-debug-log` button copies the log in one click; the log
now opens with app version, source/target language, status, and the **source
text**, then formalized/translated markdown, context detection, context-selection
questions, full translation-step JSON, and the CST JSON.

## RC5 — The version bump never runs

**Symptom.** Version stuck at `0.9.0`; **zero git tags**; 60+ unprocessed
changesets accumulated in `.changeset/`.

**Cause.** In `.github/workflows/js.yml`, the entire `release` job — which
includes "Version packages and commit to main" (`version-and-commit.mjs --mode
changeset`) — was gated by:

```yaml
if: |
  !cancelled() &&
  vars.NPM_PUBLISH_ENABLED == 'true' &&   # <-- gate on the whole job
  github.ref == 'refs/heads/main' && …
```

`NPM_PUBLISH_ENABLED` is an opt-in repository variable and is **unset**
(`gh variable list` returns nothing). So the job never ran, the version never
bumped, and no tags/releases were created — even though changesets kept landing.
npm publishing being opt-in is intentional (the repo can ship its static web
prototype without npm), but coupling the version bump to that gate was the bug.

**Fix.** Removed `NPM_PUBLISH_ENABLED` from the job-level `if` so the job runs on
every push to `main` once tests pass. Only the npm OIDC setup and the
`publish-to-npm` step remain gated by `NPM_PUBLISH_ENABLED`. The GitHub release +
git tag are created whenever a version was committed, falling back to the freshly
bumped version when npm publishing is skipped.

## RC6 — Untranslated phrases are downstream of RC1/RC2

The 15 unresolved phrases (e.g. `developing systems`, `perform tasks requiring`,
`solving human problems`, `setbacks`) and the transliterations (`term` →
"Макукин", `has` → "Хас") are symptoms of the same wrong-sense selection: once a
phrase is pinned to a scholarly article or a surname, no sensible target label
exists, so the translator falls back to passthrough/transliteration. Fixing
RC1/RC2 removes the upstream cause; the persistent context questions give a human
the final say when automation is still wrong.
