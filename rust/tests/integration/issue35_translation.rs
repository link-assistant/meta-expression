use meta_expression_core::translate_known_semantic_sentence;

#[test]
fn translates_issue35_sentence_through_semantic_ids() {
    let translation = translate_known_semantic_sentence("Hawaii is a state.", "en", "ru").unwrap();

    assert_eq!(translation.target_text, "Гавайи это штат.");
    assert_eq!(translation.source_phrases[0].text, "Hawaii");
    assert_eq!(translation.source_phrases[0].meaning_id, "Q782");
    assert_eq!(translation.source_phrases[1].text, "state");
    assert_eq!(translation.source_phrases[1].meaning_id, "Q7275");
    assert_eq!(translation.target_phrases[0].text, "Гавайи");
    assert_eq!(translation.target_phrases[0].meaning_id, "Q782");
    assert_eq!(translation.target_phrases[1].text, "штат");
    assert_eq!(translation.target_phrases[1].meaning_id, "Q35657");
    assert_eq!(
        translation.transformation_steps,
        [
            "english-article-omission",
            "english-copula-to-russian-eto",
            "english-us-state-predicate-to-russian-shtat"
        ]
    );

    let round_trip =
        translate_known_semantic_sentence(&translation.target_text, "ru", "en").unwrap();

    assert_eq!(round_trip.target_text, "Hawaii is a state.");
}
