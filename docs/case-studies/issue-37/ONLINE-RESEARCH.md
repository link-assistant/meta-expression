# Online Research

## GitHub Issue URL Parameters

GitHub documentation confirms that `issues/new` supports query parameters such
as `title`, `body`, and `labels`, and explicitly says an over-limit URL returns
`414 URI Too Long`.

Source:
<https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query>

Local capture:
[`data/github-creating-issue.html`](./data/github-creating-issue.html)

Decision:
Measure the final encoded URL, not just the Markdown body length, because URL
encoding expands Markdown punctuation and non-ASCII text.

## Calculator Reference

`link-assistant/calculator` builds a report with ordered environment data,
input, result, Links Notation, reproduction steps, and a description placeholder.

Local captures:

- [`data/calculator-reportIssue.ts`](./data/calculator-reportIssue.ts)
- [`data/calculator-reportIssue.test.ts.txt`](./data/calculator-reportIssue.test.ts.txt)
- [`data/calculator-App.tsx.txt`](./data/calculator-App.tsx.txt)

Decision:
Keep the same useful issue-report sections, but add URL-aware compaction because
Translate diagnostics are much larger than calculator reports.

## Formal AI Reference

`link-assistant/formal-ai` already has comments and code paths for keeping a
prefilled GitHub issue body short enough to fit in a `?body=` query parameter.

Local capture:
[`data/formal-ai-app.js.txt`](./data/formal-ai-app.js.txt)

Decision:
Use the same principle: preserve recent/essential user-visible context and omit
bulky generated diagnostics when the issue URL would otherwise be rejected.

## Wiktionary Facts

English Wiktionary has an `is-a` page with a definition for the relationship
between entities. English Wiktionary also has a page for Russian `это`.

Sources:

- <https://en.wiktionary.org/wiki/is-a#English>
- <https://en.wiktionary.org/wiki/%D1%8D%D1%82%D0%BE>

Local captures:

- [`data/wiktionary-is-a-definition.json`](./data/wiktionary-is-a-definition.json)
- [`data/wiktionary-eto-page.json`](./data/wiktionary-eto-page.json)

Decision:
For Wiktionary source candidates, use English Wiktionary page URLs because the
REST definition endpoint is English Wiktionary and includes language-specific
entries such as Russian.
