# Solution plan for issue #26

This plan mirrors the requirements list in
[`REQUIREMENTS.md`](./REQUIREMENTS.md). File paths are anchored to the
repository root.

## Phase 1 — Concept comparison doc

Touches: `docs/COMPARISON-CONCEPTS.md`.

1. Group entries by concept. The seven concept clusters are anchored on
   meta-expression's existing surfaces (`/analyze`, `/formalize`,
   `/translate`, `/check`, `/uniqueness`) plus the persistence layer
   (`Links Notation` + `doublets`).
2. For each entry, record name, URL, license, pricing in USD (or
   "Quote-based" when no public price exists), and the meta-expression
   concept it overlaps. Sources are captured in
   [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md) §A.
3. The doc opens with a front matter line `> Last checked: 2026-05-11`
   and a "How to update" section that points contributors at this case
   study.

Tests: none directly (markdown). The doc participates in
`tests/documentation.test.js` which lints document headings; the new
file follows the existing pattern.

## Phase 2 — Feature comparison doc

Touches: `docs/COMPARISON-FEATURES.md`.

1. Build the feature axis from the README capability list (library,
   CLI, microservice, static web; `analyze`, `formalize`, `translate`,
   `check`, `uniqueness`, preference profiles, Links Notation export,
   doublets storage). Add one row per first-party feature.
2. Build the project axis from the seven concept clusters' projects.
3. Use the legend `✓` / `≈` / `—` / `✗` defined in R26.5. The legend
   is explained inline so the doc remains self-contained.
4. The doc closes with a "How this matrix is maintained" footer that
   points at this case study.

Tests: `tests/issue-26-comparable-fixtures.test.js` includes a
documentation sanity check that the comparison file exists and the
expected legend symbols are documented.

## Phase 3 — Canonical test-case catalogue

Touches: `docs/case-studies/issue-26/TEST-CASES.md`,
`tests/issue-26-comparable-fixtures.test.js`.

1. Harvest fixtures from comparable projects' public docs:
   - **Arithmetic kernel** — `1 + 1 = 2`, `2 + 2 = 4`, `2 * 3 = 6`,
     `10 - 4 = 6` (Wolfram Alpha, Metamath `2p2e4`, Z3, Lean,
     SWI-Prolog), false counter-parts to keep the negation pair.
   - **Computable contradiction** — `1 + 1 = 1`, `2 + 2 = 5` (Z3
     unsat, Wolfram Alpha "False").
   - **Wikidata structured facts** — `Earth orbits the Sun`,
     `Moon orbits Earth`, `Paris is the capital of France`,
     `Berlin is the capital of Germany`, `Berlin is the capital of
France` (Wikidata P36, P398).
   - **Liveness via P570** — `Elon Musk is alive`, `Ada Lovelace is
dead`, `Albert Einstein is dead` (Wikidata P570).
   - **Self-reference** — `this statement is false`,
     `this statement is true` (Liar paradox; meta-expression marks
     undetermined).
   - **Disputed-truth corpus** — `5G causes coronavirus`,
     `Einstein failed math in school` (Google Fact Check ClaimReview,
     Snopes; correctness band only).
2. `TEST-CASES.md` records each fixture as a table row with:
   - Source project (Wikidata, Metamath, Wolfram Alpha, Z3, ClaimReview,
     Snopes, etc.)
   - Input string (exact)
   - Expected output in the source system (e.g. Metamath "proved",
     Wolfram Alpha "2", Z3 "sat").
   - Expected meta-expression behavior (`result.correctness` band,
     `result.signedConfidence` band, supported/refuted evidence
     status).
3. `tests/issue-26-comparable-fixtures.test.js` covers the subset
   meta-expression already supports (arithmetic, liveness templated
   examples, capital templated examples, self-reference) and uses
   `it.skip` (via test-anywhere) with explanatory titles for fixtures
   that depend on roadmap phases not yet shipped.

## Phase 4 — Case study deliverables

Touches: `docs/case-studies/issue-26/README.md` (this case study),
`REQUIREMENTS.md`, `SOLUTION-PLAN.md`, `ONLINE-RESEARCH.md`,
`TEST-CASES.md`, `data/issue-26.json`, `data/issue-26-body.md`.

1. Mirror the issue-21 layout: README → REQUIREMENTS → SOLUTION-PLAN →
   ONLINE-RESEARCH → companion docs.
2. Use the same scope statement style and "outcome" framing so future
   contributors can grep for the pattern.
3. Cross-link the four files into a navigable web from
   `docs/case-studies/issue-26/README.md`.

## Phase 5 — Library survey

Touches: `docs/case-studies/issue-26/ONLINE-RESEARCH.md` §D.

1. Enumerate libraries considered for each meta-expression feature
   surface (e.g. `wikibase-sdk`, `wikipedia` (npm), `nock`, `msw`,
   `@xenova/transformers`, `sentence-transformers`).
2. Each row records license, last-checked version, and a one-line
   verdict (`adopt`, `defer`, `reject`) with rationale. The verdict
   column states whether the library is already in use, planned for
   adoption in a future phase, or explicitly rejected (e.g.
   license clash, scope creep).

## Phase 6 — Documentation & PR hygiene

Touches: `docs/REQUIREMENTS.md` (optional follow-up only),
PR #33 description.

1. PR description links to the four new docs, the test file, and this
   case study; it also includes the R26.x checklist.
2. Project-wide `docs/REQUIREMENTS.md` is left unchanged in this PR
   because the new surfaces stay under `docs/` and do not change any
   public API contract. A follow-up issue tracks adding R49.x for
   "comparison docs maintained per release" if the team wants the
   matrix to be a release gate.

## Existing libraries surveyed

See [`ONLINE-RESEARCH.md`](./ONLINE-RESEARCH.md) §D for full notes; the
short list:

- **`wikibase-sdk`** (MIT) — typed Wikidata API helper. Rejected in
  issue #21; recorded here for context as we keep our hand-rolled
  client.
- **`wikipedia` (npm)** (MIT) — convenient REST wrapper. Rejected for
  the same reason.
- **`sentence-transformers`** / **`@xenova/transformers`** (Apache-2.0)
  — semantic similarity for uniqueness. Deferred until the roadmap
  enters a phase that requires fuzzy paraphrase scoring.
- **`@wikimedia/codex`** (GPL-2.0-or-later) — design system; rejected
  due to license clash with our MIT base.
- **`nock` / `msw`** (MIT) — HTTP mocking. Rejected: existing
  `makeFetch(routes)` fixture is sufficient.
- **`prov-js`** (MIT) — PROV-O / PROV-JSON-LD serializer. Deferred:
  potentially adopted once `result.evidence.provenance` migrates from
  ad hoc dicts to a W3C-aligned schema.
