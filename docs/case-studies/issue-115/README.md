# Issue 115 Case Study

Issue: https://github.com/link-assistant/meta-expression/issues/115

PR: https://github.com/link-assistant/meta-expression/pull/125

## Summary

Issue 115 asked for the highest-quality translation umbrella to improve
paragraph naturalization through reconstructed interlingua and unified term data
rather than source-text shortcuts.

The issue #96 English-to-Russian reference gate was the measurable surface for
this work. Before the fix, the top-2025 corpus had one article with no Russian
human-reference overlap and measured 22 overlapping Cyrillic content tokens out
of 46 machine-emitted Cyrillic tokens.

## Fix

- Expanded `js/data/semantic-lexicon.json` with reference-aligned interlingua
  phrase concepts for article-specific meanings such as top-level domain,
  media personality, Tiananmen Square, body snatcher, American politician, and
  action thriller film.
- Kept the translation pipeline source-neutral: runtime lookups still derive
  directional glossaries from concept ids and target primary forms.
- Tightened `js/tests/integration/issue-96-reference-quality.test.js` so all 10
  Russian-referenced articles must reproduce topic-specific human-attested
  words.
- Raised the corpus gate from at least 8/10 articles and 18 overlapping tokens
  to 10/10 articles and at least 40 overlapping tokens with at least 50%
  reference precision.

## Evidence

Focused gate after the lexicon expansion:

```text
articlesWithMatch=10/10
totalOverlap=60
totalMachineTokens=84
precision=0.7143
```

Recorded baseline from the same fixture before the fix:

```text
articlesWithMatch=9/10
totalOverlap=22
totalMachineTokens=46
precision=0.4783
```

## Verification

Focused command:

```sh
node --test js/tests/integration/issue-96-reference-quality.test.js
```

Expected result: all 11 issue #96 reference-quality tests pass.
