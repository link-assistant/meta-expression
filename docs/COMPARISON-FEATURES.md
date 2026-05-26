# Feature comparison: meta-expression vs. similar projects

> Last checked: 2026-05-26.
> Companion document: [`COMPARISON-CONCEPTS.md`](./COMPARISON-CONCEPTS.md).
> Source case studies:
> [`docs/case-studies/issue-26/`](./case-studies/issue-26/) and
> [`docs/case-studies/issue-71/`](./case-studies/issue-71/).
> Missing-feature ledger:
> [`docs/case-studies/issue-71/MISSING-FEATURES.md`](./case-studies/issue-71/MISSING-FEATURES.md).
> Issue #20 extension:
> [`docs/case-studies/issue-20/`](./case-studies/issue-20/).

This matrix turns the seven concept clusters from
[`COMPARISON-CONCEPTS.md`](./COMPARISON-CONCEPTS.md) into a per-feature
comparison. Rows are every public meta-expression feature surface;
columns are the comparable projects grouped by cluster.

## Legend

- `✓` — first-class support (the surface is a documented, shipped
  feature of the project, with explicit input/output).
- `≈` — partial or adjacent support (a related feature exists but
  differs in scope, requires extra glue, or is documented as
  experimental).
- `—` — concept is not applicable to that project (e.g., asking
  Metamath about uniqueness/plagiarism).
- `✗` — concept is explicitly out of scope or rejected by the project.

A cell is left blank only when public documentation does not clarify
the status; if you can clarify a blank cell, please update it via the
process in [`COMPARISON-CONCEPTS.md`](./COMPARISON-CONCEPTS.md).

## 1. meta-expression public surfaces

These are the surfaces the project exposes today (see
[`README.md`](../README.md) and [`docs/REQUIREMENTS.md`](./REQUIREMENTS.md)):

| ID  | Surface                                                                                                                           | Where                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| F1  | Reusable JS library (`analyzeStatement`, `formalizeTextWith`, `translateTextWith`, `checkText`, `searchTextUniqueness`)           | `js/src/index.js`, `js/src/index.d.ts` |
| F2  | CLI                                                                                                                               | `js/src/cli.js`                        |
| F3  | Microservice (`GET /health`, `/analyze`, `/formalize`, `/translate`, `/check`, `/fact-check`, `/uniqueness`)                      | `js/src/server.js`                     |
| F4  | Static web prototype (Analyse / Compare / Check / Uniqueness / Formalize / Translate / Preferences)                               | `web/index.html`, `web/app.js`         |
| F5  | Statement interpretation pipeline (top-3 paraphrases, selection link)                                                             | `js/src/index.js`                      |
| F6  | Formal levels (`describeFormalizationLevel`) with executable flag                                                                 | `js/src/index.js`                      |
| F7  | Exact arithmetic evaluation (equality + question shape)                                                                           | `js/src/index.js`                      |
| F8  | Real-world evidence with bounded confidence (Wikidata P36/P397/P398/P570 templates)                                               | `js/src/wikimedia-evidence.js`         |
| F9  | `correctness` (0..1) and `signedConfidence` (-1..+1) result metrics                                                               | `js/src/index.js`, issue #13 tests     |
| F10 | `/formalize` returning Markdown / Links Notation / HTML / CST                                                                     | `js/src/formalize.js`                  |
| F11 | `/translate` via formalized Wikidata Q/P + sentence rules                                                                         | `js/src/translate.js`                  |
| F12 | `/check` (`/fact-check`) with red-to-green coloring                                                                               | `js/src/check.js`                      |
| F13 | `/uniqueness` over public web + scholarly APIs                                                                                    | `js/src/uniqueness.js`                 |
| F14 | Preference profiles (worldview / context / God-slider)                                                                            | `js/src/preferences.js`                |
| F15 | Links Notation export everywhere                                                                                                  | `js/src/lino.js`                       |
| F16 | Issue-report URL prefilled with the analysis state                                                                                | `js/src/index.js`                      |
| F17 | Rust core with `doublets` relation-link encoding, issue #52 translation coverage, and Wikimedia cache/batch planning (WASM-ready) | `rust`                                 |

