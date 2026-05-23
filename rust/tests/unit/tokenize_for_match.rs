use meta_expression_core::tokenize_for_match;

#[test]
fn tokenizes_with_unicode_and_drops_stopwords() {
    let tokens = tokenize_for_match("The fox and the dog 42 на Луне");
    assert_eq!(tokens, vec!["fox", "dog", "луне"]);
}
