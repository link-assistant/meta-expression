# Issue #16 Requirements

## R16.1 — Add `/translate`

After `/formalize`, provide automated translation based on Wikidata. The
implementation must be available from user-facing surfaces, not only as an
internal helper.

Status: implemented as `translateTextWith()`, CLI `translate`, HTTP
`/translate`, and web `#/translate`.

## R16.2 — Use `/formalize` as the first step

Translation should reuse formalization so each resolved entity or predicate can
be translated by looking up target-language Wikidata labels.

Status: implemented. Translation calls `formalizeTextWith()` first and then
fetches target labels for resolved Q/P ids.

## R16.3 — Improve formalization CST

The formalization output must include enough concrete syntax-tree information
to regenerate Markdown and support later Links Notation manipulation.

Status: implemented. The formalization CST stores phrase ids, token spans,
source text, chosen entity ids, generated link URLs, candidate summaries, and
contexts. `markdownFromFormalizationCst()` verifies the Markdown round trip.

## R16.4 — Preserve undefined parts as variables

Anything the formalizer or translator cannot define must remain visible as a
variable that still needs a definition.

Status: implemented. Unresolved source phrases, non-Wikidata sources, and
missing target-language labels become `variable-N` records in the translation
CST and Links Notation.

## R16.5 — Generate questions for variables

Undefined parts need generated questions so a user or later rule engine knows
what must be supplied.

Status: implemented. Each variable produces a question describing whether an
entity mapping or target-language label is missing.

## R16.6 — Keep tests accurate

Tests should not fake correctness. They should pin observed data contracts and
use deterministic fixtures.

Status: implemented with mocked Wikidata search/entity payloads for Hawaii
`Q782` and Russian `Гавайи`, plus unresolved-term fixtures.

## R16.7 — Survey related work and components

The issue requested current online/repository research, including related
language-switching and substitution-rule projects.

Status: implemented in [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md) with raw
captures in [`data/`](./data/).
