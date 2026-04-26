# Roadmap: Issue #5 Vision Continuation

This roadmap turns the broad issue #5 request into implementable follow-up
slices. It builds on the deterministic JavaScript prototype and the additions
made in this PR.

## Current PR

Implemented now:

- Bounded confidence for real-world evidence estimates.
- Wikidata fixture evidence for `Elon Musk is alive`.
- `arithmetic-question` support for inputs such as `1 + 1`.
- `self-reference-paradox` handling for `this statement is false`.
- Local user belief evidence from web slider state.
- Prepared examples and issue-report URL generation.
- Human-readable formalization level metadata.
- Live Wikimedia evidence resolver for person liveness, capital, and orbit
  statement templates.
- Browser Web Worker that updates the links network with live evidence when the
  request succeeds.
- Rust core workspace with Doublets-backed relation-link encoding and a
  WASM-ready crate type.
- Canonical [`docs/REQUIREMENTS.md`](../../REQUIREMENTS.md) and
  [`docs/ROADMAP.md`](../../ROADMAP.md).
- Case-study data, screenshot, requirement matrix, and online research notes.

## Phase 1: Harden Live Wikimedia Evidence

Goal: turn the first live resolver into a robust evidence subsystem.

- Add request cancellation and stale-response handling.
- Add retry/backoff for temporary Wikimedia failures.
- Add persistent IndexedDB cache with retrieval timestamps.
- Add controlled claim templates for instance/subclass claims.
- Return explicit timeout/error/unknown evidence links.
- Add scoped WDQS query templates after candidate Q/P identifiers are known.

Exit criteria:

- `Elon Musk is alive` evidence comes from live selected Q/P retrieval.
- Worker failure leaves UI responsive and marks evidence as unavailable.
- Every live evidence item has source URL, identifiers, retrieval time, and
  support/refute polarity.

## Phase 2: Belief and Formal-System Configuration

Goal: make user beliefs and source reliability reproducible.

- Add editable source weights for computed, Wikidata, algorithm, and user
  evidence.
- Add named built-in systems:
  - default scientific,
  - math only,
  - user first,
  - Wikidata structured.
- Persist selected system and slider values locally.
- Include selected belief system in report URLs and Links Notation export.
- Add tests for mixed support/refute evidence under different source weights.

Exit criteria:

- Users can reproduce a confidence number from visible weights and evidence.
- User overrides are always stored as explicit links/evidence, not hidden UI
  state.

## Phase 3: Entity and Name Interpretation

Goal: handle inputs such as `Elon Musk` as entity references.

- Add deterministic name-like input detection.
- Search Wikidata candidates for selected name references.
- Present candidate entity labels/descriptions for user selection.
- Store entity-reference links separately from truth claims.
- Allow follow-up actions such as "is alive", "occupation", or "country".

Exit criteria:

- `Elon Musk` becomes a selectable person/entity reference.
- The UI does not force entity mentions into true/false statement results.

## Phase 4: Links Notation Persistence

Goal: store and reload human-readable links-network state.

- Add a real `links-notation` parser/formatter dependency.
- Define canonical Lino shapes for:
  - user beliefs,
  - formalization levels,
  - evidence payloads,
  - worker retrieval records,
  - issue-report snapshots.
- Persist small local state in Links Notation text.
- Add import/export tests.

Exit criteria:

- A reported Links Notation payload can be pasted back into the prototype and
  reproduce the same statement, interpretation, evidence, and result.

## Phase 5: Rust/Doublets Binary Storage

Goal: move from JS objects to a durable binary links representation.

- Define Rust data structures matching the JS fixture schema.
- Represent Unicode strings as sequences/trees of links.
- Map link IDs, roles, references, scalar values, provenance, and versions to
  Doublets.
- Add WASM bindings for browser use.
- Add parity tests between JS fixtures and Rust storage snapshots.

Exit criteria:

- Statement and evidence links survive save/load without losing identity,
  references, provenance, or Unicode text.

## Phase 6: Wikipedia Text Evidence

Goal: extract candidate confirmations/refutations from Wikipedia text without
making the UI brittle.

- Use Wikidata sitelinks to select relevant Wikipedia pages.
- Fetch summaries or scoped sections in the worker.
- Extract candidate claims with provenance.
- Require user or deterministic validation before scoring extracted claims.
- Store extracted text evidence separately from structured Wikidata evidence.

Exit criteria:

- Wikipedia text can suggest evidence candidates.
- Extracted claims are never treated as source-of-truth without provenance and
  validation.

## Phase 7: Question and Refinement Workflows

Goal: support more of the issue's "questions as expressions" direction.

- Add question categories:
  - arithmetic result,
  - entity lookup,
  - evidence lookup,
  - dependency explanation.
- Store question links and answer links separately from true/false claims.
- Add refinement actions for ambiguous questions.

Exit criteria:

- `1 + 1`, `Who is Elon Musk?`, and "What supports this claim?" each have
  separate formalization and result shapes.

## Explicit Non-Goals for These Phases

- Full natural-language understanding.
- Perfect truth or probability semantics.
- Unbounded Wikipedia crawling.
- Treating LLM output as factual evidence.
- Large-scale optimization before the link schema and persistence format are
  stable.