## 2. Per-cluster matrix

The matrix below collapses each cluster into the most-cited project
representative. For a full per-project listing see
[`COMPARISON-CONCEPTS.md`](./COMPARISON-CONCEPTS.md) and the raw research
log [`docs/case-studies/issue-26/ONLINE-RESEARCH.md`](./case-studies/issue-26/ONLINE-RESEARCH.md).
The 2026-05-26 refresh is archived in
[`docs/case-studies/issue-71/ONLINE-RESEARCH.md`](./case-studies/issue-71/ONLINE-RESEARCH.md).

| Feature                                | Wolfram Alpha             | Wikidata SPARQL         | Coq / Lean / Z3       | Stanford OpenIE           | DBpedia Spotlight     | Turnitin / iThenticate    | SBERT                                     | Perplexity AI           | Consensus.app                          | Wikipedia / ClaimReview | Neo4j / Datomic  | RDF / JSON-LD / PROV-O | LinksPlatform / Doublets |
| -------------------------------------- | ------------------------- | ----------------------- | --------------------- | ------------------------- | --------------------- | ------------------------- | ----------------------------------------- | ----------------------- | -------------------------------------- | ----------------------- | ---------------- | ---------------------- | ------------------------ |
| F1 Reusable JS library                 | ≈ (Cloud SDK)             | ≈ (community SDKs)      | — (CLI/IDE)           | ≈ (Java)                  | ✓ (REST)              | ≈ (REST)                  | ≈ (Python; JS via `@xenova/transformers`) | ≈ (REST)                | ≈ (REST)                               | ≈ (REST)                | ✓ (drivers)      | ✓ (parsers)            | ✓ (multi-language)       |
| F2 CLI                                 | —                         | ≈ (`curl`)              | ✓                     | ✓                         | ≈                     | —                         | ✓                                         | —                       | —                                      | —                       | ✓                | ≈                      | ✓                        |
| F3 Microservice                        | ✓ (paid API)              | ✓ (public endpoint)     | —                     | ≈                         | ✓                     | ✓                         | ≈ (self-host)                             | ✓                       | ✓                                      | ✓                       | ✓                | —                      | ≈                        |
| F4 Static web prototype                | ✓ (web UI)                | ✓ (query.wikidata.org)  | ≈ (try.lean)          | —                         | ≈                     | —                         | ≈                                         | ✓                       | ✓                                      | ✓                       | ✓ (Bloom)        | —                      | ≈                        |
| F5 Interpretation pipeline             | ≈ (NL parse)              | —                       | —                     | ✓ (relation triples)      | ✓ (entity URIs)       | —                         | ≈ (paraphrase)                            | ≈ (LLM)                 | ≈ (LLM)                                | —                       | —                | —                      | —                        |
| F6 Formal levels                       | ≈ (knows when computable) | —                       | ✓ (proof obligations) | —                         | —                     | —                         | —                                         | —                       | —                                      | —                       | —                | —                      | —                        |
| F7 Exact arithmetic                    | ✓                         | —                       | ✓ (proof / SMT sat)   | —                         | —                     | —                         | —                                         | ≈ (LLM)                 | —                                      | —                       | —                | —                      | —                        |
| F8 Real-world evidence                 | ✓ (entity facts)          | ✓                       | —                     | —                         | ≈ (entity URIs only)  | —                         | —                                         | ✓ (cited)               | ✓ (meta)                               | ✓ (ClaimReview)         | —                | ≈ (PROV-O is a schema) | —                        |
| F9 Correctness + signed confidence     | ≈ (True/False answers)    | —                       | ≈ (sat/unsat)         | ≈ (extraction confidence) | —                     | ≈ (similarity %)          | —                                         | ≈ (per-source citation) | ✓ (Consensus Meter ↔ signedConfidence) | ≈ (truth label)         | —                | —                      | —                        |
| F10 Formalize → markdown/Lino/HTML/CST | ≈ (Wolfram input form)    | —                       | ✓ (proof script)      | ≈ (triples)               | ✓ (annotations)       | —                         | —                                         | —                       | —                                      | —                       | —                | ✓ (JSON-LD)            | ✓ (Lino)                 |
| F11 Translate via formalized entities  | ≈ (Wolfram Translate)     | ✓ (sitelinks / labels)  | —                     | —                         | ≈ (language editions) | —                         | —                                         | ≈ (multilingual chat)   | —                                      | ≈ (Wikipedia editions)  | —                | —                      | —                        |
| F12 /check (fact-check)                | ≈ (computable check)      | ≈ (SPARQL)              | —                     | —                         | —                     | —                         | —                                         | ≈ (citations)           | ✓ (consensus per claim)                | ✓ (ClaimReview)         | —                | ≈ (PROV)               | —                        |
| F13 /uniqueness (originality)          | —                         | —                       | —                     | —                         | —                     | ✓                         | ✓                                         | ≈                       | —                                      | —                       | —                | —                      | —                        |
| F14 Preference profiles                | —                         | —                       | —                     | —                         | —                     | ≈ (course-level settings) | ≈                                         | ≈ (custom prompts)      | ≈ (filters)                            | —                       | —                | —                      | —                        |
| F15 Links Notation export              | —                         | ✓ (Turtle/JSON exports) | ≈ (script export)     | ≈ (triples)               | ✓ (RDF)               | —                         | —                                         | —                       | —                                      | ≈ (JSON-LD)             | ✓ (Cypher dumps) | ✓                      | ✓ (native)               |
| F16 Issue-report URL prefilled         | —                         | —                       | —                     | —                         | —                     | —                         | —                                         | —                       | —                                      | —                       | —                | —                      | —                        |
| F17 Rust + doublets core               | —                         | —                       | —                     | —                         | —                     | —                         | —                                         | —                       | —                                      | —                       | ✓ (Rust drivers) | ≈                      | ✓ (doublets-rs)          |

