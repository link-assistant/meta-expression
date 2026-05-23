# Issue 54 Requirements

## Source Requirement Matrix

| ID  | Requirement                                                                                                         | Status                     | Evidence                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Study `link-assistant/formal-ai` and copy as many relevant test cases as practical.                                 | Done                       | `formal-ai` was cloned and reviewed at commit `a4999861759ad688f55198b893af378f3da350df`; focused compatibility cases were added in JS and Rust.                                      |
| R2  | Support formalization in Rust and JavaScript for Formal AI use.                                                     | Done                       | JS formalization has pre/post hooks, trace steps, CST/AST linguistic metadata, and links-network relation records. Rust exposes deterministic transformation and metadata primitives. |
| R3  | Support naturalization, also available as deformalization.                                                          | Done                       | JS translation result and CST expose `deformalization`; Rust exposes `deformalize_semantic_translation()`.                                                                            |
| R4  | Support translation.                                                                                                | Done                       | JS translation has before/after translation hooks, naturalization/deformalization hooks, and semantic links carrying source fragment roles. Rust test covers semantic translation.    |
| R5  | Keep Rust and JavaScript behavior in sync where APIs overlap.                                                       | Done                       | Both runtimes now have ordered text transformation rules, naturalization/deformalization naming, and deterministic linguistic metadata extraction for shared structural categories.   |
| R6  | Make the pipeline customizable with transformation rules before and after formalization.                            | Done                       | `FormalizeOptions` now accepts `beforeFormalizationRules`, `preFormalizationRules`, `afterFormalizationRules`, and `postFormalizationRules`.                                          |
| R7  | Make naturalization/deformalization customizable.                                                                   | Done                       | `TranslateOptions` now accepts before/after naturalization and deformalization aliases.                                                                                               |
| R8  | Make translation customizable.                                                                                      | Done                       | `TranslateOptions` now accepts before/after translation hooks.                                                                                                                        |
| R9  | Preserve original CST and AST/debug metadata for formalization.                                                     | Done                       | Formalization returns CST phrases with exact source spans, `ast`, `linguisticMetadata`, Links Network entries, and hook trace steps.                                                  |
| R10 | Extract linguistic fragments such as symbols, words, noun phrases, verb phrases, subject/predicate, and SVO layers. | Done                       | JS and Rust extract words, symbols, noun phrases, verb phrases, subject, predicate, object, SVO relations, and dependency-style records by default.                                   |
| R11 | Record relation metadata showing which text part maps to which formal part and how.                                 | Done                       | Fragments carry source spans and phrase ids; CST phrases carry linguistic roles and fragment ids; Links Network records linguistic fragments, dependencies, and relations.            |
| R12 | Work out of the box with zero configuration.                                                                        | Preserved                  | All new hooks are optional and existing tests continue to use the default pipeline.                                                                                                   |
| R13 | Formalization should find exact contextual terms.                                                                   | Improved                   | Entity selection remains compatible; deterministic subject/predicate/object metadata now maps exact contextual terms such as `Moon`, `orbits`, and `Sun` to source spans and roles.   |
| R14 | Collect case-study data under `docs/case-studies/issue-54`.                                                         | Done                       | Tracked markdown plus ignored raw GitHub captures were added.                                                                                                                         |
| R15 | Search online for additional facts and related components.                                                          | Done                       | See `ONLINE-RESEARCH.md`.                                                                                                                                                             |
| R16 | Prepare one pull request and update PR 55.                                                                          | Pending final verification | PR 55 is updated from branch `issue-54-d4e0c163ea88`; it will be marked ready after local verification and push.                                                                      |

## Reproduction Contract

The focused JS and Rust regressions demonstrate the missing compatibility
surface:

1. A caller can rewrite `kitten` to `cat` before formalization.
2. A caller can attach custom metadata after formalization.
3. A caller can rewrite source text before translation.
4. A caller can rewrite the naturalized target surface before it is returned.
5. A caller can treat naturalization and deformalization as the same result.
6. Formalization publishes word/symbol/noun-phrase/verb-phrase fragments.
7. Formalization publishes subject, predicate, object, SVO, dependency, and
   phrase-reference metadata.
8. Translation semantic links preserve source linguistic roles.

Before this PR, those hook options and aliases were absent. After this PR, the
same behavior is covered in `js/tests/integration/issue-54.test.js` and
`rust/tests/unit/issue54_formal_ai.rs`.
