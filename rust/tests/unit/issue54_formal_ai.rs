use meta_expression_core::{
    apply_text_transformation_rules, deformalize_semantic_translation,
    naturalize_semantic_translation, translate_known_semantic_sentence, TextTransformationRule,
};

#[test]
fn configurable_text_rules_apply_in_order() {
    let rules = [
        TextTransformationRule::new("kitten-to-cat", "kitten", "cat"),
        TextTransformationRule::new("cat-to-feline", "cat", "feline"),
    ];

    let result = apply_text_transformation_rules("kitten", &rules);

    assert_eq!(result, "feline");
}

#[test]
fn deformalization_is_alias_for_semantic_translation_naturalization() {
    let translation = translate_known_semantic_sentence("Найти синонимы", "ru", "en").unwrap();

    assert_eq!(
        naturalize_semantic_translation(&translation),
        "Find synonyms"
    );
    assert_eq!(
        deformalize_semantic_translation(&translation),
        naturalize_semantic_translation(&translation)
    );
}