## 3. Measured competitor quality gates

Issue #114 adds recurring measured gates for the harvested competitor datasets
from issue #26. The machine-readable score fixture is
[`js/tests/fixtures/competitor-quality-gates.json`](../js/tests/fixtures/competitor-quality-gates.json),
and the CI gate runs
[`js/tests/integration/issue-114-competitor-quality-gates.test.js`](../js/tests/integration/issue-114-competitor-quality-gates.test.js)
through `npm run test:acceptance` and the JS workflow's no-regression
acceptance step.

As measured on 2026-05-26: **26/26 enabled cases passing**,
**26/36 total harvested cases executable**, **72.2% executable coverage**.

| Dataset                             | Comparable sources                             | Enabled pass score | Executable coverage | Gated status |
| ----------------------------------- | ---------------------------------------------- | ------------------ | ------------------- | ------------ |
| Arithmetic kernel                   | Wolfram Alpha, Metamath, Z3, Lean, SWI-Prolog  | 10/10              | 10/10               | CI gate      |
| Wikidata structured facts           | Wikidata Query Service, Wolfram Alpha, DBpedia | 7/7                | 7/7                 | CI gate      |
| Wikidata P570 liveness              | Wikidata Query Service                         | 4/4                | 4/4                 | CI gate      |
| Self-reference and paradoxes        | Tarski/Kripke literature, Russell paradox      | 3/3                | 3/3                 | CI gate      |
| NL to logic and triple extraction   | Stanford OpenIE, AllenNLP SRL, Boxer, AMR      | deferred           | 0/4                 | #89          |
| Disputed-truth corpora              | Google Fact Check Tools, Snopes, PolitiFact    | deferred           | 0/4                 | #87          |
| Uniqueness and paraphrase           | iThenticate, SBERT                             | 1/1                | 1/2                 | CI gate, #90 |
| Knowledge representation round-trip | LinksPlatform / Doublets, ClaimReview JSON-LD  | 1/1                | 1/2                 | CI gate, #88 |

