# Requirements Matrix: Issue #5

This matrix extracts each requirement from
[issue #5](https://github.com/link-assistant/meta-expression/issues/5) and maps
it to the current solution or a follow-up plan.

## Scope Legend

| Mark  | Meaning                             |
| ----- | ----------------------------------- |
| Done  | Implemented in this PR              |
| Next  | Should be implemented after this PR |
| Later | Long-term architecture work         |

## Matrix

| #   | Requirement                                                                           | Scope   | Proposed solution                                                              | Implementation plan                                                                                                            |
| --- | ------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Preserve issue-related data under `docs/case-studies/issue-5`.                        | Done    | Capture issue, PR, comments, screenshot, file tree, and reference data.        | Store raw JSON/text captures in `data/` and the screenshot in `assets/`.                                                       |
| 2   | Search online for additional facts and data.                                          | Done    | Use primary project docs and source captures.                                  | Summarize Wikidata, WDQS, MDN, GitHub, calculator, human-language, link-cli, and Doublets references in `ONLINE-RESEARCH.md`.  |
| 3   | List every requirement and solution plan.                                             | Done    | Keep this matrix as the explicit requirement inventory.                        | Update it as new issue comments refine scope.                                                                                  |
| 4   | Make `Elon Musk is alive` more useful than unknown.                                   | Done    | Add bounded Wikidata-backed fixture evidence for Q317521/P570 absence.         | Return support evidence with provenance and confidence `0.99`, not `1`.                                                        |
| 5   | Use Wikipedia/Wikidata for real-world checking.                                       | Partial | Start with Wikidata structured data; attach Wikipedia summary context later.   | Added live Wikimedia resolver and worker for selected templates; add scoped WDQS and validated Wikipedia text extraction next. |
| 6   | If a person is stated dead, use that as refutation/support as appropriate.            | Done    | Model death-date evidence through P570.                                        | Live resolver treats present P570 as refuting an alive claim/supporting a dead claim; missing P570 is bounded support only.    |
| 7   | Never use `0%` or `100%` for real-world facts.                                        | Done    | Clamp non-computed evidence confidence to `1%..99%`.                           | Keep exact `0/1` only for deterministic computable expressions such as arithmetic.                                             |
| 8   | Keep arithmetic exact in a selected formal system.                                    | Done    | Preserve exact arithmetic equality behavior.                                   | `1 + 1 = 2` remains `100%`; `1 + 1 = 1` remains `0%`.                                                                          |
| 9   | Allow meanings of `1`, `+`, and expressions to be overridden by belief/formal system. | Later   | Add formal-system profiles and symbol dictionaries.                            | Extend `beliefSystem` beyond source weights into operator semantics and custom evaluators.                                     |
| 10  | Support `1 + 1` as a question expression.                                             | Done    | Add `arithmetic-question` formalization.                                       | Evaluate question-like arithmetic fragments to numeric result links.                                                           |
| 11  | Explain what the numeric formalization level means.                                   | Done    | Add `FORMALIZATION_LEVEL_DETAILS` and `describeFormalizationLevel`.            | Surface level name in the web UI and report body.                                                                              |
| 12  | Represent implied statements/dependencies.                                            | Partial | Existing dependency links remain; new docs clarify implied-dependency roadmap. | Add richer dependency extraction for entity names, operators, source claims, and symbol meanings.                              |
| 13  | Interpret `Elon Musk` as a person name reference.                                     | Next    | Add entity-reference interpretation separate from claim evaluation.            | Parse name-like inputs into candidate entity links and ask the user to select/refine.                                          |
| 14  | Support self-referential false statements.                                            | Done    | Detect common self-reference false forms.                                      | Return `self-reference-paradox`, value `undetermined`, confidence `0.5`.                                                       |
| 15  | Add continuous user-belief sliders with false/unknown/true states.                    | Done    | Add a web slider stored in `localStorage`.                                     | Convert non-50% slider values into local `user` support/refute evidence.                                                       |
| 16  | Persist user beliefs locally.                                                         | Done    | Use `localStorage` for current static prototype.                               | Move larger evidence caches to IndexedDB or Doublets-backed storage later.                                                     |
| 17  | Make it easy to report issues from any page/mode/failure.                             | Done    | Add `createIssueReportUrl` and a web `Report Issue` button.                    | Include environment, statement, result, evidence, and Links Notation in the prefilled GitHub issue.                            |
| 18  | Provide many prepared examples.                                                       | Done    | Add `getPreparedExamples` and render web example buttons.                      | Grow examples as new formalization/evidence slices are added.                                                                  |
| 19  | Traverse Wikipedia in a worker thread.                                                | Partial | Use Web Workers for browser-side retrieval/traversal.                          | Browser worker now resolves supported Wikimedia templates; add cancellation, IndexedDB cache, and text-claim extraction next.  |
| 20  | Store everything in human-readable Links Notation in local storage.                   | Next    | Use Links Notation as portable export/import.                                  | Add parser-backed persistence once real `links-notation` dependency is integrated.                                             |
| 21  | Work internally in binary links for Doublets.                                         | Partial | Keep JS links-network schema compatible with future Rust/Doublets mapping.     | Added Rust core with Doublets relation-link encoding; expand to durable storage and parity fixtures next.                      |
| 22  | Support Unicode strings as links sequences.                                           | Later   | Model strings as sequences/trees of character links.                           | Study `link-cli`/LinksPlatform approaches and reimplement the mapping in Rust.                                                 |
| 23  | Infer support/refutation candidates for a statement.                                  | Partial | Derive candidate properties/entities from selected interpretation.             | Controlled templates now cover liveness, capital, and orbit; expand with tests before broad extraction.                        |
| 24  | Reflect all issue requirements across repository parts.                               | Done    | Update core, web, tests, README, and case-study docs.                          | Keep roadmap items traceable rather than pretending large architecture work is done.                                           |
| 25  | Predict future issues and solve before they occur.                                    | Partial | Add explicit uncertainty, local belief evidence, reports, and examples.        | Continue with worker isolation, cache boundaries, and versioned persistence before broad live retrieval.                       |

## Acceptance Criteria for This PR

- `npm test` includes reproductions for the concrete issue examples.
- The static web prototype exposes prepared examples, belief slider,
  formalization level name, evidence counts, and issue reporting.
- The case study documents implemented and deferred requirements clearly.
