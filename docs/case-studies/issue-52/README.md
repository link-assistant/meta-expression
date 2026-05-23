# Issue 52 Translate request-churn case study

Issue 52 reported poor Translate behavior on the text beginning with
"Links Platform planned as a system..." plus large numbers of redundant
Wikimedia requests. The raw transcript and GitHub comment captures were
downloaded during investigation, but the repo intentionally ignores
`docs/case-studies/*/data/`; this note records the durable findings and the
initial CI run metadata is preserved in `ci-logs/issue-52-runs.json`.

## Timeline

- 2026-05-23 18:03:58 UTC: issue 52 opened with the long Translate transcript.
- 2026-05-23 18:04:41 UTC: PR 53 opened from `issue-52-14d124fa6a47`.
- 2026-05-23 18:04:45 UTC: initial Rust and JS workflows started for commit
  `4d1f02cc54cb6dfb2c1a48db157fb553974006e6`.
- 2026-05-23 18:05:02 UTC: JS workflow failed during `Setup Bun` before tests
  ran, with GitHub API `401 Bad credentials` while fetching Bun tags. The full
  log was saved locally under `ci-logs/` for this investigation.
- 2026-05-23 18:34:42 UTC: Rust and JS workflows passed for commit
  `80e60c3c3226c9d1c8b8ca361ec2247d12d5dd18`, while Broken Link Checker
  failed on a stale local `rust/core` link and a timed-out DBpedia homepage.
  The run list and failing log were saved under `ci-logs/`.

## Root causes

1. `fetchWikimediaJson()` only cached successful responses. Repeated missing
   Wiktionary pages such as `/definition/Platform` and `/definition/(Links)`
   were fetched again on each pass.
2. Concurrent requests for the same URL were not coalesced, so duplicate work
   could burst before the first request had a chance to populate the cache.
3. Wiktionary lookup text was passed through too literally. Wrapping
   punctuation and source casing produced avoidable 404s.
4. Wikidata entity hydration requested one `wbgetentities` ID per call even
   when several IDs were requested in the same event-loop turn.
5. Translate question option buttons only updated local button state; they did
   not change the rendered translation, CST snapshot, or Links Notation.
6. The default live Wikimedia cache TTL was one hour, which made browser
   reloads much more likely to repeat expensive lookups.
7. The first regression pass covered request churn and answer application, but
   not the full seven-sentence issue text through translate, formalize, and
   back-translate flows.
8. The latest Broken Link Checker run found a stale README link to `rust/core`
   and a transient timeout from `https://www.dbpedia.org/`.

## Fixes in PR 53

- Cache successful Wikimedia responses and cacheable negative misses with a
  seven-day TTL plus stable one-to-three-day jitter.
- Coalesce in-flight Wikimedia requests per cache instance.
- Normalize Wiktionary lookup surfaces before API calls, while preserving the
  cleaned display text.
- Batch same-tick Wikidata entity hydration into one `ids=Q1|Q2` request.
- Batch same-tick target-language Wikidata label hydration during Translate.
- Apply Translate question answers to phrases, variables, sentences,
  naturalization, CST, and Links Notation.
- Disable the Translate button while a request is in progress and re-render
  the UI when an answer is selected.
- Add exact full-text integration coverage for English-to-Russian translation,
  Russian formalization, and Russian-to-English back translation.
- Extend the deterministic glossary for the issue text so offline regression
  tests do not ask unresolved questions.
- Correct the README Rust workspace link and ignore the DBpedia homepage in the
  link checker, matching the existing external-resource ignore policy.

## Regression coverage

`js/tests/unit/issue-52.test.js` covers the reproduced request-churn paths and
answer application:

- concurrent 404 coalescing and negative caching
- Wiktionary punctuation/case normalization
- same-tick Wikidata entity batching
- same-tick target-language Wikidata label batching during Translate
- question-answer application to Translate output

`js/tests/integration/issue-52.test.js` covers the exact reported source text:

- translate the full text from English to Russian without questions
- formalize the translated Russian text and verify every token is linked
- back-translate the Russian output to English and verify full token coverage
