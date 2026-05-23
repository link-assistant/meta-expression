use meta_expression_core::{
    apply_text_transformation_rules, deformalize_semantic_translation, extract_linguistic_metadata,
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

#[test]
fn linguistic_metadata_extracts_formal_ai_structural_fragments() {
    let metadata = extract_linguistic_metadata("Moon orbits the Sun.");

    let subject = metadata
        .fragments
        .iter()
        .find(|fragment| fragment.role == "subject")
        .expect("subject fragment should be extracted");
    let predicate = metadata
        .fragments
        .iter()
        .find(|fragment| fragment.role == "predicate")
        .expect("predicate fragment should be extracted");
    let object = metadata
        .fragments
        .iter()
        .find(|fragment| fragment.role == "object")
        .expect("object fragment should be extracted");

    assert_eq!(subject.text, "Moon");
    assert_eq!(predicate.text, "orbits");
    assert_eq!(object.text, "Sun");
    assert!(metadata
        .fragments
        .iter()
        .any(|fragment| fragment.kind == "word" && fragment.text == "Moon"));
    assert!(metadata
        .fragments
        .iter()
        .any(|fragment| fragment.kind == "symbol" && fragment.text == "."));
    assert!(metadata
        .fragments
        .iter()
        .any(|fragment| fragment.kind == "noun-phrase" && fragment.text == "the Sun"));
    assert!(metadata
        .fragments
        .iter()
        .any(|fragment| fragment.kind == "verb-phrase" && fragment.text == "orbits"));
    assert!(metadata
        .relations
        .iter()
        .any(|relation| relation.kind == "subject-predicate-object"
            && relation.subject_fragment_id == subject.id
            && relation.predicate_fragment_id == predicate.id
            && relation.object_fragment_id.as_deref() == Some(object.id.as_str())));
    assert!(metadata
        .dependencies
        .iter()
        .any(|dependency| dependency.relation == "nsubj"));
    assert!(metadata
        .dependencies
        .iter()
        .any(|dependency| dependency.relation == "root"));
    assert!(metadata
        .dependencies
        .iter()
        .any(|dependency| dependency.relation == "obj"));
}
