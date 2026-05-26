# Formal AI Compatibility Contract

> Last checked: 2026-05-26.
> Downstream: [formal-ai](https://github.com/link-assistant/formal-ai)
> formal-ai v0.123.0,
> commit `39530ef2e71f787561f9252b72032eb81e329c3e`.

This contract defines what meta-expression keeps stable so formal-ai can use it
as a symbolic foundation while meta-expression remains useful as a standalone
library, CLI, service, web prototype, and Rust/WASM core.

formal-ai exposes OpenAI-shaped Chat Completions and Responses interfaces. The
meta-expression side of that contract is lower level: it must keep
formalization, transformation, naturalization, reasoning, probability, evidence,
and Links Notation exchange predictable enough that formal-ai can wrap them in
its assistant surfaces without adding hidden neural inference or hidden state.

## Contract Principles

- **OpenAI-shaped boundary**: downstream assistant APIs may speak
  `/v1/chat/completions`, `/v1/responses`, roles, messages, responses, models,
  status, and token usage, but meta-expression primitives stay deterministic
  and symbolic.
- **Lino-native exchange**: every durable semantic artifact must be representable
  as Links Notation or as data that can regenerate Links Notation without
  losing link ids, references, provenance, roles, versions, or source spans.
- **WASM-buildable core**: Rust functionality intended for browser or formal-ai
  reuse must remain compatible with the `wasm-bindgen` package and the
  JavaScript `loadWasmCore()` wrapper.
- **Additive evolution**: new fields may be added, but existing JSON,
  TypeScript, Links Notation, CLI, service, web, and Rust/WASM fields should not
  be removed or renamed without a tracked breaking-change issue.
- **Explicit unknowns**: unsupported text, incomplete formal expressions, and
  missing evidence stay partial or unknown. LLM suggestions, user preferences,
  and source weights must be explicit inputs, not hidden truth sources.

## Surface Matrix

| Surface      | Entry points                                                                                                                                  | Input contract                                                                                                    | Output contract                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Library      | `analyzeStatement`, `formalizeTextWith`, `translateTextWith`, `naturalizeExpressionWith`, `deformalizeExpressionWith`, `rewriteLinksNotation` | Human text, selected interpretations, transformation rules, belief profiles, source options, optional RML hook    | Structured result, confidence/correctness/probability, evidence, CST/AST metadata, Links Network records, Markdown/HTML/Links Notation where applicable      |
| CLI          | `analyze`, `formalize`, `translate`, `check`, `fact-check`, `uniqueness`                                                                      | Positional or `--input` text, `--format`, `--live`, language, source, override, article, score, and profile flags | JSON for machine use, Links Notation for Lino-native exchange, Markdown/HTML for rendered surfaces, nonzero exit on command/runtime errors                   |
| Microservice | `GET`/`POST /analyze`, `/formalize`, `/translate`, `/check`, `/fact-check`, `/uniqueness`, plus `/health`                                     | Query parameters or JSON bodies matching the CLI/library options                                                  | HTTP JSON by default; route `format` options expose Links Notation, Markdown, or HTML without changing the underlying semantic records                       |
| Static web   | Analyse, Compare, Check, Uniqueness, Formalize, Translate, Preferences                                                                        | Browser text input, selected interpretation, local belief/preference controls, source/link-target controls        | Same semantic payloads as the library surfaced as UI state, report URLs, local storage state, worker results, Links Notation, Markdown, HTML, CST, and steps |
| Rust         | `meta-expression-core`, `wasm-bindgen` package, `loadWasmCore()` wrapper, Rust unit/integration fixtures                                      | UTF-8 text, typed Rust structs, deterministic transformation and metadata helpers                                 | WASM-safe JSON/string values, selected analysis fields, Links Notation, semantic translation helpers, parser metadata, cache/batch-planning helpers          |

## Operation Contract

### formalize

`formalizeTextWith()` is the canonical JavaScript formalization entry point.
It accepts text plus source, override, context, and hook options, and returns a
CST rich enough for downstream tools to regenerate Markdown and Links Notation.
The CST must keep phrase ids, source spans, selected entity ids, source URLs,
candidate information, contexts, parser metadata, linguistic fragments, and
relation records stable as additive data.

Rust mirrors the deterministic metadata subset through
`extract_linguistic_metadata()` and related WASM-safe helpers. Rust and
JavaScript do not need byte-identical internal structures, but overlapping
public fields must preserve the same meaning.

### transform

Transformation starts as ordered text/object hook phases and
Links Notation rewrite helpers. The supported hook shapes are function rules,
object rules with `apply`, declarative text replacements, and declarative
object assignments. A rule that changes a value must be traceable through a
step record with phase, rule id, and before/after summary.

The long-term target is a parser-backed Links Notation rewrite engine. Until
that lands, existing hook names and the `rewriteLinksNotation` /
`simplifyLinksNotation` helpers remain compatibility anchors.

### naturalize

Naturalization and deformalization are aliases for the same public behavior.
JavaScript exposes `naturalizeExpressionWith()` and
`deformalizeExpressionWith()`; translation results expose both
`naturalization` and `deformalization` views. Rust exposes the matching
deterministic deformalization alias for semantic translations.

Naturalized output must keep text, CST, semantic links, and Links Notation in
sync after transformation hooks run.

### reason

Reasoning covers interpretation selection, formalization-level description,
exact computable evaluation, evidence-scored real-world claims, formal
reasoning summaries, dependency records, and relative-meta-logic adapter
mapping. Computable expressions may return exact truth or numeric answers.
Real-world claims must return bounded evidence estimates with visible support,
refutation, source, retrieval time, and calculation inputs.

Unsupported reasoning stays explicit through unknowns, refinement suggestions,
or partial-formalization output.

### translate

Translation is a consumer of formalization plus transformation plus
naturalization. It must keep source phrase ids, target meaning ids, semantic
links, questions for unresolved parts, trace steps, and sentence-level rendered
output. Formal AI prompt translation support in English, Russian, Hindi, and
Chinese is covered by the upstream corpus fixture and parity tests.

### probability and evidence

Probability calculations must name their strategy, input values, truth range,
valence, deterministic/bounded status, and evidence items. Legacy
`result.confidence` and `result.rawBalance` stay available while newer
`correctness`, `signedConfidence`, `probability`, and `calculation` fields are
used for richer clients.

## Release Tracking

When formal-ai publishes a new release, update this file if the shared
contract changes:

1. Record the latest formal-ai tag, commit, commit date, and release date.
2. Regenerate or verify `js/tests/fixtures/formal-ai-test-corpus.json` when
   upstream test identities changed.
3. Run the formal-ai corpus and parity tests that map upstream cases to local
   assertions or explicit skip reasons.
4. Confirm that library, CLI, service, web, and Rust/WASM surfaces still expose
   the operation contract above.
5. File a child issue for any newly unsupported downstream requirement rather
   than hiding it in a skip reason.

The latest checked downstream release is:

| Repository                 | Release    | Commit                                     | Release date         |
| -------------------------- | ---------- | ------------------------------------------ | -------------------- |
| `link-assistant/formal-ai` | `v0.123.0` | `39530ef2e71f787561f9252b72032eb81e329c3e` | 2026-05-26T00:50:47Z |

## Verification Anchors

- `js/tests/fixtures/formal-ai-test-corpus.json` pins the upstream formal-ai
  corpus at `v0.123.0`.
- `js/tests/integration/issue-54-formal-ai-corpus.test.js` verifies the pinned
  upstream test identities and Formal AI prompt translation behavior.
- `js/tests/integration/issue-72-parity.test.js` requires each upstream test
  identity to have either local coverage or an explicit skip reason.
- `js/tests/integration/issue-61-wasm.test.js` verifies the JavaScript wrapper
  over the Rust WASM package.
- `rust/tests/unit/issue54_formal_ai.rs`,
  `rust/tests/unit/issue70_reasoning_metadata.rs`, and
  `rust/tests/integration/issue61_wasm_surface.rs` cover the Rust side of the
  shared compatibility surface.

## Deferred Or App-Specific Areas

The following formal-ai behaviors are intentionally not promised by
meta-expression itself:

- assistant-specific dialogue memory and app shell behavior;
- Telegram bot transport behavior;
- Docker runtime and formal-ai release workflow behavior;
- proof-assistant UX beyond the formal reasoning and relative-meta-logic
  adapter surfaces;
- browser-only formal-ai UI state that is not expressible through shared
  symbolic artifacts.

When any of those areas needs a shared primitive, the primitive should be added
to this contract before formal-ai relies on it.
