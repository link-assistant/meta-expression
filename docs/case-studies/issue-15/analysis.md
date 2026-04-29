# Case Study: Issue 15 — Add `/formalize` section

## Issue

URL: https://github.com/link-assistant/meta-expression/issues/15
Reporter: @konard
Labels: documentation, enhancement
Title: "Add `/formalize` section"

### Description (verbatim)

> Big text area - input of any text in any language, as in the result we should
> get fully formalized text, that should be represent as each phrase (as big as
> possible) is converted to link to wikipedia (if Q/P ids from wikidata have
> wikipedia page, with link's alt containing Q/P id mandatory), and also direct
> link to wikidata for everything that does not have wikipedia article.
>
> And result should be each and every word grouped into phrases, and each of
> them covered with a link. We should use real wikidata API to get the data for
> full text formalization.
>
> It should be copiable as markdown text, that is fully wikified. And also as
> links notation, containing exact ids of each and every concept, so all text
> is fully formalized.
>
> We should also determine the main contexts and also additional contexts, by
> frequency. We see all entities and check to which contexts they are linked.
> And list all contexts of the result text also (with calculated
> weight/probability of each context).
>
> Switching between these context should allow to reinterpret the text via the
> prism of the other context. We also should show top 10 most probable
> interpretations of the text.
>
> Use best practices from:
>
> - https://github.com/link-assistant/human-language/blob/main/transformation/index.html
> - https://github.com/link-assistant/human-language/blob/main/transformation/test-ngram.html
> - https://github.com/link-assistant/human-language/blob/main/search-demo.html
> - https://github.com/link-assistant/human-language/blob/main/cache-demo.html
> - https://github.com/link-assistant/human-language/blob/main/browser-cache-test.html
> - https://github.com/link-assistant/human-language/blob/main/run-tests.html
>
> And if you know how to do even better, universal, efficient, perfect to do it.
>
> Also add a mode (switch) to show links to:
>
> - https://link-assistant.github.io/human-language/entities.html
> - https://link-assistant.github.io/human-language/properties.html
>
> So we can use not only wikipedia/wikidata, but our own viewers.

---

## Requirement Inventory (R-IDs used in code & tests)

| ID  | Requirement                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Add a `/formalize` section reachable from the top navigation alongside Analyse and Compare.                                                                                                                                |
| F2  | Provide a **big textarea** for free-form input in any language.                                                                                                                                                            |
| F3  | Tokenize the input into phrases (n-grams), grouping each and every word into the longest phrase that has a Wikidata Q/P match.                                                                                             |
| F4  | Resolve each phrase against the **real** Wikidata API (`wbsearchentities`) and pick the best matching Q (entity) or P (property).                                                                                          |
| F5  | Render each phrase as a hyperlink. **Default link target = Wikipedia article** when the Wikidata item has an `enwiki` sitelink; otherwise **fallback target = Wikidata page** (`wikidata.org/wiki/Q…` or `…/Property:P…`). |
| F6  | The link's `title`/alt MUST contain the Q/P id (mandatory).                                                                                                                                                                |
| F7  | Surface a "use local viewer" mode (switch) that retargets links to `link-assistant.github.io/human-language/entities.html#Q…` and `…/properties.html#P…` instead of Wikipedia/Wikidata.                                    |
| F8  | Provide a one-click **Copy as Markdown** button that emits fully wikified Markdown (each phrase becomes `[phrase](URL "Q…")`).                                                                                             |
| F9  | Provide a **Copy as Links Notation** button that emits a Lino payload containing exact Q/P ids for every phrase.                                                                                                           |
| F10 | Determine **main contexts** plus **additional contexts** weighted by frequency, derived from the resolved entities.                                                                                                        |
| F11 | List all contexts with calculated weight/probability so the user can see how strongly each context is supported.                                                                                                           |
| F12 | A context switch must reinterpret the same text "via the prism of" the chosen context (re-rank entity candidates, prefer that domain).                                                                                     |
| F13 | Show the **top 10 most probable interpretations** of the text.                                                                                                                                                             |
| F14 | Reuse best-practices from the listed `human-language` files: tokenize → generate n-grams up to size N → search ALL n-grams in parallel → pick longest non-overlapping matches first.                                       |
| F15 | Cache Wikidata responses (in-memory + `localStorage`) so repeated queries are free, mirroring `cache-demo.html`/`browser-cache-test.html` patterns.                                                                        |
| F16 | Run network calls in a Web Worker to keep the UI responsive (matches existing `evidence-worker.js` pattern in this repo).                                                                                                  |
| F17 | Provide examples / prepared inputs (multi-language friendly, but English first to stay deterministic).                                                                                                                     |
| F18 | Cover the new module with automated tests; do NOT regress existing ones.                                                                                                                                                   |
| F19 | Make every formalize action traceable through Links Notation (provenance: which phrase came from which n-gram window, which Q/P was chosen, which context tipped the disambiguation).                                      |

---

## Reference research from `human-language`

Files reviewed (snapshots saved under `data/`):

- `transformation/index.html` + `text-to-qp-transformer.js` — the canonical
  pipeline. Tokenize → generate n-grams up to a configurable size →
  `Promise.all` search every n-gram → `matchTokensWithPriority()` reserves
  longest n-grams first, marking covered tokens. Format with `formatSequence()`
  and `formatSequenceWithLinks()`. Disambiguation surfaces as
  `[Q1 or Q2 or Q3]`.
- `transformation/test-ngram.html` — assertion shape: longer n-grams must win
  over shorter ones (e.g. `Barack Obama` matches as **one** entity even when
  `Barack` and `Obama` separately exist).
- `search-demo.html` — uses `wbsearchentities` directly, with `language=en`,
  configurable `type=item|property|both`, and a `limit` knob.
- `cache-demo.html` / `browser-cache-test.html` — three-tier cache pattern
  (memory map + `localStorage` + IndexedDB) keyed by URL with TTL.
- `run-tests.html` — minimal in-browser test runner; we don't need to copy it
  because we already run Node's `node --test` runner.

The important behavioural invariants we copy:

1. **Longest-match-first, non-overlapping.** Every word ends up in exactly one
   phrase; longer matches consume their tokens before shorter ones get a turn.
2. **Single round-trip per n-gram.** All n-gram queries fire together; we wait
   for the whole batch with `Promise.all`, not one-at-a-time.
3. **Property indicators bias the search type.** Verbs/relations like `is`,
   `wrote`, `capital of` tilt the search toward `type=property`.
4. **Stop-word skipping.** N-grams composed only of `the/a/of/…` are rejected
   so we don't waste API calls on glue words; but glue words are still
   visible in the rendered text.

We extend the playbook with one upgrade for our codebase: every link we
produce must carry the Q/P id in the `title` attribute (issue requirement F6),
and the link target follows our F5 rule (Wikipedia first, Wikidata fallback,
local viewer if the user toggles it).

---

## Existing components we reuse

- `src/wikimedia-evidence.js` already wraps `wbsearchentities`,
  `wbgetentities`, en-Wikipedia summaries, in-memory cache with TTL, and
  fetch-injection for tests. We **extract its low-level helpers** for the new
  formalize module instead of forking a second Wikimedia client.
- `web/evidence-worker.js` is the proven worker pattern — the formalize page
  posts work to a sibling `formalize-worker.js` that uses the same module.
- `serializeLinksNotation()` from `src/index.js` already turns a links network
  into Lino text; the formalize module emits a links network that flows
  through it, so the existing exporter does the heavy lifting.
- `web/styles.css` already has top-nav, panel, and button styles; we add a
  `formalize-*` block instead of restyling from scratch.
- `localStorage` cache pattern already used for `wikimedia-cache.v1` —
  formalize uses the same key namespace so cache hits cross between Analyse
  and Formalize pages.

---

## Algorithm overview

```
input → normalize → tokens
tokens → n-grams[size = 1..maxN] (skip stop-only)
n-grams → [parallel] wbsearchentities(text, type=item|property|both, limit)
results → score(label exact + description domain bias) → pick top-K per n-gram
n-grams → matchTokensWithPriority(longest-first, non-overlapping) → phrases[]
phrases → resolve sitelinks (wbgetentities, props=sitelinks|claims) → wikipediaUrl?
phrases → contexts[] = bag-of-instance-of (P31) + subclass (P279) + occupation (P106) labels, weighted
contexts → mainContext = argmax weight; additionalContexts = the rest
phrases → generateInterpretations(phrases, contexts) → top-10 ranked permutations
phrases → render:
  - HTML <a href="<wikipedia|wikidata|local>" title="Q/P id">phrase</a>
  - Markdown [phrase](url "Q/P id")
  - Links Notation: (formalization: input <statement-id>) (phrase-1: phrase Q42 …)
caching: in-memory map + localStorage backing keyed by URL; TTL 1h
worker: formalize-worker.js posts {id, statement, options} → returns {id, formalization}
```

`generateInterpretations` is intentionally bounded: with `m` ambiguous phrases
each having ≤K candidates we generate at most `K × m` permutations and prune
to 10 by joint score (`Σ candidate.score × contextBonus`). This keeps the
top-10 list deterministic and cheap, while still letting context switches
reorder it.

---

## UI design

```
┌────────────────────────────────────────────────────────────┐
│ Analyse | Compare | Formalize                              │
├────────────────────────────────────────────────────────────┤
│ Input text [ textarea, multiline, 80×8 ]                   │
│ Options: max n-gram size [3] | link target ◉Wikipedia      │
│                                ◯Wikidata ◯Local viewer     │
│ [Formalize] [Copy as Markdown] [Copy as Links Notation]    │
│                                                            │
│ Result (rendered HTML, every phrase = <a title="Q/P id">)  │
│                                                            │
│ Contexts (sorted by weight)                                │
│   politics 38%  history 24%  geography 18%  …              │
│   ▣ click a context to reinterpret                         │
│                                                            │
│ Top 10 interpretations                                     │
│   1. (Q76 Barack Obama) (P19 place of birth) (Q782 Hawaii) │
│   2. …                                                     │
│                                                            │
│ <details>Markdown</details>                                │
│ <details>Links Notation</details>                          │
└────────────────────────────────────────────────────────────┘
```

---

## Acceptance examples

- "Barack Obama was born in Hawaii." →
  - Phrases: `Barack Obama` Q76, `was born in` P19 (place of birth),
    `Hawaii` Q782.
  - Wikipedia for Q76 and Q782, Wikidata for P19 (Wikidata properties have no
    `enwiki` sitelink, so they fall back to `Property:P19`).
  - Markdown:
    `[Barack Obama](https://en.wikipedia.org/wiki/Barack_Obama "Q76") [was born in](https://www.wikidata.org/wiki/Property:P19 "P19") [Hawaii](https://en.wikipedia.org/wiki/Hawaii "Q782").`
  - Links Notation: `(formalization: Barack Obama was born in Hawaii. Q76 P19 Q782)`.
- "Paris is the capital of France." → Q90, P36, Q142.
- "Albert Einstein discovered the theory of relativity." → Q937, P0 (no clean
  property match — surfaced as a Q-only fallback link), Q11455.

For non-English input we still tokenize and try the API but transparently
fall back to "raw text" when no Q/P matches; the issue allows this because
every word still has to be inside a phrase, and an unmatched phrase is still
a phrase (it just doesn't get a hyperlink).

---

## Out of scope for this slice

- Full multilingual disambiguation (we send `language=en` to the Wikidata
  search; multilingual `wbsearchentities` exists but quality varies).
- Persistent IndexedDB cache (in-memory + `localStorage` is enough for the
  prototype; matches the existing `wikimediaCacheStorageKey` pattern).
- LLM-based interpretation candidates (R12 in `docs/REQUIREMENTS.md` keeps
  LLMs out of truth evidence; the prototype generates interpretations
  deterministically from cartesian-product of candidates).
