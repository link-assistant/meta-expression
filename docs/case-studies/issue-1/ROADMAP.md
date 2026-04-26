# Roadmap: Issue #1 First Prototype

This roadmap tracks everything needed after the first deterministic prototype.
The product terminology is links-theory terminology: links network, link,
relation link, reference, Links Notation, provenance, and version.

## Current Prototype

Implemented in this pull request:

- Library API:
  - `createStatementDraft(input)`
  - `analyzeStatement(input, options)`
  - `serializeLinksNotation(linksNetwork)`
  - `computeEvidenceConfidence(evidenceItems)`
- CLI:
  - JSON output
  - Links Notation output
  - interpretation selection by index
- Microservice:
  - `GET /health`
  - `GET /analyze?input=...`
  - `POST /analyze`
- Static web app:
  - input field
  - interpretation selector
  - confidence/result band
  - links-network link list
  - Links Notation output
- Reasoning slice:
  - `1 + 1 = 2` -> computed true, confidence `1`
  - `1 + 1 = 1` -> computed false, confidence `0`
  - `Earth orbits the Sun` -> Wikidata-backed fixture evidence with provenance

## Terminology Rule

Use links-network terms in all first-class APIs and docs:

| Use                         | Avoid in product terminology |
| --------------------------- | ---------------------------- |
| links network               | graph                        |
| link                        | node / vertex                |
| relation link               | edge                         |
| reference                   | endpoint                     |
| links-network visualization | graph visualization          |

External tools may internally use different terminology, but adapters must
translate to links-network language at the repository boundary.

## Phase 1: Stabilize Prototype API

Goal: make the JavaScript prototype a reliable baseline before Rust/WASM.

- Rename package metadata from template values to final project values after
  release scripts are updated.
- Add complete TypeScript declaration coverage for:
  - links network
  - link
  - relation link
  - statement draft
  - interpretation
  - formalization
  - evidence item
  - belief system
  - result
- Add JSON fixtures for the three current examples.
- Add Links Notation fixture snapshots.
- Add import/export tests:
  - JSON -> Links Notation
  - Links Notation -> internal links network once parser dependency is added
- Add CLI tests with child-process execution.
- Add microservice tests using an ephemeral port.
- Add static web smoke test with Playwright.

Exit criteria:

- All public functions have tests.
- CLI and service return the same analysis as the library.
- Static web app renders all current example inputs.

## Phase 2: Real Links Notation Integration

Goal: replace hand-written serializer assumptions with real parser/formatter
behavior.

- Add `links-notation` dependency.
- Define canonical Lino shapes for:
  - raw statement links
  - interpretation links
  - selection links
  - formalization links
  - evidence links
  - support/refute relation links
  - dependency relation links
  - result links
- Implement round-trip parsing.
- Preserve provenance and version metadata in Links Notation.
- Add compatibility fixtures shared with future Rust code.
- Document how JSON convenience output maps to Links Notation.

Exit criteria:

- Links Notation is the canonical exchange format.
- JSON is clearly documented as an API convenience wrapper.

## Phase 3: Rust Core and WebAssembly

Goal: move deterministic reasoning and links-network operations into Rust.

- Add Rust workspace:
  - `crates/core`
  - `crates/wasm`
  - `crates/cli` if the CLI moves to Rust
- Define Rust structs matching JavaScript fixtures.
- Add wasm-bindgen/wasm-pack build.
- Expose WASM functions:
  - create draft
  - select interpretation
  - formalize
  - evaluate
  - serialize Links Notation
- Keep JavaScript wrapper API stable.
- Add cross-language fixture parity tests.

Exit criteria:

- JavaScript and Rust return equivalent results for the current examples.
- Browser can run the core pipeline through WASM.

## Phase 4: Relative Meta Logic Integration

Goal: replace local arithmetic-only evaluation with the intended logic engine.

- Inspect current `relative-meta-logic` JavaScript and Rust APIs.
- Map formalization levels to RML inputs.
- Support:
  - arithmetic equality
  - basic boolean expressions
  - computability checks
  - exact result extraction
  - probability primitives already present in RML
- Keep local arithmetic evaluator as a fallback only if needed.
- Add examples that fail formalization cleanly when unsupported.

Exit criteria:

- Computable expressions are evaluated through RML or a documented adapter.
- Unsupported expressions produce partial formalization with refinement prompts.

## Phase 5: Evidence and Wikidata

Goal: replace the current Wikidata fixture with scoped live evidence loading.

- Add Wikidata entity search for selected interpretations.
- Add property mapping for a small controlled relation set:
  - parent astronomical body
  - instance of
  - subclass of
  - country
  - capital
- Add scoped WDQS query templates.
- Add caching:
  - browser IndexedDB
  - local file cache for CLI/service
  - Doublets-backed cache later
