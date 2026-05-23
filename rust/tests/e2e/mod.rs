//! End-to-end tests for `meta_expression_core`.
//!
//! These exercise the C ABI (extern "C") surface as it would be called from
//! a WebAssembly bridge or a foreign-language host, ensuring the public
//! constants and computed values agree with the Rust-side semantics.

mod ffi_translation_quality;
mod ffi_weighted_support;
