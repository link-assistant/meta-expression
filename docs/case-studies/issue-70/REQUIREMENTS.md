# Issue 70 Requirements

## Requirement Matrix

| ID  | Requirement                                                                  | Status | Evidence                                                                                                            |
| --- | ---------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| R1  | Replace the unnamed parser-free baseline with a parser-backed metadata flow. | Done   | JS emits `metadata.parser` and a parser CST; Rust exposes the same parser descriptor and CST structures.            |
| R2  | Complete role and dependency metadata for reasoning consumers.               | Done   | Existing subject/predicate/object, SVO, and dependency records are preserved and now include parser provenance.     |
| R3  | Add provenance and version metadata for every statement artifact.            | Done   | Fragments, dependencies, relations, AST sentence nodes, CST tokens/symbols/sentences, and metadata roots are typed. |
| R4  | Keep existing CST/AST consumers working without breaking field changes.      | Done   | Existing fields remain in place; new fields are additive and covered by issue 54/64 regressions.                    |
| R5  | Keep Rust and JavaScript overlap aligned.                                    | Done   | Both runtimes expose the parser id `meta-expression-linguistic-parser`, parser version `1`, CST, and provenance.    |

## Reproduction Contract

Before this PR, callers could inspect structural fragments but could not know
which parser produced them, which schema version applied, or where parser CST
ranges sat before materialization into fragments.

After this PR, the issue-70 tests assert that:

1. metadata has a stable parser descriptor;
2. metadata has a parser CST with tokens, symbols, and sentence parse details;
3. subject, predicate, and object extraction still works;
4. every fragment, dependency, relation, and AST sentence is versioned;
5. every reasoning artifact carries parser provenance.
