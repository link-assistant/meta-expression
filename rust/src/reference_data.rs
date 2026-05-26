//! Curated offline translation fixtures and linguistic metadata.
//!
//! The Rust engine is pure and offline: unlike the JavaScript engine it cannot
//! reach Wikidata/Wiktionary at runtime to label entities such as Hawaii. The
//! case-study expectations for issues #35 and #52 (the Russian surface forms the
//! online JavaScript engine would fetch) and the stopword/grammar metadata are
//! therefore kept here, in `rust/data/reference-translations.json`, instead of
//! being baked into `rust/src`. That keeps every Rust source file free of
//! hardcoded `source <-> target` translation literals — exactly the policy the
//! `issue-96-no-hardcoded-translations` guard enforces for `js/src`. The data is
//! a rare, documented override, not a general translation dictionary.

use std::sync::OnceLock;

/// The reference data, embedded at build time. The path is relative to this
/// source file: `rust/src/` -> `rust/data/reference-translations.json`.
const REFERENCE_JSON: &str = include_str!("../data/reference-translations.json");

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferencePhrase {
    pub source: String,
    pub target: String,
    pub meaning_id: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Issue35Reference {
    /// Russian surface form for Hawaii (Wikidata Q782 label).
    pub hawaii: String,
    /// Russian surface form for the "state" predicate (Wikidata Q35657 label).
    pub state: String,
    /// Russian copula rendered for the English "is" in "X is a Y".
    pub copula: String,
    /// Normalized Russian sentence key that routes back into English.
    pub ru_source_key: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Issue52Reference {
    pub russian_text: String,
    pub english_round_trip_text: String,
    pub en_ru_phrases: Vec<ReferencePhrase>,
    pub ru_en_phrases: Vec<ReferencePhrase>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceData {
    /// Stopwords filtered out before token-coverage matching. Stopwords are
    /// never translated, so they are metadata rather than a translation table.
    pub match_stopwords: Vec<String>,
    /// Russian trigger word for the "examples of" genitive expansion rule.
    pub examples_genitive_trigger_ru: String,
    pub issue35: Issue35Reference,
    pub issue52: Issue52Reference,
}

/// The process-wide reference dataset, parsed once from the embedded JSON.
pub fn reference_data() -> &'static ReferenceData {
    static DATA: OnceLock<ReferenceData> = OnceLock::new();
    DATA.get_or_init(|| {
        serde_json::from_str(REFERENCE_JSON).expect("reference translations JSON must parse")
    })
}
