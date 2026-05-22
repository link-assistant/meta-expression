# Issue #41 Online Research

## Sources Checked

- MediaWiki `API:Search`: <https://www.mediawiki.org/wiki/API:Search/en>
- MediaWiki `API:Pageprops`: <https://www.mediawiki.org/wiki/API:Pageprops>
- Wikidata data access/API overview:
  <https://www.wikidata.org/wiki/Help:Data_access>

## Findings

- MediaWiki `list=search` performs full-text search for page titles or content
  matching `srsearch`. That means a returned page can match because the query
  appears in the snippet, not because the page title is the phrase meaning.
- The same search response can include snippets. Snippets are useful diagnostic
  evidence, but they should not be treated as title/label evidence.
- `prop=pageprops` can expose `wikibase_item` for a page, which is useful for
  connecting a Wikipedia page to a Wikidata Q-id. It does not prove that the
  original query semantically names that page.
- Wikidata's API is appropriate for entity search and entity retrieval, but the
  local ranker still needs language and phrase-shape checks before promoting a
  result into a formalized link.

## Impact on the Fix

The fix treats title/label/match/alias text as strong phrase evidence and treats
snippet-only hits as insufficient for selected links. This follows the API
semantics more closely: full-text search results are candidates, not final
entity-linking decisions.