## 4. Expanded academic-writing assistant matrix

Issue #20 asks for the comparison to include projects from the
AI-writing / academic-assistant cluster directly, rather than only via
the representative columns above. This focused lens keeps the
full-feature rows but narrows the columns to the assistant products most
likely to be compared with Jenni AI.

| Feature                                | Jenni AI                                    | Elicit                                | Grammarly                         | Consensus.app                   |
| -------------------------------------- | ------------------------------------------- | ------------------------------------- | --------------------------------- | ------------------------------- |
| F1 Reusable JS library                 | —                                           | ≈ (REST API with JS examples)         | —                                 | ≈ (API by application)          |
| F2 CLI                                 | —                                           | ≈ (API examples include CLI/MCP glue) | —                                 | —                               |
| F3 Microservice                        | —                                           | ✓ (hosted API)                        | —                                 | ✓ (hosted API)                  |
| F4 Static web prototype                | ✓ (web editor)                              | ✓ (web app)                           | ✓ (web/editor/extensions)         | ✓ (web app)                     |
| F5 Interpretation pipeline             | ≈ (autocomplete + chat)                     | ≈ (paper chat / reports)              | ≈ (rewrites + Citation Finder)    | ≈ (query-to-papers search)      |
| F6 Formal levels                       | —                                           | —                                     | —                                 | —                               |
| F7 Exact arithmetic                    | —                                           | —                                     | —                                 | —                               |
| F8 Real-world evidence                 | ≈ (citations + source-controlled chat)      | ✓ (paper metadata + excerpts)         | ≈ (citation and source refs)      | ✓ (peer-reviewed citations)     |
| F9 Correctness + signed confidence     | ≈ (Claim Confidence categories)             | ≈ (relevance / screening signals)     | ≈ (originality / match score)     | ✓ (Consensus Meter)             |
| F10 Formalize → markdown/Lino/HTML/CST | ≈ (document / BibTeX export, not CST)       | ≈ (PDF/Word/CSV/BIB/RIS exports)      | ≈ (citation formatting/rewrites)  | —                               |
| F11 Translate via formalized entities  | ≈ (multilingual writing; no entity mapping) | —                                     | —                                 | —                               |
| F12 /check (fact-check)                | ≈ (Claim Confidence, not public endpoint)   | ≈ (paper-grounded review workflows)   | ≈ (integrity/citation checks)     | ✓ (yes/no literature agreement) |
| F13 /uniqueness (originality)          | ≈ (source-confidence review only)           | —                                     | ✓ (plagiarism/originality report) | —                               |
| F14 Preference profiles                | ≈ (source/language toggles)                 | ≈ (protocols, filters, columns)       | ≈ (tone/style goals)              | ≈ (filters + saved libraries)   |
| F15 Links Notation export              | —                                           | —                                     | —                                 | —                               |
| F16 Issue-report URL prefilled         | —                                           | —                                     | —                                 | —                               |
| F17 Rust + doublets core               | —                                           | —                                     | —                                 | —                               |

The focused view shows Jenni AI's closest overlap with meta-expression
is not deterministic reasoning or Links Notation export; it is the
writing-assistant side of F4, F8, F9, F12, F13, and F14. Grammarly is
the stronger direct comparison for originality scoring (F13), while
Elicit and Consensus.app are stronger comparisons for paper discovery,
evidence attachment, and literature-level confidence.

## 5. How to read F8 vs F9

The F8 ("evidence") and F9 ("correctness + signed confidence") rows do
**not** mean the same thing:

- F8 asks "does the project attach machine-readable evidence to the
  answer?" Schema.org/ClaimReview, Wikidata, and Wolfram Alpha all do.
