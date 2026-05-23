# Issue 50 Online Research

Research date: 2026-05-23

## Sources Consulted

| Source                                                                                                | Relevant finding                                                                                                                                                                                           | Impact on fix                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [MediaWiki API etiquette](https://www.mediawiki.org/wiki/Special:MyLanguage/API:Etiquette)            | Wikimedia recommends making Action API requests in series rather than in parallel for a safe request rate, setting a meaningful user agent, caching data, and increasing delay after rate-limit responses. | Changed default formalize source lookup concurrency to serial, kept `Api-User-Agent`/`User-Agent`, and added retry handling for retryable responses. |
| [Manual:Maxlag parameter](https://www.mediawiki.org/wiki/Manual:Maxlag_parameter)                     | `maxlag` is intended to pause non-interactive work under high server load and responses can include `Retry-After`.                                                                                         | The Translate page is interactive, so this PR does not add `maxlag`; retry handling honors `Retry-After` when present.                               |
| [API:Presenting Wikidata knowledge](https://www.mediawiki.org/wiki/API:Presenting_Wikidata_knowledge) | `wbgetentities` can return labels, descriptions, claims, and sitelinks, and supports language-specific labels and language fallback.                                                                       | Confirmed the existing Wikidata label path is the right source for Q/P entities, but missing labels should not block lexical glossary translation.   |
| [Wikidata:Data access](https://www.wikidata.org/wiki/Help:Data_access)                                | Wikidata's Action API is appropriate for direct entity data in small groups, while large result sets should use dumps, search, or query services.                                                          | Reinforced avoiding unbounded per-token request fan-out and keeping the fix scoped to small interactive lookups.                                     |
| [MediaWiki REST API](https://www.mediawiki.org/wiki/API:REST_API/en)                                  | The REST API has structured endpoints and cached responses for Wikimedia content.                                                                                                                          | Supported using Wiktionary REST/page links for lexical fallback rather than private local viewer links by default.                                   |

## Existing Components Used

- Existing `formalizeTextWith()` source registry and cache injection.
- Existing translation strategies and glossary lookup module.
- Existing link-target mode constants from Formalize.
- Existing CLI/server/web Translate entry points.

No new external library was necessary for this slice.
