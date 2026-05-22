# Formalize library reference

> Auto-generated from JSDoc blocks in `src/formalize*.js` by
> [`scripts/generate-formalize-docs.mjs`](../scripts/generate-formalize-docs.mjs).
> Run `npm run docs:formalize` to regenerate this file. The CI check
> `npm run docs:formalize:check` fails if the committed output is stale.

## Overview

`formalize` turns free-form text into a sequence of phrases, each anchored
to a Wikidata Q/P (or another knowledge-graph) entity. Public surface:

- **Library**: `import { formalizeTextWith, parseSourceSpec, … } from 'meta-expression';`
- **CLI**: `meta-expression formalize "Barack Obama was born in Hawaii."`
- **HTTP**: `POST /formalize` (see `src/server.js`); responses are cached on
  disk in both JSON and Links Notation form for cross-validation.
- **Web demo**: `web/index.html` → Formalize tab.

See [`docs/case-studies/issue-15/analysis.md`](case-studies/issue-15/analysis.md)
for the design rationale and acceptance examples.

## Pipeline & rendering

Source: [`src/formalize.js`](../src/formalize.js)

High-level entry points (`formalizeText`, `formalizeTextWith`), tokenization, n-gram generation, and link/markdown/HTML rendering.

### `interpretationKey()`

Build a stable identity key for an interpretation based on its phrase
entity ids. Used by the web layer to detect whether the currently
selected interpretation is already among the top‑N (R4).

**Returns** `string`

### `formalizeText(input, options)`

Synchronous-friendly entry point used by older call sites. Always returns
a Promise — fetch is intentionally null so callers without a resolver get
a deterministic (no-network) result.

| Parameter   | Type     | Description |
| ----------- | -------- | ----------- |
| `input`     | `string` | —           |
| `[options]` | `object` | —           |

**Returns** `Promise<object>`

### `formalizeTextWith(input, options)`

Formalize free-form text by tokenising, resolving each n-gram against
one or more knowledge graphs, picking the longest non-overlapping
cover, and producing renderings (Markdown, HTML, Links Notation) plus
aggregated big contexts and ranked interpretations.

| Parameter                      | Type                        | Description           |
| ------------------------------ | --------------------------- | --------------------- |
| `input`                        | `string`                    | —                     |
| `[options]`                    | `object`                    | —                     |
| `[options.fetch]`              | `Function\|null`            | fetch implementation  |
| `[options.cache]`              | `Map<string,unknown>\|null` | TTL cache             |
| `[options.cacheTtlMs]`         | `number`                    | —                     |
| `[options.now]`                | `Function`                  | —                     |
| `[options.maxNgramSize]`       | `number`                    | —                     |
| `[options.searchLimit]`        | `number`                    | —                     |
| `[options.topKCandidates]`     | `number`                    | —                     |
| `[options.maxInterpretations]` | `number`                    | —                     |
| `[options.linkTargetMode]`     | `string`                    | —                     |
| `[options.contextLens]`        | `string\|object\|null`      | —                     |
| `[options.language]`           | `string`                    | —                     |
| `[options.sources]`            | `object[]`                  | pluggable source list |
| `[options.overrides]`          | `object[]`                  | repo+user overrides   |
| `[options.contextOptions]`     | `object`                    | passed to aggregator  |

**Returns** `Promise<object>`

### `markdownFromFormalizationCst(cst)`

Recreate Markdown from a formalization CST.

The CST stores phrase order, source text, source character ranges, selected
entity id, and the exact link URL used by the formalizer. That makes the
Links Notation / CST form sufficient for downstream tools such as
`/translate` to regenerate the same wikified Markdown, including sentence
punctuation, without re-running disambiguation.

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `cst`     | `object` | —           |

**Returns** `string`

### `tokenize(text)`

Tokenize input by stripping punctuation and splitting on whitespace.

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `text`    | `string` | —           |

**Returns** `string[]`

### `generateNgrams(tokens, maxSize)`

