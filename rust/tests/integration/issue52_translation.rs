use meta_expression_core::{
    issue52_english_text, issue52_russian_text, issue52_translation_relations, token_coverage,
    translate_known_semantic_sentence, translate_known_semantic_text,
};

#[test]
fn translates_full_issue52_text_and_round_trips_back_to_english() {
    let forward = translate_known_semantic_text(issue52_english_text(), "en", "ru").unwrap();

    assert_eq!(forward.source_language, "en");
    assert_eq!(forward.target_language, "ru");
    assert_eq!(forward.target_text, issue52_russian_text());
    assert_eq!(forward.source_phrases.len(), 24);
    assert_eq!(forward.target_phrases.len(), 24);
    assert!(forward
        .target_phrases
        .iter()
        .any(|phrase| phrase.text == "бот-программист"));
    assert!(forward
        .transformation_steps
        .contains(&"issue-52-wikidata-entity-batch-plan".to_string()));
    assert!(forward
        .transformation_steps
        .contains(&"seven-sentence-round-trip-coverage".to_string()));

    let reverse = translate_known_semantic_text(&forward.target_text, "ru", "en").unwrap();
    let coverage = token_coverage(&reverse.target_text, issue52_english_text());

    assert_eq!(reverse.source_language, "ru");
    assert_eq!(reverse.target_language, "en");
    assert!(reverse.target_text.contains("Links Platform planned"));
    assert!(reverse.target_text.contains("bot-programmer"));
    assert_eq!(coverage.ratio, 1.0);
    assert!(coverage.missing.is_empty());
}

#[test]
fn sentence_api_accepts_the_issue52_full_text_for_wasm_callers() {
    let forward = translate_known_semantic_sentence(issue52_english_text(), "en-US", "ru").unwrap();

    assert_eq!(forward.target_text, issue52_russian_text());
    assert_eq!(forward.source_phrases[0].text, "Links");
    assert_eq!(forward.source_phrases[0].meaning_id, "Q36978172");
    assert_eq!(forward.target_phrases[1].text, "Платформа");
    assert_eq!(forward.target_phrases[1].meaning_id, "Q64896574");
}

#[test]
fn issue52_relations_link_source_and_target_text_to_shared_meanings() {
    let relations = issue52_translation_relations();

    assert_eq!(relations.len(), 28);
    assert!(relations
        .iter()
        .any(|relation| relation.source == 52_000 && relation.target == 36_978_172));
    assert!(relations
        .iter()
        .any(|relation| relation.source == 52_001 && relation.target == 20_162_172));
}
