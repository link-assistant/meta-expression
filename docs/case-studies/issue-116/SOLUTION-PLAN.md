# Issue 116 Solution Plan

## Plan

1. Capture the issue, PR, comment, and screenshot evidence locally.
2. Reproduce the public GitHub Pages failure in a real browser and save the
   console output.
3. Trace the static module graph from `web/index.html` through `web/app.js` and
   `js/src/index.js`.
4. Add an automated browser-module-graph regression test that fails for static
   `node:` imports, unmapped bare specifiers, and missing JSON resources.
5. Remove the static Node built-in imports from the browser graph.
6. Teach the static web page how to resolve package imports and publish the
   required package/data files in the GitHub Pages artifact.
7. Verify the fixed UI locally with Playwright and save an after-fix screenshot.
8. Add CI coverage before artifact upload and after deployment so this exact
   failure cannot silently return.
9. Update PR #117 with the implementation summary, tests, and visual evidence.

## Final Design

- `semantic-lexicon.js` resolves the lexicon URL with `import.meta.url`.
- When the URL is HTTP or HTTPS, the module fetches the JSON data during module
  initialization. That is the GitHub Pages path.
- When the URL is a local file URL, the module dynamically imports Node file
  helpers and preserves the existing synchronous cache behavior for tests and
  local CLI usage.
- `web/index.html` defines an import map for the `links-notation` bare package
  specifier before the module script runs.
- The Pages build copies `js/data` and `node_modules/links-notation/dist` into
  `_site` because the static page imports directly from repository source files.
- `verify-web-module-graph.mjs` follows static imports, module workers, and
  `new URL(..., import.meta.url)` JSON/JS resources from the page entrypoint.

## Current Status

Implemented locally. Focused tests and full checks are run after formatting
before pushing the PR branch.