- F9 asks "does the project also expose a per-claim _score_ that
  combines support/refutation symmetrically?" Consensus.app gets the
  highest mark because the Consensus Meter is the closest external
  analog to meta-expression's `signedConfidence`. Wolfram Alpha and Z3
  return a binary verdict only, so they sit at `≈`.

## 6. Notable gaps the matrix reveals

- **F16 (issue-report URL prefilled)** is unique to meta-expression in
  this survey. No comparable project ships a one-click "report this
  result as a GitHub issue" surface.
- **F15 (Links Notation export)** is fully native only in
  LinksPlatform/Doublets; RDF/JSON-LD reach it indirectly. Other
  systems either expose proprietary text formats (Cypher dumps,
  Wolfram input form) or rely on JSON.
- **F11 (translate via formalized entities)** is currently strongest
  in Wikidata sitelinks, but Wikidata does not expose a `/translate`
  endpoint; meta-expression wraps the sitelinks/labels into a
  sentence-level translation surface that no other project ships
  out of the box.
- **F7 (exact arithmetic) and F8 (evidence)** combined is meta-expression's
  defining intersection: Wolfram Alpha covers both but charges for the
  API and is closed-source; Wikidata covers F8 but not F7; Z3 and
  Coq/Lean cover F7 but not F8.
- **Academic-writing assistants** (Jenni AI, Elicit, Grammarly, and
  Consensus.app) cluster around citations, source review, originality,
  and literature synthesis. None of them expose meta-expression's
  prefilled issue-report state, Links Notation export, or Rust/doublets
  persistence surface.

## 7. Competitor-derived follow-up issues

Canonical ledger: `docs/case-studies/issue-71/MISSING-FEATURES.md`.

Issue #71 turns the refreshed competitor gaps into focused child issues:
[#87](https://github.com/link-assistant/meta-expression/issues/87) for
ClaimReview / Schema.org interchange,
[#88](https://github.com/link-assistant/meta-expression/issues/88) for
PROV-O / JSON-LD provenance export,
[#89](https://github.com/link-assistant/meta-expression/issues/89) for
OpenIE / AMR / SRL formalization inputs,
[#90](https://github.com/link-assistant/meta-expression/issues/90) for
document-level originality reporting,
[#91](https://github.com/link-assistant/meta-expression/issues/91) for
literature-review evidence workflows,
[#92](https://github.com/link-assistant/meta-expression/issues/92) for
SPARQL and graph exports,
[#93](https://github.com/link-assistant/meta-expression/issues/93) for
formal proof and solver artifacts, and
[#94](https://github.com/link-assistant/meta-expression/issues/94) for browser
and editor assistant surfaces.

Existing sibling issues stay linked to the parity work: #72 executes harvested
competitor and formal-ai corpora as tests, #73 tracks the formal-ai
compatibility contract, and #74 keeps generalized algorithms from regressing
already-supported examples.

## 8. How this matrix is maintained

1. When a new feature lands in meta-expression, add a row to §1 and a
   column-by-column assessment in §2.
2. When a comparable project ships a relevant feature, update the
   corresponding cell and bump the `Last checked` date.
3. When pricing changes, update
   [`COMPARISON-CONCEPTS.md`](./COMPARISON-CONCEPTS.md) and the
   current issue-specific raw research log, most recently
   [`docs/case-studies/issue-71/ONLINE-RESEARCH.md`](./case-studies/issue-71/ONLINE-RESEARCH.md).
4. When a competitor exposes a shipped feature meta-expression lacks, file a
   focused child issue and update
   [`docs/case-studies/issue-71/MISSING-FEATURES.md`](./case-studies/issue-71/MISSING-FEATURES.md).

The [`docs/case-studies/issue-26/`](./case-studies/issue-26/) folder
records the baseline audit trail per row; issue-specific refreshes record the
current delta.
