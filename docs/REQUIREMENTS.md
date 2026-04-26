# Requirements

This is the canonical requirements inventory for the meta-expression
prototype. It consolidates:

- [Issue #1](https://github.com/link-assistant/meta-expression/issues/1)
- [Issue #5](https://github.com/link-assistant/meta-expression/issues/5)
- [PR #6 feedback](https://github.com/link-assistant/meta-expression/pull/6#issuecomment-4322346610)

## Terminology

First-class code and documentation should use Links Theory terminology:
`links network`, `link`, `relation link`, `reference`, `Links Notation`,
`provenance`, and `version`. External libraries may use their own words, but
repository APIs, UI labels, and product docs should translate them at the
boundary.

## Requirement Matrix

| ID  | Requirement                                                  | Scope | Current status                                                                                                           | Plan                                                                                                            |
| --- | ------------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| R1  | Provide a reusable library.                                  | MVP   | JavaScript API exposes draft creation, analysis, confidence, reporting, and Links Notation output.                       | Keep the JS API stable while moving core primitives into Rust and WASM.                                         |
| R2  | Provide a CLI.                                               | MVP   | Node.js CLI supports JSON and Links Notation output.                                                                     | Replace ad hoc parsing with `lino-arguments`; support config files, live evidence mode, and belief profiles.    |
| R3  | Provide a microservice.                                      | MVP   | HTTP service exposes health and analyze routes.                                                                          | Add endpoint separation for interpret, formalize, evaluate, evidence, and export/import.                        |
| R4  | Provide a GitHub Pages static web app.                       | MVP   | Static playground exists under `web/`.                                                                                   | Replace static JS with React after WASM bindings are stable.                                                    |
| R5  | Use Rust plus WebAssembly plus React on web.                 | MVP   | Rust core workspace now exists and is `cdylib`-ready for WASM; web remains static JS.                                    | Add `wasm-bindgen` packaging and a React/TypeScript app that calls the Rust core.                               |
| R6  | Use `lino-arguments` in CLI.                                 | MVP   | Tracked; not integrated yet.                                                                                             | Add it when CLI config grows beyond current flags.                                                              |
| R7  | Use `links-notation` for internal and external data.         | MVP   | Serializer prototype exists.                                                                                             | Add real parser/formatter dependency and persist local state as Links Notation.                                 |
| R8  | Use `relative-meta-logic` for formalization and computation. | MVP   | Local arithmetic evaluator is a temporary narrow slice.                                                                  | Add an adapter once the dependency API is selected; keep local evaluator only as fallback.                      |
| R9  | Use `doublets-rs` for associative links operations.          | MVP   | Rust core uses the `doublets` crate for relation-link doublet encoding.                                                  | Extend from encoding helpers to durable Doublets-backed storage.                                                |
| R10 | Accept any human-language input conservatively.              | MVP   | All input creates a raw statement link; unsupported claims remain partial or unknown.                                    | Add controlled-language and provider interfaces without pretending unsupported input is fully understood.       |
| R11 | Generate multiple interpretations and require selection.     | MVP   | Deterministic top-3 interpretations and selected interpretation links exist.                                             | Add top-N configuration, equivalence clustering, user-provided candidates, and optional LLM candidate provider. |
| R12 | Bound the role of LLMs.                                      | MVP   | LLM output is not used as truth evidence.                                                                                | Use LLMs only for candidate interpretations, refinements, and draft formal structures.                          |
| R13 | Support explicit formalization levels.                       | MVP   | Levels 1-4 have names, summaries, and executable flags.                                                                  | Preserve the gate: only fully computable expressions execute locally.                                           |
| R14 | Evaluate computable expressions exactly.                     | MVP   | Arithmetic equality and arithmetic question expressions work.                                                            | Move these computations into Rust/RML and broaden only with tests.                                              |
| R15 | Treat question expressions separately from truth statements. | MVP   | `1 + 1` returns a computed answer.                                                                                       | Add entity lookup, evidence lookup, and dependency-explanation question shapes.                                 |
| R16 | Support configurable belief and formal systems.              | MVP   | Source weights and local user evidence are represented.                                                                  | Add operator semantics, symbol dictionaries, source reliability profiles, and custom strategy files.            |
| R17 | Avoid absolute confidence for real-world facts.              | MVP   | Real-world confidence is bounded away from 0% and 100%.                                                                  | Keep exact 0%/100% only for deterministic computations in an explicit formal system.                            |
| R18 | Calculate confidence with visible evidence.                  | MVP   | Weighted support/refute confidence and raw balance exist.                                                                | Add dependency-aware strategies and show all inputs needed to reproduce the number.                             |
| R19 | List confirmations and refutations.                          | MVP   | Supporting and refuting evidence are relation links with provenance.                                                     | Add richer candidate inference from selected statement templates.                                               |
| R20 | Use Wikipedia/Wikidata for public knowledge.                 | MVP   | Fixture evidence exists; live Wikimedia resolver supports liveness, capital, and direct or parent-chain orbit templates. | Harden live retrieval, add scoped WDQS, and later extract validated Wikipedia text claims.                      |
| R21 | Check alive/dead claims through Wikidata P570.               | MVP   | Live resolver and fixture path both model P570.                                                                          | Treat present P570 as support for dead/refutation for alive; absence as bounded support for alive only.         |
| R22 | Interpret entity-name inputs.                                | Next  | Claim templates search entity labels when resolving live evidence.                                                       | Add standalone entity-reference mode for inputs such as `Elon Musk`.                                            |
| R23 | Represent implied statements and dependencies.               | MVP   | Arithmetic parts, Q/P phrase mappings, reasoning steps, and evidence mappings are relation links.                        | Add source-weight and belief-system dependency extraction.                                                      |
| R24 | Show statements that depend on the current statement.        | Next  | Not implemented yet.                                                                                                     | Add reverse relation-link queries once persistence exists.                                                      |
| R25 | Support self-reference without false certainty.              | MVP   | `this statement is false` is undetermined at 50% confidence.                                                             | Add more paradox and self-reference templates only with explicit tests.                                         |
| R26 | Add continuous user-belief sliders.                          | MVP   | Web slider maps false/unknown/true to local evidence.                                                                    | Add named belief profiles and source-weight controls.                                                           |
| R27 | Persist user beliefs locally.                                | MVP   | Current slider state is stored in `localStorage`.                                                                        | Move larger state to Links Notation text, IndexedDB, or Doublets-backed storage.                                |
| R28 | Store human-readable state in Links Notation.                | MVP   | Links Notation export exists.                                                                                            | Add parser-backed import/export and local persistence.                                                          |
| R29 | Work internally with binary links for durable storage.       | Next  | Rust `doublets` foundation exists.                                                                                       | Map strings, scalar values, roles, provenance, and versions into Doublets.                                      |
| R30 | Support Unicode strings as link sequences.                   | Next  | Tracked from issue #5.                                                                                                   | Implement Rust sequence/tree encoding compatible with LinksPlatform references.                                 |
| R31 | Traverse Wikimedia data in a worker thread.                  | MVP   | Browser worker fetches live evidence after initial render.                                                               | Add cancellation, backoff, IndexedDB cache, and progress events.                                                |
| R32 | Infer support/refutation candidates.                         | Next  | Template inference supports liveness, capital, and orbit claims, including bounded parent-body chains.                   | Add controlled property templates before broad extraction.                                                      |
| R33 | Provide many prepared examples.                              | MVP   | Example buttons cover math, evidence, question, and self-reference cases.                                                | Expand examples as algorithms become real rather than fixture-only.                                             |
| R34 | Make issue reporting easy.                                   | MVP   | Prefilled GitHub issue link includes statement, interpretations, result, evidence, reasoning trace, and Links Notation.  | Include live evidence status, belief profile, and browser worker errors.                                        |
| R35 | Keep UI natural-language first.                              | MVP   | Interpretation paraphrases appear before formal details.                                                                 | Keep raw formal output behind secondary/details views.                                                          |
| R36 | Collect case-study data for each issue.                      | MVP   | Issue #1 and #5 case-study folders contain captured data, screenshots, and research notes.                               | Keep future issue analyses under `docs/case-studies/issue-{id}`.                                                |
| R37 | Search current component/library data before implementation. | MVP   | Case studies and this PR record current package/crate facts.                                                             | Re-check versions before adding new dependencies because ecosystem state changes.                               |
| R38 | Do not overclaim the MVP.                                    | MVP   | Docs separate implemented slices from roadmap work.                                                                      | Keep guardrails explicit: no full NLU, no perfect probability, no unbounded Wikipedia traversal.                |

## Concrete Acceptance Examples

The prototype must keep these examples working:

- `1 + 1 = 2`: fully computable and true in the default arithmetic system.
- `1 + 1 = 1`: fully computable and false in the default arithmetic system.
- `1 + 1`: an arithmetic question whose answer is `2`.
- `Earth orbits the Sun`: evidence-backed real-world claim with provenance.
- `Moon orbits the Sun`: evidence-backed parent-body chain
  `Moon -> Earth -> Sun` with Q/P reasoning links.
- `Elon Musk is alive`: bounded liveness claim using Wikidata P570.
- `this statement is false`: self-reference marked undetermined.
- `Paris is the capital of France`: live Wikimedia evidence template.

## Current Guardrails

- Unsupported natural-language input must stay partial or unknown.
- Real-world confidence must be labeled confidence, not truth.
- User beliefs and LLM suggestions must be explicit inputs, not hidden truth
  sources.
- Every computed result or evidence estimate should remain traceable through
  links, references, provenance, and versioned state.
