# Issue 50 Case Study: Translate Coverage And Link Targets

Issue: https://github.com/link-assistant/meta-expression/issues/50
PR: https://github.com/link-assistant/meta-expression/pull/51

## Summary

The reported Translate page run translated only a small part of a two-sentence
English technical paragraph into Russian. It also rendered fallback target
phrases as local `human-language` entity links by default, even though those
links were lexical placeholders rather than useful Wikidata or public language
resources.

This PR makes the Translate pipeline complete the reported paragraph without
unresolved questions, keeps local lexical links opt-in, adds a Translate UI
link-target selector, and serializes the default Wikimedia lookup fan-out so
longer text does not burst the APIs.

## Captured Data

Raw issue, PR, search, live CLI, and test logs were captured under
`docs/case-studies/issue-50/data/`. That folder is intentionally ignored by the
repository for large generated artifacts, so the tracked case study summarizes
the relevant before/after findings here.

The browser verification screenshot is tracked at
[`assets/translate-link-target.png`](./assets/translate-link-target.png).

| Capture                     | Before                               | After                        |
| --------------------------- | ------------------------------------ | ---------------------------- |
| Input                       | Reported issue text                  | Same text                    |
| Plain output                | Mixed English/Russian partial output | Fully Russian output         |
| Phrase count                | 33                                   | 31                           |
| Translated phrases          | 3                                    | 28                           |
| Unresolved questions        | 27                                   | 0                            |
| API requests                | 268                                  | 350                          |
| HTTP 429 responses          | 166                                  | 0                            |
| Default local lexical links | Present                              | Absent                       |
| Wiktionary lexical links    | Absent from target fallback          | Present for lexical fallback |

The after output from the live CLI run was:

```text
Первый прототип для основанной на сети ссылок площадки для рассуждений. Он принимает человеко-языковое утверждение, создает выбираемые интерпретации, формализует выбранный смысл когда возможно, вычисляет вычислимые фрагменты, и прикрепляет доказательства с происхождением для невычислимых утверждений.
```

## Root Causes

1. `formalizeTextWith()` searched every generated n-gram concurrently. Each
   n-gram also searched multiple Wikimedia-backed sources, so the reported text
   produced a burst of Wikipedia, Wikidata, and Wiktionary requests and hit
   429s.
2. Translate treated many glossary-backed lexical phrases as unresolved because
   the fallback path only translated a narrow set of phrases and kept asking
   for target labels on source entities that did not have useful Russian labels.
3. Glossary target links could fall back to local `human-language` URLs by
   default. For target lexical strings, a public Wiktionary link is a better
   default; the local viewer is still useful but should be explicit.
4. The web Translate form did not expose the link-target mode, even though
   Formalize already had Wikidata/Wikipedia/local target modes.
5. The reported punctuation around comma-separated clauses was source-visible
   but not preserved after target naturalization.

## Implemented Solution

- Added a reproducing integration test for the reported paragraph, default
  link-target behavior, explicit local-link opt-in, source lookup concurrency,
  and the new web selector.
- Defaulted Translate link targets to Wikidata, while lexical fallback targets
  now resolve to Wiktionary unless the caller explicitly chooses the local
  viewer.
- Added a Translate UI radio group for Wikidata, Wikipedia, and Local viewer
  link targets.
- Expanded the glossary path so it can provide deterministic lexical targets
  without selecting unrelated Wikidata candidates.
- Added bounded source lookup concurrency with a serial default and exposed
  `searchConcurrency` in the public type surface for explicit callers.
- Added retry handling for retryable Wikimedia responses and preserved interior
  source punctuation during target sentence naturalization.

## Verification

- `node --test js/tests/integration/issue-50.test.js`
- `node --test js/tests/integration/issue-35.test.js js/tests/integration/issue-39.test.js js/tests/integration/issue-41.test.js js/tests/integration/issue-48.test.js js/tests/integration/issue-50.test.js`
- `npm test`
- `npm run check`
- Live CLI before/after capture against Wikimedia APIs
- Browser verification of the Translate link-target selector

## CI Follow-Up

The latest PR run at `2026-05-23T16:45:44Z` used head
`600fa79a990a0bb22b5d65c898990012ae8d40c1`. The only failing check was
`JS Checks and release`, job `Test (node on windows-latest)`. The saved log
showed the job failed during `actions/checkout@v6`, before dependencies or
tests:

```text
fatal: Cannot prompt because user interactivity has been disabled.
fatal: could not read Username for 'https://github.com': terminal prompts disabled
The process 'C:\Program Files\Git\bin\git.exe' failed with exit code 128
```

The CI follow-up keeps JavaScript tests to the maintained Bun/Linux target,
keeps Node-based lint/release jobs where the repository scripts require them,
and runs Rust tests fully on Linux with `--all-targets --all-features`. Matching
template findings were filed upstream:

- https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/66
- https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/issues/59

See also:

- [Requirements](./REQUIREMENTS.md)
- [Solution Plan](./SOLUTION-PLAN.md)
- [Online Research](./ONLINE-RESEARCH.md)
