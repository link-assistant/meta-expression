# Case Study: Issue #20 — compare features with Jenni AI

> Source: <https://github.com/link-assistant/meta-expression/issues/20>
> Pull request: <https://github.com/link-assistant/meta-expression/pull/34>
> Last checked: 2026-05-12.

## Problem Statement

Issue #20 asks to expand the existing comparison to cover more projects
from the comparison set and products like <https://jenni.ai>. The gap was
specific to the feature matrix: Jenni AI already appeared in
[`docs/COMPARISON-CONCEPTS.md`](../../COMPARISON-CONCEPTS.md), but
[`docs/COMPARISON-FEATURES.md`](../../COMPARISON-FEATURES.md) collapsed
AI-writing assistants into representative columns and did not show a
direct Jenni AI feature comparison.

## Source Review

| Project       | Sources checked                                                                                                                                | Notes for the matrix                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Jenni AI      | <https://jenni.ai/pricing>, <https://help.jenni.ai/docs/ai-tools/ai-autocomplete/>, <https://help.jenni.ai/docs/research/citation-management/> | Web editor, autocomplete, AI chat, citations, bibliography export, source controls, and claim-confidence reviews. No public CLI, JS library, or Lino export. |
| Jenni AI      | <https://help.jenni.ai/docs/ai-tools/ai-chat/>, <https://help.jenni.ai/docs/ai-tools/reviews/>                                                 | AI Chat can use current document, library, web, and selected text sources; Reviews include proofread and claim-confidence modes.                             |
| Elicit        | <https://docs.elicit.com/>, <https://support.elicit.com/en/articles/1418881>, <https://support.elicit.com/en/articles/7927169>                 | API, research reports, Find Papers, Paper Chat, systematic review workflow, screening, extraction, and paper-grounded reports.                               |
| Elicit        | <https://support.elicit.com/en/articles/1153857>, <https://support.elicit.com/en/articles/553025>                                              | CSV/Excel/BIB/RIS/PDF/Word exports and paper corpus/source notes.                                                                                            |
| Grammarly     | <https://www.grammarly.com/plans>, <https://www.grammarly.com/plagiarism-checker>, <https://www.grammarly.com/citations>                       | Web/editor assistance, plagiarism/originality report, citation generation, Citation Finder, citation formatting, and writing suggestions.                    |
| Consensus.app | <https://help.consensus.app/en/articles/9922673-how-consensus-works>, <https://help.consensus.app/en/articles/10069920-the-consensus-meter>    | Peer-reviewed paper search, cited synthesis, Consensus Meter, Ask Paper, filters, and library features.                                                      |
| Consensus.app | <https://consensus.app/home/api/>, <https://help.consensus.app/en/articles/9922799-how-to-filter-searches-by-paper-details>                    | API access, metadata, relevance scores, advanced filters, and hosted search surface.                                                                         |

## Decision

The fix adds an "Expanded academic-writing assistant matrix" to
[`docs/COMPARISON-FEATURES.md`](../../COMPARISON-FEATURES.md). It keeps
the existing public feature IDs F1-F17 and compares Jenni AI, Elicit,
Grammarly, and Consensus.app directly.

That scope is intentionally narrower than reopening the whole issue #26
survey. These four products cover the direct Jenni-like comparison space:
academic drafting, citation support, literature search, source-grounded
review, originality checking, and confidence/consensus surfaces.

## Verification

The regression test `tests/issue-20.test.js` checks that the feature
comparison contains the expanded assistant matrix, includes Jenni AI and
the comparable assistant products, retains key feature rows, and archives
the Jenni source URLs in this case study.
