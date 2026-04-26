# meta-expression

First prototype for a links-network based reasoning playground. It accepts a
human-language statement, generates selectable interpretations, formalizes the
selected meaning when possible, evaluates computable fragments, and attaches
evidence with provenance for non-computable claims.

The implementation in this PR is intentionally small and deterministic. It
keeps the long-term Rust/WASM/React/Doublets direction documented in
[`docs/case-studies/issue-1/ROADMAP.md`](docs/case-studies/issue-1/ROADMAP.md),
while providing working library, CLI, microservice, and static web surfaces now.

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

## CLI

```bash
node src/cli.js analyze "1 + 1 = 2"
node src/cli.js analyze --input "Earth orbits the Sun" --format links
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
- `POST /analyze` with `{ "input": "...", "format": "json" }`

## Static Web Prototype

Serve the repository root and open [`web/index.html`](web/index.html):

```bash
python3 -m http.server 4173
```

Then visit `http://127.0.0.1:4173/web/`.

On `main`, CI publishes the same static prototype to the repository's GitHub
Pages `/web/` path after tests pass.

## Development

```bash
npm install
npm test
npm run check
scripts/check-file-line-limits.sh
```

The package keeps the existing multi-runtime test setup based on
`test-anywhere`, so tests should also pass under Bun and Deno in CI.
