---
'meta-expression': minor
---

Add a CI/CD integration gate that translates lead paragraphs from the top-10 most-viewed Wikipedia articles of 2025 into the most popular languages. A new offline fixture (`js/tests/fixtures/issue-96/articles.json`) mirrors the Topviews last-year list, and `scripts/record-issue-96-articles.mjs` regenerates it by aggregating the 12 monthly Wikimedia top-pageview lists for the year and resolving multi-language intro extracts via Wikidata sitelinks. New `extractParagraphs()`, `extractFirstParagraph()`, and `normalizeParagraphText()` helpers split and whitespace-normalize multi-sentence prose so whole paragraphs flow through the formalize → semantic-meta-language → naturalize pipeline. The deterministic, network-free integration test asserts full source-side coverage, stable replays, explicit unresolved-phrase questions, and real Russian vocabulary for every captured article across en/es/de/fr/ru/ja/zh/pt/it/ar.
