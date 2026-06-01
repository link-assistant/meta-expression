# Issue 131 - Root-Cause Analysis

## RC1 - Tokenization treated brackets as word characters

**Symptom.** The issue reported links such as `[California \(]` and `[\)]`.

**Cause.** The word-token regex excluded whitespace and a small punctuation set
but did not exclude parentheses, square brackets, or braces. Once `(` was part
of the source span, the covering algorithm could attach it to the previous
phrase or link it as its own phrase.

**Fix.** `js/src/text-tokenization.js` centralizes tokenization and excludes
brackets from lexical tokens. Formalization and linguistic metadata now use the
same tokenizer.

## RC2 - IPA pronunciation was treated as normal lexical content

**Symptom.** `(/ˌkælɪˈfɔːrniə/)` produced a linked IPA-looking term and then
showed up as translated phrase content.

**Cause.** The tokenizer had no special case for parenthesized slash
pronunciations. The interior IPA text was a non-space token, so source search
and translation treated it like a word.

**Fix.** Parenthesized slash spans containing non-ASCII content are recognized
as pronunciation metadata and skipped as tokens. The original source gap remains
available so the translator can preserve it.

## RC3 - Translation punctuation stitching could not preserve grouped IPA

**Symptom.** After skipping the pronunciation token, the translator still needed
to reattach ` (/ˌkælɪˈfɔːrniə/)` to the preceding translated unit.

**Cause.** `applySourceInteriorPunctuation` only consumed a simple prefix of
punctuation characters. It did not recognize the whole parenthesized slash group
as one suffix.

**Fix.** The punctuation stitcher first matches a full parenthesized slash
pronunciation before falling back to the simple punctuation prefix.

## RC4 - The phrase gate rejected phrasal verbs ending in prepositions

**Symptom.** `lies on` became `lies` + `on`, with `lies` interpreted through the
wrong lexical path and `on` translated independently.

**Cause.** `shouldSearchNgram` rejected any multi-word candidate ending in
grammar glue. That protects against accidental covers such as `California in`,
but it also blocks legitimate verb-particle and verb-preposition phrases.

**Fix.** English phrasal-verb candidates can pass the gate when the head looks
verbal and the remaining tokens are particles or prepositions.

## RC5 - Missing phrase data had no local fallback path

**Symptom.** If external source search had no usable `lies on` candidate, the
formalizer could only fall back to single-token choices.

**Cause.** Lexical fallback existed for raw phrases but not as a source-search
candidate for known multi-word phrasal verbs after candidate lookup failed.

**Fix.** Known `lie` + particle phrases can synthesize a lexical fallback
candidate after external lookup returns no scored candidates.

## RC6 - `Pacific Coast` lacked a usable Russian target

**Symptom.** The reported translation asked what Russian label should represent
`Pacific Coast`.

**Cause.** The live Wikidata snapshot for `Q430265` had an English label and
description but no Russian label in the `en|ru` lookup captured for this case.
Without a local target, the translator asked the user.

**Fix.** `js/data/semantic-lexicon.json` now includes `Q430265` with English
aliases and Russian `Тихоокеанское побережье`.

## RC7 - Initial PR CI failed before behavior was tested

**Symptom.** The first JS CI run for PR #132 failed in
`js/tests/unit/package-identity.test.js`.

**Cause.** The branch had no active changeset targeting `meta-expression`, and
the package-identity test requires one for PR changes.

**Fix.** Added a patch changeset. The original log is preserved at
[`logs/ci-js-checks-26727847528.log`](logs/ci-js-checks-26727847528.log).
