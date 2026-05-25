# Roadmap

This roadmap turns the requirements from issues #1, #5, #18, and the
formal-ai era (#43/#48/#50/#52/#54/#56) into incremental implementation
slices. The current goal is a real, inspectable playground that keeps every
statement, interpretation, evidence item, result, preference, and refinement
traceable as links with provenance — and that grows into a "solid foundation
for [formal-ai](https://github.com/link-assistant/formal-ai), but also
available as a tool in itself" (issue #58).

For a single-page view of where each vision pillar stands and which issue
tracks the remaining work, see
[`IMPLEMENTATION-STATUS.md`](./IMPLEMENTATION-STATUS.md). Each phase below now
carries a **Status** marker (`done` / `partial` / `not started`).

## Current Slice

Shipped through issue #56 (the full list of surfaces now in the codebase —
see [`docs/case-studies/issue-58/CODE-AUDIT.md`](./case-studies/issue-58/CODE-AUDIT.md)):

- Library, CLI, microservice, and static web surfaces (7 web pages).
- Deterministic interpretation and selection pipeline.
- Formalization levels 1–4 with labels and an executable gate.
- Exact arithmetic equality and arithmetic question evaluation.
- Bounded `correctness` (0..1) and `signedConfidence` (-1..+1) metrics.
- Live Wikimedia evidence resolver (P36/P397/P398/P570) with a browser worker,
  plus fixture evidence and the `Moon -> Earth -> Sun` parent-body chain.
- `/formalize` (Markdown/Lino/HTML/CST), `/translate` (formalize → semantic
  meta-language → naturalize), `/check` (`/fact-check`, red→green), and
  `/uniqueness` (web + scholarly APIs).
- `/preferences` profile with worldview, religion, context presets, local
  persistence, and Links Notation import/export.
- Links Notation parser **and** serializer (`js/src/lino.js`), linguistic
  AST/CST metadata, transformation hooks (before/after phases), and
  naturalization/deformalization aliasing.
- Formal-AI prompt translation (en/ru/hi/zh) and upstream-corpus tracking
  (706 case IDs as a fixture).
- Prefilled GitHub issue reporting with interpretations, Q/P reasoning traces,
  evidence, and Links Notation.
- Rust core with `doublets` relation-link encoding, issue #52 translation
  coverage, Wikimedia cache/batch planning, and a C ABI (WASM-ready
  crate type, but no `wasm-bindgen` packaging yet).

### Known blockers (planned in issue #58)

The audit found foundation problems that block the vision and are tracked as
issues opened from #58: template `package.json` identity, no WASM build, no
official `links-notation`/`lino-arguments` adoption, no `relative-meta-logic`
integration (computation is arithmetic-only), fixture-driven formalization,
and the upstream corpus being tracked but not executed.

## Phase 1: Stabilize Public Surfaces

> Status: **partial** — all four surfaces ship with tests, but package
> metadata is still the template placeholder (issue #58 foundation fix).

Goal: make the current JavaScript API, CLI, service, and web prototype reliable
while Rust parity grows.

- Add child-process CLI tests, including `--live` with mocked fetch.
- Add microservice tests for sync and live analysis modes.
- Add JSON and Links Notation fixtures for all concrete acceptance examples.
- Keep TypeScript declarations aligned with runtime exports.
- Rename package metadata from template placeholders once release settings are
  confirmed.

Exit criteria:

- Library, CLI, service, and web all expose the same analysis shape.
- Fixture snapshots can catch accidental schema drift.

## Phase 2: Rust Core and WebAssembly

> Status: **partial** — the Rust core and parity fixtures exist, but there is
> no `wasm-bindgen` packaging yet, so the web app cannot call the Rust core.

Goal: move deterministic reasoning and links operations into Rust.

- Expand `rust` structs for links, relation links, evidence, belief
  systems, formalizations, and results.
- Add parity tests between JavaScript fixtures and Rust outputs.
- Add `wasm-bindgen` packaging once the repository installs the WASM target.
- Expose WASM functions for draft creation, selection, formalization,
  evaluation, confidence, and Links Notation serialization.
- Keep JavaScript wrappers stable for browser and package consumers.

Exit criteria:

- Rust and JavaScript return equivalent results for the acceptance examples.
- Browser code can call the Rust core through WASM without changing user-facing
  behavior.

## Phase 3: Live Wikimedia Evidence

> Status: **partial** — live P36/P397/P398/P570 templates resolve in a worker;
> cancellation/backoff, persistent cache, and scoped WDQS remain.

Goal: replace fixture-only evidence with scoped live retrieval.

- Keep evidence fetching in a worker for browser responsiveness.
- Support selected statement templates first:
  - person alive/dead through P570,
  - direct and parent-chain astronomical body through P397,
  - capital through P36,
  - instance/subclass after the first three are stable.
- Add request cancellation, retry/backoff, explicit timeout state, and unknown
  state.
- Add persistent cache with retrieval timestamps.
- Add scoped WDQS queries only after entity/property IDs are known.

Exit criteria:

- Live evidence can support and refute selected claims with Q/P identifiers,
  source URL, retrieval time, and confidence inputs visible to the user.

## Phase 4: Links Notation Persistence

> Status: **partial** — a hand-rolled parser/serializer (`js/src/lino.js`) and
> import/export exist; the official `links-notation` dependency and durable
> persistence are not adopted yet.

Goal: make Links Notation the human-readable storage and exchange format.

- Add the real `links-notation` parser/formatter dependency.
- Define canonical shapes for statement links, interpretation links,
  formalization links, evidence links, result links, belief links, preference
  profile links, and report snapshots.
- Add import/export tests.
- Store small local state as Links Notation text.
- Keep JSON as an API convenience wrapper only.

Exit criteria:

- A reported Links Notation payload can be imported and reproduce the same
  statement, interpretation, evidence, and result.

## Phase 5: Doublets Storage

> Status: **not started** — only the Rust `doublets` encoding foundation
> exists; durable save/load and Unicode sequences remain.

Goal: move durable state from JavaScript objects to associative binary links.

- Map link IDs, references, roles, scalar values, provenance, and versions into
  Doublets.
- Represent Unicode strings as sequences of character links.
- Add save/load tests for statement and evidence links.
- Add export/import for portable case data.
- Keep a migration path for current fixtures.

Exit criteria:

- Statement and evidence links survive save/load without losing identity,
  references, provenance, Unicode text, or version history.

## Phase 6: Relative Meta Logic

> Status: **not started** — computation is the arithmetic-only evaluator;
> `relative-meta-logic` is not integrated (the central full-computability gap).

Goal: replace local arithmetic-only evaluation with the intended formal logic
engine where it fits.

- Inspect the current `relative-meta-logic` repository API before adding it.
- Map formalization levels to supported RML inputs.
- Support arithmetic equality, basic boolean expressions, computability checks,
  exact result extraction, and probability primitives.
- Preserve explicit unknown/refinement output for unsupported expressions.

Exit criteria:

- Computable expressions are evaluated through RML or a documented adapter.
- Unsupported expressions remain partial rather than silently guessed.

## Phase 7: Belief and Formal-System Configuration

> Status: **partial** — web preference/context profiles and source weights
> exist; promotion to CLI/service and symbol/operator overrides remain.

Goal: make confidence and formal semantics reproducible.

- Add built-in profiles: default scientific, math only, user first, and
  Wikidata structured.
- Promote context presets and preference profiles from web-only controls to the
  CLI and service APIs.
- Expose source weights in CLI, service, and web.
- Add symbol/operator overrides for formal systems.
- Add custom belief-system files.
- Include selected profile and weights in issue reports and Links Notation.

Exit criteria:

- Users can reproduce a confidence value from visible evidence and weights.
- Exact math depends on the selected formal system, not hidden assumptions.

## Phase 8: Interpretation and Refinement

> Status: **partial** — deterministic top-3 interpretations and selection
> exist; provider interface, top-N, clustering, refinement, and standalone
> entity-reference mode remain.

Goal: improve ambiguity handling while keeping user selection explicit.

- Add provider interface for deterministic rules, optional LLM candidates, and
  user-provided candidates.
- Add top-N configuration and equivalence clustering.
- Add refinement actions for subject, relation, time, place, and scope.
- Version each refinement as a new statement link.
- Add standalone entity-reference mode for inputs such as `Elon Musk`.

Exit criteria:

- Users select or refine before formal execution.
- LLM output is never counted as truth evidence.

## Phase 9: React GitHub Pages App

> Status: **not started** — the web app is still the static prototype; it
> depends on the Phase 2 WASM build.

Goal: replace the static prototype with the requested React experience.

- Add TypeScript + React build.
- Use WASM core through a small TypeScript wrapper.
- Build views for statement input, interpretation selection, refinement,
  confidence/result, links, provenance/evidence, and Links Notation
  import/export.
- Add Playwright smoke tests and screenshots.
- Keep the first screen as the usable playground.

Exit criteria:

- The app works on GitHub Pages with deterministic offline behavior and live
  evidence when network access succeeds.

## Phase 10: Wikipedia Text Evidence

> Status: **not started** — Wikipedia text is used by the translation-quality
> gate, but candidate-claim evidence extraction is not implemented.

Goal: extract candidate confirmations/refutations from Wikipedia text without
turning free text into unverified truth.

- Use Wikidata sitelinks to select relevant Wikipedia pages.
- Fetch summaries or scoped sections in the worker.
- Extract candidate claims with provenance.
- Require deterministic validation or user confirmation before scoring.
- Store extracted text evidence separately from structured Wikidata evidence.

Exit criteria:

- Wikipedia text can suggest evidence candidates, but only validated claims
  affect confidence.

## Explicitly Deferred

- Full natural-language understanding.
- Complete ambiguity coverage.
- Perfect probability semantics.
- Unbounded Wikipedia traversal.
- Treating LLM output as factual evidence.
- General programming language execution.
- Full multilingual translation.
- Large-scale optimization before schemas and persistence are stable.
