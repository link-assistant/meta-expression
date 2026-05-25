---
'meta-expression': minor
---

Add a Wikipedia top-views translation-quality gate. New `assessArticleSet()`, `assessArticleTranslation()`, `selectLanguagePair()`, `summarizeAssessment()`, `extractFirstStatement()`, `tokenCoverage()`, `tokenizeForMatch()`, and `normalizeStatementKey()` helpers route per-article statements through curated skip-list, translation-fixes, direct coverage, and round-trip stability checks. A new `translation-quality` CLI subcommand reads articles/skip-list/fixes JSON, prints a per-status summary, and exits non-zero on failures. The Rust core mirrors the helpers and exposes a `meta_expression_translation_quality_status_code` C ABI for native consumers. Two Translate samples (Artemis II lead, Russian Michael Jackson biographical lead) are added to the web app.
