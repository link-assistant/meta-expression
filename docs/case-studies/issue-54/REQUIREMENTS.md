# Issue 54 Requirements

## Source Requirement Matrix

| ID  | Requirement                                                                                                         | Status                     | Evidence                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Study `link-assistant/formal-ai` and copy exactly all upstream Formal AI test case identities into local coverage.  | Done                       | `js/tests/fixtures/formal-ai-test-corpus.json` indexes all 706 upstream test cases from 61 files at commit `e1467d531534af582a2f457e69695ac6861131b8`; `issue-54-formal-ai-corpus.test.js` asserts the pinned counts and key cases.               |
| R2  | Support formalization in Rust and JavaScript for Formal AI use.                                                     | Done                       | JS formalization has pre/post hooks, trace steps, CST/AST linguistic metadata, and links-network relation records. Rust exposes deterministic transformation and metadata primitives.                                                             |
| R3  | Support naturalization, also available as deformalization.                                                          | Done                       | JS translation result and CST expose `deformalization`; Rust exposes `deformalize_semantic_translation()`.                                                                                                                                        |
| R4  | Support translation.                                                                                                | Done                       | JS translation has before/after translation hooks, Formal AI prompt parsing, naturalization/deformalization hooks, and semantic links carrying source fragment roles. Rust covers the matching deterministic Formal AI phrase/common-noun corpus. |
| R5  | Keep Rust and JavaScript behavior in sync where APIs overlap.                                                       | Done                       | Both runtimes now have ordered text transformation rules, naturalization/deformalization naming, and deterministic linguistic metadata extraction for shared structural categories.                                                               |
| R6  | Make the pipeline customizable with transformation rules before and after formalization.                            | Done                       | `FormalizeOptions` now accepts `beforeFormalizationRules`, `preFormalizationRules`, `afterFormalizationRules`, and `postFormalizationRules`.                                                                                                      |
| R7  | Make naturalization/deformalization customizable.                                                                   | Done                       | `TranslateOptions` now accepts before/after naturalization and deformalization aliases, including `pre*` and `post*` forms, and keeps transformed outputs synchronized.                                                                           |
| R8  | Make translation customizable.                                                                                      | Done                       | `TranslateOptions` now accepts before/after translation hooks.                                                                                                                                                                                    |
| R9  | Preserve original CST and AST/debug metadata for formalization.                                                     | Done                       | Formalization returns CST phrases with exact source spans, `ast`, `linguisticMetadata`, Links Network entries, and hook trace steps.                                                                                                              |
| R10 | Extract linguistic fragments such as symbols, words, noun phrases, verb phrases, subject/predicate, and SVO layers. | Done                       | JS and Rust extract words, symbols, noun phrases, verb phrases, subject, predicate, object, SVO relations, and dependency-style records by default.                                                                                               |
| R11 | Record relation metadata showing which text part maps to which formal part and how.                                 | Done                       | Fragments carry source spans and phrase ids; CST phrases carry linguistic roles and fragment ids; Links Network records linguistic fragments, dependencies, and relations.                                                                        |
| R12 | Work out of the box with zero configuration.                                                                        | Preserved                  | All new hooks are optional and existing tests continue to use the default pipeline.                                                                                                                                                               |
| R13 | Formalization should find exact contextual terms.                                                                   | Improved                   | Entity selection remains compatible; deterministic subject/predicate/object metadata now maps exact contextual terms such as `Moon`, `orbits`, and `Sun` to source spans and roles.                                                               |
| R14 | Collect case-study data under `docs/case-studies/issue-54`.                                                         | Done                       | Tracked markdown records the requirements, plan, formal-ai audit, research notes, and verification details; ignored raw-capture scratch space is documented for local regeneration.                                                               |
| R15 | Search online for additional facts and related components.                                                          | Done                       | See `ONLINE-RESEARCH.md`.                                                                                                                                                                                                                         |
| R16 | Prepare one pull request and update PR 55.                                                                          | Pending final verification | PR 55 is updated from branch `issue-54-d4e0c163ea88`; it will be marked ready after local verification and push.                                                                                                                                  |

## Reproduction Contract

The focused JS and Rust regressions demonstrate the missing compatibility
surface:

1. The local corpus fixture contains every upstream Formal AI test identity from
   the pinned source commit: 534 Rust tests and 172 JavaScript/Playwright tests.
2. A caller can rewrite `kitten` to `cat` before formalization.
3. A caller can attach custom metadata after formalization.
4. A caller can rewrite source text before translation.
5. A caller can parse and answer Formal AI translation prompts in English,
   Russian, Hindi, and Chinese without configuration.
6. A caller can rewrite the naturalized target surface before it is returned.
7. A caller can use deformalization aliases for naturalization hooks.
8. Post-naturalization/deformalization rules keep top-level text, CST, and links
   notation aligned with the transformed naturalization result.
9. A caller can treat naturalization and deformalization as the same result.
10. Formalization publishes word/symbol/noun-phrase/verb-phrase fragments.
11. Formalization publishes subject, predicate, object, SVO, dependency, and
    phrase-reference metadata.
12. Translation semantic links preserve source linguistic roles.

Before this PR, those hook options and aliases were absent. After this PR, the
same behavior is covered in `js/tests/integration/issue-54.test.js` and
`rust/tests/unit/issue54_formal_ai.rs`. Exact upstream corpus coverage is
covered by `js/tests/integration/issue-54-formal-ai-corpus.test.js`.
