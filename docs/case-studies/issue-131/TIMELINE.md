# Issue 131 - Timeline

## 2026-05-31 22:54 UTC

Issue #131 was opened with the Translate-page input:

```text
California (/ˌkælɪˈfɔːrniə/) is a state in the Western United States that lies on the Pacific Coast.
```

The issue included a debug log gist and reported bad formalization,
naturalization, and translation output.

## 2026-05-31 23:40 UTC

The prepared PR #132 ran CI at commit
`13c36686c6d21fdc95652a52f8d4000724435a59`.

- Rust Checks: passed.
- JS Checks and release: failed.

The JS failure was in the package-identity test because the branch had no active
changeset targeting `meta-expression`.

## Investigation

The issue, PR metadata, comments, debug log, and failed CI log were downloaded
into this case-study folder. The debug log showed the exact bad output from the
user report, and the CI log showed the independent changeset failure.

## Reproduction tests

Focused integration tests were added for:

- bracket punctuation in phrase links;
- parenthesized IPA preservation;
- preposition-ending phrasal verbs;
- fallback for known `lie` + particle phrases;
- the virtual source override layer;
- the full California sentence, including Russian case/relative-clause wording;
- experimental linked-article translation and cache behavior;
- Translate-page article-context wiring.

The first focused test run failed before the implementation and is preserved at
[`logs/node-issue-131-red.log`](logs/node-issue-131-red.log).

## Implementation

The first implementation introduced shared tokenization,
pronunciation-preserving translation punctuation stitching,
phrasal-verb-aware phrase search, local semantic lexicon entries, and a patch
changeset.

## 2026-06-01 10:05 UTC

A PR comment clarified that virtual source overrides, recursive article
translation, and Russian grammar quality are all in issue #131 scope. The PR was
converted back to draft and the implementation was expanded to add:

- `virtual-source-overrides` as a default source tier and semantic supplement;
- source-backed grammatical forms for the reported Russian sentence;
- disabled-by-default linked Wikipedia summary translation;
- Translate-page article-context controls.

## Verification

Focused issue #131 and nearby regression tests pass locally. The post-fix live
translation output is preserved at
[`data/live-translate-after.json`](data/live-translate-after.json), and the
green focused test log is preserved at
[`logs/node-focused-green.log`](logs/node-focused-green.log).
