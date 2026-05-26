# Concept comparison: meta-expression vs. similar projects

> Last checked: 2026-05-26.
> Source case studies:
> [`docs/case-studies/issue-26/`](./case-studies/issue-26/) and
> [`docs/case-studies/issue-71/`](./case-studies/issue-71/).
> Raw research log:
> [`docs/case-studies/issue-71/ONLINE-RESEARCH.md`](./case-studies/issue-71/ONLINE-RESEARCH.md).
> Baseline research log:
> [`docs/case-studies/issue-26/ONLINE-RESEARCH.md`](./case-studies/issue-26/ONLINE-RESEARCH.md).

This document maps meta-expression's concepts (statement interpretation,
formalization, evidence with provenance, formal evaluation, translation,
correctness/confidence scoring, uniqueness search, Links Notation
persistence) against the public surfaces of comparable projects, both
open-source and proprietary, free and paid. Pricing is recorded in USD
as published on the vendor pricing page on the last-checked date.

## How to read this document

Each section is one concept cluster meta-expression already exposes
(`/analyze`, `/formalize`, `/translate`, `/check`, `/uniqueness`, plus
the underlying Links Notation / doublets persistence and the React+WASM
target). The "meta-expression role" subsection records which
meta-expression public surface intersects the cluster. Each entry then
records:

- License (open-source vs proprietary).
- Pricing tier (free, freemium, paid) with the entry price in USD.
- Project URL.
- Concept overlap (which meta-expression concept it most closely
  resembles).

The companion document [`COMPARISON-FEATURES.md`](./COMPARISON-FEATURES.md)
turns these entries into a matrix keyed on every meta-expression
public feature.

## How to update

When a comparable system's pricing or license changes:

1. Update the row below.
2. Update the corresponding row in
   the current issue refresh log, such as
   [`docs/case-studies/issue-71/ONLINE-RESEARCH.md`](./case-studies/issue-71/ONLINE-RESEARCH.md)
   §B.
3. Bump the `Last checked` date at the top of both files.

When a comparable system ships or removes a feature:

1. Update the matrix in [`COMPARISON-FEATURES.md`](./COMPARISON-FEATURES.md).
2. If a canonical input/output changes, update
   [`docs/case-studies/issue-26/TEST-CASES.md`](./case-studies/issue-26/TEST-CASES.md).

## Measured competitor quality gates

Issue #114 turns the harvested competitor cases into a measured recurring gate.
The score fixture is
[`js/tests/fixtures/competitor-quality-gates.json`](../js/tests/fixtures/competitor-quality-gates.json),
and the executable gate is
[`js/tests/integration/issue-114-competitor-quality-gates.test.js`](../js/tests/integration/issue-114-competitor-quality-gates.test.js).
As measured on 2026-05-26, the gate reports **26/26 enabled cases passing**
and **26/36 total harvested cases executable**, for **72.2% executable
coverage** across the competitor catalogue.

| Concept cluster                         | Measured score              | Current gap tracked by |
| --------------------------------------- | --------------------------- | ---------------------- |
| Arithmetic and formal-verification core | 10/10 enabled cases passing | No open gap            |
| Wikidata-structured public facts        | 7/7 enabled cases passing   | No open gap            |
| Wikidata P570 liveness templates        | 4/4 enabled cases passing   | No open gap            |
| Self-reference and paradoxes            | 3/3 enabled cases passing   | No open gap            |
| NL to logic / extraction                | 0/4 executable cases        | #89                    |
| Disputed-truth corpora                  | 0/4 executable cases        | #87                    |
| Uniqueness and paraphrase               | 1/2 executable cases        | #90                    |
| Knowledge representation round-trip     | 1/2 executable cases        | #88, #92               |

## 1. Automated fact checking

**meta-expression role**: `/check` (and alias `/fact-check`) on every
surface; `/analyze` when the input is a single statement with public
evidence.

