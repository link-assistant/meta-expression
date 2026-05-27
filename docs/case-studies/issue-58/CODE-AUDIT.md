# Issue #58 — Code vs. Documentation Audit

> Captured: 2026-05-25 on branch `issue-58-4fd21cb80249`.
> Method: read every canonical doc (`README.md`, `docs/REQUIREMENTS.md`,
> `docs/ROADMAP.md`, `docs/COMPARISON-*.md`, `docs/FORMALIZE.md`), read the
> JavaScript and Rust sources, and ran `npm test` (76 + 154 + 41 subtests,
> 0 failures) plus targeted `grep` probes.

This audit answers the first half of issue #58 ("make sure everything in docs
is in sync with the actual state of the code") before any new issues are
opened. It records what is true today, what the docs claim, and where the two
diverge.

## 1. Test baseline

`npm test` runs three suites with no failures:

| Suite              | Subtests | Result |
| ------------------ | -------- | ------ |
| `test:unit`        | 41       | pass   |
| `test:integration` | 154      | pass   |
| `test:e2e`         | 76       | pass   |

The full log was captured during the audit to the repository's gitignored
`ci-logs/npm-test-baseline.log` (not committed, per `.gitignore`).

## 2. What is genuinely implemented (verified in source)

| Capability                                    | Evidence (file)                                        |
| --------------------------------------------- | ------------------------------------------------------ |
| Library `analyzeStatement` / draft / Lino     | `js/src/index.js`                                      |
| CLI (`analyze/formalize/translate/check/...`) | `js/src/cli.js`                                        |
| HTTP microservice                             | `js/src/server.js`                                     |
| Static web prototype (7 pages)                | `web/index.html`, `web/app.js`                         |
| Formalization levels 1–4 + executable gate    | `FORMALIZATION_LEVEL_DETAILS` in `js/src/index.js`     |
| Exact arithmetic (equality + question)        | `evaluateComputableFormalization` in `js/src/index.js` |
| `correctness` + `signedConfidence` metrics    | `estimateFromEvidence` in `js/src/index.js`            |
| Live Wikimedia evidence (P36/P397/P398/P570)  | `js/src/wikimedia-evidence.js`                         |
| `/formalize` → Markdown/Lino/HTML/CST         | `js/src/formalize.js`                                  |
| `/translate` via formalized Q/P + rules       | `js/src/translate.js`                                  |
| `/check` (`/fact-check`) red→green            | `js/src/check.js`                                      |
| `/uniqueness` over web + scholarly APIs       | `js/src/uniqueness.js`                                 |
| Preference profiles + context presets         | `js/src/preferences.js`                                |
| Links Notation parser **and** serializer      | `parseLino`/`serializeLino` in `js/src/lino.js`        |
| Linguistic metadata (AST/CST baseline)        | `js/src/linguistic-metadata.js`                        |
| Transformation hooks (before/after phases)    | `js/src/transformation-rules.js`                       |
| Naturalization / deformalization alias        | `js/src/translate.js`, `rust/src/issue52.rs`           |
| Formal AI prompt translation (en/ru/hi/zh)    | `js/src/formal-ai-prompts.js`                          |
| Rust core w/ `doublets` encoding + C ABI      | `rust/src/lib.rs`, `rust/src/issue52.rs`               |
| Formal AI upstream corpus tracking (706 IDs)  | `js/tests/fixtures/formal-ai-test-corpus.json`         |

## 3. Documentation drift found

| #   | Drift                                                                                                                                                                                                                                                                                                                                                                                 | Fix in this PR                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| D1  | `docs/ROADMAP.md` "Current Slice" still describes **PR #6** as the latest work, ignoring everything shipped through issue #56 (formalize, translate, check, uniqueness, preferences, formal-ai hooks, naturalization).                                                                                                                                                                | Refresh "Current Slice"; add per-phase status markers. |
| D2  | `docs/REQUIREMENTS.md` consolidates only issues #1/#5/#16/#18 and stops at **R49**. The formal-ai era (issues #43/#48/#50/#52/#54/#56) introduced naturalization/deformalization, linguistic AST/CST metadata, transformation hooks, the translation-quality gate, the semantic-meta-language pipeline, and upstream-corpus tracking — none of which appear as numbered requirements. | Add R50–R57 and widen the source list.                 |
| D3  | No single document tracks **overall progress toward the vision** (the formal-ai north star) or links requirements to the open plan.                                                                                                                                                                                                                                                   | Add `docs/IMPLEMENTATION-STATUS.md`.                   |
| D4  | `README.md` does not point to a status/vision tracker.                                                                                                                                                                                                                                                                                                                                | Add a pointer.                                         |

## 4. Foundation problems that block the vision

These are real blockers found while auditing; each becomes a planned issue.

| #   | Problem                                                                                                                                                                                                                                                                                                                                                                                          | Evidence                                        | Impact                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| F1  | **Package identity is still the template placeholder.** `package.json` has `name: "my-package"`, the template `description`, and a `repository.url` pointing at `link-foundation/js-ai-driven-development-pipeline-template`. `CONTRIBUTING.md` is titled "Contributing to js-ai-driven-development-pipeline-template". Yet `docs/FORMALIZE.md` instructs `import { … } from 'meta-expression'`. | `package.json`, `docs/CONTRIBUTING.md`          | The package cannot be published or consumed under the name the docs promise, contradicting "available as a tool in itself." |
| F2  | **No `wasm-bindgen` / WASM build.** The crate is `cdylib`-ready and exposes a C ABI, but there is no WASM packaging, so the web app cannot call the Rust core (R5/Phase 2 unmet).                                                                                                                                                                                                                | `rust/Cargo.toml`, no `wasm_bindgen` in `rust/` | Rust/JS parity and the React+WASM target are blocked.                                                                       |
| F3  | **`relative-meta-logic` is not integrated.** Computation is a local arithmetic-only evaluator (`evaluateArithmeticExpression`).                                                                                                                                                                                                                                                                  | `js/src/index.js`; no dependency                | "Full computability of each and every statement" is impossible with arithmetic-only evaluation.                             |
| F4  | **`lino-arguments` is not used in the CLI** (R6).                                                                                                                                                                                                                                                                                                                                                | no reference in `js/src/cli.js`                 | CLI config cannot grow into belief profiles / formal-system selection cleanly.                                              |
| F5  | **Formalization is fixture/keyword-driven, not general.** `realWorldInterpretations` keys off `knownRealWorldClaims`; arbitrary text falls back to partial/unknown.                                                                                                                                                                                                                              | `js/src/index.js`, `js/src/known-evidence.js`   | "Formalize any text and extract all metadata" is the central unmet goal.                                                    |
| F6  | **Upstream formal-ai corpus is tracked but not executed.** 706 case IDs are recorded as a fixture, not run as parity tests.                                                                                                                                                                                                                                                                      | `js/tests/fixtures/formal-ai-test-corpus.json`  | "Take all the same tests" (competitor/foundation parity) is unmet.                                                          |

## 5. Requirement status snapshot (R1–R49, pre-existing matrix)

After re-reading the sources, the existing R1–R49 statuses in
`docs/REQUIREMENTS.md` are accurate. The only true gaps relative to their
"Plan" columns are the ones above (R5 WASM, R6 lino-arguments, R7 official
`links-notation` dependency — a custom `lino.js` parser exists instead, R8
`relative-meta-logic`, R24 reverse-dependency queries, R29/R30 durable
Doublets + Unicode sequences). Everything else is implemented at the
prototype level the matrix claims.
