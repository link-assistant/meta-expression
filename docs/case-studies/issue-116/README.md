# Issue 116 Case Study: GitHub Pages UI Buttons Did Not Work

## Summary

Issue #116 reported that the deployed static prototype at
`https://link-assistant.github.io/meta-expression/web` rendered, but no UI
button behaved correctly. The browser console showed the root failure: the
module graph tried to load Node.js built-in specifiers, starting with `node:fs`
and `node:url`, from a browser page.

The immediate break happened before event handlers could run. Once the browser
failed to load the app module graph, navigation and action buttons had no live
JavaScript behind them.

## Evidence

- Original issue screenshot:
  [`assets/issue-screenshot.png`](./assets/issue-screenshot.png)
- Live console capture before the fix:
  [`data/live-console-before.txt`](./data/live-console-before.txt)
- GitHub issue metadata:
  [`data/issue-116.json`](./data/issue-116.json)
- PR metadata and comment channels:
  [`data/pr-117.json`](./data/pr-117.json),
  [`data/pr-review-comments.json`](./data/pr-review-comments.json),
  [`data/pr-conversation-comments.json`](./data/pr-conversation-comments.json),
  [`data/pr-reviews.json`](./data/pr-reviews.json)
- Local after-fix browser screenshot:
  [`assets/local-after-fix.png`](./assets/local-after-fix.png)

## Timeline

- 2026-05-26 19:41 UTC: Issue #116 opened with a screenshot showing browser
  console errors for `node:fs` and `node:url`.
- 2026-05-26 19:43 UTC: The deployed page was reproduced with Playwright. The
  console showed four errors, all caused by blocked `node:` module loads.
- 2026-05-26 19:49 UTC: A local e2e module-graph test was added and failed,
  showing six browser-load violations: four unmapped `links-notation` bare
  imports and two `node:` imports.
- 2026-05-26 19:51 UTC: The fixed local page loaded with zero console errors,
  navigation buttons switched pages, and Check/Translate actions executed.

## Root Causes

1. `web/app.js` imports `../js/src/index.js` directly, so GitHub Pages serves
   the repository source modules as a native browser ESM graph.
2. `js/src/semantic-lexicon.js` statically imported `node:fs` and `node:url` to
   synchronously read `js/data/semantic-lexicon.json`. Browsers cannot load
   Node.js built-ins, so the module graph failed before app startup.
3. After tracing the graph, there was a second latent browser failure:
   `links-notation` is used by several modules as a bare package specifier, but
   the static page had no import map and the Pages artifact did not include that
   package path.
4. The Pages artifact copied `js/src` but not `js/data`, so changing the lexicon
   to a browser JSON module also required publishing `js/data`.

## Fix

- `js/src/semantic-lexicon.js` now loads `../data/semantic-lexicon.json` with
  browser `fetch` when served from GitHub Pages and dynamic Node file readers
  when loaded from the local filesystem. This keeps the existing synchronous
  public API without static `node:` imports in the browser graph.
- `web/index.html` now declares an import map for `links-notation`.
- The Pages build installs dependencies, copies the required
  `links-notation/dist` files, and includes `js/data` in the static artifact.
- `scripts/verify-web-module-graph.mjs` validates the native browser module
  graph for invalid `node:` imports, unmapped bare imports, and deployed
  JavaScript/JSON content types.
- `js/tests/e2e/issue-116.test.js` runs the verifier locally.
- The GitHub Actions Pages flow runs the same verifier before uploading the
  artifact and again after deployment.

## Verification

Local focused check:

```bash
node --test js/tests/e2e/issue-116.test.js
```

Manual browser verification:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173/web/?statement=Earth+orbits+the+Sun
```

Observed result: zero browser console errors; navigation buttons work; Check and
Translate actions run.

## Related Notes

No upstream project bug was identified. The failure was caused by this
repository's static deployment shape and browser module graph, so no external
GitHub issue was opened.
