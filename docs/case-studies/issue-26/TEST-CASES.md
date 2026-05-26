# Canonical test cases harvested for issue #26

> Last checked: 2026-05-11.

Each row is a fixture that appears in the canonical docs of one or more
comparable systems with a known expected output. The "meta-expression
expectation" column records what `analyzeStatement` (or the adjacent
`/check`, `/translate`, `/formalize`, `/uniqueness` surface) should
return today. Rows that meta-expression already supports are covered by
[`js/tests/integration/issue-26-comparable-fixtures.test.js`](../../../js/tests/integration/issue-26-comparable-fixtures.test.js);
rows that depend on roadmap-deferred work are skipped in tests with
explanatory titles.

Legend for the **status** column:

- `covered` — assertion is enabled in the test file.
- `skipped` — test exists but `it.skip` is used; the title documents
  the deferred roadmap phase.

## A. Arithmetic kernel (deterministic, `correctness ∈ {0, 1}`)

| Source                                                      | Input        | Source-system answer      | meta-expression expectation                      | Status  |
| ----------------------------------------------------------- | ------------ | ------------------------- | ------------------------------------------------ | ------- |
| Wolfram Alpha; Metamath `2p2e4`; Z3; Lean `rfl`; SWI-Prolog | `1 + 1 = 2`  | `True` / `sat` / `proved` | `correctness === 1`, `signedConfidence === 1`    | covered |
| Wolfram Alpha; Z3 unsat                                     | `1 + 1 = 1`  | `False` / `unsat`         | `correctness === 0`, `signedConfidence === -1`   | covered |
| Wolfram Alpha; Z3                                           | `2 + 2 = 4`  | `True`                    | `correctness === 1`                              | covered |
| Wolfram Alpha; Z3                                           | `2 + 2 = 5`  | `False`                   | `correctness === 0`                              | covered |
| Wolfram Alpha; Lean mathlib                                 | `2 * 3 = 6`  | `True`                    | `correctness === 1`                              | covered |
| Wolfram Alpha                                               | `2 * 3 = 7`  | `False`                   | `correctness === 0`                              | covered |
| Wolfram Alpha                                               | `10 - 4 = 6` | `True`                    | `correctness === 1`                              | covered |
| Wolfram Alpha                                               | `10 - 4 = 5` | `False`                   | `correctness === 0`                              | covered |
| Wolfram Alpha "1+1" pod                                     | `1 + 1`      | `2`                       | Question-shaped result with `result.value === 2` | covered |
| Wolfram Alpha                                               | `1 - 1`      | `0`                       | Question-shaped result with `result.value === 0` | covered |

## B. Wikidata-structured public facts (bounded confidence)

| Source                                                        | Input                              | Source-system answer                            | meta-expression expectation                                                       | Status  |
| ------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- | ------- |
| Wikidata Q2 (P398 Q525); Wolfram Alpha "Earth orbital period" | `Earth orbits the Sun`             | True, with provenance                           | `correctness > 0.5`, `result.confidence` bounded below 1, evidence list non-empty | covered |
| Wikidata negation; geocentrism corpus                         | `Earth does not orbit the Sun`     | False                                           | `correctness < 0.5`                                                               | covered |
| Wikidata Q405 (P397 Q2 → Q525)                                | `Moon orbits the Sun`              | True via parent-body chain `Moon → Earth → Sun` | `correctness > 0.5`; reasoning trace includes parent chain                        | covered |
| Wikidata Q405 P397 Q2                                         | `Moon orbits Earth`                | True                                            | `correctness > 0.5`                                                               | covered |
| Wikidata Q142 P36 Q90                                         | `Paris is the capital of France`   | True                                            | `correctness > 0.5`, live-evidence path resolves Q90                              | covered |
| Wikidata negation                                             | `Berlin is the capital of France`  | False                                           | `correctness < 0.5`                                                               | covered |
| Wikidata Q183 P36 Q64; DBpedia                                | `Berlin is the capital of Germany` | True                                            | `correctness > 0.5`, bounded confidence                                           | covered |

## C. Wikidata P570 (date of death) liveness templates

| Source                     | Input                   | Source-system answer     | meta-expression expectation                                  | Status  |
| -------------------------- | ----------------------- | ------------------------ | ------------------------------------------------------------ | ------- |
| Wikidata Q317521 (no P570) | `Elon Musk is alive`    | True (as of 2026-05-11)  | `correctness > 0.5`, evidence cites Wikidata absence of P570 | covered |
| Wikidata negation          | `Elon Musk is dead`     | False (as of 2026-05-11) | `correctness < 0.5`                                          | covered |
| Wikidata Q7259 P570 = 1852 | `Ada Lovelace is dead`  | True                     | `correctness > 0.5`, evidence cites Wikidata P570            | covered |
| Wikidata negation          | `Ada Lovelace is alive` | False                    | `correctness < 0.5`                                          | covered |