Build all n-grams up to `maxSize` tokens. Generic multi-token stop-only
n-grams are skipped, but single-token stop words and exact Wiktionary
grammar compounds are kept with `stopOnly: true` so lexical definitions
remain linkable without flooding every source tier with glue words.

| Parameter   | Type       | Description |
| ----------- | ---------- | ----------- |
| `tokens`    | `string[]` | —           |
| `[maxSize]` | `number`   | —           |

**Returns** `Array<{text:string,tokens:string[],start:number,end:number,size:number,stopOnly:boolean` — >}

### `buildMarkdownLink(phrase, options)`

Render a single phrase as Markdown link `[text](url "Qid")`.

| Parameter   | Type     | Description |
| ----------- | -------- | ----------- |
| `phrase`    | `object` | —           |
| `[options]` | `object` | —           |

**Returns** `string`

### `buildHtmlLink(phrase, options)`

Render a single phrase as HTML `<a title="Qid">text</a>`.

| Parameter   | Type     | Description |
| ----------- | -------- | ----------- |
| `phrase`    | `object` | —           |
| `[options]` | `object` | —           |

**Returns** `string`

### `resolveLinkTarget(phrase, options)`

Resolve the URL the rendered link should point at, depending on the
configured `linkTargetMode`. Supports any source-tagged entity.

| Parameter   | Type     | Description |
| ----------- | -------- | ----------- |
| `phrase`    | `object` | —           |
| `[options]` | `object` | —           |

**Returns** `string|null`

## Knowledge-graph sources

Source: [`src/formalize-sources.js`](../src/formalize-sources.js)

Pluggable resolvers for Wikidata, WordNet (Wiktionary opensearch), and Fandom wikis. `parseSourceSpec` accepts the human-readable spec used by the CLI / web UI.

### `createWikidataSource(options)`

Build a Wikidata source resolver.

| Parameter               | Type     | Description |
| ----------------------- | -------- | ----------- |
| `options`               | `object` | —           |
| `[options.language]`    | `string` | —           |
| `[options.searchLimit]` | `number` | —           |

**Returns** `object` — Source resolver

### `createWikipediaSource(options)`

Build a Wikipedia source resolver.

The issue mandates Wikipedia as the FIRST disambiguation tier — it
carries the richest article context per phrase and (via
`pageprops.wikibase_item`) tells us which Wikidata Q-id each title
actually points at, so downstream context-walking still works.

Implementation:

- `action=query&list=search` for a candidate list (one MediaWiki
  round-trip per phrase).
- `action=query&prop=pageprops` to backfill the wikibase_item for
  every returned title (one batch round-trip).

Each candidate carries the canonical Wikidata id as its `.id` so the
existing entity-hydration path (wbgetentities -> claims/sitelinks)
still applies. When a Wikipedia hit has no wikibase_item we fall back
to a `wp:<title>` id so the candidate is at least linkable in the UI.

| Parameter               | Type     | Description |
| ----------------------- | -------- | ----------- |
| `options`               | `object` | —           |
| `[options.language]`    | `string` | —           |
| `[options.searchLimit]` | `number` | —           |

**Returns** `object`

### `createWiktionarySource(options)`

Build a Wiktionary fallback resolver.

Wiktionary's REST-v1 definition endpoint returns clean per-PoS
definitions for a single token. This is the LAST disambiguation
tier per issue #21 — it ensures even glue words (`the`, `of`,
`and`) get a tooltip-worthy hit when Wikipedia and Wikidata return
nothing.

| Parameter                  | Type     | Description |
| -------------------------- | -------- | ----------- |
| `options`                  | `object` | —           |
| `[options.language]`       | `string` | —           |
| `[options.maxDefinitions]` | `number` | —           |

**Returns** `object`

### `createWordNetSource(options)`

