# meta-expression

First prototype for a links-network based reasoning playground. It accepts a
human-language statement, generates selectable interpretations, formalizes the
selected meaning when possible, evaluates computable fragments, and attaches
evidence with provenance for non-computable claims.

The implementation in this PR keeps the long-term direction documented in
[`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) and
[`docs/ROADMAP.md`](docs/ROADMAP.md), while providing working library, CLI,
microservice, and static web surfaces now.

The text-formalization sub-system has its own auto-generated reference at
[`docs/FORMALIZE.md`](docs/FORMALIZE.md) (regenerated from JSDoc with
`npm run docs:formalize`).

## Library

```js
import { analyzeStatement, serializeLinksNotation } from './src/index.js';

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
- `createIssueReportUrl(analysis, options)` creates a prefilled GitHub issue
  URL with statement, result, evidence, and Links Notation.
- `createWikimediaEvidenceClient()` and `analyzeStatementWithLiveEvidence()`
  resolve supported real-world claims through Wikimedia APIs with cacheable
  evidence.

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
node src/cli.js analyze "1 + 1 = 2"
node src/cli.js analyze --input "Earth orbits the Sun" --format links
node src/cli.js analyze --input "Paris is the capital of France" --live
```

## Microservice

```bash
npm start
curl "http://127.0.0.1:3000/analyze?input=1%20%2B%201%20%3D%202"
curl "http://127.0.0.1:3000/analyze?input=Earth%20orbits%20the%20Sun&format=links"
```

Routes:

- `GET /health`
- `GET /analyze?input=...&format=json|links&select=0`
- `GET /analyze?input=...&live=true`
- `POST /analyze` with `{ "input": "...", "format": "json" }`

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
network, Links Notation output, a live Wikimedia evidence worker, a prefilled
GitHub issue report link, and a top-menu page switch between **Analyse**
(default), **Compare**, **Formalize**, and **Preferences**. The Preferences page
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

The Rust workspace under [`rust/core`](rust/core) contains WASM-ready core
primitives and uses the `doublets` crate for relation-link doublet encoding:

```bash
cargo test --workspace
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