## D. Self-reference / paradoxes

| Source                                | Input                                                | Source-system answer       | meta-expression expectation                         | Status  |
| ------------------------------------- | ---------------------------------------------------- | -------------------------- | --------------------------------------------------- | ------- |
| Classic Liar paradox (Tarski, Kripke) | `this statement is false`                            | Undetermined / paradoxical | `correctness === 0.5`, `signedConfidence === 0`     | covered |
| Classic positive Liar variant         | `this statement is true`                             | Undetermined               | `correctness === 0.5`, `signedConfidence === 0`     | covered |
| Russell's paradox (Frege/Russell)     | `The set of all sets that do not contain themselves` | Paradox                    | Out of scope; assert `unknown` interpretation today | covered |

## E. NL→logic / triple extraction (deferred to Phase 8 / Phase 10)

| Source                     | Input                             | Source-system answer                                      | meta-expression expectation             | Status  |
| -------------------------- | --------------------------------- | --------------------------------------------------------- | --------------------------------------- | ------- |
| Stanford OpenIE canonical  | `Barack Obama was born in Hawaii` | Triple `(Barack Obama; was born in; Hawaii)`              | Roadmap Phase 8 — entity-reference mode | skipped |
| AllenNLP SRL canonical     | `Mary gave John a book`           | `Arg0=Mary, V=give, Arg1=a book, Arg2=John`               | Roadmap Phase 8 — refinement actions    | skipped |
| Boxer / Montague canonical | `Every man loves a woman`         | Scope-ambiguous FOL                                       | Roadmap Phase 8 — top-N interpretations | skipped |
| AMR canonical              | `The boy wants to go`             | `(w / want-01 :ARG0 (b / boy) :ARG1 (g / go-01 :ARG0 b))` | Roadmap Phase 8 — CST output enrichment | skipped |

## F. Disputed-truth and misinformation corpora

The fixtures below come from Google Fact Check Tools, Snopes, and
Politifact. They are _not_ used to assert a binary truth value;
meta-expression's contract is that real-world claims must keep
`result.correctness` strictly between 0 and 1, with explicit evidence
and provenance. Tests therefore assert the _band_ (`0 ≤ correctness ≤
1` strictly, plus evidence presence when the live resolver runs).

| Source                                        | Input                            | Source-system answer | meta-expression expectation                                     | Status  |
| --------------------------------------------- | -------------------------------- | -------------------- | --------------------------------------------------------------- | ------- |
| Google Fact Check Tools (ClaimReview "False") | `5G causes coronavirus`          | False                | Roadmap Phase 10 — ClaimReview ingestion and verdict provenance | skipped |
| Snopes (False)                                | `Einstein failed math in school` | False                | Roadmap Phase 10 — fact-check source ingestion                  | skipped |
| Politifact ("Pants on Fire")                  | `Barack Obama was born in Kenya` | False                | Roadmap Phase 10 — fact-check source ingestion                  | skipped |
| Politifact ("Half True") variants             | `Crime is at an all-time high`   | Half-true            | Roadmap Phase 10 — graded fact-check verdicts                   | skipped |

## G. Uniqueness / paraphrase (meta-expression `/uniqueness`)

| Source                             | Input                                                   | Source-system answer                      | meta-expression expectation                       | Status  |
| ---------------------------------- | ------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------- | ------- |
| SBERT STS-B canonical              | `A man is eating food.` vs `A person is having a meal.` | Cosine ≈ 0.82 (paraphrase)                | Roadmap Phase 10 — semantic paraphrase embeddings | skipped |
| iThenticate published-text example | `Hawaii is a state.` (from project sample)              | "Already published; cite source" guidance | `/uniqueness` returns at least one source match   | covered |

## H. Knowledge representation round-trip

| Source                                              | Input                                          | Source-system answer                        | meta-expression expectation                                                        | Status  |
| --------------------------------------------------- | ---------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- | ------- |
| LinksPlatform Doublets demo (single-link self-loop) | Encode `[1, 1, 1]` triplet                     | Persists as a single doublet self-reference | `createDoubletStore().create(1, 1)` persists `(1: 1 1)`                            | covered |
| ClaimReview JSON-LD round trip                      | `Earth orbits the Sun` analysis as ClaimReview | Round-trip preserved                        | Roadmap Phase 4 (Links Notation Persistence) / Phase 10 (Wikipedia text evidence). | skipped |

## How this file is maintained

When a comparable system updates its canonical example, the fixture
should be re-checked here. If the new fixture is enabled in
`js/tests/integration/issue-26-comparable-fixtures.test.js`, the status column
moves from `skipped` to `covered`. The
[`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md) log records the
"last checked" date for the source pricing/feature page.