Build a WordNet source resolver via en.wiktionary's `wbgetentities`-free
search API. WordNet itself ships no CORS endpoint we can call from the
browser, but Wiktionary mirrors WordNet senses inside its own search API
(`action=opensearch`) which IS CORS-permitting and works as a layered
lexical source. Each candidate carries a `wn:` prefix so it never
collides with a Wikidata Q/P id.

| Parameter               | Type     | Description |
| ----------------------- | -------- | ----------- |
| `options`               | `object` | —           |
| `[options.language]`    | `string` | —           |
| `[options.searchLimit]` | `number` | —           |

**Returns** `object`

### `createFandomSource(options)`

Build a Fandom (Wikia) source resolver.

Each Fandom wiki exposes the standard MediaWiki API at
`https://<wiki>.fandom.com/api.php`. We use `action=opensearch` for the
candidate list and prefix the id with `fandom:<wiki>:` so cross-source
ids stay unique. The wiki slug becomes part of the source name so
users can register multiple Fandom wikis in parallel
(e.g. `fandom:genshin-impact`, `fandom:harrypotter`).

| Parameter               | Type     | Description                             |
| ----------------------- | -------- | --------------------------------------- |
| `options`               | `object` | —                                       |
| `options.wiki`          | `string` | e.g. `genshin-impact`                   |
| `[options.host]`        | `string` | override host for self-hosted MediaWiki |
| `[options.language]`    | `string` | —                                       |
| `[options.searchLimit]` | `number` | —                                       |

**Returns** `object`

### `createSourceRegistry(sources)`

Build a registry of named sources. The first registered source is
treated as the "primary" one (its result drives the default link
target and entity hydration).

| Parameter | Type            | Description |
| --------- | --------------- | ----------- |
| `sources` | `Array<object>` | —           |

**Returns** `object` — Registry with `primary`, `all`, `byName`.

### `parseSourceSpec(spec)`

Parse a comma-separated source spec (used by CLI / server / web URL
params) into a list of source instances. Supported tokens:
wikidata
wordnet
fandom:<slug> e.g. `fandom:genshin-impact`
fandom-host:<host> e.g. `fandom-host:tolkiengateway.net`

| Parameter | Type               | Description |
| --------- | ------------------ | ----------- |
| `spec`    | `string\|string[]` | —           |

**Returns** `object[]`

### `createDefaultSourceTiers(language)`

Default tier order per issue #21:

1. Wikipedia (richest article context, carries wikibase_item)
2. Wikidata (canonical Q/P graph, holds claims for context BFS)
3. Wiktionary (last-resort lexical fallback for stop words / verbs)

| Parameter    | Type     | Description |
| ------------ | -------- | ----------- |
| `[language]` | `string` | —           |

**Returns** `object[]`

## Lazy overrides

Source: [`src/formalize-overrides.js`](../src/formalize-overrides.js)

Repository-level (`docs/formalize/overrides.lino`, JSON accepted as legacy fallback) and user-level overrides that pin a phrase to a specific entity, bypassing live lookups.

### `buildOverrideMap(layers)`

Build an override map from one or more lists.

| Parameter | Type                                    | Description |
| --------- | --------------------------------------- | ----------- |
| `layers`  | `Array<OverrideEntry\|OverrideEntry[]>` | —           |

**Returns** `Map<string, OverrideEntry>`

### `lookupOverride(overrides, phraseText)`

Look up an override for a phrase text.

| Parameter    | Type                         | Description |
| ------------ | ---------------------------- | ----------- |
| `overrides`  | `Map<string, OverrideEntry>` | —           |
| `phraseText` | `string`                     | —           |

**Returns** `OverrideEntry|null`

### `overrideToCandidate(override)`

Convert an override entry into the candidate shape the formalize
pipeline expects so it can slot in alongside live API results.

| Parameter  | Type            | Description |
| ---------- | --------------- | ----------- |
| `override` | `OverrideEntry` | —           |

**Returns** `object`

### `overrideToEntity(override)`

Convert an override entry into the entity shape attached to a phrase.

