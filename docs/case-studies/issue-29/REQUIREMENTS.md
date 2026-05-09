# Requirements

| ID  | Requirement                                                         | Status | Acceptance check                                                                                                                     |
| --- | ------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Add issue reporting on each web page.                               | Done   | `web/index.html` has a global `#report-issue-global` link available outside page-specific panels.                                    |
| R2  | Prefill a GitHub issue with current page content/state.             | Done   | `web/page-report.js` collects page-specific sections for Analyse, Compare, Formalize, Translate, and Preferences.                    |
| R3  | Keep the user flow one click from the app to GitHub.                | Done   | Report links update their `href` on pointer/focus/click and open `/issues/new` with title, body, and labels.                         |
| R4  | Include environment diagnostics.                                    | Done   | Reports include page, version, commit, URL, locale, theme, user agent, and timestamp.                                                |
| R5  | Track deployed GitHub Pages app version.                            | Done   | The Pages workflow writes `_site/web/app-version.json` with package version, commit SHA, ref, build time, and source.                |
| R6  | Match the calculator reference behavior where relevant.             | Done   | The solution follows calculator's page-state-to-issue-URL pattern while adapting sections to this app's pages.                       |
| R7  | Compile issue data and analysis under `docs/case-studies/issue-29`. | Done   | Raw issue/PR/reference data and analysis documents are committed under this folder.                                                  |
| R8  | Add automated regression coverage.                                  | Done   | `tests/issue-29.test.js` covers report URL/body generation, version metadata loading, HTML wiring, and workflow metadata generation. |

## Page-Critical State

| Page        | Captured state                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Analyse     | Statement, selected interpretation, result metrics, candidates, alternatives, dependencies, definitions, confirmations, refutations, reasoning trace, Links Notation. |
| Compare     | Claim rows with correctness and confidence values.                                                                                                                    |
| Formalize   | Input text, n-gram/link/source/display options, status, rendered result, contexts, big contexts, top interpretations, Markdown, Links Notation, overrides.            |
| Translate   | Input text, source/target languages, status, formalized input, translated result, questions, Markdown, Links Notation, CST, steps.                                    |
| Preferences | Worldview sliders, religion sliders when visible, selected context, exported Links Notation, normalized profile JSON.                                                 |
