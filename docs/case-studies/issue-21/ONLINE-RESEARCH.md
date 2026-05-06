# Online research log for issue #21

> Updated 2026-05-06.

## A. Wikidata facts validated against the live API

### 1. The "to formalize" claim

The issue says Q115492965 should resolve for the verb _formalize_ because it
contains "to formalize" as one of its forms. After fetching
<https://www.wikidata.org/wiki/Q115492965> the actual situation is:

- **Q115492965 is an Item, not a Lexeme.** Its English label is
  `formalizing` and its description is _"act of describing something in a
  strict form (often using a formal language or formal system)"_.
- Its **aliases** include `to formalize` and `formalization`, which is what
  the issue is referring to.
- Wikidata stores verb conjugations as **Lexemes** (`L<id>`) with **Forms**
  (`L<id>-F<n>`), not as items. The lexeme for the English verb _formalize_
  lives outside this case study but is reachable via
  `action=wbsearchentities&search=formalize&type=lexeme&language=en`.

**Implication for the implementation:** the resolver does not need a
separate `forms` query for Q115492965 specifically — adding `aliases` to the
candidate-matching step (in addition to `label`) will pick it up. We should
_also_ add a Wikidata-Lexemes search tier so future verb forms (e.g.
_running_, _swam_) snap to their lexeme parents.

### 2. Property P910 and inverse P301

- **P910** ("topic's main category"): Item → category item.
- **P301** ("category's main topic"): the inverse, category → item.
- The example from the issue
  (`Q2555318` automated reasoning → `Q52701496` Category:Automated reasoning
  via P910) is correct; this is the relationship our context BFS already
  walks.

### 3. The example link salad in the issue

The issue body links each phrase in the project README to a Wikidata Q-id.
Spot-checking shows that some of those ids point to the **wrong sense** —
e.g. the phrase "meta-expression" links to Q42778339 which is _a 2017
research article about rice gene expression_. This is not noise; it is
direct evidence that the current single-source, top-1 resolver picks
spurious candidates for compound technical phrases. After this PR, the
context aggregator should down-weight Q42778339 because its `instance of`
chain (Q13442814 scholarly article → Q11424 film? no — Q191067 article)
contradicts every other phrase's biology-free context.

## B. Disambiguation priority precedent

The issue mandates Wikipedia → Wikidata → Wiktionary. Existing precedents:

- **Wikifier.org** and **DBpedia Spotlight** both use Wikipedia article
  presence as the strongest disambiguation signal.
- **OpenRefine's Wikidata reconciliation service** falls back to Wikidata
  search only when no exact Wikipedia title matches.
- **TextRazor**, **Babelfy**, and **Aida** use Wikipedia link graphs first
  and only consult Wikidata for typing.

This validates the order requested in the issue.

## C. Wiktionary access

Wiktionary exposes:

- `https://en.wiktionary.org/w/api.php?action=opensearch&search=…` (already
  used as our WordNet source).
- `https://en.wiktionary.org/api/rest_v1/page/definition/<word>` — REST-v1
  endpoint that returns clean JSON definitions per part-of-speech.

For function words (e.g. _the_, _of_, _and_) the REST-v1 endpoint returns a
crisp definition object that we can render directly in the tooltip. We will
use it as the canonical Wiktionary backend.

## D. Library survey

| Candidate                                                                                               | License          | Verdict                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [`wikibase-sdk`](https://github.com/maxlath/wikibase-sdk)                                               | MIT              | Skip. Convenient but adds another dep for endpoints we already speak directly.                                                  |
| [`wikipedia`](https://www.npmjs.com/package/wikipedia) (npm)                                            | MIT              | Skip. Single-API helper, no streaming, and our snapshot layer needs to control caching itself.                                  |
| [`@wikimedia/codex`](https://www.npmjs.com/package/@wikimedia/codex)                                    | GPL-2.0-or-later | Skip. License clash with our MIT codebase; we'll roll our own tooltip in plain DOM.                                             |
| [`nock`](https://github.com/nock/nock) / [`msw`](https://mswjs.io/)                                     | MIT              | Skip. Our existing `makeFetch(routes)` test fixture already gives deterministic mocks; adding either would just bloat installs. |
| [`@xenova/transformers`](https://www.npmjs.com/package/@xenova/transformers) (for word-form embeddings) | Apache-2.0       | Skip for now. Out of scope; mention in the ROADMAP as a future option for fuzzy candidate scoring.                              |

## E. Snapshot test pattern references

- **VCR (Ruby)** popularised "record once, replay forever" HTTP fixtures.
- **PollyJS** is the JS equivalent; its on-disk format inspires our
  per-source `.lino` snapshot layout.
- **Jest snapshots** show how to wire `--updateSnapshot` into developer
  workflow; we mirror this with `npm run formalize:record-snapshots`.

## F. Open questions deferred to follow-up issues

1. Should manual overrides created via the tooltip auto-persist to
   `docs/formalize/overrides.lino`, or should we keep them session-local
   until the user explicitly hits "Save"?
2. Do we want a Wikidata-Lexeme tier _before_ Wiktionary in the resolver
   chain when the phrase is a single token? (Probably yes; tracked in the
   follow-up.)
3. Should the snapshot recorder normalize transient timestamps in API
   responses before writing the .lino so diffs stay clean? (Likely yes;
   plan: strip `?modified` and `?revid` fields.)
