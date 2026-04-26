# Online Research Notes: Issue #1

Research date: 2026-04-26

The issue explicitly asked for online research into existing components and
libraries. This file records the primary sources used and the conclusions drawn
from them.

## Wikidata and Public Knowledge

| Source                                                                                       | Notes for meta-expression                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Reuse)                         | The data access page distinguishes WDQS, REST/API access, search, and dumps. It warns that WDQS is best for scoped queries and not suitable for broad text/fuzzy search or large result sets. |
| [Wikidata SPARQL query service](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service) | WDQS is the structured query path for evidence retrieval once entity/property IDs are known.                                                                                                  |

### Recommendation

Use Wikidata search or the Wikibase/API layer to find candidate entities and
properties. Use WDQS only after the statement has been narrowed to a selected
interpretation with known Q/P identifiers. Defer Wikipedia text extraction until
the structured evidence path works.

## Rust, WebAssembly, and Browser Integration

| Source                                                              | Notes for meta-expression                                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [wasm-pack](https://github.com/wasm-bindgen/wasm-pack)              | Official Rust-to-WASM workflow tool for packages that interoperate with JavaScript in browser or Node workflows.                            |
| [wasm-bindgen guide](https://rustwasm.github.io/docs/wasm-bindgen/) | Provides bindings for high-level Rust/WASM and JavaScript interaction, including richer types than raw numeric WebAssembly imports/exports. |

### Recommendation

Keep reasoning and links-network primitives in Rust, expose a WASM API for the web app,
and use TypeScript wrappers for UI integration. Use Web Workers for expensive
operations or optional local model inference.

## Links-network UI and Algorithms

| Source                                    | Notes for meta-expression                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [React Flow](https://reactflow.dev/learn) | React-native visual editor toolkit that can render links-network views if adapted away from its native terminology. |
| [Cytoscape.js](https://js.cytoscape.org/) | Mature interactive visualization and analysis library that can render links-network projections in browser views.   |

### Recommendation

Use React Flow if the first UI is an editor/playground with selectable links and
custom cards. Use Cytoscape.js if links-network layout complexity becomes more
important than React component composition.

## Controlled Natural Language and Formalization

| Source                                                                   | Notes for meta-expression                                                                                                                                                                                              |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Attempto/APE](https://github.com/Attempto/APE)                          | Parser for Attempto Controlled English. APE translates controlled English into Discourse Representation Structures and other logical forms; useful as a mature reference for ambiguity control and formal translation. |
| [Grammatical Framework](https://www.grammaticalframework.org/)           | Programming language for multilingual grammar applications, with projects using abstract syntax as interlingua and natural-language interfaces to formal proofs.                                                       |
| [Common Logic Controlled English](https://www.jfsowa.com/clce/specs.htm) | English-like notation for first-order logic; useful as a design reference for readable formal statements.                                                                                                              |

### Recommendation

Do not attempt unrestricted natural-language-to-logic in the MVP. Borrow the
controlled-language lesson: explicit syntax and user confirmation are more
reliable than hidden parser guesses. The first prototype should accept any
input but only execute supported formal fragments.

## Logic, Solvers, and Probabilistic Reasoning

| Source                                                                       | Notes for meta-expression                                                                                                                                   |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ProbLog documentation](https://problog.readthedocs.io/en/latest/)           | Probabilistic logic programming reference with probabilistic facts, annotated disjunctions, clauses, queries, evidence, and inference modules.              |
| [Z3 theorem prover](https://github.com/Z3Prover/z3)                          | SMT solver with WebAssembly/TypeScript/JavaScript package availability through `z3-solver`. Useful for future formal equivalence and satisfiability checks. |
| [SWI-Prolog WASM](https://www.swi-prolog.org/pldoc/man?section=wasm-version) | SWI-Prolog can run in the browser via WebAssembly, which is relevant if Prolog-like rules become useful in the playground.                                  |

### Recommendation

Use `relative-meta-logic` first because it is already aligned with Links
Notation and the issue's probability model. Keep ProbLog, Z3, and SWI-Prolog
WASM as design references or optional later engines for specific fragments.

## Semantic Web Interoperability

| Source                                                                 | Notes for meta-expression                                                                            |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [RDF/JS data model specification](https://rdf.js.org/data-model-spec/) | JavaScript interface standard for RDF terms and quads, intended to make RDF libraries interoperable. |
| [W3C OWL](https://www.w3.org/OWL/)                                     | OWL 2 specifications define ontology language structure, semantics, profiles, and syntaxes.          |

### Recommendation

Keep Links Notation as the native representation, but design import/export
adapters so statement links networks can later interoperate with RDF/OWL tools.

## Links Theory Terminology

| Source                                                                          | Notes for meta-expression                                                                                         |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [`link-foundation/meta-theory`](https://github.com/link-foundation/meta-theory) | The Links Theory archive defines links networks as the native model and treats other visual forms as projections. |

### Recommendation

Use "links network", "link", and "relation link" in product APIs and docs.
External visualization or algorithm libraries can still be evaluated, but they
must be hidden behind links-network adapters.

## In-Ecosystem Repository Captures

Raw metadata and READMEs were saved for:

| Repository                                                                                      | Captured files                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`link-foundation/lino-arguments`](https://github.com/link-foundation/lino-arguments)           | [`lino-arguments.json`](./data/repositories/lino-arguments.json), [`lino-arguments-readme.md`](./data/repositories/lino-arguments-readme.md)                     |
| [`link-foundation/links-notation`](https://github.com/link-foundation/links-notation)           | [`links-notation.json`](./data/repositories/links-notation.json), [`links-notation-readme.md`](./data/repositories/links-notation-readme.md)                     |
| [`link-foundation/relative-meta-logic`](https://github.com/link-foundation/relative-meta-logic) | [`relative-meta-logic.json`](./data/repositories/relative-meta-logic.json), [`relative-meta-logic-readme.md`](./data/repositories/relative-meta-logic-readme.md) |
| [`linksplatform/doublets-rs`](https://github.com/linksplatform/doublets-rs)                     | [`doublets-rs.json`](./data/repositories/doublets-rs.json), [`doublets-rs-readme.md`](./data/repositories/doublets-rs-readme.md)                                 |
| [`link-assistant/human-language`](https://github.com/link-assistant/human-language)             | [`human-language.json`](./data/repositories/human-language.json), [`human-language-readme.md`](./data/repositories/human-language-readme.md)                     |
| [`link-assistant/model-in-browser`](https://github.com/link-assistant/model-in-browser)         | [`model-in-browser.json`](./data/repositories/model-in-browser.json), [`model-in-browser-readme.md`](./data/repositories/model-in-browser-readme.md)             |
| [`link-assistant/calculator`](https://github.com/link-assistant/calculator)                     | [`calculator.json`](./data/repositories/calculator.json), [`calculator-readme.md`](./data/repositories/calculator-readme.md)                                     |
| [`link-foundation/meta-theory`](https://github.com/link-foundation/meta-theory)                 | [`meta-theory.json`](./data/repositories/meta-theory.json), [`meta-theory-readme.md`](./data/repositories/meta-theory-readme.md), archived article captures      |

## Search Gaps

- No closed PRs existed in `link-assistant/meta-expression` at analysis time.
- `gh search code` found Links Notation usage in `calculator`, `hive-mind`,
  `agent`, and `web-capture`, but no direct `relative-meta-logic` usage inside
  `link-assistant` repositories.
- The first implementation should still inspect the current versions of these
  dependencies before adding package manifests, because package versions can
  change quickly.
