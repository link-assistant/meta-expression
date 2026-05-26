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

Shipped through issue #96 / PR #107 (the full list of surfaces now in the
codebase — see
[`docs/case-studies/issue-58/CODE-AUDIT.md`](./case-studies/issue-58/CODE-AUDIT.md)
and
[`IMPLEMENTATION-STATUS.md`](./IMPLEMENTATION-STATUS.md)):

- Library, CLI, microservice, and static web surfaces (7 web pages); the CLI
  now parses arguments with the official `lino-arguments` dependency (#62).
- Deterministic interpretation and selection pipeline.
- Formalization levels 1–4 with labels and an executable gate, generalized so
  arbitrary text reaches structured meaning links (#64) with OpenIE/AMR/SRL
  providers (#89).
- Exact arithmetic equality and arithmetic question evaluation, with computable
  expressions routed through the `relative-meta-logic` adapter (#69).
- Bounded `correctness` (0..1) and `signedConfidence` (-1..+1) metrics, with
  reproducible probability from visible evidence (#68).
- Entailment/contradiction/dependency reasoning (#67) and a Links Notation
  rewrite engine for transformations (#65).
- Live Wikimedia evidence resolver (P36/P397/P398/P570) with a browser worker,
  plus fixture evidence and the `Moon -> Earth -> Sun` parent-body chain.
- `/formalize` (Markdown/Lino/HTML/CST), `/translate` (formalize → semantic
  meta-language → naturalize), `/check` (`/fact-check`, red→green), and
  `/uniqueness` (web + scholarly APIs).
- `/preferences` profile with worldview, religion, context presets, local
  persistence, and Links Notation import/export.
- Official `links-notation` parser **and** serializer (#62), parser-backed
  linguistic AST/CST metadata (#70), transformation hooks, and generalized
  naturalization/deformalization (#66).
- An id-keyed semantic interlingua (`js/data/semantic-lexicon.json`, 328
  concepts across en/hi/ru/zh) so translation routes source-form → concept id →
  target-form with no hardcoded language-pair tables in `src`, guarded by tests
  (#96 / PR #107).
- Formal-AI prompt translation (en/ru/hi/zh) and the upstream corpus (706 cases)
  executed as a real parity gate (#72) plus a no-regression acceptance gate
  (#74).
- Competitor-parity surfaces: ClaimReview import/export (#87), JSON-LD/PROV-O
  provenance (#88), document-level originality reports (#90), literature-review
  workflows (#91), scoped SPARQL + graph-store interchange (#92), proof/solver
  artifact adapters (#93), and writing-assistant surfaces (#94).
- Prefilled GitHub issue reporting with interpretations, Q/P reasoning traces,
  evidence, and Links Notation.
- Rust core with `doublets` relation-link encoding, durable doublets-backed
  storage with Unicode sequences (#63), issue #52 translation coverage,
  Wikimedia cache/batch planning, a C ABI, and a `wasm-bindgen` package in
  `rust/pkg/` (#61).

### Foundation blockers (fixed in issues #60–#63)

The audit found foundation problems that blocked the vision; all are now
resolved: package identity (`meta-expression`, #60), the `wasm-bindgen` build
(#61), the official `links-notation`/`lino-arguments` adoption (#62), and
durable `doublets`-backed storage with Unicode sequences (#63). The
`relative-meta-logic` adapter is integrated (#69) and the upstream corpus is
executed as a parity gate (#72).

### Next batch (planned in issue #58 follow-up)

The 2026-05-26 feedback on PR #59 sets the next batch: a fully reconstructed
intermediate semantic meta language with all linguistic detail made explicit,
a unified on-demand Wikipedia/Wikidata/Wiktionary data source, no hardcoded data
(rule-based automatic overrides only), real
[`doublets-rs`](https://github.com/linksplatform/doublets-rs) /
[`doublets-web`](https://github.com/linksplatform/doublets-web) backing,
multi-language grammar checking, and competitor datasets as quality gates. See
the [Next Batch](#next-batch-quality-and-the-reconstructed-meta-language)
phase below and
[`docs/case-studies/issue-58/NEXT-BATCH.md`](./case-studies/issue-58/NEXT-BATCH.md).

## Phase 1: Stabilize Public Surfaces

> Status: **done** — all four surfaces ship with tests and the package metadata
> now publishes the `meta-expression` identity (#60).

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

> Status: **done** — the Rust core, parity fixtures, and a `wasm-bindgen`
> package in `rust/pkg/` ship (#61); the static web app can call the Rust core
> through the generated bindings.

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

> Status: **done** — the official `links-notation` parser/formatter dependency
> is adopted (#62) and import/export round-trips through it; the remaining
> next-batch work is unifying the semantic meta-language store on real
> `doublets-rs`/`doublets-web` (R58.27/R58.28).

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

> Status: **done** — portable case data saves/loads link ids, references,
> roles, scalar values, provenance, versions, and Unicode-sequence strings
> through the doublets binary store (#63). The next-batch work replaces the
> hand-rolled JS store with real `doublets-rs`/`doublets-web` (R58.27/R58.28).

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

> Status: **partial** — `relative-meta-logic-adapter.js` routes computable
> expressions to the RML engine and keeps the arithmetic evaluator as a
> documented fallback (#69); broadening the supported expression set is ongoing.

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

> Status: **not started** — the web app is still the static prototype. The
> Phase 2 WASM build it depends on now ships (#61), so this phase is unblocked.

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

## Next Batch: Quality and the Reconstructed Meta-Language

> Status: **not started** — planned from the 2026-05-26 feedback on PR #59 as
> the next batch of issues under epic #58. Quality first; optimizations later.
> Full analysis in
> [`docs/case-studies/issue-58/NEXT-BATCH.md`](./case-studies/issue-58/NEXT-BATCH.md).

Goal: make the intermediate semantic meta language carry **all** of a source
text's meaning and linguistic detail, store and operate it on real
`doublets-rs`/`doublets-web`, and drive translation/naturalization quality from
that reconstruction rather than from the source text or hardcoded tables.

- **Unified on-demand term data source (R58.26)** — merge Wikipedia, Wikidata,
  and Wiktionary into one virtual source resolved per term on demand (never
  bulk-loaded). Cache both the original requests/responses and the merged
  result as Links Notation / binary links, recording what merged from where,
  how, and into what so the merge is inspectable and reusable.
- **`doublets-rs` meta-language store (R58.27)** — replace the hand-rolled JS
  doublets port with the real `doublets-rs` crate as the canonical Rust store
  for the meta language and the unified data cache.
- **`doublets-web` meta-language store (R58.28)** — back the browser/web app
  with `doublets-web` over the same binary-links model through WASM.
- **No hardcoded data; rule-based overrides (R58.29)** — derive lexicon and
  translation data from the unified source; allow only rule-based, automatic
  overrides, with per-concept overrides permitted solely when a concept is used
  in more than 50% of formalizations/naturalizations/translations.
- **Full explicit linguistic metadata (R58.30)** — at the formalization stage,
  reconstruct the meta language completely for each source text and make every
  implicit relation explicit (which word refers to what, which noun phrase and
  verb phrase relate to which, and all other linguistic detail).
- **Multi-language grammar checking (R58.31)** — Grammarly-class grammar
  checking across all supported languages, built on the explicit meta language.
- **Competitor dataset quality gates (R58.32)** — adopt competitor tests and
  test datasets as CI quality gates and deepen the comparison matrices.
- **Highest-quality translation umbrella (R58.33)** — drive translation and
  naturalization quality from the fully reconstructed interlingua, not the
  source text.

Exit criteria:

- Translation and naturalization read only from the reconstructed meta language
  and the unified, cached term data; no hardcoded language-pair data remains.
- The meta language records every linguistic relation needed to regenerate and
  grammar-check the text in any supported language.

## Explicitly Deferred

- Full natural-language understanding.
- Complete ambiguity coverage.
- Perfect probability semantics.
- Unbounded Wikipedia traversal.
- Treating LLM output as factual evidence.
- General programming language execution.
- Full multilingual translation.
- Large-scale optimization before schemas and persistence are stable.
