use meta_expression_core::normalize_statement_key;

#[test]
fn normalizes_statement_keys_by_collapsing_whitespace_and_punctuation() {
    assert_eq!(normalize_statement_key("  Hello   world!  "), "Hello world");
    assert_eq!(normalize_statement_key("Hello world.\n"), "Hello world");
}
