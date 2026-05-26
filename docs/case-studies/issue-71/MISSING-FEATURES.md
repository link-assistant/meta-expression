# Missing competitor-derived features for issue #71

> Last checked: 2026-05-26.
> Parent issue: [#71](https://github.com/link-assistant/meta-expression/issues/71).
> Epic: [#58](https://github.com/link-assistant/meta-expression/issues/58).

This ledger converts the refreshed comparison matrices into focused follow-up
issues. Each row is a missing feature exposed by one or more competitors but not
yet shipped as a first-class meta-expression surface.

## Child issue ledger

| Missing feature                         | Competitor signal                                                                                 | Current meta-expression state                                                                   | Child issue                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| ClaimReview / Schema.org interchange    | Google Fact Check Tools API, Schema.org ClaimReview, PolitiFact, Snopes, Full Fact AI             | `/check` exists, but ClaimReview import/export does not.                                        | [#87](https://github.com/link-assistant/meta-expression/issues/87)                                      |
| PROV-O / JSON-LD provenance export      | RDF, JSON-LD, PROV-O, DBpedia, Wikidata Query Service, Neo4j, Datomic, TerminusDB                 | Evidence is structured and Links-Notation-exportable, but there is no standards export.         | [#88](https://github.com/link-assistant/meta-expression/issues/88)                                      |
| OpenIE / AMR / SRL formalization inputs | Stanford OpenIE, CoreNLP, spaCy, AllenNLP, AMR, Boxer/C&C, DBpedia Spotlight, BabelNet, TextRazor | Deterministic formalization and Wikidata resolution exist, but no richer NLP provider surface.  | [#89](https://github.com/link-assistant/meta-expression/issues/89)                                      |
| document-level originality reporting    | Turnitin, iThenticate, Copyscape, Grammarly Pro, Quetext, PlagScan, SBERT                         | `/uniqueness` exists, but report spans, source exclusions, and multi-source reports are narrow. | [#90](https://github.com/link-assistant/meta-expression/issues/90)                                      |
| literature-review evidence workflows    | Elicit, Consensus.app, Jenni AI, Perplexity, ChatGPT, Claude, Microsoft Copilot                   | Single-claim evidence exists, but paper screening, excerpts, agreement, and exports do not.     | [#91](https://github.com/link-assistant/meta-expression/issues/91)                                      |
| SPARQL and graph exports                | Wikidata Query Service, DBpedia, YAGO, Neo4j, Datomic, TerminusDB, RDF/OWL, JSON-LD stores        | Selected Wikimedia templates exist, but scoped SPARQL and graph database import/export do not.  | [#92](https://github.com/link-assistant/meta-expression/issues/92)                                      |
| Proof and solver artifacts              | Rocq/Coq, Lean 4, Isabelle/HOL, Metamath, Wolfram Mathematica, Z3, SWI-Prolog, Souffle            | Exact arithmetic exists, but external proof/solver artifact adapters do not.                    | [#93](https://github.com/link-assistant/meta-expression/issues/93); execution parity stays in [#72][72] |
| Browser and editor assistant surfaces   | Grammarly, Jenni AI, Microsoft Copilot, Perplexity, You.com, ChatGPT, Claude                      | Web, CLI, service, and library exist, but no editor/browser integration surface.                | [#94](https://github.com/link-assistant/meta-expression/issues/94)                                      |

[72]: https://github.com/link-assistant/meta-expression/issues/72

## Existing linked parity gates

- [#72](https://github.com/link-assistant/meta-expression/issues/72) executes
  the harvested competitor fixtures and formal-ai corpus as real tests.
- [#73](https://github.com/link-assistant/meta-expression/issues/73) keeps the
  formal-ai compatibility contract visible.
- [#74](https://github.com/link-assistant/meta-expression/issues/74) keeps
  generalized algorithms from regressing already-supported examples.
