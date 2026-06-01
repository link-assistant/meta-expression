# Issue 131 - Solution Plan

For each requirement in [`REQUIREMENTS.md`](REQUIREMENTS.md), this records the
implemented fix and the planned work that was intentionally kept out of this
bug-fix PR.

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

Add two narrow semantic lexicon entries:

- `lex:en:lie_on->ru`, source-backed by Oxford Learner's Dictionaries, for the
  geographic "be located" sense of `lie + adv./prep.`;
- `Q430265`, source-backed by Wikidata, with English labels for `Pacific Coast`
  and Russian `Тихоокеанское побережье`.

### Regression tests

`js/tests/integration/issue-131.test.js` covers:

- parentheses excluded from phrase links;
- source-backed phrasal verbs ending in prepositions;
- lexical fallback for known phrasal verbs when source data is missing;
- the full California sentence with preserved pronunciation, `Q35657` state,
  `lies on`, `Q430265`, and no translation questions.

### Release trigger

Add a patch changeset so JS CI's package-identity check passes and the next main
merge can bump the package version.

## Planned: virtual links and source overrides

The regression is fixed with direct lexicon entries, but the issue's broader
request is a reusable override layer. A good next step is a structured
`virtual-source-overrides` registry with entries like:

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

The formalizer can then expose a virtual link when external sources are missing
data, and the UI can show whether the entry is local-only, source-backed, or
ready to contribute upstream.

## Planned: recursive article translation

Recursive translation of linked Wikipedia articles should be behind an
experimental flag because it can explode network and token usage. The proposed
shape:

1. Add a per-link action such as "Translate linked context".
2. Fetch the source article summary or selected section, not the whole article
   by default.
3. Run the existing formalize/translate pipeline on that bounded text.
4. Cache by source URL, target language, selected section, and source revision.
5. Surface translated context as expandable evidence, not as part of the main
   sentence translation.

This keeps the main Translate page deterministic while enabling deeper context
when reviewers need it.

## Planned: grammar quality follow-up

The current fix removes unresolved and wrongly linked phrases. It does not
solve Russian agreement and case for every phrase. A later grammar pass should
handle examples such as:

- `в Запад США` -> `на западе США` or another context-appropriate expression;
- `расположен на Тихоокеанское побережье` -> case/agreement-aware wording.

That work belongs in a separate grammar requirement because it affects many
sentences beyond issue #131.
