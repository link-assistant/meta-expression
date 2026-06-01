# Issue 131 Case Study

Issue: https://github.com/link-assistant/meta-expression/issues/131

PR: https://github.com/link-assistant/meta-expression/pull/132

## Summary

The Translate page was reported for the sentence:

```text
California (/ˌkælɪˈfɔːrniə/) is a state in the Western United States that lies on the Pacific Coast.
```

The reported output had four separate failures:

1. Parentheses around the pronunciation became formalized content:
   `[California \(]`, a linked IPA token, and `[\)]`.
2. The pronunciation was translated or normalized instead of being preserved as
   source punctuation attached to `California`.
3. `lies on` was split into `lies` and `on`, giving the wrong parts of speech
   and the wrong Russian surface text.
4. `Pacific Coast` had no usable Russian target, so the translation kept the
   English phrase and asked a follow-up question.

This PR fixes the common cause in tokenization and the phrase-selection gate,
adds a source-backed lexical override for the geographic `lie on` sense, adds a
local target for `Pacific Coast`, and locks the regression down with integration
tests.

The post-fix live run captured in
[`data/live-translate-after.json`](data/live-translate-after.json) now produces:

```text
Калифорния (/ˌkælɪˈfɔːrniə/) это штат в Запад США что расположен на Тихоокеанское побережье.
```

The pronunciation stays plain text, `state` remains the `U.S. state` sense
(`Q35657`), `lies on` resolves as one lexical phrase, `Pacific Coast` resolves to
`Q430265`, and there are no translation questions. Russian case and agreement
improvements are intentionally outside this PR; the regression here was
unresolved or wrongly linked phrases.

## Files

- [`data/issue-131.json`](data/issue-131.json) - raw issue body and metadata.
- [`data/issue-comments.json`](data/issue-comments.json) - issue comments
  snapshot.
- [`data/pr-132-before-finalize.json`](data/pr-132-before-finalize.json) - PR
  state before finalizing this fix.
- [`data/live-translate-after.json`](data/live-translate-after.json) - verified
  post-fix Translate output using live sources plus local lexicon data.
- [`data/wikidata-Q430265.json`](data/wikidata-Q430265.json) and
  [`data/wikidata-Q430265-en-ru.json`](data/wikidata-Q430265-en-ru.json) -
  Wikidata snapshots for `Pacific Coast`.
- [`data/oxford-lie_1.html`](data/oxford-lie_1.html) and
  [`data/wiktionary-lie-definition.json`](data/wiktionary-lie-definition.json) -
  source snapshots used while validating the `lie on` sense.
- [`logs/translation-debug-log.txt`](logs/translation-debug-log.txt) - debug log
  attached through the issue gist, preserved verbatim.
- [`logs/ci-js-checks-26727847528.log`](logs/ci-js-checks-26727847528.log) -
  initial failing CI log.
- [`logs/node-issue-131-red.log`](logs/node-issue-131-red.log) and
  [`logs/node-focused-green.log`](logs/node-focused-green.log) - focused test
  logs before and after the fix.
- [`REQUIREMENTS.md`](REQUIREMENTS.md) - complete requirement list extracted from
  the issue body.
- [`TIMELINE.md`](TIMELINE.md) - reconstructed sequence of events.
- [`ROOT-CAUSES.md`](ROOT-CAUSES.md) - root-cause analysis with concrete
  symptoms.
- [`SOLUTION-PLAN.md`](SOLUTION-PLAN.md) - implemented slice plus planned
  broader work.
- [`ONLINE-RESEARCH.md`](ONLINE-RESEARCH.md) - external data and library
  research.
- [`CONTRIBUTING-MISSING-DATA.md`](CONTRIBUTING-MISSING-DATA.md) - guide for
  contributing missing wiki data and local source overrides.

## Reproduction

Run the integration regression directly:

```sh
node --test js/tests/integration/issue-131.test.js
```

The smallest manual reproduction is the original sentence in the Translate page,
English to Russian, with Wikipedia, Wikidata, and Wiktionary enabled.
