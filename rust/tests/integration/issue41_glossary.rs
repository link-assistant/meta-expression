use meta_expression_core::translate_known_semantic_sentence;

#[test]
fn translates_issue41_glossary_examples_through_semantic_links() {
    let examples = [
        ("Найти синонимы", "ru", "en", "Find synonyms"),
        (
            "Найти примеры перевода",
            "ru",
            "en",
            "Find examples of translation",
        ),
        ("Перевести текст", "ru", "en", "Translate text"),
        ("Формализовать текст", "ru", "en", "Formalize text"),
        ("Проверить утверждение", "ru", "en", "Check statement"),
        ("Сравнить значения", "ru", "en", "Compare values"),
        ("Показать вопросы", "ru", "en", "Show questions"),
        ("Открыть страницу", "ru", "en", "Open page"),
        ("Сохранить результат", "ru", "en", "Save result"),
        ("Add examples", "en", "ru", "Добавьте примеры"),
    ];

    for (source, from, to, expected) in examples {
        let translation = translate_known_semantic_sentence(source, from, to).unwrap();

        assert_eq!(translation.target_text, expected);
        assert!(translation
            .source_phrases
            .iter()
            .all(|phrase| phrase.meaning_id.starts_with("lex:")));
        assert!(!translation.target_phrases.is_empty());
    }
}
