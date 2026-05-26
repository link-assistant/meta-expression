# Issue #90: document-level originality reports

> Pull request: [#102](https://github.com/link-assistant/meta-expression/pull/102).

Issue #90 extends the existing `/uniqueness` statement scoring into a
document-level originality report. The implementation keeps the current summary,
statement, Markdown, HTML, and Links Notation outputs, while adding structured
report data for matched sources, source spans, match strengths, and exclusions.

## Artifacts

- [`REQUIREMENTS.md`](./REQUIREMENTS.md) records the acceptance criteria.
- [`js/tests/fixtures/issue-90-originality-document.json`](../../../js/tests/fixtures/issue-90-originality-document.json)
  is the document-level originality fixture.
- [`js/tests/integration/issue-90-originality-report.test.js`](../../../js/tests/integration/issue-90-originality-report.test.js)
  verifies the report shape.

## Outcome

- `/uniqueness` JSON now includes `originalityReport`.
- Report matches include input spans, source spans, source URLs, match kind, and
  match strength.
- Quoted text and reference sections are listed as exclusions.
- Existing `summary`, `statements`, `html`, `markdown`, and `linksNotation`
  fields remain available.
