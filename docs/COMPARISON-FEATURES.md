# Feature comparison: meta-expression vs. similar projects

> Last checked: 2026-05-12.
> Companion document: [`COMPARISON-CONCEPTS.md`](./COMPARISON-CONCEPTS.md).
> Source case study: [`docs/case-studies/issue-26/`](./case-studies/issue-26/).
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

## 3. Expanded academic-writing assistant matrix

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

## 4. How to read F8 vs F9

The F8 ("evidence") and F9 ("correctness + signed confidence") rows do
**not** mean the same thing:

- F8 asks "does the project attach machine-readable evidence to the
  answer?" Schema.org/ClaimReview, Wikidata, and Wolfram Alpha all do.
- F9 asks "does the project also expose a per-claim _score_ that
  combines support/refutation symmetrically?" Consensus.app gets the
  highest mark because the Consensus Meter is the closest external
  analog to meta-expression's `signedConfidence`. Wolfram Alpha and Z3
  return a binary verdict only, so they sit at `≈`.

## 5. Notable gaps the matrix reveals

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

## 6. How this matrix is maintained

1. When a new feature lands in meta-expression, add a row to §1 and a
   column-by-column assessment in §2.
2. When a comparable project ships a relevant feature, update the
   corresponding cell and bump the `Last checked` date.
3. When pricing changes, update
   [`COMPARISON-CONCEPTS.md`](./COMPARISON-CONCEPTS.md) and the
   raw research log
   [`docs/case-studies/issue-26/ONLINE-RESEARCH.md`](./case-studies/issue-26/ONLINE-RESEARCH.md).

The [`docs/case-studies/issue-26/`](./case-studies/issue-26/) folder
records the audit trail per row.
