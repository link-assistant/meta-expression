//! Unit-style tests for `meta_expression_core` pure helpers.
//!
//! These exercise the small, focused public functions whose behavior can be
//! verified without involving cross-module state or FFI.

mod classify_statement;
mod extract_first_statement;
mod formalize_contexts;
mod issue54_formal_ai;
mod issue64_general_formalization;
mod issue66_naturalization;
mod issue70_reasoning_metadata;
mod normalize_statement_key;
mod support_ratio;
mod token_coverage;
mod tokenize_for_match;
mod translation_quality;
mod wikimedia_plan;
