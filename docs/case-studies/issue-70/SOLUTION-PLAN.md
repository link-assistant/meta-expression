# Issue 70 Solution Plan

## Investigation Plan

1. Read issue 70, issue 58 tracking context, PR 85 metadata, and related issue
   54/64 implementations.
2. Locate the JavaScript and Rust linguistic metadata extractors and the
   downstream formalization/Links Network consumers.
3. Add focused failing tests for parser descriptors, parser CST, provenance,
   version fields, and preserved subject/predicate/object extraction.
4. Implement additive metadata fields without changing existing fragment,
   dependency, relation, or AST consumer fields.
5. Run focused JS/Rust regressions, then repository checks.
6. Update PR 85 and mark it ready after verification.

## Considered Solutions

| Option                                            | Outcome     | Reason                                                                                                      |
| ------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| Add a large external natural-language parser.     | Rejected    | The issue can be satisfied by making the current deterministic parser explicit without adding runtime risk. |
| Replace existing AST/CST field shapes.            | Rejected    | Issue 70 explicitly requires existing CST consumers to keep working.                                        |
| Add parser metadata only in JavaScript.           | Rejected    | Issue 54 established a shared JS/Rust metadata surface where APIs overlap.                                  |
| Add parser CST and provenance as additive fields. | Implemented | This completes the reasoning metadata contract while preserving all current callers.                        |

## Implementation Plan

1. Add `js/tests/integration/issue-70.test.js`.
2. Add `rust/tests/unit/issue70_reasoning_metadata.rs`.
3. Introduce a stable parser descriptor:
   `meta-expression-linguistic-parser`, version `1`.
4. Add parser CST roots containing token, symbol, sentence, phrase-range,
   dependency-slot, relation, and materialized id metadata.
5. Add provenance/version fields to fragments, dependencies, relations, AST
   sentence nodes, CST nodes, and metadata roots.
6. Preserve existing fields and update TypeScript declarations.
7. Preserve parser metadata in Links Network linguistic entries.
8. Add a changeset and case-study notes.
