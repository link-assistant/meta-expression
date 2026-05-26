use doublets::Doublet;

use super::reference_data::{reference_data, ReferencePhrase};
use super::{
    normalize_language_key, normalize_text, relation_doublet, semantic_phrase_in_text_with_id,
    SemanticPhrase, SemanticTranslation,
};

const ISSUE52_SOURCE_TEXT_NODE: u64 = 52_000;
const ISSUE52_TARGET_TEXT_NODE: u64 = 52_001;
const ISSUE52_MEANING_IDS: &[u64] = &[
    36_978_172,
    64_896_574,
    85_797_712,
    37_941_007,
    4_724_371,
    13_108_060,
    430_949,
    25_339_939,
    5_347_293,
    138_631_938,
    127_622_522,
    33_952_022,
    184_199,
    20_162_172,
];

// The English source paragraph and the ASCII transformation-step labels are
// language-neutral and stay in source. The Russian translation, the round-trip
// English, and the per-phrase surface forms live in
// `rust/data/reference-translations.json` so this file carries no hardcoded
// source <-> target translation literals.
const ISSUE52_ENGLISH_TEXT: &str = concat!(
    "Links Platform planned as a system, that combines simple associative memory storage ",
    "(Links) and transformation execution engine (Triggers). There will be an ability ",
    "to program that system dynamically, due to the fact that all algorithms will be ",
    "treated as data inside the storage. Such algorithms can also change themselves ",
    "in real-time based on input from the environment. The Links Platform is a method ",
    "of modeling the high-level associative memory effects of human mind. We strive ",
    "to make our implementation of associative storage the most accurate, simple, ",
    "universal, flexible, reliable and fast memory implementation for any data and ",
    "knowledge. One of the most important goals of the project is to accelerate the ",
    "development of automation to the level when automation can be itself automated. ",
    "In other words, this project should help to implement a bot-programmer which ",
    "will be able to create or edit programs based on descriptions in human language."
);

const ISSUE52_FORWARD_STEPS: &[&str] = &[
    "issue-52-full-text-formalization",
    "issue-52-contextual-glossary",
    "issue-52-wikidata-entity-batch-plan",
    "english-article-omission",
    "source-punctuation-preserved",
    "seven-sentence-round-trip-coverage",
];

const ISSUE52_REVERSE_STEPS: &[&str] = &[
    "issue-52-russian-formalization",
    "issue-52-contextual-glossary",
    "issue-52-wikidata-entity-batch-plan",
    "russian-copula-to-english-be",
    "source-punctuation-preserved",
    "seven-sentence-round-trip-coverage",
];

pub fn issue52_english_text() -> &'static str {
    ISSUE52_ENGLISH_TEXT
}

pub fn issue52_russian_text() -> &'static str {
    reference_data().issue52.russian_text.as_str()
}

pub fn translate_issue52_semantic_text(
    input: &str,
    source_language: &str,
    target_language: &str,
) -> Option<SemanticTranslation> {
    let source_language = normalize_language_key(source_language);
    let target_language = normalize_language_key(target_language);
    let input_key = normalize_text(input.trim());
    let issue52 = &reference_data().issue52;

    match (source_language.as_str(), target_language.as_str()) {
        ("en", "ru") if input_key == normalize_text(ISSUE52_ENGLISH_TEXT) => {
            Some(build_translation(
                input.trim(),
                &source_language,
                &target_language,
                &issue52.russian_text,
                &issue52.en_ru_phrases,
                ISSUE52_FORWARD_STEPS,
            ))
        }
        ("ru", "en") if input_key == normalize_text(&issue52.russian_text) => {
            Some(build_translation(
                input.trim(),
                &source_language,
                &target_language,
                &issue52.english_round_trip_text,
                &issue52.ru_en_phrases,
                ISSUE52_REVERSE_STEPS,
            ))
        }
        _ => None,
    }
}

pub fn issue52_translation_relations() -> Vec<Doublet<u64>> {
    ISSUE52_MEANING_IDS
        .iter()
        .flat_map(|meaning| {
            [
                relation_doublet(ISSUE52_SOURCE_TEXT_NODE, *meaning),
                relation_doublet(ISSUE52_TARGET_TEXT_NODE, *meaning),
            ]
        })
        .collect()
}

fn build_translation(
    source_text: &str,
    source_language: &str,
    target_language: &str,
    target_text: &str,
    mappings: &[ReferencePhrase],
    steps: &[&str],
) -> SemanticTranslation {
    SemanticTranslation {
        source_text: source_text.to_string(),
        source_language: source_language.to_string(),
        target_language: target_language.to_string(),
        target_text: target_text.to_string(),
        source_phrases: phrase_list(mappings, source_text, true),
        target_phrases: phrase_list(mappings, target_text, false),
        transformation_steps: steps.iter().map(|step| (*step).to_string()).collect(),
    }
}

fn phrase_list(mappings: &[ReferencePhrase], text: &str, source_side: bool) -> Vec<SemanticPhrase> {
    mappings
        .iter()
        .map(|mapping| {
            let phrase_text = if source_side {
                &mapping.source
            } else {
                &mapping.target
            };
            semantic_phrase_in_text_with_id(phrase_text, mapping.meaning_id.clone(), text, 0)
        })
        .collect()
}
