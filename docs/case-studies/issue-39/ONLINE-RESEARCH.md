# Issue #39 Online Research

## Sources Checked

- MediaWiki API etiquette:
  <https://www.mediawiki.org/wiki/Special:MyLanguage/API:Etiquette>
- MediaWiki "Presenting Wikidata knowledge":
  <https://www.mediawiki.org/wiki/API:Presenting_Wikidata_knowledge>
- Wikidata REST/API comparison:
  <https://www.wikidata.org/wiki/Wikidata:REST_API/Comparison>
- Wiktionary overview:
  <https://en.wikipedia.org/wiki/Wiktionary>
- "Enhancing Machine Translation Experiences with Multilingual Knowledge
  Graphs":
  <https://ojs.aaai.org/index.php/AAAI/article/download/30563/32725>
- "Statistical and Neural Methods for Cross-lingual Entity Label Mapping in
  Knowledge Graphs":
  <https://arxiv.org/abs/2206.08709>

## Findings

- Wikimedia API etiquette recommends identifiable requests and a considerate
  request rate. The before-capture's HTTP 429 target lookup failures are
  consistent with a pipeline that makes many live Wikimedia requests in one
  translate action.
- `wbgetentities` is the right Wikidata Action API primitive for retrieving
  labels, descriptions, aliases, and sitelinks in selected languages. It is
  useful for entity names, but it does not solve grammar or inflection.
- Wikidata's newer REST comparison page documents label-specific endpoints with
  language fallback. That can simplify future target-label lookups, but it still
  returns labels rather than translated sentences.
- Wiktionary contains lexical data such as definitions and translations, but
  the current code only uses definitions. A future implementation can add
  translation extraction as another lexical source.
- Knowledge-graph-enhanced machine translation research supports using
  multilingual knowledge graph labels for entity and term grounding, but the
  papers also treat this as a supplement to machine translation, not a complete
  sentence translator.

## Design Consequence

The practical fix for this PR is a hybrid path:

- Keep the semantic-label strategy for traceable entity translation.
- Add a contextual glossary strategy for short technical product text.
- Keep unresolved variables explicit, but attach answer options so the user can
  choose or provide missing mappings.
- Avoid over-linking grammar-bound n-grams so downstream grammar rules can see
  phrase boundaries.
