# Solution Plan

## Considered Options

### Option 1: Keep Full Reports and Use a Shorter Title

Rejected. The long URL came from the encoded `body`, not the title.

### Option 2: Always Remove Diagnostics

Rejected. Full diagnostics are valuable when the URL remains below the limit.
The implementation should only compact when needed.

### Option 3: Compact Only After Measuring the Encoded URL

Selected. This keeps the existing rich reports for normal cases and falls back
to a purpose-built compact report only when GitHub would reject the URL.

## Implementation Steps

1. Add failing tests for the oversized Translate issue URL and the two
   formalization defects.
2. Add URL-length-aware report generation in `web/page-report.js`.
3. Keep Translate essentials in compact reports:
   source text, source formalization Markdown, target Markdown, result text,
   questions, options/status, reproduction steps, and report notes.
4. Expose the latest Translate result from `setupTranslatePage()` so reports can
   use exact Markdown payloads rather than DOM text.
5. Allow Wiktionary source lookup for supported multi-token grammar compounds
   by using explicit page-title mappings.
6. Allow supported stop-only multi-token n-grams to be searched by the
   Wiktionary tier.
7. Teach English-to-Russian translation rules to map source `is a` to linked
   Russian `это`.
8. Run focused tests, then the repository test/check suite.

## Follow-Up Candidates

- Add a copy-to-clipboard fallback containing the full omitted diagnostics when
  a compact report is generated in the browser.
- Move grammar phrase mappings into data-driven overrides or a rule graph once
  the translation architecture grows beyond narrow English/Russian rules.
