# Issue #43 Online Research

## Sources Checked

- Wikipedia top-views tool (the source linked in the issue):
  <https://pageviews.wmcloud.org/topviews/?project=en.wikipedia.org&platform=all-access&date=2026-04>
- MediaWiki REST `page/summary` API:
  <https://en.wikipedia.org/api/rest_v1/#/Page%20content/get_page_summary__title_>
- MediaWiki `API:Query` for extracts (`prop=extracts`, `exintro=1`):
  <https://www.mediawiki.org/wiki/Extension:TextExtracts>
- Wikidata `wbgetentities` for sitelinks:
  <https://www.wikidata.org/w/api.php?action=help&modules=wbgetentities>
- AI-driven development pipeline templates referenced in the issue:
  - <https://github.com/link-foundation/js-ai-driven-development-pipeline-template>
  - <https://github.com/link-foundation/rust-ai-driven-development-pipeline-template>

## Findings

- The top-views tool ranks pages by the WMF pageviews API and exposes
  per-month or per-day windows. It is not stable in real time, so the
  integration test fixes a snapshot for April 2026 and refreshes it as part
  of explicit follow-up work rather than scraping live during CI.
- MediaWiki's `prop=extracts` is the right primitive for "first sentence" or
  "intro" text. It returns clean plain text with the `explaintext=1` flag,
  which is what `extractFirstStatement()` consumes.
- Wikipedia language editions are independently authored. They are not
  translations of one another. Even for the same entity, the lead sentence
  can frame the topic differently (Russian `Майкл Джозеф Джексон` uses
  present-tense identity framing; English uses past-tense biography
  framing). This validates the skip-list path: not every divergence is a
  translator bug.
- The MediaWiki `srsearch` lesson from issue #41 (full-text snippets are
  not entity-linking evidence) carries forward here. The quality test
  matches on tokens that appear in the target extract — not via a separate
  search — because the target extract is already the authoritative ground
  truth.
- The AI-driven development pipeline templates split workflows by language
  (`js.yml`, `rust.yml`), expose pages preview deploys, and require explicit
  release publication variables. The current repository already has parts of
  this shape (Pages deployment, npm publish guard) but does not have full
  parity; this is documented as follow-up rather than implemented here.

## Impact on the Fix

- The fixture is captured up-front and consumed by an offline-friendly test
  (with `offlineFetch` returning empty JSON) so the integration test is
  deterministic and works without network access.
- The quality test classifies missing translations into "Wikipedia
  divergence" vs "project translator gap" instead of treating every miss as
  a failure. The skip-list captures the former; the translation-fixes file
  captures the latter.
- The translator pipeline is exposed in the same `formalize → semantic meta
language → naturalize` shape required by the issue, so future improvements
  (additional lexicon, additional predicate templates) plug into a known
  contract rather than ad-hoc translator paths.
