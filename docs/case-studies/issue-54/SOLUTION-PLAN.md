# Issue 54 Solution Plan

## Investigation Plan

1. Confirm the prepared branch and PR.
2. Capture issue, issue comments, PR metadata, PR comments, PR review comments,
   and PR reviews with GitHub CLI.
3. Clone `link-assistant/formal-ai` and inspect its active test suites.
4. Identify the smallest testable compatibility gaps in this repository.
5. Add reproducing tests before implementation.
6. Implement scoped JavaScript and Rust changes without replacing the whole
   formalization engine.
7. Run focused tests and local repository checks.
8. Commit, push, update PR 55, mark it ready, and inspect post-push CI.

## Considered Solutions

| Option                                                     | Outcome              | Reason                                                                                                                                            |
| ---------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Copy the whole `formal-ai` test suite directly.            | Rejected for this PR | The repositories expose different public APIs; direct copy would create many non-actionable failures unrelated to this library's current surface. |
| Add a full natural-language parser dependency immediately. | Rejected for this PR | The issue asks for broad linguistic layers, but landing a parser stack requires API design, runtime packaging decisions, and quality benchmarks.  |
| Add narrow compatibility hooks and aliases first.          | Implemented          | Formal AI can use these immediately, they are easy to test, and they preserve zero-configuration defaults.                                        |
| Add only JavaScript support.                               | Rejected             | The issue explicitly asks for both Rust and JavaScript support to stay aligned.                                                                   |
| Rename naturalization to deformalization.                  | Rejected             | Existing users already consume `naturalization`; an alias is additive and non-breaking.                                                           |

## Implementation Plan

1. Add JS integration tests for formalization hooks, translation hooks,
   naturalization/deformalization aliases, CST metadata, and trace steps.
2. Add Rust unit tests for ordered text transformation rules and semantic
   translation naturalization/deformalization aliases.
3. Add a shared JS transformation-rule helper that applies function,
   object-apply, declarative replacement, and metadata assignment rules.
4. Wire formalization pre/post hooks into `formalizeTextWith()`.
5. Wire translation pre/post hooks and naturalization hooks into
   `translateTextWith()`.
6. Extend public TypeScript declarations.
7. Add Rust primitives for text transformation and the deformalization alias.
8. Add a changeset for the public API additions.

## Follow-Up Work

- Design a stable linguistic metadata schema for words, symbols, noun phrases,
  verb phrases, subject/predicate, SVO, dependency relations, and coreference.
- Evaluate Universal Dependencies and parser-backed extraction for deeper
  language layers.
- Add a formalization strategy API for contextual term selection and candidate
  reranking.
- Import more `formal-ai` tests as public APIs converge, especially translation
  gap reporting, symbolic answer traces, and summarize/deformalize round trips.
- Add richer Rust parity for formalization and translation once the Rust core
  owns more of the shared pipeline.
