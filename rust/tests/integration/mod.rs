//! Integration tests for `meta_expression_core`.
//!
//! These combine the higher-level pipeline pieces — semantic-translation
//! lookups, issue-35 doublet relations, and the lexical glossary fallback —
//! to verify they operate together as advertised.

mod issue109_doublets_store;
mod issue35_translation;
mod issue41_glossary;
mod issue52_translation;
mod issue61_wasm_surface;
mod issue96_four_language_parity;
mod issue96_no_hardcoded_translations;
mod semantic_relations;
