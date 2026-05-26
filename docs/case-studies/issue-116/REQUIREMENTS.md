# Issue 116 Requirements

## Source Request

Issue #116 reported that the public GitHub Pages UI at
`https://link-assistant.github.io/meta-expression/web/?statement=Earth+orbits+the+Sun`
rendered but no buttons worked. The attached screenshot showed browser console
errors while loading `node:fs` and `node:url` from the static page.

## Requirements and Status

| Requirement                                       | Status | Evidence                                                                                                                                                                               |
| ------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reproduce the deployed browser failure            | Done   | `data/live-console-before.txt` captures the four `node:` loading errors from the live page.                                                                                            |
| Preserve the original issue evidence locally      | Done   | `assets/issue-screenshot.png` stores the issue screenshot and `data/issue-116.json` stores issue metadata.                                                                             |
| Fix the GitHub Pages module graph                 | Done   | `js/src/semantic-lexicon.js` no longer has static Node built-in imports, `web/index.html` maps `links-notation`, and the Pages artifact includes `js/data` plus `links-notation/dist`. |
| Add a regression test                             | Done   | `js/tests/e2e/issue-116.test.js` verifies the browser module graph has no static `node:` imports or unmapped bare specifiers and includes the semantic lexicon data.                   |
| Verify the deployed artifact shape before publish | Done   | The Pages workflow runs `scripts/verify-web-module-graph.mjs --root _site` before upload.                                                                                              |
| Verify the deployed page after publish            | Done   | The Pages workflow runs the same verifier against the deployed Pages URL after `actions/deploy-pages`.                                                                                 |
| Document the investigation and outcome            | Done   | `README.md`, this requirements file, `SOLUTION-PLAN.md`, and `ONLINE-RESEARCH.md` preserve the case-study notes.                                                                       |

## Out of Scope

- No upstream bug report is needed. The issue was caused by this repository's
  static artifact and browser module graph.
- No UI redesign is included. The broken behavior was caused by JavaScript
  startup failure, not button markup or styling.
