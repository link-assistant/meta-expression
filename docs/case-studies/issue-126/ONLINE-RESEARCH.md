# Issue 126 — Online Research & Existing Components

This records the existing components, libraries, and external facts considered
before implementing the fix, and the basis for the R10 conclusion (no upstream
issue is warranted).

## How candidates are fetched today

The formalizer talks to the Wikimedia APIs directly via `fetch` — there is no
third-party entity-linking dependency to swap out. The relevant modules are:

- `js/src/formalize-sources.js` / `js/src/term-data-source.js` — call
  `wbsearchentities` (search by label) and `wbgetentities` (hydrate claims).
- `js/src/wikimedia-evidence.js` — Wikipedia/Wiktionary lookups.
- `js/src/formalize-contexts.js` — ranking, covering, context aggregation.

The project's runtime dependencies (`package.json`) are `doublets-web`,
`links-notation`, `lino-arguments` — none of which do entity disambiguation. So
the ranking logic is entirely ours; any disambiguation defect is in this repo.

## Fact 1 — `wbsearchentities` returns scholarly articles by design

The MediaWiki Wikibase `wbsearchentities` action does a prefix/label search over
**all** entities. Wikidata holds tens of millions of `scholarly article`
(`Q13442814`) items — bulk-imported from sources like Crossref/PubMed — whose
long titles share words with ordinary phrases. The API matches those titles and
returns them with no notion of "everyday concept vs. obscure paper". This is
expected, documented behavior: the search action ranks by label match, not by
real-world salience.

**Implication.** We cannot rely on the API to filter out papers; the caller must
demote them. That is exactly what `isScholarlyPublicationCandidate` now does
(by description regex + hydrated `P31` claims), which is the standard,
language-agnostic way to recognize the _class_ of an item rather than
blocklisting individual Q-ids.

## Fact 2 — Disambiguation approaches considered

- **Wikidata `P31`/`P279` class filtering** (chosen). Recognizing the _kind_ of
  an entity from its claims is the canonical Wikidata-native signal and
  generalizes to any language. We use it both to demote publications (R2) and to
  surface per-word context (R3).
- **Sense-pinning via user selection** (chosen for R1). Letting a human pin a
  sense that then rewrites the formalization is the same pattern used by
  interactive entity linkers (e.g. mention → candidate list → confirm). We
  implemented it as persistent `contextQuestions` + a `contextSelections`
  channel rather than introducing a dependency.
- **Embedding/ML re-ranking** (rejected for now). A learned re-ranker would need
  a model + training data and would undercut the project's transparent,
  inspectable pipeline. The claim-based heuristic is debuggable (it shows up in
  the new context panel and debug log) and sufficient for the reported failures.
- **Hard-coded Q-id blocklist** (rejected). Does not generalize and rots as
  Wikidata grows.

## Fact 3 — Versioning / release tooling

The repo uses **Changesets** (`@changesets/cli`) with a custom
`version-and-commit.mjs` driver invoked by `.github/workflows/js.yml`. The bug
(RC5) was not in Changesets itself but in the workflow gating the version-bump
job behind the opt-in `NPM_PUBLISH_ENABLED` variable. No external tool change was
needed; the fix is purely in the workflow `if:` conditions.

## R10 — Upstream issue assessment

**Conclusion: no external issue is warranted.**

- Wikidata returning scholarly articles from `wbsearchentities` is **expected**
  API behavior, not a bug — the action is a label search over all entities. The
  appropriate fix is consumer-side ranking, which we implemented.
- There is no third-party entity-linking library in the dependency tree to file
  against; the ranking/covering logic is ours (`formalize-contexts.js`).
- The release-workflow defect (RC5) is in this repo's own
  `.github/workflows/js.yml`, not in `@changesets/cli`.

If a future failure traces to incorrect _data_ on a specific Wikidata item
(e.g. a wrong `P31` claim), the right venue is editing that item on
wikidata.org, not a code issue against a dependency. No such data defect was
found for the phrases in this report — the items are correctly typed as
articles/surnames; our ranking simply preferred them.
