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

### `tokenize(text)`

Tokenize input by stripping punctuation and splitting on whitespace.

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `text`    | `string` | —           |

**Returns** `string[]`

### `generateNgrams(tokens, maxSize)`

Build all n-grams up to `maxSize` tokens, skipping stop-only n-grams.

| Parameter   | Type       | Description |
| ----------- | ---------- | ----------- |
| `tokens`    | `string[]` | —           |
| `[maxSize]` | `number`   | —           |

**Returns** `Array<{text:string,tokens:string[],start:number,end:number,size:number` — >}

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

## Lazy overrides

Source: [`src/formalize-overrides.js`](../src/formalize-overrides.js)

Repository-level (`docs/formalize/overrides.json`) and user-level overrides that pin a phrase to a specific entity, bypassing live lookups.

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

### `loadRepoOverrides()`

Load repository-level overrides from disk (Node-only).
Returns an empty array on any IO/parse failure so the caller can keep going.

**Returns** `Promise<OverrideEntry[]>`

### `loadUserOverrides(source)`

Load user overrides from a file path or already-parsed list.

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

Filesystem cache used by the HTTP server. Each entry is written atomically as JSON (`<key>.json`) plus a Links Notation echo (`<key>.lino`) for cross-validation.

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

### `writeCacheEntry(root, key, payload, linoBody)`

| Parameter  | Type     | Description |
| ---------- | -------- | ----------- |
| `root`     | `string` | —           |
| `key`      | `string` | —           |
| `payload`  | `object` | —           |
| `linoBody` | `string` | —           |

**Returns** `Promise<{ binPath: string, linoPath: string` — >}
