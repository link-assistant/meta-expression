# Issue 131 - Requirements

Every requirement extracted from the issue body
([`data/issue-131.json`](data/issue-131.json)), numbered for traceability.

## R1 - Preserve the input evidence

The report included a debug log gist and a concrete Translate-page input. The
PR must preserve the raw issue context, debug log, PR comments, and CI logs so
reviewers can audit the investigation.

**Status: done.** The case-study `data/` and `logs/` folders preserve issue,
PR, debug, CI, and local test artifacts, including the final PR audit request
and green current-head CI run list.

## R2 - Parentheses must be punctuation, not phrase content

The formalized output linked `[California \(]` and `[\)]`. Brackets and
parentheses should delimit words; they should not be absorbed into phrase text
or become standalone linked phrase candidates.

**Status: done.** Tokenization now treats `()[]{}` and slash punctuation as
delimiters, shared by formalization and linguistic metadata.

## R3 - Parenthesized IPA pronunciation must remain plain source text

The pronunciation `(/ˌkælɪˈfɔːrniə/)` was linked and then surfaced in the
translation. The system should keep this as punctuation-like source text
attached to `California`, not ask for or translate the IPA token.

**Status: done.** Parenthesized slash-delimited non-ASCII pronunciation spans
are skipped as lexical tokens and are preserved during source-gap stitching in
translation.

## R4 - Detect source-backed phrasal verbs that end in a preposition

`lies on` was split because the phrase gate rejected n-grams ending in grammar
glue. That rule is useful for accidental phrases but incorrect for phrasal verbs
and geographic predicates.

**Status: done.** Phrasal-verb candidates with a verb head and particle tail
can pass phrase search even when the final word is a preposition.

## R5 - Cover known phrasal verbs when external sources are sparse

Even when source search misses a specific multi-token phrase, known phrase
patterns such as geographic `lies on` should not fall back to unrelated
single-word candidates.

**Status: done.** The formalizer can emit a lexical fallback candidate for
known `lie` + particle combinations when external candidates are empty.

## R6 - Translate `lies on` in the California sentence

The phrase should translate to Russian location language, not keep `lies` or
translate `on` independently.

**Status: done.** The semantic lexicon now contains source-backed
`lex:en:lie_on->ru`, with Russian `расположен на`.

## R7 - Resolve `Pacific Coast`

The reported run asked what Russian label should represent `Pacific Coast`.
The issue expected a concrete target instead of an unresolved question.

**Status: done.** `Q430265` is added to the semantic lexicon with English labels
and Russian `Тихоокеанское побережье`.

## R8 - Keep the existing `state` sense behavior

The sentence uses `state` in the U.S. federal context. The fix must not regress
the earlier `state` work.

**Status: done.** The regression test asserts `state` still resolves to
`Q35657`.

## R9 - Research external facts, APIs, and existing components

The issue requested online research for additional facts, existing components,
libraries, and data-source options.

**Status: done.** See [`ONLINE-RESEARCH.md`](ONLINE-RESEARCH.md). No new library
is needed for this scoped fix.

## R10 - Explain how to contribute missing wiki data and overrides

The issue asked whether missing data should be added to Wiktionary, Wikidata, or
other projects, and how credentials or upstream reporting should work.

**Status: done.** See
[`CONTRIBUTING-MISSING-DATA.md`](CONTRIBUTING-MISSING-DATA.md).

## R11 - Implement virtual links and overridable sources

The issue asked for a robust data-source abstraction where missing concepts can
be represented as virtual links with provenance suitable for upstream
contribution.

**Status: done.** The `virtual-source-overrides` registry is a first-class
formalization source and semantic lexicon supplement. It records source-backed
entries for `Q99`, `Q35657`, `Q12612`, `Q430265`, the geographic `lie on`
sense, and the relative-clause `that` rule, and exposes a virtual links view for
UI/debug use.

## R12 - Implement experimental recursive article translation

The issue asked for recursive Wikipedia article translation as an experimental
feature where a concept link can expand into translated source context.

**Status: done.** The Translate page lists linked Wikipedia articles, keeps the
feature behind an explicit Experimental checkbox, fetches bounded summaries
only, translates them through the existing pipeline, and caches by source URL,
target language, section, and source revision.

## R13 - Report external issues if another GitHub project is at fault

If the root cause is in another GitHub-hosted repository, the PR should report
it upstream with a reproduction and workaround.

**Status: assessed - none filed.** The actionable failures are in this
repository's tokenization, phrase search, translation punctuation preservation,
and local semantic data. Wikimedia data gaps are edited through Wikidata or
Wiktionary workflows rather than GitHub issues.

## R14 - Include a changeset so JS CI can pass

The prepared PR initially failed JS CI because there was no active changeset for
`meta-expression`.

**Status: done.** `.changeset/quiet-lakes-lie.md` targets `meta-expression` as a
patch release.

## R15 - Naturalize the reported Russian sentence grammar

The issue discussion treats grammar quality as part of this fix because the
reported output still contained `в Запад США`, `что расположен`, and nominative
`Тихоокеанское побережье` after `на`.

**Status: done.** The English-to-Russian naturalization pass now applies
source-backed locative/prepositional forms and relative-clause wording, producing
`на западе США, который расположен на Тихоокеанском побережье` for the reported
sentence.
