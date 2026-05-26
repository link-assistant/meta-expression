//! Rust view of the semantic interlingua lexicon.
//!
//! This module is the Rust counterpart of `js/src/semantic-lexicon.js`. It reads
//! the *same* `js/data/semantic-lexicon.json` file (embedded at build time via
//! `include_str!`) so the Rust and JavaScript engines translate from a single
//! shared source of truth. Every entry is a concept with a unique id (a Wikidata
//! Q, a Wiktionary or Wikipedia URL) and per-language surface forms. Directional
//! translation is never stored as a direct language pair anywhere in `rust/src`;
//! it is derived at runtime by routing a source surface form through a concept id
//! to the target form the concept licenses. That keeps the Rust source free of
//! hardcoded en<->ru / en<->hi / en<->zh dictionaries, exactly as the JavaScript
//! side does.

use std::collections::BTreeMap;
use std::sync::{Mutex, OnceLock};

/// The interlingua data, shared verbatim with the JavaScript engine. The path is
/// relative to this source file: `rust/src/` -> repository root -> `js/data`.
const LEXICON_JSON: &str = include_str!("../../js/data/semantic-lexicon.json");

#[derive(serde::Deserialize)]
struct RawConcept {
    id: String,
    #[serde(default)]
    primary: BTreeMap<String, String>,
    #[serde(default)]
    labels: BTreeMap<String, Vec<String>>,
}

#[derive(serde::Deserialize)]
struct RawLexicon {
    #[serde(default)]
    languages: Vec<String>,
    #[serde(default)]
    concepts: Vec<RawConcept>,
}

fn lexicon() -> &'static RawLexicon {
    static LEXICON: OnceLock<RawLexicon> = OnceLock::new();
    LEXICON.get_or_init(|| {
        serde_json::from_str(LEXICON_JSON).expect("semantic lexicon JSON must parse")
    })
}

/// Derive a directional `source -> target` lookup table from the interlingua,
/// mirroring `buildDirectionalGlossary` in `js/src/semantic-lexicon.js`. A concept
/// contributes `form -> primary[target]` for every source surface form, but only
/// when it explicitly licenses that direction via `primary[target]`. The first
/// concept (in file order) to claim a given source form wins, so the asymmetry of
/// natural-language inflection is preserved exactly as on the JavaScript side. The
/// built table is leaked into a process-wide cache, matching the frozen
/// `directionalCache` the JavaScript module keeps.
pub fn build_directional_glossary(
    source_language: &str,
    target_language: &str,
) -> &'static BTreeMap<String, String> {
    static CACHE: OnceLock<Mutex<BTreeMap<String, &'static BTreeMap<String, String>>>> =
        OnceLock::new();
    let cache = CACHE.get_or_init(|| Mutex::new(BTreeMap::new()));
    let key = format!("{source_language}:{target_language}");

    if let Some(found) = cache.lock().unwrap().get(&key) {
        return found;
    }

    let mut map: BTreeMap<String, String> = BTreeMap::new();
    for concept in &lexicon().concepts {
        let Some(target_form) = concept.primary.get(target_language) else {
            continue;
        };
        if let Some(forms) = concept.labels.get(source_language) {
            for form in forms {
                map.entry(form.clone())
                    .or_insert_with(|| target_form.clone());
            }
        }
    }

    let leaked: &'static BTreeMap<String, String> = Box::leak(Box::new(map));
    cache.lock().unwrap().insert(key, leaked);
    leaked
}

/// Translate a single source surface form to its licensed target form by routing
/// it through the interlingua. Returns `None` when no concept licenses the pair.
pub fn lookup_glossary(source_language: &str, target_language: &str, form: &str) -> Option<String> {
    build_directional_glossary(source_language, target_language)
        .get(form)
        .cloned()
}

/// Resolve a concept id to its licensed surface form in `language`, mirroring
/// `resolveConceptForm` in the JavaScript module. Prefers the canonical
/// `primary[language]` form and falls back to the first label.
pub fn resolve_concept_form(concept_id: &str, language: &str) -> Option<String> {
    if concept_id.is_empty() || language.is_empty() {
        return None;
    }
    for concept in &lexicon().concepts {
        if concept.id != concept_id {
            continue;
        }
        if let Some(form) = concept.primary.get(language) {
            return Some(form.clone());
        }
        return concept
            .labels
            .get(language)
            .and_then(|forms| forms.first())
            .cloned();
    }
    None
}

/// The supported languages declared by the interlingua, e.g. `["en", "hi", "ru", "zh"]`.
pub fn list_lexicon_languages() -> Vec<String> {
    lexicon().languages.clone()
}

/// The set of directional `source:target` pairs the interlingua can serve,
/// discovered from concept data and sorted, mirroring `listDirectionalPairs`.
pub fn list_directional_pairs() -> Vec<String> {
    let mut pairs = std::collections::BTreeSet::new();
    for concept in &lexicon().concepts {
        for source in concept.labels.keys() {
            for target in concept.primary.keys() {
                if source != target {
                    pairs.insert(format!("{source}:{target}"));
                }
            }
        }
    }
    pairs.into_iter().collect()
}