- Store evidence with:
  - source URL
  - Q/P identifiers
  - retrieval time
  - source weight
  - claim text
  - support/refute polarity
- Add timeout and unknown-result behavior.

Exit criteria:

- Evidence is loaded only after the user selects an interpretation.
- Every evidence item has provenance.
- Unknown/no-evidence states are explicit.

## Phase 6: Belief Systems and Probability

Goal: make confidence configurable and inspectable.

- Define built-in belief systems:
  - `default-scientific`
  - `math-only`
  - `wikidata-structured`
  - `local-user`
- Make source weights visible in CLI, service, and web.
- Add probability strategies:
  - weighted support ratio
  - raw support/refute balance
  - dependency-minimum
  - dependency-product
- Add support for custom belief-system files.
- Add tests for mixed support/refute evidence.
- Ensure probability is always labeled confidence.

Exit criteria:

- Users can reproduce a confidence value from visible inputs.
- LLM outputs never count as truth evidence.

## Phase 7: Interpretation and Refinement

Goal: improve ambiguity handling without hiding assumptions.

- Add provider interface:
  - deterministic provider
  - optional LLM provider
  - user-provided candidates
- Add top-N configuration.
- Add equivalence clustering:
  - exact normalized text
  - exact formal expression
  - confirmed paraphrase relation links
- Add refinement actions:
  - make subject more specific
  - choose relation
  - choose time/place/scope
  - convert to computable expression
- Version every refinement as a new statement link.

Exit criteria:

- The user selects or refines before formal execution.
- The links network records selection and refinement provenance.

## Phase 8: React GitHub Pages Playground

Goal: replace the static prototype with the requested React app.

- Add TypeScript + React web project.
- Use WASM core through a small TypeScript wrapper.
- Build views:
  - statement input
  - interpretation selector
  - refinement controls
  - result/confidence panel
  - links-network visualization
  - provenance/evidence details
  - Links Notation export/import
- Add GitHub Pages deployment workflow.
- Add Playwright tests and screenshots.
- Keep raw formal expression behind an advanced/detail view.

Exit criteria:

- The app works on GitHub Pages.
- The first screen is the usable playground, not a marketing page.

## Phase 9: Doublets Persistence

Goal: move from in-memory links to durable links storage.

- Evaluate `doublets-rs` current API.
- Define storage mapping:
  - link id
  - references
  - role/type link
  - value link for external scalar values
  - provenance links
  - version links
- Add lazy load APIs for evidence and statement neighborhoods.
- Add export/import for portable case data.
- Add migration strategy for fixture data.

Exit criteria:

- Statement/evidence links can be saved and reloaded without losing identity,
  references, provenance, or version history.

## Phase 10: Product Surfaces

Goal: make all required surfaces first-class.

- Library:
  - stable semver API
  - browser/Node compatibility
  - full type declarations
- CLI:
  - migrate argument parsing to `lino-arguments`
  - support config files, env vars, and defaults
  - support JSON and Links Notation input/output
- Microservice:
  - OpenAPI description
  - stateless endpoints
  - health and version endpoints
  - request limits and timeouts
- Static web app:
  - GitHub Pages deployment
  - import/export
  - offline deterministic mode

Exit criteria:

- All surfaces use the same core pipeline and fixtures.

## Explicitly Deferred

These are not part of the current prototype:

- Full natural-language understanding.
- Complete ambiguity coverage.
- Perfect probability semantics.
- Broad Wikidata or Wikipedia crawling.
- Wikipedia text claim extraction.
- Large-scale links-network optimization.
- General programming language execution.
- Full multilingual translation.
- Persistent user accounts or hosted storage.

## Requirement Coverage

| Requirement group      | Current PR                   | Roadmap phases |
| ---------------------- | ---------------------------- | -------------- |
| Library                | Minimal JavaScript API       | 1, 2, 3, 10    |
| CLI                    | Minimal Node CLI             | 1, 2, 10       |
| Microservice           | Minimal Node HTTP service    | 1, 10          |
| GitHub Pages app       | Static prototype files       | 8, 10          |
| Rust/WASM/React        | Documented only              | 3, 8           |
| Links Notation         | Serializer prototype         | 2              |
| Relative Meta Logic    | Documented only              | 4              |
| Doublets               | Documented only              | 9              |
| Wikidata               | Fixture with real IDs        | 5              |
| Multi-interpretation   | Deterministic top 3          | 7              |
| User selection         | API, CLI, web prototype      | 7, 8           |
| Formalization levels   | Implemented constants/result | 4              |
| Confidence/probability | Weighted support ratio       | 6              |
| Provenance/versioning  | Basic provenance             | 1, 6, 9        |
| Links-network core     | Implemented data shape       | 2, 3, 9        |