| Project                          | License                 | Pricing (USD)             | URL                                                  | Concept overlap                                                     |
| -------------------------------- | ----------------------- | ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Google Fact Check Tools API      | Proprietary             | Free, rate-limited        | <https://developers.google.com/fact-check/tools/api> | Verdict + provenance via ClaimReview JSON-LD.                       |
| ClaimBuster                      | Free academic           | Free with key             | <https://idir.uta.edu/claimbuster/>                  | Check-worthiness score 0..1; meta-expression maps to `correctness`. |
| Full Fact AI                     | Proprietary partnership | Free for non-profit       | <https://fullfact.ai/>                               | UK political fact monitoring; some OSS components.                  |
| FactStream (Duke Reporters' Lab) | Proprietary             | Free app (project paused) | <https://reporterslab.org/factstream/>               | Live fact-check streaming.                                          |
| Snopes                           | Proprietary editorial   | Free; memberships vary    | <https://www.snopes.com/>                            | Misconception corpus; verdict labels.                               |
| PolitiFact                       | Proprietary editorial   | Free                      | <https://www.politifact.com/>                        | "Truth-O-Meter" verdict + ClaimReview.                              |
| OpenFactCheck                    | Apache 2.0              | Free                      | <https://openfactcheck.com/>                         | Unified evaluation harness for LLM factuality.                      |

## 2. Knowledge graphs and reasoning systems

**meta-expression role**: live evidence resolver
(`js/src/wikimedia-evidence.js`), interpretation pipeline
(`js/src/index.js`), reasoning trace.

| Project                | License                                              | Pricing (USD)                                         | URL                             | Concept overlap                                               |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------------------- | ------------------------------- | ------------------------------------------------------------- |
| Cyc / ResearchCyc      | Proprietary (OpenCyc EOL 2017; ResearchCyc EOL 2019) | Quote-based                                           | <https://cyc.com/>              | Higher-order logic + microtheories; reference, not adoptable. |
| Wolfram Alpha          | Proprietary                                          | Web Free; Pro $5/mo; API free 2k calls/mo, paid above | <https://www.wolframalpha.com/> | Computational kernel + curated knowledge.                     |
| DBpedia                | CC-BY-SA 3.0 / GFDL                                  | Free; Enterprise quote-based                          | <https://www.dbpedia.org/>      | SPARQL over Wikipedia infoboxes.                              |
| YAGO                   | CC-BY-SA 3.0                                         | Free                                                  | <https://yago-knowledge.org/>   | KB with temporal/spatial qualifiers.                          |
| Wikidata Query Service | CC0 (data), MIT (code)                               | Free                                                  | <https://query.wikidata.org/>   | Already used by meta-expression's live resolver.              |
| Mycroft AI / OVOS      | Apache 2.0                                           | Free                                                  | <https://github.com/MycroftAI>  | Voice assistant scope; listed for completeness.               |

## 3. Formal verification and logic kernels

**meta-expression role**: deterministic arithmetic evaluation
(`js/src/index.js`); future Rust + WASM core (R5, R8).

| Project             | License             | Pricing (USD)                              | URL                                    | Concept overlap                                               |
| ------------------- | ------------------- | ------------------------------------------ | -------------------------------------- | ------------------------------------------------------------- |
| Coq / Rocq          | LGPL 2.1            | Free                                       | <https://rocq-prover.org/>             | Calculus of Inductive Constructions; canonical `1 + 1 = 2`.   |
| Lean 4              | Apache 2.0          | Free                                       | <https://lean-lang.org/>               | mathlib formalized math kernel.                               |
| Isabelle/HOL        | BSD-revised         | Free                                       | <https://isabelle.in.tum.de/>          | Higher-order logic + Sledgehammer.                            |
| Metamath            | Public domain / CC0 | Free                                       | <https://us.metamath.org/>             | Tiny axiom set; `2p2e4` is the canonical pedagogical theorem. |
| Wolfram Mathematica | Proprietary         | Home $390 one-time / $200/yr; Student $160 | <https://www.wolfram.com/mathematica/> | Symbolic computation + EntityValue.                           |
| Z3                  | MIT                 | Free                                       | <https://github.com/Z3Prover/z3>       | SMT solver; sat/unsat for arithmetic and constraints.         |
| SWI-Prolog          | BSD-2-Clause        | Free                                       | <https://www.swi-prolog.org/>          | Classic logic programming.                                    |
| Soufflé (Datalog)   | UPL-1.0             | Free                                       | <https://souffle-lang.github.io/>      | Decidable Horn-clause logic.                                  |

## 4. NL→logic, entity linking, AMR

**meta-expression role**: `/formalize` and the interpretation pipeline
in `js/src/formalize.js` and `js/src/disambiguation.js`.

| Project                         | License                          | Pricing (USD)                    | URL                                             | Concept overlap                    |
| ------------------------------- | -------------------------------- | -------------------------------- | ----------------------------------------------- | ---------------------------------- |
| spaCy                           | MIT                              | Free                             | <https://spacy.io/>                             | NER + dep-parse.                   |
| Stanford CoreNLP                | GPL v3 (commercial license sold) | Free / Quote-based               | <https://stanfordnlp.github.io/CoreNLP/>        | OpenIE triple extraction.          |
| AllenNLP                        | Apache 2.0                       | Free (maintenance only)          | <https://allenai.org/allennlp>                  | SRL, coref, AMR models.            |
| Abstract Meaning Representation | Mixed (LDC datasets paid)        | Mixed                            | <https://amr.isi.edu/>                          | Sentence-level semantic graphs.    |
| Boxer / C&C (Montague)          | Academic                         | Free (research)                  | <https://www.let.rug.nl/bos/comsem/boxer.html>  | Compositional FOL.                 |
| BabelNet / Babelfy              | Academic free; commercial quote  | Free academic key                | <https://babelnet.org/>                         | Multilingual sense disambiguation. |
| DBpedia Spotlight               | Apache 2.0                       | Free                             | <https://www.dbpedia-spotlight.org/>            | Entity linking to DBpedia.         |
| TextRazor                       | Proprietary SaaS                 | Free 500 req/day; paid ~$200+/mo | <https://www.textrazor.com/>                    | NER + Wikidata IDs.                |
| Stanford OpenIE                 | GPL v3                           | Free                             | <https://nlp.stanford.edu/software/openie.html> | Schema-free relation triples.      |

## 5. Uniqueness and paraphrase

**meta-expression role**: `/uniqueness` and citation/rewording
suggestions in `js/src/uniqueness.js`.

| Project                                 | License     | Pricing (USD)                                                 | URL                            | Concept overlap                              |
| --------------------------------------- | ----------- | ------------------------------------------------------------- | ------------------------------ | -------------------------------------------- |
| Turnitin (Similarity / Feedback Studio) | Proprietary | Institutional, ~$3–10/student/year                            | <https://www.turnitin.com/>    | Education plagiarism + AI-writing detection. |
| iThenticate / Crossref Similarity Check | Proprietary | From $125 per 25k-word manuscript                             | <https://www.ithenticate.com/> | Scholarly pre-publication screening.         |
| Copyscape                               | Proprietary | Free basic; Premium ~$0.03 per 300-word search                | <https://www.copyscape.com/>   | Web duplicate detection.                     |
| Grammarly Pro                           | Proprietary | $12/mo annual / $30/mo monthly                                | <https://www.grammarly.com/>   | Grammar + plagiarism + AI.                   |
| Quetext                                 | Proprietary | Free ≤500 words; Pro $9.99/mo                                 | <https://www.quetext.com/>     | DeepSearch plagiarism.                       |
| PlagScan                                | Proprietary | Quote/account-based; no current public self-serve price found | <https://www.plagscan.com/>    | Education/enterprise plagiarism.             |
| Sentence-Transformers / SBERT           | Apache 2.0  | Free                                                          | <https://sbert.net/>           | Semantic similarity baseline.                |

## 6. AI writing and fact-check assistants

**meta-expression role**: shared territory with general AI chat
products. Meta-expression intentionally bounds the role of LLMs (R12).

| Project           | License     | Pricing (USD)                                                 | URL                              | Concept overlap                                       |
| ----------------- | ----------- | ------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------- |
| Perplexity AI     | Proprietary | Free; Pro $20/mo ($200/yr); Enterprise Pro/Max paid           | <https://www.perplexity.ai/>     | Citations + answer engine.                            |
| You.com           | Proprietary | Free; Pro $20/mo annual; Max $200/mo annual; APIs usage-based | <https://you.com/>               | Multi-mode AI search.                                 |
| ChatGPT           | Proprietary | Free; Plus $20/mo; Pro $100–$200/mo; Business $20–$25/seat    | <https://chatgpt.com/>           | Browsing-with-citations mode.                         |
| Claude            | Proprietary | Free; Pro $20/mo; Max $100–$200/mo; Team paid                 | <https://claude.ai/>             | Web search + tool use.                                |
| Microsoft Copilot | Proprietary | Free; Pro $20/mo; M365 Copilot Business paid                  | <https://copilot.microsoft.com/> | Bing-backed citations.                                |
| Elicit            | Proprietary | Free; Plus $10–$12/mo; Pro $42–$49/mo                         | <https://elicit.com/>            | Literature-review automation.                         |
| Consensus.app     | Proprietary | Free; Pro $10/mo annual / $15/mo monthly                      | <https://consensus.app/>         | Consensus Meter ≈ `signedConfidence`.                 |
| Jenni AI          | Proprietary | Free 10/day; Plus $12/mo; Pro $29/mo                          | <https://jenni.ai/>              | Academic writing assistant (called out in issue #20). |

## 7. Links Notation and knowledge representation

**meta-expression role**: Links Notation text export everywhere, Rust core
(`rust`) for durable doublets storage and WASM-ready translation/cache planning,
future React+WASM binding (R5).

| Project                  | License                                 | Pricing (USD)                                                    | URL                                | Concept overlap                         |
| ------------------------ | --------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- | --------------------------------------- |
| RDF / OWL (W3C)          | W3C royalty-free                        | Free                                                             | <https://www.w3.org/RDF/>          | Triple model + ontology layer.          |
| JSON-LD                  | W3C Rec                                 | Free                                                             | <https://json-ld.org/>             | Schema.org / ClaimReview serialization. |
| PROV-O / PROV-JSON-LD    | W3C Rec                                 | Free                                                             | <https://www.w3.org/TR/prov-o/>    | Provenance graph standard.              |
| LinksPlatform / Doublets | Unlicense / MIT                         | Free                                                             | <https://github.com/linksplatform> | Native links-of-links substrate.        |
| Datomic                  | Proprietary (Pro free as of 2023)       | Free Pro; Cloud usage-based                                      | <https://www.datomic.com/>         | Immutable, time-aware datalog.          |
| Neo4j                    | Community GPL v3; Enterprise commercial | Community free; AuraDB from ~$65/mo; Enterprise from ~$15–25k/yr | <https://neo4j.com/>               | Native graph DB + Cypher.               |
| TerminusDB               | AGPL v3                                 | Free OSS; SaaS free tier                                         | <https://terminusdb.com/>          | Git-like graph DB with revisions.       |

## 8. Where meta-expression sits

Across the seven clusters, meta-expression sits closest to the
intersection of:

- **Consensus.app** (signed confidence across evidence),
- **Perplexity AI** (citations attached to answers),
- **Wolfram Alpha** (deterministic computable kernel for the arithmetic
  fragment), and
- **Wikidata SPARQL** (structured public knowledge with stable
  identifiers).

It differs from all four in three explicit ways:

1. Real-world `correctness` is intentionally bounded away from `0` and
   `1` (see R17), unlike fact-check verdicts that flip to a single
   label.
2. Every result is also exportable as Links Notation, so the analysis
   is reproducible offline (no comparable system except RDF/JSON-LD
   exposes a full round-trippable text form by default).
3. LLM output is bounded to candidate interpretations only (R12), so
   the prototype's truth labels are never directly attributable to a
   language model. Most assistants in §6 take the opposite stance.

For per-feature comparison, see
[`COMPARISON-FEATURES.md`](./COMPARISON-FEATURES.md). For the harvested
canonical test cases, see
[`docs/case-studies/issue-26/TEST-CASES.md`](./case-studies/issue-26/TEST-CASES.md).
