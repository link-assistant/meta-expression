# Online Research for Issue #18

Research date: 2026-05-07.

## Browser Storage

- MDN Web Storage API: <https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API>

  The existing static app already uses origin-scoped `localStorage` for theme,
  locale, cache, and per-statement beliefs. The preferences prototype follows
  that pattern for `meta-expression.preferences.v1`.

- MDN `localStorage`: <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>

  MDN notes that `file:` URL behavior is browser-dependent, so review should use
  a local server or GitHub Pages for reliable persistence checks.

## Import and Export Shape

- MDN `URLSearchParams`: <https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams>

  Query/hash transport is suitable for a later share-link flow. This PR keeps
  the first slice to text import/export because the issue specifically asks for
  Links Notation.

- W3C RDF 1.1 Concepts: <https://www.w3.org/TR/rdf11-concepts/>
- W3C RDF 1.1 Dataset Semantics: <https://www.w3.org/TR/rdf11-datasets/>

  RDF datasets and named graphs are relevant to future context-scoped
  statements. For now, the repository's `.lino` codec is enough to represent
  profile records without adding a dependency.

## Candidate Components and Libraries

- RDF/JS Data Model specification: <https://rdf.js.org/data-model-spec/>

  RDF/JS defines interoperable JavaScript interfaces for RDF terms and quads.
  It is a good boundary if preference profiles become RDF-compatible datasets.

- N3.js: <https://github.com/rdfjs/N3.js>

  Current npm facts captured in `data/npm-n3.txt`: version `2.0.3`; streaming
  Turtle/N3/RDF parsing and writing. Good future candidate for RDF/TriG profile
  interchange.

- rdf-ext: <https://rdf-ext.org/api/rdf-ext.html>

  Current npm facts captured in `data/npm-rdf-ext.txt`: version `2.6.0`;
  developer-friendly RDF/JS environment. Useful later if profiles need richer
  RDF operations in the browser or Node.

- `@rdfjs/data-model`: <https://github.com/rdfjs-base/data-model>

  Current npm facts captured in `data/npm-rdfjs-data-model.txt`: version
  `2.1.1`; small RDF/JS data model implementation. Useful if we need only term
  and quad construction.

## Belief Revision Background

- Stanford Encyclopedia of Philosophy, Logic of Belief Revision:
  <https://plato.stanford.edu/entries/logic-belief-revision/>
- Jon Doyle, "A truth maintenance system":
  <https://www.sciencedirect.com/science/article/pii/0004370279900080>

  These sources support the distinction between a small preference profile and a
  real belief-maintenance engine. This PR records preference-derived evidence
  explicitly and avoids claiming full consistency maintenance.
