# Research Notes for Issue #3

## GitHub Pages

Sources:

- GitHub Docs: <https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>
- `actions/deploy-pages`: <https://github.com/actions/deploy-pages>
- `actions/upload-pages-artifact`: <https://github.com/actions/upload-pages-artifact>

Findings:

- Workflow-based GitHub Pages deployment expects a build/upload step and a
  deploy step.
- The deploy job needs `pages: write` and `id-token: write` permissions.
- The deploy job should depend on the job that uploads the Pages artifact.
- A static site can be deployed without npm package publication.

## npm Trusted Publishing

Sources:

- npm trusted publishers: <https://docs.npmjs.com/trusted-publishers/>
- npm package metadata: <https://docs.npmjs.com/cli/v11/configuring-npm/package-json>

Findings:

- Trusted publishing uses OIDC and should avoid long-lived npm tokens.
- The GitHub workflow must have `id-token: write` for npm OIDC publication.
- npm requires package trusted-publisher configuration to match the GitHub
  organization, repository, and workflow filename.
- npm also requires `package.json` `repository.url` to match the GitHub
  repository used for publishing.
- This repository still has template package metadata, so automatic npm
  publication should stay disabled until package identity is corrected.

## Related Components

Useful existing components for this issue:

- `actions/configure-pages`
- `actions/upload-pages-artifact`
- `actions/deploy-pages`
- npm trusted publishing with GitHub Actions OIDC

No third-party replacement library is needed; the official GitHub Pages actions
cover the required static deployment path.
