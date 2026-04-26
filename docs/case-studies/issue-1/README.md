# Case Study: Issue #1 - First Prototype

**Issue:** [link-assistant/meta-expression#1](https://github.com/link-assistant/meta-expression/issues/1)
**Title:** First prototype
**Status:** Analysis complete, implementation plan proposed
**Created:** 2026-04-26
**Analysis date:** 2026-04-26

## Executive Summary

Issue #1 asks for a functional playground that bridges natural language,
formal reasoning, evidence retrieval, probability estimation, and graph
visualization. The requested product surface is broad: library, CLI,
microservice, and GitHub Pages static web app. The requested technical stack is
Rust, WebAssembly, React, Links Notation, Relative Meta Logic, Doublets, and
Wikidata/Wikipedia-backed evidence.

The practical MVP should not attempt general natural-language understanding or
complete fact checking. It should instead implement a narrow graph-first
pipeline:

```text
input text
  -> interpretations
  -> selected interpretation
  -> formalization level
  -> dependency/evidence graph
  -> computable result or confidence estimate
  -> playground visualization
```

The strict MVP from the issue is achievable if the first prototype supports
only math/basic logic, a small set of Wikidata evidence queries, naive weighted
support/refute probability, and manual/user-confirmed interpretation selection.

## Data Collected

Raw data was captured under [`data/`](./data/):

| File                                                                    | Purpose                                            |
| ----------------------------------------------------------------------- | -------------------------------------------------- |
| [`issue-1.json`](./data/issue-1.json)                                   | Full issue title, body, labels, author, timestamps |
| [`issue-comments.json`](./data/issue-comments.json)                     | Issue comments; empty at analysis time             |
| [`pr-2.json`](./data/pr-2.json)                                         | Prepared PR metadata before implementation         |
| [`meta-expression-repo.json`](./data/meta-expression-repo.json)         | Repository metadata                                |
| [`meta-expression-file-tree.txt`](./data/meta-expression-file-tree.txt) | Local repository file inventory                    |
| [`repositories/`](./data/repositories/)                                 | Metadata and READMEs for referenced repositories   |

The current repository is still close to the JavaScript package template. Its
source contains sample arithmetic functions and tests, while the issue requests
product research and planning rather than a direct bug fix.

## Referenced In-Ecosystem Components

| Component                                                                                       | Role in issue                              | Case-study finding                                                                                                                          |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [`link-foundation/lino-arguments`](https://github.com/link-foundation/lino-arguments)           | CLI argument/config layer                  | Provides JavaScript and Rust configuration helpers with CLI, environment, config-file, and default priority order.                          |
| [`link-foundation/links-notation`](https://github.com/link-foundation/links-notation)           | Internal and external representation       | Multi-language parser/serializer for graph-like links notation across JavaScript, Rust, C#, Python, Go, and Java.                           |
| [`link-foundation/relative-meta-logic`](https://github.com/link-foundation/relative-meta-logic) | Formal/probabilistic logic engine          | Already models probabilities over Links Notation, many-valued logic, arithmetic, and dependent-type-like constructs in JavaScript and Rust. |
| [`linksplatform/doublets-rs`](https://github.com/linksplatform/doublets-rs)                     | Persistent graph/link storage              | Rust link-store implementation with file-mapped storage, query patterns, and FFI support.                                                   |
| [`link-assistant/human-language`](https://github.com/link-assistant/human-language)             | Wikidata entity/property mapping reference | Demonstrates text-to-Q/P transformation, search, disambiguation, caching, and Wikidata-oriented UI patterns.                                |
| [`link-assistant/model-in-browser`](https://github.com/link-assistant/model-in-browser)         | Browser LLM/WASM reference                 | Demonstrates Rust WASM, React, Web Worker model inference, and GitHub Pages deployment constraints.                                         |
| [`link-assistant/calculator`](https://github.com/link-assistant/calculator)                     | Computable-expression reference            | Demonstrates a Rust WASM + React expression calculator with Links Notation output and GitHub Pages deployment.                              |

## External Research Findings

The online research points to these useful external references:

| Area                | Useful references                                                                                                                                                        | Relevance                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Wikidata access     | [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Reuse), [WDQS](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service)                                | Use entity search/API for lookup and scoped SPARQL for evidence; avoid broad WDQS scans.                                 |
| Rust/WebAssembly    | [wasm-pack](https://github.com/wasm-bindgen/wasm-pack), [wasm-bindgen guide](https://rustwasm.github.io/docs/wasm-bindgen/)                                              | Fit for exporting Rust core logic to browser and JavaScript package consumers.                                           |
| Graph UI            | [React Flow](https://reactflow.dev/learn), [Cytoscape.js](https://js.cytoscape.org/), [Graphology](https://graphology.github.io/)                                        | Candidate libraries for visual graph editing, graph analysis, and browser rendering.                                     |
| Controlled language | [Attempto/APE](https://github.com/Attempto/APE), [Grammatical Framework](https://www.grammaticalframework.org/)                                                          | Existing approaches for controlled natural language, formal translation, multilingual grammars, and ambiguity reduction. |
| Logic/probability   | [ProbLog](https://problog.readthedocs.io/en/latest/), [Z3](https://github.com/Z3Prover/z3), [SWI-Prolog WASM](https://www.swi-prolog.org/pldoc/man?section=wasm-version) | Useful design references or optional engines for probabilistic logic, SMT solving, and browser-side logic execution.     |
| Semantic web        | [RDF/JS data model](https://rdf.js.org/data-model-spec/), [W3C OWL](https://www.w3.org/OWL/)                                                                             | Useful interoperability targets when moving beyond Links Notation into RDF/OWL ecosystems.                               |

See [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md) for source notes.

## Product Requirements Summary

The full requirement extraction is in
[`REQUIREMENTS.md`](./REQUIREMENTS.md). The requirements fall into these
groups:

1. Product surfaces: library, CLI, microservice, and static web playground.
2. Core representation: every statement, interpretation, dependency,
   evidence item, and computation result is a versioned graph node or edge.
3. Input handling: accept human-language text, generate multiple
   interpretations, cluster/normalize them, and ask the user to select or
   refine before formal execution.
4. Formalization: move statements through explicit levels from raw text to
   structured graph, partial formal expression, and fully computable
   expression.
5. Reasoning: evaluate computable expressions exactly; estimate confidence for
   real-world statements using evidence, provenance, and weighted
   support/refute edges.
6. Evidence: use Wikidata structured data first, then Wikipedia-derived claims
   later, with provenance on every claim.
7. UI: show paraphrases and examples before raw logic; visualize dependencies,
   dependents, confirmations, refutations, and probability.
8. Scope guardrails: no full NLU, perfect probability, complete ambiguity
   coverage, or large-scale graph optimization in the first prototype.

## Proposed Architecture

### Packages

The repository can start as a monorepo with these modules:

| Module     | Runtime          | Responsibility                                                                       |
| ---------- | ---------------- | ------------------------------------------------------------------------------------ |
| `core`     | Rust             | Statement graph, formalization levels, probability model, Links Notation conversion. |
| `wasm`     | Rust/WASM        | Browser bindings for `core`.                                                         |
| `web`      | React/TypeScript | GitHub Pages playground, interpretation selector, graph visualization.               |
| `cli`      | Rust or Node.js  | Command-line entry point using `lino-arguments`.                                     |
| `service`  | Rust or Node.js  | Thin HTTP wrapper around the same core pipeline.                                     |
| `examples` | Mixed            | Reproducible scenarios: arithmetic, simple logic, Wikidata-backed fact claim.        |

### Core Data Types

The first prototype should define stable schemas before building UI features:

| Type               | Required fields                                                                         |
| ------------------ | --------------------------------------------------------------------------------------- |
| `StatementNode`    | `id`, `text`, `formalizationLevel`, `selectedInterpretationId`, `version`, `provenance` |
| `Interpretation`   | `id`, `statementId`, `paraphrase`, `examples`, `confidence`, `source`                   |
| `StatementEdge`    | `id`, `source`, `target`, `kind`, `weight`, `provenance`                                |
| `EvidenceClaim`    | `id`, `statementId`, `polarity`, `sourceUrl`, `sourceType`, `weight`, `retrievedAt`     |
| `BeliefSystem`     | `id`, `name`, `sourceWeights`, `defaultLogic`, `probabilityStrategy`                    |
| `EvaluationResult` | `statementId`, `kind`, `value`, `probability`, `explanation`, `dependencies`            |

Links Notation should be the canonical exchange format, with JSON wrappers only
where needed for web APIs and tests.

### Pipeline

1. Normalize input text and create a level-1 raw statement node.
2. Generate three candidate interpretations using deterministic rules first,
   then optional LLM suggestions.
3. Cluster/merge near-equivalent interpretations and present paraphrases to the
   user.
4. Convert the selected interpretation into a level-2 graph and, when possible,
   a level-3 or level-4 formal expression.
5. If level 4, evaluate with the local calculator/RML engine.
6. If not level 4, retrieve scoped Wikidata evidence and attach support/refute
   edges.
7. Compute naive confidence for MVP:

```text
confidence = clamp(weighted_support / (weighted_support + weighted_refute))
```

If both support and refute totals are zero, return `unknown`, not `50%`.

8. Visualize the statement, selected interpretation, dependencies, evidence,
   and confidence.

## MVP Plan

### Phase 0: Repository Foundation

- Rename package metadata from template placeholders to `meta-expression`.
- Add Rust workspace, web app, and shared schema fixtures.
- Keep the existing JavaScript template release pipeline until the Rust/WASM
  release path is defined.

### Phase 1: Schema and Fixtures

- Define Links Notation and JSON fixtures for statements, interpretations,
  edges, evidence, and results.
- Add examples for `1 + 1 = 1`, `1 + 1 = 2`, and one Wikidata-backed claim.
- Add round-trip tests for Links Notation serialization.

### Phase 2: Core Reasoning MVP

- Integrate or wrap `relative-meta-logic` for simple math/basic logic.
- Implement formalization levels and computability checks.
- Implement the naive probability strategy over support/refute evidence.

### Phase 3: Input and Interpretation MVP

- Implement deterministic interpretation generation for math and basic logic.
- Add optional LLM interpretation provider behind an explicit interface.
- Require user selection before formal execution when multiple candidates exist.

### Phase 4: Evidence MVP

- Implement Wikidata entity/property search and narrowly scoped WDQS queries.
- Store evidence claims with URL, Q/P identifiers, retrieval time, and weight.
- Defer Wikipedia text extraction until Wikidata-only evidence is stable.

### Phase 5: Playground Surfaces

- Build React UI with input, interpretation selector, result panel, and graph
  visualization.
- Export the same pipeline through CLI and microservice wrappers.
- Deploy static web app to GitHub Pages with WASM artifacts.

## Risk Analysis

| Risk                                            | Impact                              | Mitigation                                                                           |
| ----------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| General NLU is too broad                        | Prototype becomes untestable        | Treat unrestricted input as interpretation suggestions plus explicit user selection. |
| Probability semantics become misleading         | Users confuse confidence with truth | Label as confidence, show supporting/refuting evidence and source weights.           |
| Wikidata queries become expensive or incomplete | Slow UI and unreliable evidence     | Use entity search and narrowly scoped SPARQL; cache results; expose unknown states.  |
| Ambiguity explosion                             | Graph and UI become unreadable      | Limit top-k interpretations, cluster equivalents, and prune by relevance/weight.     |
| LLM hallucination                               | False formalizations/evidence       | LLMs may propose candidates but never count as sources of truth.                     |
| Browser WASM/model size                         | GitHub Pages UX degrades            | Keep core deterministic path small; make browser model optional.                     |

## Open Questions

1. Which first non-English language should be supported after English?
2. Should the microservice be Rust-native or a Node.js wrapper around WASM?
3. Should browser LLM inference be included in MVP, or should the first MVP use
   deterministic rules only?
4. What is the default source reliability table for Wikidata, Wikipedia, user
   assertions, and computed expressions?
5. Should evidence be persisted locally in Doublets during MVP, or can MVP use
   in-memory graph storage with export/import first?

## Recommended First Implementation Target

Build a vertical slice around three inputs:

| Input                  | Expected result                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `1 + 1 = 2`            | Fully computable expression, probability/confidence `100%`, no external evidence needed.              |
| `1 + 1 = 1`            | Fully computable expression, probability/confidence `0%`, no external evidence needed.                |
| `Earth orbits the Sun` | Non-computable real-world claim, Wikidata-backed evidence graph, confidence estimate with provenance. |

This slice exercises interpretation, formalization levels, exact computation,
evidence retrieval, confidence estimation, and dependency visualization without
requiring full natural-language understanding.

## Conclusion

The issue describes a long-term reasoning platform, but the first prototype
should be a constrained playground with explicit user choice, transparent graph
state, and narrow evidence retrieval. The most important implementation
decision is to make graph/provenance/versioning the stable core now, while
keeping LLMs, Wikipedia extraction, richer probability propagation, and
large-scale graph optimization as replaceable later layers.
