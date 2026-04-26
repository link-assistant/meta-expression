# Case Study: Issue #3 - Publish the Web Prototype Independently from npm

## Issue Overview

**Issue:** [link-assistant/meta-expression#3](https://github.com/link-assistant/meta-expression/issues/3)
**Title:** Fix CI/CD
**Created:** 2026-04-26 12:53:41 UTC
**Prepared PR:** [link-assistant/meta-expression#4](https://github.com/link-assistant/meta-expression/pull/4)

The concrete requirement from the issue is that the web pages prototype should
be published regardless of whether npm package publication succeeds.

## Captured Data

The case-study evidence is stored in this folder:

- `data/issue-3.json` - issue body and metadata
- `data/issue-3-comments.json` - issue comments
- `data/pr-4.json` - prepared PR metadata
- `data/pr-4-conversation-comments.json`, `data/pr-4-review-comments.json`,
  `data/pr-4-reviews.json` - PR discussion/review data
- `data/main-runs.json` and `data/branch-runs.json` - recent workflow runs
- `data/checks-and-release-24957473839.json` - first PR verification run after
  the workflow fix
- `data/pages-config.json` - repository GitHub Pages configuration
- `ci-logs/checks-and-release-24953081524.txt` - failed main run from
  2026-04-26 09:14:53 UTC
- `ci-logs/checks-and-release-24957036729.txt` - failed main run from
  2026-04-26 12:49:45 UTC
- `ci-logs/checks-and-release-24957473839.txt` - failed PR verification run
  that exposed Windows line-ending sensitivity in the new workflow test
- `data/npm-view-*.txt` - npm registry lookups used to confirm package-name
  state

## Requirements

1. Publish the static `web/` prototype through GitHub Pages.
2. Do not make that publication depend on npm package publication.
3. Preserve the existing CI quality gate before publication.
4. Keep npm publishing available for future use, but do not let an
   unconfigured package identity repeatedly fail main.
5. Download issue and CI evidence into `docs/case-studies/issue-3`.
6. Document timeline, root causes, solution plan, and relevant external facts.
7. Add a reproducing automated test for the workflow behavior.

## Timeline

- **2026-04-26 09:14:53 UTC** - `Checks and release` run
  `24953081524` starts on `main` at `1eb411c`.
- **2026-04-26 09:17:01 UTC** - The release job detects that
  `my-package@0.8.0` is not published and decides a self-healing release is
  needed (`ci-logs/checks-and-release-24953081524.txt:5797`).
- **2026-04-26 09:17:06 UTC** - npm publish fails with `E404 Not Found - PUT`
  for `my-package` (`ci-logs/checks-and-release-24953081524.txt:5831`).
- **2026-04-26 12:49:42 UTC** - PR #2 merges the first working web prototype.
- **2026-04-26 12:49:45 UTC** - `Checks and release` run
  `24957036729` starts on `main` at `f82fe23`.
- **2026-04-26 12:51:20 UTC** - The release job starts npm publication for
  `my-package@0.9.0` (`ci-logs/checks-and-release-24957036729.txt:5975`).
- **2026-04-26 12:51:48 UTC** - npm publish fails after three attempts
  (`ci-logs/checks-and-release-24957036729.txt:6170`).
- **2026-04-26 12:53:41 UTC** - Issue #3 is opened requesting CI/CD repair and
  independent web prototype publication.
- **2026-04-26 13:12:12 UTC** - The first PR verification run
  `24957473839` exposes that the new workflow regression test was sensitive to
  Windows checkout line endings. The test was updated to normalize line endings
  before inspecting the YAML text.

## Root Causes

### Missing GitHub Pages Deploy Path

The repository has GitHub Pages configured with `build_type: workflow` in
`data/pages-config.json`, but `.github/workflows/release.yml` did not contain a
Pages artifact upload or deployment job. As a result, the web prototype could be
served locally from `web/`, but no workflow published it.

### Web Publication Coupled to Package Release Flow

The only deployment-like path after the test matrix was the `release` job, and
that job was dedicated to npm package publication plus GitHub release creation.
If npm publication failed, there was no independent job that could still deploy
the static prototype.

### npm Package Identity Is Not Configured for This Repository

`package.json` still uses the template package name `my-package` and repository
URL from `link-foundation/js-ai-driven-development-pipeline-template`. The npm
registry lookup captured in `data/npm-view-my-package.txt` shows that
`my-package` already exists at `0.0.0`, while the failed CI logs show this
repository trying to publish `0.8.0` and `0.9.0`. That explains the repeated
permission-style `E404` failures.

npm trusted publishing documentation also says the `repository.url` in
`package.json` must exactly match the GitHub repository used for publishing.
This repository does not currently meet that requirement.

## External Research

GitHub Pages custom workflow documentation states that Pages deployments should
use a Pages artifact and that the deploy job needs `pages: write`,
`id-token: write`, an environment, and a dependency on the build job:
<https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>

The official `actions/deploy-pages` documentation recommends a dedicated deploy
job that deploys a previously uploaded Pages artifact:
<https://github.com/actions/deploy-pages>

npm trusted publishing documentation confirms that OIDC publishing requires a
configured trust relationship and exact package repository metadata:
<https://docs.npmjs.com/trusted-publishers/>

## Solution

The fix adds two jobs to `.github/workflows/release.yml`:

- `build-pages` runs on `main` pushes after `lint` and the full test matrix
  pass. It prepares `_site`, copies `web/` and `src/`, adds a root redirect to
  `web/`, and uploads the official Pages artifact.
- `deploy-pages` depends only on `build-pages` and deploys the artifact with
  `actions/deploy-pages`.

The fix also gates the automatic npm `release` job behind repository variable
`NPM_PUBLISH_ENABLED == 'true'`. This preserves the npm release workflow for
the future while preventing the placeholder package identity from repeatedly
breaking main and blocking unrelated web publication.

A regression test in `tests/workflow.test.js` verifies that:

- the workflow uses the official Pages upload and deploy actions,
- `deploy-pages` depends on `build-pages`, not `release`,
- automatic npm publishing is explicitly opt-in.

## Follow-Up Plan

Before enabling npm publication, choose the intended package name, update
`package.json` and release helper constants, publish or reserve the package as
needed, configure npm trusted publishing for `.github/workflows/release.yml`,
and set repository variable `NPM_PUBLISH_ENABLED` to `true`.

No external upstream GitHub issue was created because the failure is caused by
this repository's workflow and package metadata configuration, not by a defect
in GitHub Pages, GitHub Actions, or npm.
