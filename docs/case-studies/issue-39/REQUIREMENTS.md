# Issue #39 Requirements Audit

## Reported Requirements

| Requirement                                                           | Status                               | Notes                                                                                                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Translate the reported `en -> ru` text instead of preserving English. | Implemented                          | Covered by `tests/issue-39.test.js` and `live-translate-after.json`.                                                                                                        |
| Add a carefully crafted test for this example.                        | Implemented                          | The test first failed against the old behavior and now passes.                                                                                                              |
| Generalize beyond one hard-coded output.                              | Partial                              | The implementation adds a reusable strategy layer, glossary lookup, multi-token decomposition, sentence-boundary-safe grammar filtering, and sentence transformation hooks. |
| Questions should include answer options.                              | Implemented                          | `TranslateResult.questionDetails` contains selected defaults and options.                                                                                                   |
| Default choices should use the most likely option.                    | Implemented for unresolved variables | The default option preserves source text, which matches current traceable fallback behavior.                                                                                |
| Allow switching strategies for selecting likely translation cases.    | Implemented                          | API and UI expose contextual glossary, semantic labels, and lexical glossary.                                                                                               |
| Keep previous test cases working unless they assert nonsense.         | Implemented                          | Issue 16, 35, and 37 translation tests pass after the change.                                                                                                               |
| Translate UI should allow selecting supported example cases.          | Implemented                          | `web/translate-samples.js` and `#translate-sample` cover the reported case plus existing Hawaii cases.                                                                      |
| Download logs and data into `docs/case-studies/issue-39`.             | Implemented                          | Issue, PR, live captures, search results, and test logs are stored under `data/`.                                                                                           |
| Perform online research and document findings.                        | Implemented                          | See `ONLINE-RESEARCH.md`.                                                                                                                                                   |
| Reconstruct timeline, requirements, root causes, and solution plans.  | Implemented                          | See `README.md`, this audit, and `SOLUTION-PLAN.md`.                                                                                                                        |
| Report issues to related projects if needed.                          | Not needed                           | No external project bug was isolated; observed Wikimedia 429 behavior is consistent with API etiquette constraints.                                                         |
| Add debug output or verbose mode if root cause cannot be found.       | Not needed                           | Existing translation steps captured target lookup errors and transformation steps.                                                                                          |

## Verification Evidence

- `data/node-issue-39-before.log`: failing behavior before implementation.
- `data/node-issue-39-after.log`: focused issue #39 tests passing.
- `data/node-related-translation-after.log`: related translation tests passing.
- `data/npm-test.log`: full Node test suite passing.
- `data/npm-check.log`: lint, format, duplication, and docs checks passing.
- `data/bun-test.log`: Bun test suite passing.
- `data/deno-test.log`: Deno test suite passing.
- `data/check-file-line-limits.log`: file line-limit check passing.
- `data/live-translate-before.json`: live source-language result and 429 target lookup failures.
- `data/live-translate-after.json`: live Russian output with no unresolved questions.
- `translate-ui.png` and `translate-ui-mobile.png`: Translate UI smoke
  screenshots after selecting the issue #39 sample and contextual glossary
  strategy.

## Deferred Work

The request asks for support for "as much translation cases for any text as
possible". That remains larger than a single PR without integrating a full MT
system or a larger bilingual lexicon. The forward plan is in
[`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md).
