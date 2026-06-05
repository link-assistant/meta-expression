//! Issue #96 parity: the Rust engine must exercise the same four supported
//! languages (English, Russian, Hindi, Chinese) and survive the same round
//! trips as the JavaScript engine, routing every translation through the shared
//! `js/data/semantic-lexicon.json` interlingua. Both engines read that one data
//! file, so this test mirrors `js/tests/integration/issue-96-four-language-
//! roundtrip.test.js` to prove the Rust side is never forgotten when the
//! JavaScript side gains a language or a concept.
//!
//! Hindi (Devanagari) and Chinese (Han) do not encode letter case, so a word
//! translated out of them is rendered as an isolated capitalized word; the
//! round trip is therefore verified case-insensitively — the meaning, not the
//! casing, is what must survive.

use meta_expression_core::{
    build_directional_glossary, list_directional_pairs, list_lexicon_languages,
    resolve_concept_form, resolve_concept_form_details, resolve_concept_grammar_form,
    resolve_source_phrase_grammar_value, translate_known_semantic_text,
};

const SUPPORTED_LANGUAGES: [&str; 4] = ["en", "hi", "ru", "zh"];

struct SharedConcept {
    id: &'static str,
    forms: [(&'static str, &'static str); 4],
}

// Shared vocabulary attested for all four languages by a single concept id:
//   apple -> Wikidata Q89, hello -> en.wiktionary.org/wiki/hello.
const SHARED_VOCABULARY: [SharedConcept; 2] = [
    SharedConcept {
        id: "Q89",
        forms: [
            ("en", "apple"),
            ("ru", "яблоко"),
            ("hi", "सेब"),
            ("zh", "苹果"),
        ],
    },
    SharedConcept {
        id: "wikt:en:hello",
        forms: [
            ("en", "hello"),
            ("ru", "привет"),
            ("hi", "नमस्ते"),
            ("zh", "你好"),
        ],
    },
];

fn form_for(concept: &SharedConcept, language: &str) -> &'static str {
    concept
        .forms
        .iter()
        .find(|(lang, _)| *lang == language)
        .map(|(_, form)| *form)
        .expect("shared concept must carry the requested language")
}

fn ordered_language_pairs() -> Vec<(&'static str, &'static str)> {
    let mut pairs = Vec::new();
    for source in SUPPORTED_LANGUAGES {
        for target in SUPPORTED_LANGUAGES {
            if source != target {
                pairs.push((source, target));
            }
        }
    }
    pairs
}

#[test]
fn declares_all_four_supported_languages_in_the_interlingua() {
    let mut languages = list_lexicon_languages();
    languages.sort();
    assert_eq!(languages, SUPPORTED_LANGUAGES.to_vec());
}

#[test]
fn serves_every_ordered_pair_among_the_four_languages() {
    let pairs = list_directional_pairs();
    for (source, target) in ordered_language_pairs() {
        let key = format!("{source}:{target}");
        assert!(
            pairs.contains(&key),
            "interlingua must serve directional pair {key}"
        );
    }
}

#[test]
fn maps_shared_vocabulary_through_a_single_id_carrying_every_language() {
    for concept in &SHARED_VOCABULARY {
        for language in SUPPORTED_LANGUAGES {
            // One concept id resolves to the canonical form in each language,
            // proving a single interlingua entry carries all four languages.
            assert_eq!(
                resolve_concept_form(concept.id, language).as_deref(),
                Some(form_for(concept, language)),
                "concept {} must resolve to the {language} form",
                concept.id
            );
        }
    }
}

#[test]
fn translates_shared_vocabulary_forward_in_every_direction() {
    for concept in &SHARED_VOCABULARY {
        for (source, target) in ordered_language_pairs() {
            let source_form = form_for(concept, source);
            let expected = form_for(concept, target);
            // The directional glossary is derived purely from concept ids, so a
            // present mapping proves no direct language pair was hardcoded.
            let glossary = build_directional_glossary(source, target);
            assert_eq!(
                glossary.get(source_form).map(String::as_str),
                Some(expected),
                "{} {source}->{target} glossary mapping",
                concept.id
            );

            let translation = translate_known_semantic_text(source_form, source, target)
                .unwrap_or_else(|| panic!("{} {source}->{target} must translate", concept.id));
            assert_eq!(
                translation.target_text.to_lowercase(),
                expected.to_lowercase(),
                "{} {source}->{target} translation",
                concept.id
            );
        }
    }
}

#[test]
fn merges_issue131_virtual_concepts_into_the_rust_glossary() {
    let glossary = build_directional_glossary("en", "ru");

    assert_eq!(
        glossary.get("California").map(String::as_str),
        Some("Калифорния")
    );
    assert_eq!(glossary.get("state").map(String::as_str), Some("штат"));
    assert_eq!(
        glossary.get("lies on").map(String::as_str),
        Some("расположен на")
    );
    assert_eq!(
        glossary.get("Western United States").map(String::as_str),
        Some("Запад США")
    );
    assert_eq!(
        glossary.get("pacific coast").map(String::as_str),
        Some("Тихоокеанское побережье")
    );

    let state = resolve_concept_form_details("Q35657", "ru").unwrap();
    assert_eq!(state.text, "штат");
    assert_eq!(
        state.url.as_deref(),
        Some("https://ru.wikipedia.org/wiki/%D0%A8%D1%82%D0%B0%D1%82_%D0%A1%D0%A8%D0%90")
    );
}

#[test]
fn resolves_issue131_grammar_forms_with_source_metadata() {
    let california = resolve_concept_form_details("Q99", "ru").unwrap();
    assert_eq!(california.text, "Калифорния");
    assert_eq!(california.entity_id.as_deref(), Some("Q99"));

    let lie_on = resolve_concept_form("lex:en:lie_on", "ru");
    assert_eq!(lie_on.as_deref(), Some("расположен на"));

    let relative_that = resolve_concept_form("lex:en:that_relative", "ru");
    assert_eq!(relative_that.as_deref(), Some("который"));

    let locative = resolve_concept_grammar_form("Q12612", "ru", "locative").unwrap();
    assert_eq!(locative.text, "западе США");
    assert_eq!(locative.entity_id.as_deref(), Some("Q12612"));

    let preposition = resolve_concept_grammar_form("Q12612", "ru", "locativePreposition").unwrap();
    assert_eq!(preposition.text, "на");
    assert_eq!(preposition.entity_id, None);

    let coast = resolve_concept_grammar_form("Q430265", "ru", "prepositional").unwrap();
    assert_eq!(coast.text, "Тихоокеанском побережье");

    assert_eq!(
        resolve_source_phrase_grammar_value("lying on", "en", "ru", "objectCase").as_deref(),
        Some("prepositional")
    );
}

#[test]
fn survives_a_round_trip_through_every_other_language() {
    for concept in &SHARED_VOCABULARY {
        for (source, target) in ordered_language_pairs() {
            let source_form = form_for(concept, source);
            let forward = translate_known_semantic_text(source_form, source, target)
                .unwrap_or_else(|| panic!("{} {source}->{target} must translate", concept.id));
            let back = translate_known_semantic_text(&forward.target_text, target, source)
                .unwrap_or_else(|| {
                    panic!(
                        "{} {source}->{target}->{source} must translate back",
                        concept.id
                    )
                });
            assert_eq!(
                back.target_text.to_lowercase(),
                source_form.to_lowercase(),
                "{} {source}->{target}->{source} round trip",
                concept.id
            );
        }
    }
}
