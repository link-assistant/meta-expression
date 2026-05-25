# Issue 56 Case Study

## Source Material

- GitHub issue: https://github.com/link-assistant/meta-expression/issues/56
- Prepared pull request: https://github.com/link-assistant/meta-expression/pull/57
- Reporter gist: https://gist.github.com/konard/14e83db0b01ea864fec9a0d0eaa09437
- Captured issue payload: `issue.json`
- Captured gist payload: `translation-issue.md`
- Reproducing regression log: `regression-before.log`
- Focused fixed regression log: `regression-after-focused.log`
- Verification logs: `npm-test.log`, `npm-check.log`, `file-line-limits.log`
- Fixed output sample: `translation-after.json`
- Translate UI verification screenshot: `translate-after.png`

## Reproduction

The reported input was translated through the v0.9.0 Translate page with
English as the source language and Russian as the target language.

Before the fix, the formalizer tokenized slash-separated technical pairs as
single fallback tokens:

- `naturalization/deformalization`
- `CST/AST`

Those tokens were then rendered as encoded Wiktionary page lookups such as
`naturalization%2Fdeformalization` and `CST%2FAST`. The translation layer also
lacked glossary coverage for the issue text, so many English technical terms
stayed unresolved and generated questions. Some generated question options were
disabled placeholders, so the UI showed alternatives without actionable answers.

## Root Causes

1. Slash was not a token boundary in `formalize.js`, so unsupported slash pairs
   became one lexical phrase instead of two linked terms with punctuation
   preserved between them.
2. Translate had no focused glossary coverage for the Formal AI issue-56 prose,
   so deterministic technical tokens fell through to non-Wikidata lexical
   variables.
3. Question details included placeholder options with `targetText: null`, which
   made the UI show unavailable choices.
4. Translate exposed final artifacts and a step list, but not a single
   copyable, verbose debug payload combining UI context, questions, raw steps,
   request/response records, and CST JSON.
5. Source lookup priority was implemented as Wikipedia -> Wikidata ->
   Wiktionary in the default source registry, but the Translate page did not let
   reviewers reorder or disable those source tiers during debugging.

## External API Facts

- MediaWiki's `list=search` module is the Wikipedia title/content search route
  used by the Wikipedia source tier:
  https://www.mediawiki.org/wiki/API:Search/en
- Wikidata documents its MediaWiki Action API endpoint and names
  `wbsearchentities` as the entity-search action:
  https://www.wikidata.org/wiki/Wikidata:Data_access/en
- Wiktionary exposes its REST sandbox and REST API documentation from the
  Wiktionary site:
  https://en.wiktionary.org/wiki/Special:RestSandbox/wmf-restbase

These sources support keeping Wikipedia first for article context, Wikidata
second for canonical graph entities, and Wiktionary as the lexical fallback.

## Fix Summary

- Treat `/` as a token delimiter during formalization while preserving the slash
  as punctuation in rendered Translate output.
- Extend the English-to-Russian glossary for the reported Formal AI issue text.
- Keep question alternatives actionable by replacing disabled placeholder
  options with selected source-label or normalized-expression options.
- Add draggable source-priority controls on Formalize and Translate pages.
- Add a copyable Translate debug log that includes UI context, formalized input,
  translated output, text-mode questions with selected options, raw translation
  steps, request/response records, and CST JSON.
