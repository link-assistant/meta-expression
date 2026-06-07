# Issue 133 Case Study

Issue: https://github.com/link-assistant/meta-expression/issues/133

Original PR: https://github.com/link-assistant/meta-expression/pull/134

Follow-up PR: https://github.com/link-assistant/meta-expression/pull/135

## Summary

Issue #133 reports a Translate regression for `Hawaii is a state.` on
`v0.12.0`: the Russian output rendered `штат` as a Wikidata link for `Q35657`
instead of the Russian Wikipedia article `Штат США`. The issue also tightened
the Translate defaults and UI contract:

1. Default source priority is `Wikipedia, Wikidata, Wiktionary, Virtual
overrides`.
2. Default link target mode is Wikipedia with Wikidata fallback.
3. The Translate link-target radio group is replaced by one unchecked checkbox:
   "replace wikidata links with our own viewer".
4. Word context reporting shows broader transitive context chains, not only
   direct claims.
5. Wikipedia article translation is a top-level input mode; the user provides
   either text or an article URL/title, not both at once.
6. The investigation, online research, CI logs, reproductions, and solution
   notes are compiled in this folder.

The fixed live after-state is captured in
[`live-translation-after.json`](live-translation-after.json). It renders:

```text
[Гавайи](https://ru.wikipedia.org/wiki/%D0%93%D0%B0%D0%B2%D0%B0%D0%B9%D0%B8 "Q782")
[это](https://en.wiktionary.org/wiki/%D1%8D%D1%82%D0%BE "wikt:ru:это#Determiner:0")
[штат](https://ru.wikipedia.org/wiki/%D0%A8%D1%82%D0%B0%D1%82_%D0%A1%D0%A8%D0%90 "Q35657").
```

Follow-up PR #135 covers the later `California is a state.` regression from
the latest issue comment. `Q99` came from a virtual semantic-lexicon concept
whose local URL was Wikidata, so immediate translation returned before the
target-language entity lookup could use the live `ruwiki` sitelink. The fixed
target for `Калифорния` is:

```text
https://ru.wikipedia.org/wiki/%D0%9A%D0%B0%D0%BB%D0%B8%D1%84%D0%BE%D1%80%D0%BD%D0%B8%D1%8F
```

## Files

- [`issue.json`](issue.json) and [`issue-comments.json`](issue-comments.json):
  issue metadata captured from GitHub.
- [`issue-latest.json`](issue-latest.json) and
  [`issue-comments-latest.json`](issue-comments-latest.json): refreshed
  metadata after the follow-up California comment.
- [`pr-134.json`](pr-134.json), review comments, and reviews: PR metadata
  captured before the fix.
- [`ci-logs/js-checks-26986686564.log`](ci-logs/js-checks-26986686564.log):
  failed JS workflow log showing the missing changeset failure.
- [`ci-logs/js-checks-27068274619.log`](ci-logs/js-checks-27068274619.log):
  failed PR #135 placeholder workflow log showing the same active-changeset
  failure before implementation.
- [`ci-logs/js-parity-79640971351.log`](ci-logs/js-parity-79640971351.log):
  fresh post-push CI job log showing the mirrored Rust modules that needed the
  same semantic-lexicon and word-context changes.
- [`focused-tests-before.log`](focused-tests-before.log): failing regression
  tests before implementation.
- [`focused-tests-after.log`](focused-tests-after.log) and
  [`related-tests.log`](related-tests.log): passing local verification.
- [`california-translation-debug-log.txt`](california-translation-debug-log.txt):
  debug log from the issue comment's Gist.
- [`focused-california-before.log`](focused-california-before.log) and
  [`focused-california-after.log`](focused-california-after.log): focused
  failing/passing regression logs for PR #135.
- [`live-translation-before.json`](live-translation-before.json) and
  [`live-translation-after.json`](live-translation-after.json): real Wikimedia
  before/after captures for the reported sentence.
- [`wikidata-q35657-sitelinks.json`](wikidata-q35657-sitelinks.json),
  [`wikidata-q782-sitelinks.json`](wikidata-q782-sitelinks.json),
  [`wikidata-q99-sitelinks.json`](wikidata-q99-sitelinks.json),
  [`ruwiki-state-summary.json`](ruwiki-state-summary.json),
  [`ruwiki-hawaii-summary.json`](ruwiki-hawaii-summary.json), and
  [`ruwiki-california-summary.json`](ruwiki-california-summary.json): online
  research artifacts.
- UI screenshots are committed in
  [`../../screenshots/issue-133`](../../screenshots/issue-133).

## Reproduction

Automated reproduction is in `js/tests/integration/issue-133.test.js`.

Manual reproduction:

1. Open the Translate page.
2. Use `Hawaii is a state.`, source `en`, target `ru`.
3. Leave sources in default order and leave the local-viewer checkbox unchecked.
4. Click Translate.
5. Confirm `штат` points at
   `https://ru.wikipedia.org/wiki/%D0%A8%D1%82%D0%B0%D1%82_%D0%A1%D0%A8%D0%90`
   and the formalization uses source order
   `wikipedia,wikidata,wiktionary,virtual-source-overrides`.
