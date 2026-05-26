# Online research log for issue #26

> Last checked: 2026-05-26.
> Baseline captured: 2026-05-11.
> Latest refresh delta:
> [`docs/case-studies/issue-71/ONLINE-RESEARCH.md`](../issue-71/ONLINE-RESEARCH.md).

This log archives the public-source data behind
[`docs/COMPARISON-CONCEPTS.md`](../../COMPARISON-CONCEPTS.md) and
[`docs/COMPARISON-FEATURES.md`](../../COMPARISON-FEATURES.md). Pricing in
USD is recorded as published on the vendor pricing pages on the
last-checked date; non-USD or quote-based pricing is noted as such. Each
entry below is a verifiable claim with a URL.

## A. Concept clusters and per-project facts

### A.1 Automated fact checking

| Project                          | License                 | Pricing (USD)          | URL                                                  | Notes                                                                                 |
| -------------------------------- | ----------------------- | ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Google Fact Check Tools API      | Proprietary             | Free, rate-limited     | <https://developers.google.com/fact-check/tools/api> | Returns `ClaimReview` JSON-LD; closest source of structured truth-verdict provenance. |
| ClaimBuster (UT Arlington)       | Free academic API       | Free with key          | <https://idir.uta.edu/claimbuster/>                  | Returns a check-worthiness score 0..1; KDD'17 paper supplies canonical fixtures.      |
| Full Fact AI                     | Proprietary partnership | Free for non-profit    | <https://fullfact.ai/>                               | UK political claims; some components open-sourced on GitHub.                          |
| FactStream (Duke Reporters' Lab) | Proprietary, free app   | Free                   | <https://reporterslab.org/factstream/>               | Successor project is Squash; FactStream is largely paused.                            |
| Snopes                           | Proprietary editorial   | Free; memberships vary | <https://www.snopes.com/>                            | Truth/False/Mixture/Unproven ratings; supplies misconception corpus.                  |
| PolitiFact                       | Proprietary editorial   | Free                   | <https://www.politifact.com/>                        | "Pants on Fire" through "True"; ClaimReview-marked.                                   |
| OpenFactCheck                    | Apache 2.0              | Free                   | <https://openfactcheck.com/>                         | Unified framework to evaluate LLM factuality.                                         |

### A.2 Knowledge graphs and reasoning systems

| Project                | License                                                                | Pricing (USD)                                                         | URL                                                                              | Notes                                                                                    |
| ---------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Cyc / ResearchCyc      | Proprietary (OpenCyc discontinued 2017, ResearchCyc discontinued 2019) | Quote-based                                                           | <https://cyc.com/>                                                               | CycL higher-order logic, microtheories; foundational reference, not currently adoptable. |
| Wolfram Alpha          | Proprietary                                                            | Web Free; Pro $5/mo ($2.99 student); API has free 2,000 calls/mo tier | <https://www.wolframalpha.com/>, <https://products.wolframalpha.com/api/pricing> | Computational kernel for canonical arithmetic and KB facts.                              |
| DBpedia                | CC-BY-SA 3.0 / GFDL                                                    | Free; DBpedia Enterprise quote-based                                  | <https://www.dbpedia.org/>                                                       | SPARQL over Wikipedia infoboxes.                                                         |
| YAGO                   | CC-BY-SA 3.0                                                           | Free                                                                  | <https://yago-knowledge.org/>                                                    | Wikipedia + WordNet + Geonames merge with temporal/spatial qualifiers.                   |
| Wikidata Query Service | CC0 (data), MIT (code)                                                 | Free public endpoint                                                  | <https://query.wikidata.org/>                                                    | Already used by meta-expression's live evidence resolver.                                |
| Mycroft AI             | Apache 2.0 (org sunset 2023; OVOS fork)                                | Free                                                                  | <https://github.com/MycroftAI>                                                   | Listed for completeness; assistant scope, not reasoning.                                 |

### A.3 Formal verification and logic kernels

| Project             | License             | Pricing (USD)                                                          | URL                                    | Notes                                                        |
| ------------------- | ------------------- | ---------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| Coq / Rocq          | LGPL 2.1            | Free                                                                   | <https://rocq-prover.org/>             | `Theorem one_plus_one : 1 + 1 = 2. Proof. reflexivity. Qed.` |
| Lean 4              | Apache 2.0          | Free                                                                   | <https://lean-lang.org/>               | `example : 1 + 1 = 2 := rfl`; mathlib ~1.9M lines.           |
| Isabelle/HOL        | BSD-revised         | Free                                                                   | <https://isabelle.in.tum.de/>          | Sledgehammer dispatches to ATP/SMT.                          |
| Metamath            | Public domain / CC0 | Free                                                                   | <https://us.metamath.org/>             | Theorem `2p2e4` is the canonical pedagogical fixture.        |
| Wolfram Mathematica | Proprietary         | Home $390 one-time / $200/yr; Student $160; Pro/Enterprise quote-based | <https://www.wolfram.com/mathematica/> | EntityValue + computational kernel.                          |
| Z3                  | MIT                 | Free                                                                   | <https://github.com/Z3Prover/z3>       | SMT-LIB `(check-sat)`; sat/unsat results for arithmetic.     |
| SWI-Prolog          | BSD-2-Clause        | Free                                                                   | <https://www.swi-prolog.org/>          | `?- X is 1+1.` -> 2; classic ancestor rules.                 |
| Souffle (Datalog)   | UPL-1.0             | Free                                                                   | <https://souffle-lang.github.io/>      | Decidable Horn-clause logic.                                 |

### A.4 NL→logic, entity linking, AMR

| Project                         | License                               | Pricing (USD)                   | URL                                             | Notes                                    |
| ------------------------------- | ------------------------------------- | ------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| spaCy                           | MIT                                   | Free                            | <https://spacy.io/>                             | NER, POS, dep-parse.                     |
| Stanford CoreNLP                | GPL v3 (commercial license available) | Free / Quote-based              | <https://stanfordnlp.github.io/CoreNLP/>        | OpenIE relation triples.                 |
| AllenNLP                        | Apache 2.0                            | Free (maintenance only)         | <https://allenai.org/allennlp>                  | SRL, coref, AMR models.                  |
| Abstract Meaning Representation | Mixed (LDC datasets paid)             | Mixed                           | <https://amr.isi.edu/>                          | Canonical sentence-graph fixtures.       |
| Boxer / C&C (Montague)          | Academic research                     | Free (research only)            | <https://www.let.rug.nl/bos/comsem/boxer.html>  | Compositional semantics to typed lambda. |
| BabelNet / Babelfy              | Academic free; commercial quote       | Free academic key               | <https://babelnet.org/>                         | Multilingual sense disambiguation.       |
| DBpedia Spotlight               | Apache 2.0                            | Free                            | <https://www.dbpedia-spotlight.org/>            | Entity linking to DBpedia.               |
| TextRazor                       | Proprietary SaaS                      | Free 500 req/day; paid ~$200/mo | <https://www.textrazor.com/>                    | NER + Wikidata IDs.                      |
| Stanford OpenIE                 | GPL v3                                | Free                            | <https://nlp.stanford.edu/software/openie.html> | Triple extraction with confidence.       |

### A.5 Uniqueness / paraphrase

| Project                                 | License     | Pricing (USD)                                                 | URL                            | Notes                                    |
| --------------------------------------- | ----------- | ------------------------------------------------------------- | ------------------------------ | ---------------------------------------- |
| Turnitin (Similarity / Feedback Studio) | Proprietary | Institutional, ~$3–10/student/year                            | <https://www.turnitin.com/>    | LMS integrations; closed-source.         |
| iThenticate / Crossref Similarity Check | Proprietary | From $125 per 25k-word manuscript                             | <https://www.ithenticate.com/> | Scholarly publishing focus.              |
| Copyscape                               | Proprietary | Free basic; Premium ~$0.03 per 300-word search                | <https://www.copyscape.com/>   | Web-content dup detection.               |
| Grammarly Pro                           | Proprietary | $12/mo (annual) / $30/mo monthly                              | <https://www.grammarly.com/>   | Grammar + plagiarism + AI.               |
| Quetext                                 | Proprietary | Free 500 words; Pro $9.99/mo                                  | <https://www.quetext.com/>     | DeepSearch plagiarism.                   |
| PlagScan                                | Proprietary | Quote/account-based; no current public self-serve price found | <https://www.plagscan.com/>    | Education/enterprise.                    |
| Sentence-Transformers / SBERT           | Apache 2.0  | Free                                                          | <https://sbert.net/>           | Semantic similarity baseline; self-host. |

### A.6 AI writing and fact-check assistants

| Project           | License     | Pricing (USD)                                                | URL                              | Notes                                    |
| ----------------- | ----------- | ------------------------------------------------------------ | -------------------------------- | ---------------------------------------- |
| Perplexity AI     | Proprietary | Free; Pro $20/mo ($200/yr); Enterprise Pro/Max paid          | <https://www.perplexity.ai/>     | Inline citations; closest provenance UX. |
| You.com           | Proprietary | Free; Pro $20/mo annual; Max $200/mo annual; API usage-based | <https://you.com/>               | Multiple modes (Genius, Research).       |
| ChatGPT           | Proprietary | Free; Plus $20/mo; Pro $100–$200/mo; Business $20–$25/seat   | <https://chatgpt.com/>           | Browsing-with-citations mode.            |
| Claude            | Proprietary | Free; Pro $20/mo; Max $100–$200/mo; Team paid                | <https://claude.ai/>             | Web search + Computer Use + MCP.         |
| Microsoft Copilot | Proprietary | Free; Pro $20/mo; M365 Copilot Business paid                 | <https://copilot.microsoft.com/> | Bing-backed footnoted citations.         |
| Elicit            | Proprietary | Free; Plus $10–$12/mo; Pro $42–$49/mo; Enterprise quote      | <https://elicit.com/>            | Lit-review automation.                   |
| Consensus.app     | Proprietary | Free; Pro $10/mo annual / $15/mo monthly                     | <https://consensus.app/>         | Consensus Meter ≈ `signedConfidence`.    |
| Jenni AI          | Proprietary | Free 10 autocompletes/day; Plus $12/mo; Pro $29/mo           | <https://jenni.ai/>              | Mentioned explicitly in issue #20.       |

### A.7 Links Notation / knowledge representation

| Project                  | License                                   | Pricing (USD)                                                    | URL                                | Notes                                                       |
| ------------------------ | ----------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| RDF / OWL (W3C)          | W3C royalty-free                          | Free                                                             | <https://www.w3.org/RDF/>          | Triple model + ontology layer.                              |
| JSON-LD                  | W3C Rec                                   | Free                                                             | <https://json-ld.org/>             | Schema.org / ClaimReview serialization.                     |
| PROV-O / PROV-JSON-LD    | W3C Rec                                   | Free                                                             | <https://www.w3.org/TR/prov-o/>    | Provenance model; reference target for evidence.provenance. |
| LinksPlatform / Doublets | Unlicense / MIT                           | Free                                                             | <https://github.com/linksplatform> | Native infrastructure for the meta-expression family.       |
| Datomic                  | Proprietary (Datomic Pro free as of 2023) | Free Pro tier; Cloud usage-based                                 | <https://www.datomic.com/>         | Immutable time-aware datalog.                               |
| Neo4j                    | Community GPL v3; Enterprise commercial   | Community free; AuraDB from ~$65/mo; Enterprise from ~$15–25k/yr | <https://neo4j.com/>               | Native graph DB, Cypher.                                    |
| TerminusDB               | AGPL v3                                   | Free OSS; SaaS free tier                                         | <https://terminusdb.com/>          | Git-like graph DB with revisions.                           |

## B. Disambiguation priority and provenance precedent

Existing precedent supports the meta-expression layering of `Wikipedia
→ Wikidata → Wiktionary` for entity resolution (see
[`docs/case-studies/issue-21/ONLINE-RESEARCH.md`](../issue-21/ONLINE-RESEARCH.md)
§B): Wikifier.org, DBpedia Spotlight, OpenRefine's Wikidata
reconciliation service, TextRazor, Babelfy, and AIDA all use Wikipedia
title presence as the strongest signal before falling through to
Wikidata search.

For provenance, Google Fact Check Tools, Politifact, and Snopes all
expose ClaimReview JSON-LD; W3C PROV-O is the broader standard.
Meta-expression's `result.evidence` already emits structured records
with `id`, `source`, `entity`, and `confidence` fields; a follow-up
adapter to PROV-O is tracked in
[`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md) §5.

## C. Pricing snapshot methodology

Baseline pricing values were captured from publicly accessible vendor pages on
2026-05-11 and refreshed for issue #71 on 2026-05-26. Multi-tier products list
only the entry consumer tier and the cheapest paid tier unless a higher tier is
material to the comparison; enterprise and contact-for-quote tiers are noted but
not priced. We deliberately avoid implying any tier as the "recommended" plan
because the comparison docs aim to map _concepts_, not endorse products.

## D. Library survey (potential dependencies)

| Library                                                                                      | License          | Last checked | Verdict | Rationale                                                                             |
| -------------------------------------------------------------------------------------------- | ---------------- | ------------ | ------- | ------------------------------------------------------------------------------------- |
| [`wikibase-sdk`](https://www.npmjs.com/package/wikibase-sdk)                                 | MIT              | 2026-05-11   | Reject  | Convenient but duplicates endpoints we already speak directly; rejected in issue #21. |
| [`wikipedia` (npm)](https://www.npmjs.com/package/wikipedia)                                 | MIT              | 2026-05-11   | Reject  | Single-API helper, no streaming; our snapshot layer needs to control caching.         |
| [`@wikimedia/codex`](https://www.npmjs.com/package/@wikimedia/codex)                         | GPL-2.0-or-later | 2026-05-11   | Reject  | License clash with MIT codebase.                                                      |
| [`nock`](https://github.com/nock/nock) / [`msw`](https://mswjs.io/)                          | MIT              | 2026-05-11   | Reject  | `makeFetch(routes)` fixtures are sufficient.                                          |
| [`@xenova/transformers`](https://www.npmjs.com/package/@xenova/transformers)                 | Apache-2.0       | 2026-05-11   | Defer   | Uniqueness phase will likely need paraphrase embeddings; defer until that slice.      |
| [`sentence-transformers`](https://sbert.net/) (Python; via service)                          | Apache-2.0       | 2026-05-11   | Defer   | Same as above, server-side option for uniqueness.                                     |
| [`prov-js`](https://www.npmjs.com/package/prov)                                              | MIT              | 2026-05-11   | Defer   | Adopt when `result.evidence.provenance` migrates to PROV-O.                           |
| [`schema.org` ClaimReview JSON-LD](https://schema.org/ClaimReview)                           | W3C-style        | 2026-05-11   | Defer   | Adopt when external fact-check ingestion is added (Phase 10 of ROADMAP).              |
| [`amrlib`](https://github.com/bjascob/amrlib)                                                | MIT              | 2026-05-11   | Defer   | Candidate AMR backend if Phase 8 needs richer semantics.                              |
| [`wikidata-sdk`](https://github.com/maxlath/wikidata-sdk) (deprecated alias of wikibase-sdk) | MIT              | 2026-05-11   | Reject  | Deprecated; do not adopt.                                                             |

## E. Open questions deferred to follow-up issues

1. Should `docs/COMPARISON-CONCEPTS.md` carry a per-row `lastChecked`
   column (so individual rows can age out independently), or keep the
   single doc-level date? Suggested: doc-level date for now; promote
   to per-row when a CI job starts validating pricing pages.
2. Should we cache the pricing-page HTML in `data/` for reproducibility?
   Suggested: only when a maintainer disputes a row; otherwise the
   public URL is the canonical source.
3. Should the comparison docs ship with a banner indicating release
   under CC-BY-4.0 so external contributors can quote them? Tracked as
   a docs-licensing follow-up; not required for this PR.

## F. References

- [Wolfram Alpha API pricing](https://products.wolframalpha.com/api/pricing)
- [Wolfram Alpha Pro pricing](https://www.wolframalpha.com/pro/pricing)
- [iThenticate pricing](https://www.ithenticate.com/)
- [Perplexity AI pricing](https://www.perplexity.ai/pro)
- [Consensus.app pricing](https://consensus.app/pricing)
- [Jenni AI pricing](https://jenni.ai/pricing)
- [Neo4j pricing](https://neo4j.com/pricing/)
- [Quetext pricing](https://www.quetext.com/pricing)
- [Grammarly pricing](https://www.grammarly.com/premium)
- [Schema.org ClaimReview](https://schema.org/ClaimReview)
- [W3C PROV-O](https://www.w3.org/TR/prov-o/)
- [Metamath 2p2e4](https://us.metamath.org/mpeuni/2p2e4.html)
- [Z3 GitHub](https://github.com/Z3Prover/z3)
- [Lean 4](https://lean-lang.org/)
- [Coq / Rocq Prover](https://rocq-prover.org/)
- [DBpedia](https://www.dbpedia.org/)
- [YAGO](https://yago-knowledge.org/)
- [Wikidata Query Service](https://query.wikidata.org/)
- [LinksPlatform](https://github.com/linksplatform)
