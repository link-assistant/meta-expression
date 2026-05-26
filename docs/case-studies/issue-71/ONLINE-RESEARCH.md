# Online research log for issue #71

> Last checked: 2026-05-26.
> Baseline:
> [`docs/case-studies/issue-26/ONLINE-RESEARCH.md`](../issue-26/ONLINE-RESEARCH.md).

This log refreshes the competitor facts behind
[`docs/COMPARISON-CONCEPTS.md`](../../COMPARISON-CONCEPTS.md) and
[`docs/COMPARISON-FEATURES.md`](../../COMPARISON-FEATURES.md). It keeps issue
#26 as the baseline and records the 2026-05-26 delta needed by issue #71.

## Method

- Re-opened the public project or vendor URL for every competitor listed in the
  comparison docs.
- Preferred official project pages, vendor pricing pages, standards pages, and
  project package repositories.
- Recorded exact prices only when a public page exposed them without login.
  Quote-only, institutional, or no-longer-public pricing is marked as such.
- Converted missing competitor capabilities into child issues in
  [`MISSING-FEATURES.md`](./MISSING-FEATURES.md).

## A. Material changes since issue #26

| Area                       | Refresh finding                                                                                                                                                                          | Doc action                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| AI assistant pricing       | ChatGPT now needs Plus, Pro, and Business tiers; Claude adds explicit Max tiers; You.com and Perplexity expose higher-end Max/Enterprise tiers.                                          | Updated `COMPARISON-CONCEPTS.md` AI assistant rows.                       |
| Writing/originality tools  | Grammarly now presents the paid plan as Grammarly Pro; Quetext exposes plagiarism-only and word-bundle pricing; PlagScan no longer surfaced public self-service pricing in this refresh. | Updated uniqueness/pricing rows and kept PlagScan as quote/account-based. |
| NLP provider pricing       | TextRazor still exposes the free 500-request/day tier and paid Starter/Growth/Pro plans.                                                                                                 | Kept TextRazor as the paid entity-linking SaaS comparison.                |
| Fact-check interchange     | Google Fact Check Tools API and Schema.org ClaimReview remain the clearest structured fact-check interchange surfaces.                                                                   | Filed ClaimReview parity issue #87.                                       |
| Linked-data interchange    | RDF, JSON-LD, and PROV-O remain the standards gap next to Links Notation.                                                                                                                | Filed JSON-LD/PROV-O parity issue #88.                                    |
| Literature-review workflow | Elicit, Consensus.app, and Jenni AI expose paper workflows, confidence/review surfaces, and bibliography/document exports that meta-expression does not ship.                            | Filed literature-review parity issue #91.                                 |

## B. Rechecked competitor roster

### B.1 Automated fact checking

