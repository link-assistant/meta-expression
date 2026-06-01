# Issue 131 - Solution Plan

For each requirement in [`REQUIREMENTS.md`](REQUIREMENTS.md), this records the
implemented fix in PR #132. The PR comment on June 1, 2026 clarified that the
virtual source layer, recursive article translation, and Russian grammar quality
are inside issue #131 scope, so they are implemented here in full.

## Implemented in PR #132

### Shared tokenizer

Add `js/src/text-tokenization.js` and use it from formalization and linguistic
metadata. The tokenizer:

- treats brackets and slash punctuation as delimiters;
- skips parenthesized slash-delimited non-ASCII pronunciation spans;
- returns source offsets so reconstruction and punctuation preservation still
  work.

### Pronunciation preservation

Update translation punctuation stitching to preserve a complete
`(/.../)` pronunciation group as source punctuation. This keeps the visual input
intact while avoiding a false translation target.

### Phrasal verb cover

Adjust the n-gram search gate so source-backed phrasal verbs can end in a
preposition or particle. If sources miss a known `lie` + particle phrase, the
formalizer emits a lexical fallback candidate instead of splitting the phrase.

### Local semantic data

Add a source-backed virtual override registry that feeds both formalization
source search and the semantic interlingua. The registry includes:

- `Q99` and `Q35657` target supplements so the reported sentence remains
  deterministic without live target-label lookup;
- `Q12612` with Russian locative form `западе США` and unlinked preposition
  `на`;
- `lex:en:lie_on->ru`, source-backed by Oxford Learner's Dictionaries, for the
  geographic "be located" sense of `lie + adv./prep.`;
- `Q430265`, source-backed by Wikidata, with English labels for `Pacific Coast`
  and Russian nominative/prepositional forms;
- `lex:en:that_relative->ru`, a rule-derived relative-clause supplement for
  `который`.

The default source tier order is Wikipedia, Wikidata, virtual overrides, and
Wiktionary. `parseSourceSpec()` also accepts `virtual-source-overrides`.

### Russian naturalization

Add an English-to-Russian lexical naturalization pass that consumes grammatical
forms from the semantic/virtual source data:

- `in` + `Q12612` becomes `на западе США`;
- relative `that` before the geographic predicate becomes `, который`;
- the object of `lie on` receives the prepositional form
  `Тихоокеанском побережье`.

The reported sentence now produces:

```text
Калифорния (/ˌkælɪˈfɔːrniə/) это штат на западе США, который расположен на Тихоокеанском побережье.
```

### Experimental linked-article translation

Add `collectLinkedArticleTargets()` and `translateWikipediaArticleContext()`:

- linked Wikipedia article targets are collected from the formalization CST;
- translation is disabled unless the caller passes `experimental: true`;
- only REST summary text is fetched by default;
- source text is bounded before translation;
- results are cached by source URL, target language, section, and revision.

The Translate page exposes the flow with an Experimental checkbox, per-link
"Translate linked context" actions, and a manual article URL/title input.

### Regression tests

`js/tests/integration/issue-131.test.js` covers:

- parentheses excluded from phrase links;
- source-backed phrasal verbs ending in prepositions;
- lexical fallback for known phrasal verbs when source data is missing;
- the full California sentence with preserved pronunciation, `Q35657` state,
  `lies on`, `Q430265`, natural Russian locative/prepositional wording, and no
  translation questions;
- the virtual source override layer;
- linked Wikipedia article target collection;
- disabled-by-default article translation;
- bounded summary translation with cache reuse;
- Translate-page article-context wiring.

### Release trigger

Add a patch changeset so JS CI's package-identity check passes and the next main
merge can bump the package version.

## Virtual links and source overrides

```json
{
  "id": "lex:en:lie_on",
  "kind": "lexical-sense",
  "sourceUrl": "https://www.oxfordlearnersdictionaries.com/definition/english/lie_1",
  "sourceStatus": "external-source",
  "upstreamTarget": "wiktionary",
  "labels": { "en": ["lie on", "lies on"], "ru": ["расположен на"] }
}
```

The formalizer exposes virtual links when external sources are missing data, and
the source metadata records whether the entry is local-only, source-backed,
rule-derived, or ready to contribute upstream.

## Verification commands

```sh
node --test js/tests/integration/issue-131.test.js
npm test
npm run check
```