| Parameter  | Type            | Description |
| ---------- | --------------- | ----------- |
| `override` | `OverrideEntry` | —           |

**Returns** `object`

### `decodeOverridesText(raw)`

Decode an override file's raw text. Detects `.lino` content by the
absence of a leading `{` / `[` and falls back to JSON otherwise.
Returns an empty array on any parse failure so callers can keep going.

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `raw`     | `string` | —           |

**Returns** `OverrideEntry[]`

### `encodeOverridesAsLino(entries)`

Encode an array of overrides as Links Notation text.

| Parameter | Type              | Description |
| --------- | ----------------- | ----------- |
| `entries` | `OverrideEntry[]` | —           |

**Returns** `string`

### `loadRepoOverrides()`

Load repository-level overrides from disk (Node-only).
Tries `docs/formalize/overrides.lino` first, then falls back to
`docs/formalize/overrides.json` for legacy checkouts. Returns an empty
array on any IO/parse failure so the caller can keep going.

**Returns** `Promise<OverrideEntry[]>`

### `loadUserOverrides(source)`

Load user overrides from a file path or already-parsed list.
Auto-detects `.lino` vs `.json` by file content.

| Parameter | Type                      | Description |
| --------- | ------------------------- | ----------- |
| `source`  | `string\|OverrideEntry[]` | —           |

**Returns** `Promise<OverrideEntry[]>`

## Big-context aggregation

Source: [`src/formalize-contexts.js`](../src/formalize-contexts.js)

Walks `instance of` / `subclass of` / `part of` chains to surface broad worlds (Math, Geography, Star Wars, Genshin Impact, …) the input touches.

### `aggregateBigContexts(phrases, options)`

Aggregate big-context categories from a list of resolved phrases.

all: Array<{id:string, label:string, weight:number, probability:number,
depth:number, paths:Array<string[]>, propertyTrail:string[]}>,
main: object|null,
additional: object[]
}>}

| Parameter                    | Type       | Description                                 |
| ---------------------------- | ---------- | ------------------------------------------- |
| `phrases`                    | `object[]` | Phrase objects with `entity.contextLabels`. |
| `options`                    | `object`   | —                                           |
| `[options.maxDepth]`         | `number`   | —                                           |
| `[options.perStepBranching]` | `number`   | —                                           |
| `[options.topCategories]`    | `number`   | —                                           |
| `[options.fetchJson]`        | `Function` | injected fetcher (cached)                   |
| `[options.now]`              | `Function` | —                                           |
| `[options.language]`         | `string`   | —                                           |

### `aggregateBigContextsFromGraph(phrases, options)`

Synchronous helper used by tests / clients that already have a context
graph in memory (no network needed). Same shape as the async version.

| Parameter   | Type       | Description |
| ----------- | ---------- | ----------- |
| `phrases`   | `object[]` | —           |
| `[options]` | `object`   | —           |

**Returns** `{all: object[], main: object|null, additional: object[]` — }

## Persistent cache

Source: [`src/formalize-cache.js`](../src/formalize-cache.js)

Filesystem cache used by the HTTP server. Each entry is written atomically as a binary doublets blob (`payload.bin`, the same shape used by `linksplatform/doublets-rs` / `link-foundation/link-cli`) plus a Links Notation echo (`payload.lino`) for cross-validation.

### `resolveCacheRoot(options)`

Resolve the on-disk cache root, preferring an explicit `options.cacheRoot`,
falling back to the `META_EXPRESSION_FORMALIZE_CACHE` env var, then to
`<cwd>/.cache/formalize`.

| Parameter             | Type     | Description |
| --------------------- | -------- | ----------- |
| `[options]`           | `object` | —           |
| `[options.cacheRoot]` | `string` | —           |

**Returns** `string`

### `cacheKey(input)`

Hash a formalize request descriptor into a stable cache key. The same input
(text + sources + target + overrides + maxNgramSize + language) always maps
to the same 32-char hex digest so cache entries collide deterministically.

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `input`   | `object` | —           |