- Google Fact Check Tools API: proprietary Google API; free API-key access;
  capability remains ClaimReview search plus authorized ClaimReview write/edit
  workflows. Gap: ClaimReview import/export (#87).
- ClaimBuster: academic API with key request; pricing remains free/public
  academic access; capability remains check-worthiness scoring.
- Full Fact AI: proprietary Full Fact project; public page describes AI-aided
  fact-checking workflows rather than self-serve pricing. Gap pressure: claim
  monitoring and editorial review workflows (#87, #91).
- FactStream: Reporters' Lab project remains a free app/project reference with
  successor work around live claim monitoring. Gap pressure: streaming claim
  intake, not an immediate shipped surface.
- Snopes: proprietary editorial site; articles remain publicly readable and
  subscriptions/memberships are optional. Gap pressure: verdict corpus and
  ClaimReview-style fact-check records (#87).
- PolitiFact: proprietary editorial fact-checking site; public fact checks and
  Truth-O-Meter labels remain current. Gap pressure: verdict labels and
  ClaimReview examples (#87).
- OpenFactCheck: Apache-licensed factuality evaluation framework; public package
  and paper remain available. Gap pressure: benchmark integration; execution is
  handled by #72.

### B.2 Knowledge graphs and reasoning systems

- Cyc / ResearchCyc: proprietary, quote-based historical reasoning system;
  OpenCyc/ResearchCyc remain reference systems rather than adoptable
  dependencies.
- Wolfram Alpha: proprietary web/API product; public API tiers still include a
  free low-volume tier and paid usage above it. Gap pressure: computable facts
  and curated knowledge, partly addressed by existing exact arithmetic and
  evidence work.
- DBpedia: community/open linked-data project; public datasets and SPARQL/linked
  data access remain available. Gap pressure: generic SPARQL/import/export
  (#92) and standards export (#88).
- YAGO: open knowledge-base project; free public datasets remain available. Gap
  pressure: richer temporal/spatial evidence templates (#92).
- Wikidata Query Service: free public SPARQL endpoint over CC0 data; already
  intersects meta-expression live evidence. Gap pressure: scoped SPARQL export
  and bounded query execution (#92).
- Mycroft AI / OVOS: open voice-assistant ecosystem; kept as adjacent
  conversational-agent context, but not a direct reasoning gap.

### B.3 Formal verification and logic kernels

- Rocq/Coq: LGPL proof assistant; current public site identifies Rocq as the
  successor name and latest prover release. Gap pressure: external proof
  artifacts (#93).
- Lean 4: Apache-licensed theorem prover/programming language; free and active.
  Gap pressure: proof-snippet import/export (#93).
- Isabelle/HOL: BSD-style theorem prover; free and active. Gap pressure:
  theorem/proof artifact references (#93).
- Metamath: public-domain/CC0 proof database and verifier ecosystem; free. Gap
  pressure: proof database references (#93).
- Wolfram Mathematica: proprietary symbolic computation product with public home
  and student pricing; gap pressure is symbolic computation artifacts (#93).
- Z3: MIT-licensed SMT solver; free. Gap pressure: SMT-LIB adapter and solver
  result provenance (#93).
- SWI-Prolog: BSD-licensed logic programming system; free. Gap pressure: logic
  fact/rule adapter (#93).
- Souffle: UPL-licensed Datalog system; free. Gap pressure: Datalog rule/result
  adapter (#93).

### B.4 Natural language to logic, entity linking, and AMR

- spaCy: MIT-licensed NLP library; free. Gap pressure: provider interface for
  NER and dependency parses (#89).
- Stanford CoreNLP: GPL v3 with commercial licensing; free for GPL-compatible
  use. Gap pressure: relation triples and OpenIE-backed candidates (#89).
- AllenNLP: Apache-licensed research library in maintenance mode; free. Gap
  pressure: semantic-role and AMR-style provider fixtures (#89).
- Abstract Meaning Representation: mixed ecosystem with paid LDC datasets and
  free tools/papers. Gap pressure: sentence-level semantic graphs (#89).
- Boxer / C&C: academic research tools; no current commercial self-serve pricing
  surfaced. Gap pressure: compositional semantics fixtures (#89).
- BabelNet / Babelfy: academic-free/commercial-quote sense-disambiguation
  service. Gap pressure: multilingual entity/sense provider interface (#89).
- DBpedia Spotlight: Apache-licensed entity-linking service. Gap pressure:
  external entity-link candidates (#89).
- TextRazor: proprietary SaaS; free 500 requests/day, paid Starter/Growth/Pro
  tiers begin at $200/month. Gap pressure: paid entity and relation extraction
  provider (#89).
- Stanford OpenIE: GPL v3 relation extraction tool; free. Gap pressure:
  schema-free relation triples with confidence (#89).

### B.5 Uniqueness and paraphrase

- Turnitin Similarity / Feedback Studio: proprietary institutional product;
  pricing remains institutional/quote or contract based. Gap pressure:
  document-level reports with matched sources (#90).
- iThenticate / Crossref Similarity Check: proprietary; public individual
  packages include $125 single-manuscript credits and $300 multiple-manuscript
  credits. Gap pressure: manuscript-scale reports (#90).
- Copyscape: proprietary duplicate-content service; Premium/API pricing remains
  per search and word length. Gap pressure: source URL matches and report spans
  (#90).
- Grammarly Pro: proprietary writing assistant; public paid plan is now
  Grammarly Pro, with annual and monthly pricing. Gap pressure: editor
  integration plus plagiarism/originality reporting (#90, #94).
- Quetext: proprietary plagiarism and AI-content detection service; public
  pricing includes plagiarism-only and word-bundle tiers. Gap pressure:
  downloadable originality reports and word-budgeted document checks (#90).
- PlagScan: proprietary plagiarism service; active public pages remain, but no
  current self-serve pricing was found during this refresh. Treat as
  quote/account-based until a public pricing page is restored. Gap pressure:
  education/enterprise reports (#90).
- Sentence-Transformers / SBERT: Apache-licensed semantic similarity library;
  free. Gap pressure: paraphrase/similarity embeddings for `/uniqueness` (#90).

### B.6 AI writing and fact-check assistants

- Perplexity: proprietary answer engine; public pricing includes Free, Pro
  ($20/month or $200/year), Enterprise Pro, and Enterprise Max tiers. Gap
  pressure: cited-answer UX, source collections, and research workflows (#91,
  #94).
- You.com: proprietary answer/search platform; current public page exposes chat
  plans plus usage-priced search/content/research APIs. Gap pressure: embedded
  AI-search surfaces and cited research workflows (#91, #94).
- ChatGPT: proprietary OpenAI chat product; public pages list Free, Plus, Pro,
  Business, and Enterprise tiers. Gap pressure: browser/app surfaces, connectors,
  and cited research workflows (#91, #94).
- Claude: proprietary Anthropic chat product; Pro remains $20/month and Max
  tiers are $100/month and $200/month. Gap pressure: long-context research,
  tool-use workflows, and editor/app integrations (#91, #94).
- Microsoft Copilot: proprietary Microsoft assistant; Copilot Pro remains
  $20/user/month and Microsoft 365 Copilot Business has public per-user pricing.
  Gap pressure: document/editor embedding (#94).
- Elicit: proprietary research assistant; public pricing exposes Basic, Plus,
  Pro, Team, and Enterprise; API access requires Pro or above. Gap pressure:
  paper metadata, reports, excerpts, and BibTeX/RIS/CSV exports (#91).
- Consensus.app: proprietary literature-search assistant; public help now calls
  the paid tier Consensus Pro and lists annual/monthly pricing. Gap pressure:
  literature agreement scores and paper snapshots (#91).
- Jenni AI: proprietary academic writing assistant; public docs list Free, Plus,
  and Pro plans. Gap pressure: writing-review workflow, citations, document
  export, and editor surface (#91, #94).

### B.7 Links Notation and knowledge representation

- RDF / OWL: W3C standards; free and royalty-free. Gap pressure: RDF export and
  ontology-compatible projections (#88, #92).
- JSON-LD: W3C linked-data JSON serialization; free. Gap pressure: JSON-LD
  evidence/result export (#88).
- PROV-O / PROV-JSON-LD: W3C provenance ontology; free. Gap pressure: explicit
  evidence provenance export (#88).
- LinksPlatform / Doublets: open links infrastructure; remains the closest
  native storage substrate. Current Rust/doublets work addresses part of this
  area; standards interop is still #88/#92.
- Datomic: proprietary, time-aware datalog database with free Pro and
  usage-based Cloud posture. Gap pressure: immutable query/import/export (#92).
- Neo4j: community/enterprise graph database; public Aura and enterprise pricing
  remain outside the current meta-expression storage surface. Gap pressure:
  Cypher/graph-store export (#92).
- TerminusDB: AGPL graph database with SaaS tier. Gap pressure: versioned
  knowledge-store import/export (#92).

## C. Child issue mapping

| Gap family                  | Child issue |
| --------------------------- | ----------- |
| ClaimReview fact checks     | #87         |
| JSON-LD / PROV-O provenance | #88         |
| OpenIE / AMR / SRL inputs   | #89         |
| Originality reports         | #90         |
| Literature-review evidence  | #91         |
| SPARQL and graph exports    | #92         |
| Proof and solver artifacts  | #93         |
| Browser/editor surfaces     | #94         |

## D. References

- <https://developers.google.com/fact-check/tools/api>
- <https://schema.org/ClaimReview>
- <https://idir.uta.edu/claimbuster-dev/api/request/key/>
- <https://fullfact.org/full-fact-ai/>
- <https://reporterslab.org/factstream/>
- <https://www.snopes.com/terms-and-conditions/>
- <https://www.politifact.com/>
- <https://pypi.org/project/openfactcheck/0.3.2/>
- <https://products.wolframalpha.com/api/pricing>
- <https://www.wolfram.com/mathematica/>
- <https://www.dbpedia.org/>
- <https://yago-knowledge.org/>
- <https://query.wikidata.org/>
- <https://rocq-prover.org/>
- <https://lean-lang.org/>
- <https://isabelle.in.tum.de/>
- <https://us.metamath.org/>
- <https://github.com/Z3Prover/z3>
- <https://www.swi-prolog.org/>
- <https://souffle-lang.github.io/>
- <https://spacy.io/>
- <https://stanfordnlp.github.io/CoreNLP/>
- <https://allenai.org/allennlp>
- <https://amr.isi.edu/>
- <https://www.let.rug.nl/bos/comsem/boxer.html>
- <https://babelnet.org/>
- <https://www.dbpedia-spotlight.org/>
- <https://www.textrazor.com/plans>
- <https://nlp.stanford.edu/software/openie.html>
- <https://www.turnitin.com/>
- <https://www.ithenticate.com/products>
- <https://www.copyscape.com/premium.php>
- <https://www.grammarly.com/plans>
- <https://www.quetext.com/pricing>
- <https://www.plagscan.com/en/terms-of-service-and-data-protection>
- <https://sbert.net/>
- <https://www.perplexity.ai/enterprise/pricing>
- <https://you.com/platform/upgrade>
- <https://openai.com/chatgpt/pricing/>
- <https://openai.com/business/chatgpt-pricing/>
- <https://support.claude.com/en/articles/8325606-what-is-claude-pro>
- <https://support.anthropic.com/en/articles/11049744-how-much-does-the-max-plan-cost>
- <https://www.microsoft.com/en-us/store/b/copilotpro>
- <https://www.microsoft.com/en-us/microsoft-365/copilot/pricing>
- <https://orion.elicit.com/pricing>
- <https://docs.elicit.com/>
- <https://help.consensus.app/en/articles/11408820-what-do-you-get-with-premium>
- <https://docs.jenni.ai/docs/account/plans-and-billing/>
- <https://www.w3.org/RDF/>
- <https://json-ld.org/>
- <https://www.w3.org/TR/prov-o/>
- <https://github.com/linksplatform>
- <https://www.datomic.com/>
- <https://neo4j.com/pricing/>
- <https://terminusdb.com/>
