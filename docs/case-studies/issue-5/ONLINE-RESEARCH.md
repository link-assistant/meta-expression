# Online Research Notes: Issue #5

Research date: 2026-04-26

Issue #5 asks for additional online research and existing component review. This
file records the sources used and the conclusions applied to the solution.

## Wikidata and Public Knowledge

| Source                                                                                       | Notes for meta-expression                                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Wikidata REST API](https://www.wikidata.org/wiki/Wikidata:REST_API)                         | The REST API is the modern interface for retrieving Wikibase entities, properties, and statements. It is a good fit for selected-interpretation evidence loading. |
| [Wikidata SPARQL Query Service](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service) | WDQS supports SPARQL queries over Wikidata and should be used after candidate Q/P identifiers are known, not as broad fuzzy search.                               |
| [Elon Musk Q317521](https://www.wikidata.org/wiki/Q317521)                                   | The captured entity data identifies Elon Musk as a human born in 1971 and did not include P570 date-of-death data at capture time.                                |

### Recommendation

Use a two-stage evidence pipeline:

1. Use entity/property search or REST entity retrieval for selected
   interpretations.
2. Use scoped WDQS queries only after the candidate Q/P identifiers are known.

For alive/dead claims, absence of P570 should be bounded support for alive, not
proof. Presence of P570 should refute the alive claim and support a dead claim.

## Browser Persistence and Workers

| Source                                                                                     | Notes for meta-expression                                                                                                           |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| [MDN `localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) | `localStorage` persists key/value data for the current origin across sessions, which is enough for the current belief slider.       |
| [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)        | Workers run scripts on a background thread, which fits issue #5's request for Wikipedia/Wikidata traversal away from the UI thread. |

### Recommendation

Keep the current user-belief slider in `localStorage` because it is tiny and
human-authored. Move live evidence caches, traversed Wikipedia data, and larger
links-network neighborhoods to IndexedDB or Doublets-backed storage later.

## GitHub Issue Reporting

| Source                                                                                                                                               | Notes for meta-expression                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [GitHub issue forms syntax](https://docs.github.com/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms) | GitHub issue forms support prefilled metadata such as title and labels through repository configuration; URL query parameters can prefill the classic issue page. |
| [`link-assistant/calculator` report helper](./data/calculator-reportIssue.ts)                                                                        | The calculator project already builds a prefilled issue URL containing environment, input, result, Links Notation, and reproduction context.                      |

### Recommendation

Use a simple URL builder now and include enough state for maintainers to
reproduce the current page. If the repository later adds issue forms, map the
same generated report into form-compatible fields.

## In-Ecosystem References

| Component                                                                           | Finding                                                                                                         |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`link-assistant/human-language`](https://github.com/link-assistant/human-language) | Closest reference for natural language to Wikidata entity/property sequences, caching, and semantic browser UI. |
| [`link-assistant/calculator`](https://github.com/link-assistant/calculator)         | Reference for calculator behavior, Links Notation output, and issue-report URLs.                                |
| [`link-foundation/link-cli`](https://github.com/link-foundation/link-cli)           | Reference for Links Notation and link-only operations; useful for future Unicode-as-links mapping.              |
| [`linksplatform/doublets-rs`](https://github.com/linksplatform/doublets-rs)         | Target Rust storage layer for binary links operations once the JS schema is stable.                             |

## Design Conclusions

- The current PR should not pretend to implement live Wikipedia traversal.
- The deterministic prototype should still make the issue examples useful now.
- Real-world statements need provenance and bounded confidence.
- User beliefs should be explicit evidence, not hidden state.
- Reported issues should include Links Notation so later debugging can preserve
  the links-network shape that produced the visible result.
