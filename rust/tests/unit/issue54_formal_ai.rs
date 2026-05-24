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
fn formal_ai_translation_via_links_cases_are_supported() {
    let cases = [
        ("как у тебя дела?", "ru", "en", "how are you?"),
        ("Как у тебя дела?", "ru", "en", "How are you?"),
        ("как дела", "ru", "en", "how are you"),
        ("кто ты такой", "ru", "en", "who are you"),
        ("что это такое?", "ru", "en", "what is this?"),
        ("доброе яблоко", "ru", "en", "good apple"),
        ("спасибо", "ru", "en", "thank you"),
        ("привет", "ru", "en", "hello"),
        ("hello", "en", "ru", "привет"),
        ("thank you", "en", "ru", "спасибо"),
        ("hello", "en", "hi", "नमस्ते"),
        ("hello", "en", "zh", "你好"),
        ("яблоко", "ru", "en", "apple"),
        ("apple", "en", "ru", "яблоко"),
        ("Apple", "en", "ru", "Яблоко"),
        ("apple", "en", "hi", "सेब"),
        ("apple", "en", "zh", "苹果"),
    ];

    for (source, from, to, expected) in cases {
        let translation = translate_known_semantic_sentence(source, from, to)
            .unwrap_or_else(|| panic!("expected {source:?} to translate from {from} to {to}"));

        assert_eq!(translation.target_text, expected);
        assert_eq!(translation.source_language, from);
        assert_eq!(translation.target_language, to);
        assert!(
            translation
                .transformation_steps
                .iter()
                .any(|step| step.contains("glossary")),
            "translation should record a glossary transformation step: {:?}",
            translation.transformation_steps
        );
    }
}

#[test]
fn formal_ai_common_noun_cases_translate_in_both_directions() {
    let cases = [
        ("помидор", "tomato"),
        ("огурец", "cucumber"),
        ("картофель", "potato"),
        ("морковь", "carrot"),
        ("хлеб", "bread"),
        ("вода", "water"),
    ];

    for (russian, english) in cases {
        let ru_to_en = translate_known_semantic_sentence(russian, "ru", "en")
            .unwrap_or_else(|| panic!("expected {russian:?} to translate to English"));
        assert_eq!(ru_to_en.target_text, english);

        let en_to_ru = translate_known_semantic_sentence(english, "en", "ru")
            .unwrap_or_else(|| panic!("expected {english:?} to translate to Russian"));
        assert_eq!(en_to_ru.target_text, russian);
    }
}

#[test]
fn formal_ai_unknown_translation_gaps_stay_explicitly_unresolved() {
    assert!(translate_known_semantic_sentence("неведомослово", "ru", "en").is_none());
    assert!(translate_known_semantic_sentence("zzqxqv", "en", "ru").is_none());
    assert!(translate_known_semantic_sentence("zzqxqv", "en", "hi").is_none());
    assert!(translate_known_semantic_sentence("zzqxqv", "en", "zh").is_none());
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
