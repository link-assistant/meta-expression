# meta-expression

First prototype for a links-network based reasoning playground. It accepts a
human-language statement, generates selectable interpretations, formalizes the
selected meaning when possible, evaluates computable fragments, and attaches
evidence with provenance for non-computable claims.

The implementation in this PR keeps the long-term direction documented in
[`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) and
[`docs/ROADMAP.md`](docs/ROADMAP.md), while providing working library, CLI,
microservice, and static web surfaces now.

The text-formalization and translation sub-systems have an auto-generated
formalization reference at
[`docs/FORMALIZE.md`](docs/FORMALIZE.md) (regenerated from JSDoc with
`npm run docs:formalize`).

The downstream formal-ai foundation surface is tracked in
[`docs/FORMAL_AI_COMPATIBILITY.md`](docs/FORMAL_AI_COMPATIBILITY.md): the
OpenAI-shaped, Lino-native, WASM-buildable contract across library, CLI,
microservice, web, and Rust surfaces.

## Library

```js
import { analyzeStatement, serializeLinksNotation } from './js/src/index.js';

const analysis = analyzeStatement('1 + 1 = 2');

console.log(analysis.result.value); // true
console.log(analysis.result.confidence); // 1
console.log(serializeLinksNotation(analysis.linksNetwork));
```

Core exports:

- `createStatementDraft(input)` returns three interpretations and stops before
  formalization.
- `analyzeStatement(input, options)` selects an interpretation and produces a
  links network, formalization, result, confidence, and evidence.
- `serializeLinksNotation(linksNetwork)` exports the selected links network in
  a Lino-style text form.
- `getPreparedExamples()` returns the current examples shown by the static web
  prototype.
- `describeFormalizationLevel(level)` returns the level name, summary, and
  executability flag.
- `mapFormalizationToRelativeMetaLogicInput(formalization)` shows whether a
  selected formalization can be sent to the relative-meta-logic adapter.
- `createIssueReportUrl(analysis, options)` creates a prefilled GitHub issue
  URL with statement, result, evidence, and Links Notation.
- `createWikimediaEvidenceClient()` and `analyzeStatementWithLiveEvidence()`
  resolve supported real-world claims through Wikimedia APIs with cacheable
  evidence.
- `formalizeTextWith(input, options)` links phrases to Wikipedia, Wikidata, or
  fallback sources and returns Markdown, Links Notation, and a CST.
- `translateTextWith(input, options)` formalizes first, then translates
  sentences through resolved Wikidata Q/P target-language labels and explicit
  transformation rules while preserving unresolved parts as variables with
  questions and trace steps. When a contextual rule refines a target phrase,
  the result keeps the source meaning id and the refined target meaning id.
- `checkText(input, options)` detects statements in longer text, analyzes each
  statement, and returns red-to-green correctness coloring as JSON, HTML,
  Markdown, and Links Notation.
- `importClaimReviewJsonLd(input)` and `exportClaimReviewJsonLd(result)` import
  and export Schema.org ClaimReview JSON-LD for fact-check interchange.
- `exportEvidenceJsonLd(result)` and `exportEvidenceProvJsonLd(result)` export
  `/analyze` and `/check` evidence provenance as JSON-LD and a PROV-O-compatible
  JSON-LD graph while preserving Links Notation output.
- `exportScopedSparqlEvidence(result)`, `exportEvidenceRdfTriples(result)`,
  and `exportEvidencePropertyGraph(result)` project existing Q/P evidence links
  into scoped SPARQL, RDF-triple, and property-graph interchange shapes without
  changing the bounded real-world confidence calculation.
- `collectProofSolverArtifactEvidence(input, { artifacts })` normalizes Lean 4
  proof snippets and SMT-LIB solver outputs into provenance-bearing, bounded
  evidence items that can be passed to `analyzeStatement(..., { evidence })`.
- `reviewClaimAgainstLiterature(fixture)` checks a claim against screened paper
  metadata/excerpts as normal evidence links, reports literature agreement and
  uncertainty, and `exportLiteratureBibliography(result, { format })` emits
  BibTeX, RIS, or CSV bibliography data.
- `searchTextUniqueness(input, options)` searches detected statements across
  public web and scholarly APIs, returning existing-likelihood scores,
  citation/rewording suggestions, source matches, HTML, Markdown, and Links
  Notation.
- `exportPortableCaseData(input)`, `importPortableCaseData(input)`,
  `savePortableCaseToDoublets(input)`, and `loadPortableCaseFromDoublets(input)`
  preserve analysis/link-network cases as portable Doublets-backed data with
  Unicode text, link ids, references, roles, provenance, and versions.
- `loadWasmCore(options)` loads the Rust `wasm-bindgen` package and exposes
  draft creation, interpretation selection, formalization, evaluation,
  confidence, Links Notation serialization, and known semantic translation
  helpers to JavaScript callers.

Current deterministic examples:

- `1 + 1 = 2` -> computed `true`, confidence `1`.
- `1 + 1 = 1` -> computed `false`, confidence `0`.
- `1 + 1` -> arithmetic question result `2`.
- `Earth orbits the Sun` -> Wikidata-backed evidence estimate, confidence
  `0.99`.
- `Moon orbits the Sun` -> Wikidata-backed parent-body chain
  `Moon -> Earth -> Sun`, confidence `0.99`.
- `Elon Musk is alive` -> Wikidata-backed person-alive evidence estimate,
  confidence `0.99`.
- `Paris is the capital of France` -> live Wikimedia-capable country-capital
  evidence template.
- `this statement is false` -> self-reference status `undetermined`,
  confidence `0.5`.

Real-world confidence is intentionally bounded away from absolute `0%` and
`100%`; exact certainty is reserved for deterministic computable expressions.

## CLI

```bash
node js/src/cli.js analyze "1 + 1 = 2"
node js/src/cli.js analyze --input "Earth orbits the Sun" --format links
node js/src/cli.js analyze --input "Earth orbits the Sun" --format json-ld
node js/src/cli.js analyze --input "Earth orbits the Sun" --format sparql --limit 5
node js/src/cli.js analyze --input "Paris is the capital of France" --live
node js/src/cli.js formalize --input "Hawaii is a state." --format markdown
node js/src/cli.js translate --input "Hawaii is a state." --to ru --format markdown
node js/src/cli.js check --input "Earth orbits the Sun. 1 + 1 = 1." --format html
node js/src/cli.js check --input "Earth orbits the Sun." --format claim-review
node js/src/cli.js check --input "Earth orbits the Sun." --format prov-o
node js/src/cli.js fact-check --input "Paris is the capital of France." --live
node js/src/cli.js uniqueness --input "Earth orbits the Sun." --format markdown
node js/src/cli.js literature-review --fixture js/tests/fixtures/issue-91-literature-review.json --format bibtex
```

## Microservice

```bash
npm start
curl "http://127.0.0.1:3000/analyze?input=1%20%2B%201%20%3D%202"
curl "http://127.0.0.1:3000/analyze?input=Earth%20orbits%20the%20Sun&format=links"
curl "http://127.0.0.1:3000/analyze?input=Earth%20orbits%20the%20Sun&format=json-ld"
curl "http://127.0.0.1:3000/translate?input=Hawaii%20is%20a%20state.&to=ru&format=markdown"
curl "http://127.0.0.1:3000/check?input=Earth%20orbits%20the%20Sun.%201%20%2B%201%20%3D%201.&format=html"
curl "http://127.0.0.1:3000/check?input=Earth%20orbits%20the%20Sun.&format=claim-review"
curl "http://127.0.0.1:3000/check?input=Earth%20orbits%20the%20Sun.&format=prov-o"
curl "http://127.0.0.1:3000/uniqueness?input=Earth%20orbits%20the%20Sun.&format=markdown"
```

Routes:

- `GET /health`
- `GET /analyze?input=...&format=json|links|json-ld|prov-o&select=0`
- `GET /analyze?input=...&format=sparql|rdf|property-graph&limit=50`
- `GET /analyze?input=...&live=true`
- `POST /analyze` with `{ "input": "...", "format": "json" }`
- `GET /formalize?input=...&format=json|links|markdown|html`
- `POST /formalize` with `{ "input": "...", "format": "json" }`
- `GET /translate?input=...&from=en&to=ru&format=json|links|markdown|html`
- `POST /translate` with `{ "input": "...", "targetLanguage": "ru" }`
- `GET /check?input=...&format=json|links|markdown|html|claim-review|json-ld|prov-o`
- `POST /check` with `{ "input": "...", "live": true }`
- `GET /fact-check?input=...` and `POST /fact-check` as aliases for
  `/check`
- `GET /uniqueness?input=...&format=json|links|markdown|html&limit=3`
- `POST /uniqueness` with `{ "input": "...", "limit": 3 }`
- `GET /uniquness?input=...` and `POST /uniquness` as compatibility aliases
  for the issue title typo.

The JSON `/uniqueness` response keeps the existing `summary` and `statements`
score fields, and also includes an `originalityReport` with document-level
source groups, input/source spans, match strengths, source URLs, and exclusion
metadata for quoted or reference-list text.

## Static Web Prototype

Serve the repository root and open [`web/index.html`](web/index.html):

```bash
python3 -m http.server 4173
```

Then visit `http://127.0.0.1:4173/web/`.

On `main`, CI publishes the same static prototype to the repository's GitHub
Pages `/web/` path after tests pass.

The web prototype includes prepared examples, an interpretation selector, local
belief slider saved in `localStorage`, two default metrics (Correctness and
signed Confidence), result/evidence summaries, Q/P source links in the links
network, Links Notation output, a live Wikimedia evidence worker, a global
prefilled GitHub issue report link with page state and deployed version
metadata, and a top-menu page switch between **Analyse**
(default), **Compare**, **Check**, **Uniqueness**, **Formalize**,
**Translate**, and **Preferences**. The Check page colors each detected
statement from red (wrong) to green (correct) and exposes the checked result as
Markdown and Links Notation. The Uniqueness page searches public APIs for prior
instances of each detected statement and suggests citing, quoting, reviewing,
or rewording statements that look already published. The Translate page uses
the formalization CST to show formalized
source text, translated sentence output, unresolved questions, Markdown, Links
Notation, the translation CST, and a collapsed step trace. The Preferences page
stores a local profile with worldview sliders, context presets, and Links
Notation import/export.

### Default metrics

Every analysis surfaces two complementary numbers (see
[`docs/case-studies/issue-13/analysis.md`](docs/case-studies/issue-13/analysis.md)):

- **Correctness** (`result.correctness`, `0% … 100%`) — how correct the claim is
  in absolute terms. 100% means perfectly correct, 0% means perfectly wrong.
- **Confidence** (`result.signedConfidence`, `-100% … +100%`) — net evidential
  weight; positive points toward truth, negative points toward the negation,
  zero is indecisive. Useful for ranking competing claims about the same
  subject (e.g. `Population of Russia is 100m` vs `Population of Russia is 200m`).

The two are linked by `signedConfidence ≈ 2 · correctness − 1`. The legacy
`result.confidence` (`0..1`) and `result.rawBalance` (`-1..1`) properties are
preserved unchanged for backwards compatibility.

## Rust Core

The Rust workspace under [`rust`](rust) contains WASM-ready core
primitives and uses the `doublets` crate for relation-link doublet encoding.
It also includes a deterministic issue #35 semantic translation fixture for
`Hawaii is a state.` plus issue #52 full-text Translate coverage with
source/target semantic phrase ids, round-trip checks, Wikimedia entity-batch
planning, stable seven-day cache TTL plus one-to-three-day jitter, and
ABI-safe helper exports. The issue #61 `wasm-bindgen` package exposes the
analysis pipeline and Links Notation helpers through
[`js/src/wasm-core.js`](js/src/wasm-core.js):

```bash
cargo test --workspace
npm run build:wasm
npm run test:wasm
```

```js
import { loadWasmCore } from './js/src/wasm-core.js';

const wasm = await loadWasmCore();
const analysis = wasm.analyzeStatement('1 + 1 = 2');

console.log(analysis.result.value); // true
console.log(wasm.serializeLinksNotation('1 + 1 = 2'));
```

## Durable Cases

Analysis outputs can be exported as portable case data or saved as a binary
Doublets blob:

```js
import {
  analyzeStatement,
  loadPortableCaseFromDoublets,
  savePortableCaseToDoublets,
} from './js/src/index.js';

const saved = savePortableCaseToDoublets(
  analyzeStatement('Earth orbits the Sun')
);
const loaded = loadPortableCaseFromDoublets(saved);

console.log(loaded.linksNetwork.links.length);
```

## Development

```bash
npm install
npm test
npm run check
scripts/check-file-line-limits.sh
```

The package keeps the existing multi-runtime test setup based on
`test-anywhere`, so tests should also pass under Bun and Deno in CI.