**Returns** `string`

### `readCacheEntry(root, key)`

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `root`    | `string` | —           |
| `key`     | `string` | —           |

**Returns** `Promise<{json: object, lino: string` — | null>}

### `writeCacheEntry(root, key, payload, formalizeLino)`

| Parameter       | Type     | Description |
| --------------- | -------- | ----------- |
| `root`          | `string` | —           |
| `key`           | `string` | —           |
| `payload`       | `object` | —           |
| `formalizeLino` | `string` | —           |

**Returns** `Promise<{ binPath: string, linoPath: string` — >}

## Links Notation codec

Source: [`src/lino.js`](../src/lino.js)

Pure JS parser/serializer for indented Links Notation (`.lino`). Used for the repository overrides file, cache echo files, and any future configuration we want to keep in link-graph form rather than JSON.

### `parseLino(text)`

Parse an indented .lino document into a JS value.

- Top-level identifier with no children → that identifier (string).
- Top-level identifier with children → object/list per child shape.
- Multiple top-level identifiers → ordered array of parsed entries.

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `text`    | `string` | —           |

**Returns** `unknown`

### `tokenizeLino(content)`

Tokenize a single .lino content line into a sequence of raw tokens.
Quoted strings are kept as a single token (with the quotes preserved
so `decodeToken` can detect them).

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `content` | `string` | —           |

**Returns** `string[]`

### `decodeToken(token)`

Decode a raw token into its typed value:

- "quoted" → string with escapes resolved
- true/false/null → booleans / null
- finite numeric literals → number
- everything else → bare string token (e.g. an identifier)

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `token`   | `string` | —           |

**Returns** `string|number|boolean|null`

### `serializeLino(value)`

Serialize a JS value into indented .lino. Always produces deterministic
key ordering (insertion order is preserved, matching JSON.stringify).

Top-level rules:

- string/number/boolean/null → bare scalar line
- array → list under a synthetic root (each item indented as `-`)
- object → root identifier when caller passes `{ rootIdentifier }`,
  otherwise a flat block of `key value` lines.

| Parameter | Type      | Description |
| --------- | --------- | ----------- |
| `value`   | `unknown` | —           |

**Returns** `string`

### `parseLinoEntries(text)`

Convenience: parse an array-of-entries .lino document into a flat array.
Accepts both indented `entries` block and an inline list at the root.

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `text`    | `string` | —           |

**Returns** `unknown[]`

### `serializeLinoEntries(entries)`

Convenience: serialize a list of entries as `entries:` block. Used for
overrides files so the document is always rooted under a stable name.

| Parameter | Type        | Description |
| --------- | ----------- | ----------- |
| `entries` | `unknown[]` | —           |

**Returns** `string`

## Doublets binary store

Source: [`src/doublets.js`](../src/doublets.js)

In-memory port of the link primitives used by `linksplatform/doublets-rs` / `link-foundation/link-cli`. Encodes arbitrary JS values as chains of `(index source target)` doublets — strings via unicode-sequence chains — and serializes the resulting graph as a flat `Uint8Array` blob ready for a future WebAssembly bridge.

### `encodeAsDoublets(value)`

Encode a JS value into a binary doublets blob. Convenience wrapper for
cache writers that just want round-trippable bytes.

| Parameter | Type      | Description |
| --------- | --------- | ----------- |
| `value`   | `unknown` | —           |

**Returns** `{ binary: Uint8Array, rootIndex: number, store: ReturnType<typeof createDoubletStore>` — }

### `decodeFromDoublets(binary, rootIndex)`

Decode a binary doublets blob produced by `encodeAsDoublets` back to a JS
value. The root index defaults to the last created link, matching how
`encodeAsDoublets` returns it.

| Parameter     | Type         | Description |
| ------------- | ------------ | ----------- |
| `binary`      | `Uint8Array` | —           |
| `[rootIndex]` | `number`     | —           |

**Returns** `unknown`
