# Issue 50 Solution Plan

## Investigation Plan

1. Capture the issue, issue comments, PR metadata, PR comments, PR reviews, and
   related code search results through GitHub CLI.
2. Reproduce the reported Translate behavior with the live CLI and save the
   JSON trace.
3. Add a focused integration test that fails on the reported behavior.
4. Trace the formalize and translate pipeline to locate the root causes.
5. Implement scoped pipeline, UI, and type-surface changes.
6. Verify with focused tests, nearby Translate regressions, full tests, live CLI
   capture, and browser UI verification.
7. Update PR 51 with the implemented behavior and test results.

## Considered Solutions

| Option                                                                    | Outcome     | Reason                                                                                                      |
| ------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| Hard-code the reported sentence.                                          | Rejected    | It would satisfy only the issue text and would violate the generalization requirement.                      |
| Use an external concurrency library.                                      | Rejected    | The needed behavior is a small bounded async mapper and the repo already keeps this layer dependency-light. |
| Disable live source search for long text.                                 | Rejected    | It would hide formalization problems instead of improving translation coverage.                             |
| Make local viewer links correct by defaulting all lexical targets there.  | Rejected    | The issue explicitly asked not to default to `human-language` links.                                        |
| Use Wiktionary for lexical target fallbacks and keep local viewer opt-in. | Implemented | It gives public, language-specific target links while preserving the explicit local workflow.               |
| Serialize default source lookup and expose concurrency for callers.       | Implemented | It follows Wikimedia guidance and removes the observed 429s in the live after-capture.                      |

## Implementation Plan

1. Add `js/tests/integration/issue-50.test.js` with the reported paragraph,
   local-link opt-in, default Wikidata target, lookup concurrency, and UI
   selector checks.
2. Add deterministic lexical target helpers so fallback translations can choose
   Wiktionary or local viewer URLs from the same data model.
3. Expand glossary translation to cover common technical prose and remove
   unrelated Wikidata candidate selection from glossary target creation.
4. Add bounded lookup concurrency in `formalizeTextWith()`, default it to serial
   lookups, and expose `searchConcurrency` in the public type definitions.
5. Add retry handling for retryable Wikimedia HTTP responses.
6. Add the Translate link-target selector to the web UI and wire it into
   `translateTextWith()`.
7. Preserve interior punctuation during naturalization so translated clauses
   keep the reported comma structure.
8. Add a patch changeset and case-study documentation.
9. Follow up on PR CI feedback by reducing JavaScript tests to Bun on Linux,
   running full Rust tests on Linux, adding CI job timeouts from the templates,
   and filing matching upstream template issues.

## Follow-Up Work

- Add batching for compatible Wikimedia calls where the source APIs support it.
- Grow the glossary through examples rather than issue-specific single strings.
- Add a dedicated formalization-for-translation strategy that scores candidates
  by source and target language label availability before phrase cover selection.
- Add a target-language morphology layer so future Russian output can improve
  grammar beyond glossary phrase quality.
- Consider exposing optional macOS, Windows, Node.js, and Deno test matrices
  behind explicit repository variables if future cross-platform validation is
  needed.
