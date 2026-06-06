# Issue 133 - Solution Plan

## Implemented Changes

- `js/src/semantic-lexicon.js`: keep the existing base URL when virtual
  concepts merge over a source-backed concept. This preserves the Russian
  Wikipedia URL for `Q35657`.
- `js/src/translate.js`: default Translate to Wikipedia links and route
  semantic-lexicon target URLs through the configured link-target mode.
- `js/src/cli.js` and `js/src/server.js`: stop forcing Translate target mode to
  Wikidata when the caller omits `target`.
- `js/src/formalize-sources.js`: set default and empty-spec source order to
  Wikipedia, Wikidata, Wiktionary, virtual overrides.
- `js/src/formalize-contexts.js` and `js/src/formalize.js`: expose broad
  transitive contexts on each word candidate.
- `web/index.html`, `web/translate-ui.js`, `web/styles.css`, and
  `web/i18n.js`: replace the link-target radios with the unchecked local-viewer
  checkbox, reorder sources, add top-level text/article input modes, and render
  broad contexts in the word-context panel/debug log.
- `rust/src/semantic_lexicon.rs` and `rust/src/formalize_contexts.rs`: keep the
  Rust mirrors in sync with the semantic URL merge and broad-context output
  behavior enforced by CI parity.
- `js/tests/integration/issue-133.test.js`: regression coverage for the
  reported `Q35657` URL, source order, default link target mode, and broad
  word contexts.
- Follow-up PR #135 extends `js/src/translate.js` so semantic-lexicon immediate
  translations can use a live target-language sitelink when the local concept
  only carries a Wikidata URL. It adds `Q99` / `California` regression coverage
  to `js/tests/integration/issue-133.test.js`.
- `rust/tests/unit/formalize_contexts.rs` and
  `rust/tests/integration/issue96_four_language_parity.rs`: Rust mirror
  coverage for broad word contexts and the `Q35657` Russian Wikipedia URL.
- `js/tests/integration/issue-50.test.js`: update Translate UI/default
  expectations to the new contract.
- `.changeset/issue-133-translate-defaults.md`: release readiness.
- `.changeset/issue-133-california-target-links.md`: follow-up release
  readiness for PR #135.

## Verification

Focused before-state:

```text
node --test js/tests/integration/issue-133.test.js js/tests/integration/issue-50.test.js
```

Saved failing log: [`focused-tests-before.log`](focused-tests-before.log).

Focused after-state:

```text
node --test js/tests/integration/issue-133.test.js js/tests/integration/issue-50.test.js
```

Saved passing log: [`focused-tests-after.log`](focused-tests-after.log).

Follow-up focused before/after:

```text
node --test js/tests/integration/issue-133.test.js
```

Saved failing log:
[`focused-california-before.log`](focused-california-before.log).

Saved passing log:
[`focused-california-after.log`](focused-california-after.log).

Related Translate/context/article checks:

```text
node --test js/tests/integration/issue-37.test.js \
  js/tests/integration/issue-126-context-detection.test.js \
  js/tests/integration/issue-126-context-selection.test.js \
  js/tests/integration/issue-128.test.js \
  js/tests/integration/issue-131.test.js \
  js/tests/e2e/issue-16.test.js
```

Saved passing log: [`related-tests.log`](related-tests.log).

Rust parity follow-up:

```text
cargo test
npm run check
npm test
```

## Residual Risk

The broad-context labels are available only for nodes the existing bounded
traversal fetches. The UI still falls back to Q-ids when a node is included as
an unfetched terminal ancestor. That keeps request volume bounded while making
the common shared contexts readable.
