# Issue #41 Requirements Audit

## Reported Requirements

| Requirement                                                                                       | Status      | Notes                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Do not translate the reported Russian text as unrelated entities.                                 | Implemented | Covered by `tests/issue-41.test.js` and `live-translate-after.json`.                                                                                     |
| Make formalization less fake and less example-specific.                                           | Partial     | The candidate filter now rejects snippet-only full-text hits without direct label/title evidence, which addresses the root cause beyond this one phrase. |
| Add a reproducing test.                                                                           | Implemented | `node-issue-41-before.log` captures both failing assertions before the fix.                                                                              |
| Preserve previous Translate behavior.                                                             | Implemented | Issue 21, 35, 37, 39 related tests pass after the change.                                                                                                |
| Download logs and data into `docs/case-studies/issue-41`.                                         | Implemented | Issue/PR metadata, live captures, related search data, and test logs are stored under `data/`.                                                           |
| Perform online research and document findings.                                                    | Implemented | See `ONLINE-RESEARCH.md`.                                                                                                                                |
| Reconstruct timeline, requirements, root causes, and solution plan.                               | Implemented | See `README.md`, this audit, and `SOLUTION-PLAN.md`.                                                                                                     |
| Reorganize the full repository into `js/src`, `rust/src`, wasm-first web, and split CI workflows. | Deferred    | This is larger than the reported bug and risks unrelated churn in this PR.                                                                               |
| Report upstream issues if needed.                                                                 | Not needed  | No external bug was found; the failure was local misuse of full-text search results as entity-linking evidence.                                          |

## Verification Evidence

- `data/node-issue-41-before.log`: focused failing reproduction.
- `data/node-issue-41-after.log`: focused issue #41 tests passing.
- `data/node-issue-39-after.log`: existing Translate strategy tests passing.
- `data/node-issue-35-after.log`: existing Hawaii translation tests passing.
- `data/node-issue-37-after.log`: grammar/reporting tests passing.
- `data/node-issue-21-context-after.log`: source-tier and context tests passing.
- `data/npm-test.log`: full Node test suite passing.
- `data/npm-check.log`: lint, formatting, duplication, and docs checks passing.
- `data/bun-test.log`: Bun test suite passing.
- `data/deno-test.log`: Deno test suite passing.
- `data/cargo-test.log`: Rust core tests passing.
- `data/check-file-line-limits.log`: repository file line limits passing.
- `data/live-translate-before.json`: live capture before the fix.
- `data/live-translate-after.json`: live capture after the fix.

## Deferred Work

The larger architecture requests are tracked as future work in
[`SOLUTION-PLAN.md`](./SOLUTION-PLAN.md). They should be split into separate
PRs because they are release-engineering and package-layout changes rather than
the root cause of this Translate bug.
