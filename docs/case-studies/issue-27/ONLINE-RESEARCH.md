# Online Research

Research was captured on 2026-05-10 UTC.

## Candidate APIs

| Provider                   | Used by default | Relevant capability                                                                   | CORS probe result                | Notes                                                                                                   |
| -------------------------- | --------------- | ------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Wikimedia Action API       | Yes             | `list=search` over Wikipedia pages with `origin=*`.                                   | `access-control-allow-origin: *` | Public, no key required for this query pattern. Good for encyclopedic statements and exact snippets.    |
| OpenAlex Works API         | Yes             | `/works?search=...` searches scholarly work titles, abstracts, and indexed full text. | `access-control-allow-origin: *` | Useful for academic prior work; relevance is not exact-match by itself, so title/snippet checks matter. |
| Crossref REST API          | Yes             | `/works?query.bibliographic=...` searches Crossref metadata.                          | `access-control-allow-origin: *` | No signup required for public REST usage; polite pool can use `mailto` later.                           |
| DuckDuckGo Instant Answer  | Yes             | `api.duckduckgo.com/?format=json` returns instant-answer fields for selected queries. | `access-control-allow-origin: *` | Not a general web search API. It is best as a small extra signal, not as a comprehensive source.        |
| Google/Bing/Brave web APIs | No              | General web search APIs can find wider exact phrase matches.                          | Not probed with credentials      | These require keys or server-side brokering, so they are a future adapter rather than default web code. |

## Documentation Sources

- Wikimedia API Portal: https://api.wikimedia.org/wiki/Main_Page
- OpenAlex Works: https://docs.openalex.org/api-entities/works
- OpenAlex Search Works: https://docs.openalex.org/api-entities/works/search-works
- OpenAlex API Overview: https://docs.openalex.org/how-to-use-the-api/api-overview
- Crossref REST API: https://www.crossref.org/documentation/retrieve-metadata/rest-api/
- Crossref Access and Authentication: https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/
- DuckDuckGo Instant Answer help: https://duckduckgo.com/duckduckgo-help-pages/features/instant-answers-and-other-features

## Probe Commands

Each probe sent `Origin: http://127.0.0.1:4173` to approximate the static web
prototype origin. Raw headers and sample bodies are in `data/`.

```bash
curl -sS -D data/wikimedia-cors.headers.txt -o data/wikimedia-cors.body.json -H "Origin: http://127.0.0.1:4173" "https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=%22Earth%20orbits%20the%20Sun%22&srlimit=1&origin=*"
curl -sS -D data/openalex-cors.headers.txt -o data/openalex-cors.body.json -H "Origin: http://127.0.0.1:4173" "https://api.openalex.org/works?search=Earth%20orbits%20the%20Sun&per-page=1&select=id,display_name,publication_year,doi,authorships,relevance_score"
curl -sS -D data/crossref-cors.headers.txt -o data/crossref-cors.body.json -H "Origin: http://127.0.0.1:4173" "https://api.crossref.org/works?query.bibliographic=Earth%20orbits%20the%20Sun&rows=1"
curl -sS -D data/duckduckgo-cors.headers.txt -o data/duckduckgo-cors.body.json -H "Origin: http://127.0.0.1:4173" "https://api.duckduckgo.com/?q=%22Earth%20orbits%20the%20Sun%22&format=json&no_redirect=1&no_html=1&skip_disambig=1"
```

## Findings

- All four default providers returned permissive CORS headers in the captured
  probes.
- The literal sample query did not produce reliable exact matches from every
  source. OpenAlex and Crossref returned related scholarly metadata, while
  DuckDuckGo returned an empty instant answer. This confirms the implementation
  needs per-result exact phrase checks instead of trusting source relevance.
- The feature should keep source errors local to each statement. A blocked or
  empty provider should reduce confidence, not fail the entire text.
- A future server-side search adapter can add Google, Bing, Brave, or SerpAPI
  style providers without exposing keys in the static app.
