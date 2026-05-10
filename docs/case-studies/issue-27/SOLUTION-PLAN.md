# Solution Plan

## Options Considered

### Option 1: General Search Proxy

Run every statement through a backend proxy that calls Google, Bing, Brave, or
another web search API with exact-phrase queries.

This would provide broader web coverage, but it requires API credentials and a
server-side deployment boundary. It does not fit the current static web
prototype without exposing secrets.

### Option 2: Static-App Public API Adapters

Use public APIs that can be called from browser code: Wikimedia, OpenAlex,
Crossref, and DuckDuckGo Instant Answer. Score only results that survive local
phrase/similarity checks and keep per-source failures in the result.

Selected because it works in the current repository shape, supports the static
web prototype, has deterministic test seams, and still leaves room for later
server-side adapters.

### Option 3: Reuse `/check` Evidence Scoring Only

The existing `/check` flow can split text into statements and color correctness,
but it answers a different question: truth/correctness instead of prior public
existence.

Rejected as the main implementation, but reused for statement detection and
consistent output styling.

## Implementation Steps

1. Add a failing issue #27 test covering per-statement uniqueness scoring,
   CLI alias handling, README route documentation, and static web wiring.
2. Add `src/uniqueness.js` with default source adapters, match normalization,
   likelihood combination, HTML/Markdown/Links Notation renderers, and
   source-error isolation.
3. Export the new API from `src/index.js` and `src/index.d.ts`.
4. Add CLI support for `uniqueness` and `uniquness`.
5. Add HTTP routes for `GET/POST /uniqueness` and `GET/POST /uniquness`.
6. Add the static **Uniqueness** page, controller, CSS, i18n strings, and
   page-report capture.
7. Update README and add a changeset.
8. Capture issue/PR/API data under `docs/case-studies/issue-27`.
9. Run local tests, lint/format/duplication/docs checks, visual browser
   verification, and line-limit checks.

## Scoring Model

Each source returns matches with scores in `0..1`. Exact phrase matches receive
high scores; title or metadata similarity receives lower scores. Statement
likelihood is combined as:

```text
existingLikelihood = 1 - product(1 - match.score)
```

The score is capped below certainty and converted to an action:

| Threshold | Action            | Meaning                                      |
| --------- | ----------------- | -------------------------------------------- |
| `>= 0.75` | `cite-or-quote`   | Strong public match; cite, quote, or reword. |
| `>= 0.35` | `review-matches`  | Some prior signal; human review needed.      |
| `< 0.35`  | `likely-original` | No strong public-source match found.         |

## Verification Plan

1. `node --test tests/issue-27.test.js`
2. `npm test`
3. `npm run check`
4. `scripts/check-file-line-limits.sh`
5. Serve `web/` locally and capture `#/uniqueness` with Playwright.
6. Review `gh pr diff 32` before marking the PR ready.
