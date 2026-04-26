# Issue 7 Case Study: Moon Orbits The Sun

Issue: https://github.com/link-assistant/meta-expression/issues/7
PR: https://github.com/link-assistant/meta-expression/pull/8

## Captured Data

| File                                                                                   | Purpose                                                   |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [`data/issue-7.json`](./data/issue-7.json)                                             | Original issue body and metadata                          |
| [`data/issue-7-comments.json`](./data/issue-7-comments.json)                           | Issue comments captured through the GitHub API            |
| [`data/pr-8.json`](./data/pr-8.json)                                                   | Draft pull request metadata                               |
| [`data/pr-8-conversation-comments.json`](./data/pr-8-conversation-comments.json)       | PR conversation comments                                  |
| [`data/pr-8-review-comments.json`](./data/pr-8-review-comments.json)                   | PR inline review comments                                 |
| [`data/pr-8-reviews.json`](./data/pr-8-reviews.json)                                   | PR reviews                                                |
| [`data/report-issue-code-search.txt`](./data/report-issue-code-search.txt)             | Related report-issue code search results                  |
| [`data/wikidata-code-search.txt`](./data/wikidata-code-search.txt)                     | Related Wikidata code search results                      |
| [`data/p397-code-search.txt`](./data/p397-code-search.txt)                             | Related parent astronomical body search results           |
| [`data/live-moon-orbits-sun-analysis.json`](./data/live-moon-orbits-sun-analysis.json) | Live Wikimedia analysis capture for `Moon orbits the Sun` |
| [`data/related-upstream-issues.json`](./data/related-upstream-issues.json)             | Related reuse proposal issue URLs                         |
| [`assets/issue-screenshot.png`](./assets/issue-screenshot.png)                         | Original screenshot from the issue                        |
| [`web-moon-orbit-result.png`](./web-moon-orbit-result.png)                             | Browser verification screenshot after the fix             |

## Requirements

| Requirement                                                               | Status   | Notes                                                                                                                                                                                |
| ------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Make `Moon orbits the Sun` useful rather than unknown or wrongly refuted. | Done     | Fixture and live paths now support the parent astronomical body chain `Q405 -> Q2 -> Q525` through `P397`.                                                                           |
| Support planets and moons with real Wikimedia data.                       | Improved | The live orbit resolver follows bounded `P397` chains, so direct planet-Sun and moon-planet-Sun cases share the same implementation.                                                 |
| Show reasoning steps with `moon`, `orbit`, and `sun` mapped to Q/P IDs.   | Done     | Evidence context and links network include `meaning` links for `Moon -> Q405`, `orbits -> P397`, and `Sun -> Q525`, plus step links for each `P397` hop.                             |
| Make Q/P IDs linkable in the browser.                                     | Done     | Link rows now render source anchors when a link value carries a Wikidata source URL.                                                                                                 |
| Make issue reporting prefill GitHub reliably.                             | Done     | The web action is now an ordinary anchor whose `href` is refreshed with a prefilled issue URL; report bodies include interpretations, evidence, reasoning trace, and Links Notation. |
| Keep belief-system work visible.                                          | Partial  | Existing local belief slider and source weighting remain; richer context tabs and named belief profiles stay on the roadmap.                                                         |
| Continue Rust/WASM and associative storage direction.                     | Deferred | Tracked in top-level requirements and roadmap; this fix stays in the current JavaScript live evidence slice.                                                                         |

## Root Causes

1. The fixture evidence only covered `Earth orbits the Sun`, so the screenshot
   path rendered `Moon orbits the Sun` as unknown before live evidence arrived.
2. Live Wikidata search selected the first exact label match. For `Moon`, the
   first result can be the surname item `Q16877383`; for `Sun`, non-astronomy
   items can also rank ahead of the star.
3. The orbit resolver only checked the subject's direct `P397` value. The Moon
   has direct parent astronomical body `Q2` Earth, and Earth has direct parent
   astronomical body `Q525` Sun.
4. The web report action was button-driven and opened a generated URL at click
   time. Making it an anchor exposes the final prefilled URL directly to the
   browser and review tools.

## Implemented Solution

- Added astronomy-aware Wikidata search scoring for orbit claims.
- Added bounded traversal of `P397` parent astronomical body statements.
- Added fixture evidence and a prepared example for `Moon orbits the Sun`.
- Added Q/P phrase mapping links and reasoning-step links to the links network.
- Added report-body sections for candidate interpretations and reasoning trace.
- Added tests for the fixture path, mocked live disambiguation, parent-chain
  support, and report URL contents.
- Opened reuse proposal issues for calculator issue reporting, relative
  meta-logic formalization, and human-language Q/P phrase mapping:
  https://github.com/link-assistant/calculator/issues/142,
  https://github.com/link-foundation/relative-meta-logic/issues/24, and
  https://github.com/link-assistant/human-language/issues/28.

## Deferred Work

- Exhaustive local fixtures for every planet and moon.
- User-configurable disambiguation policies and source-weight profiles in the
  web UI.
- Scoped WDQS queries after Q/P IDs are known.
- Moving the resolver and links operations into Rust/WASM once the core parity
  slice is ready.
