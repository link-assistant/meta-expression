//! Integration tests for `meta_expression_core`.
//!
//! These combine the higher-level pipeline pieces — semantic-translation
//! lookups, issue-35 doublet relations, and the lexical glossary fallback —
//! to verify they operate together as advertised.

mod issue35_translation;
mod issue41_glossary;
mod issue52_translation;
mod issue61_wasm_surface;
mod semantic_relations;
