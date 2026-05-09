# Online and Repository Research

Captured on 2026-05-08 for issue #16 and refreshed on 2026-05-09 after PR
feedback requested sentence/text-level translation and visible translation
steps.

## Wikidata and Wikimedia APIs

- Wikidata exposes entity lookups through the Wikibase API module
  `wbgetentities`, which can return labels, descriptions, and sitelinks for a
  requested language. This is the narrow API surface used by the translator.
  Source: <https://www.wikidata.org/w/api.php?action=help&modules=wbgetentities>
- Wikibase documents the broader API family used by Wikidata and related
  installs. Source: <https://www.mediawiki.org/wiki/Wikibase/API>
- Wikimedia page metadata can expose Wikidata ids through `pageprops`, which is
  still relevant to `/formalize` source resolution. Source:
  <https://www.mediawiki.org/wiki/API:Pageprops>
- Wikidata's data access page describes API and SPARQL access options. Source:
  <https://www.wikidata.org/wiki/Wikidata:Data_access>
- Wikidata's REST API comparison page shows that language-specific label
  retrieval can be performed through `wbgetentities` with `props=labels` and
  `languages=<code>`, while sitelinks can be requested through the same Action
  API surface with `props=sitelinks` and `sitefilter=<wiki>`. Source:
  <https://www.wikidata.org/wiki/Wikidata:REST_API/Comparison>

Decision: keep the implementation on direct `fetch()` calls rather than adding
a new npm dependency. The existing formalizer already has a fetch/cache pattern,
and the translator only needs one extra `wbgetentities` call per resolved Q/P
id.

## Sentence and Trace Implications

The 2026-05-09 PR feedback tightened the issue scope: `/translate` must not be
only a word-label replacer. The implementation therefore keeps phrase-level
Wikidata label lookup as the grounding layer, then assembles sentence-level
renderings and records the API and transformation-rule steps that led to the
final text.

Decision: add a narrow deterministic rule table now instead of claiming full
machine translation. The current English-to-Russian slice covers article
omission and the tested `X is a Y` copula form; broader grammar belongs in the
future parser-backed Links Notation transformation engine.

## Related First-Party Repositories

Raw metadata is stored in `data/*.json`.

- `link-assistant/human-language` was current as of
  `2026-04-29T15:55:16Z`; the issue references it as prior art for switching
  languages of entities, predicates, and facts.
- `link-foundation/link-cli` was current as of `2026-05-08T13:49:40Z`; code
  search found substitution-related Rust modules such as
  `rust/src/query_processor_substitution.rs`.
- `link-foundation/start` was current as of `2026-05-03T19:08:07Z`; code
  search found JavaScript and Rust substitution engines for turning natural
  language patterns into commands.

Decision: do not port a substitution engine in this PR. The issue needs the
formalized translation substrate first. The CST and Links Notation output added
here are the data structures that later substitution rules can consume.

## Existing Component Check

Potential helper libraries considered:

- `wikibase-sdk`: useful API URL builder, but unnecessary for the one endpoint
  this slice uses.
- `@wikimedia/codex`: useful UI reference, but too large for the static
  no-build web prototype.
- HTTP mocking libraries such as `nock` or `msw`: unnecessary because the test
  suite already uses small mocked `fetch()` fixtures.

Decision: add no runtime dependency. This keeps the PR small, keeps browser
delivery unchanged, and preserves deterministic tests.
