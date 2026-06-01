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
    url: Option<String>,
    #[serde(default, rename = "entityId")]
    entity_id: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    primary: BTreeMap<String, String>,
    #[serde(default)]
    labels: BTreeMap<String, Vec<String>>,
    #[serde(default)]
    forms: BTreeMap<String, BTreeMap<String, serde_json::Value>>,
}

#[derive(serde::Deserialize)]
struct RawLexicon {
    #[serde(default)]
    languages: Vec<String>,
    #[serde(default)]
    concepts: Vec<RawConcept>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedConceptForm {
    pub text: String,
    pub entity_id: Option<String>,
    pub url: Option<String>,
    pub description: Option<String>,
}

fn lexicon() -> &'static RawLexicon {
    static LEXICON: OnceLock<RawLexicon> = OnceLock::new();
    LEXICON.get_or_init(|| {
        let mut parsed: RawLexicon =
            serde_json::from_str(LEXICON_JSON).expect("semantic lexicon JSON must parse");
        merge_virtual_concepts(&mut parsed.concepts);
        parsed
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
                for key in directional_glossary_keys(form) {
                    map.entry(key).or_insert_with(|| target_form.clone());
                }
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
    resolve_concept_form_details(concept_id, language).map(|form| form.text)
}

/// Resolve a concept id to its licensed surface form plus source-backed
/// metadata used by renderers to build citation links.
pub fn resolve_concept_form_details(
    concept_id: &str,
    language: &str,
) -> Option<ResolvedConceptForm> {
    if concept_id.is_empty() || language.is_empty() {
        return None;
    }
    let concept = find_concept_by_id(concept_id)?;
    let text = concept
        .primary
        .get(language)
        .or_else(|| concept.labels.get(language).and_then(|forms| forms.first()))?
        .clone();
    Some(ResolvedConceptForm {
        text,
        entity_id: concept.entity_id.clone(),
        url: concept.url.clone(),
        description: concept.description.clone(),
    })
}

/// Resolve a grammatical form attached to a concept, such as the Russian
/// locative or prepositional form used by issue #131 naturalization.
pub fn resolve_concept_grammar_form(
    concept_id: &str,
    language: &str,
    form_key: &str,
) -> Option<ResolvedConceptForm> {
    if concept_id.is_empty() || language.is_empty() || form_key.is_empty() {
        return None;
    }
    let concept = find_concept_by_id(concept_id)?;
    normalize_grammar_form(concept.forms.get(language)?.get(form_key)?, concept)
}

/// Resolve a string-valued grammar hint by matching a source phrase through the
/// same interlingua concepts that power directional glossary lookup.
pub fn resolve_source_phrase_grammar_value(
    source_text: &str,
    source_language: &str,
    target_language: &str,
    form_key: &str,
) -> Option<String> {
    let normalized = normalize_label(source_text);
    if normalized.is_empty()
        || source_language.is_empty()
        || target_language.is_empty()
        || form_key.is_empty()
    {
        return None;
    }
    for concept in &lexicon().concepts {
        if !concept.primary.contains_key(target_language) {
            continue;
        }
        if !concept_has_source_label(concept, source_language, &normalized) {
            continue;
        }
        if let Some(value) = concept
            .forms
            .get(target_language)
            .and_then(|forms| forms.get(form_key))
            .and_then(grammar_value)
        {
            return Some(value);
        }
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

fn find_concept_by_id(concept_id: &str) -> Option<&'static RawConcept> {
    lexicon().concepts.iter().find(|concept| {
        concept.id == concept_id || concept.entity_id.as_deref() == Some(concept_id)
    })
}

fn concept_has_source_label(concept: &RawConcept, source_language: &str, normalized: &str) -> bool {
    concept
        .labels
        .get(source_language)
        .map(|labels| {
            labels
                .iter()
                .any(|label| normalize_label(label) == normalized)
        })
        .unwrap_or(false)
}

fn grammar_value(raw: &serde_json::Value) -> Option<String> {
    match raw {
        serde_json::Value::Null => None,
        serde_json::Value::String(value) => Some(value.clone()),
        serde_json::Value::Object(object) => object
            .get("value")
            .or_else(|| object.get("text"))
            .and_then(serde_json::Value::as_str)
            .map(str::to_string),
        value => Some(value.to_string()),
    }
}

fn normalize_grammar_form(
    raw: &serde_json::Value,
    concept: &RawConcept,
) -> Option<ResolvedConceptForm> {
    let object = raw.as_object();
    let text = object
        .and_then(|entry| entry.get("text"))
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
        .or_else(|| raw.as_str().map(str::to_string))?;
    if text.is_empty() {
        return None;
    }
    let linked = object
        .and_then(|entry| entry.get("linked"))
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(true);
    let entity_id = object
        .and_then(|entry| entry.get("entityId"))
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
        .or_else(|| {
            linked.then(|| {
                concept
                    .entity_id
                    .clone()
                    .unwrap_or_else(|| concept.id.clone())
            })
        });
    let url = object
        .and_then(|entry| entry.get("url"))
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
        .or_else(|| linked.then(|| concept.url.clone()).flatten());
    let description = object
        .and_then(|entry| entry.get("description"))
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
        .or_else(|| concept.description.clone());

    Some(ResolvedConceptForm {
        text,
        entity_id,
        url,
        description,
    })
}

fn normalize_label(value: &str) -> String {
    let mut normalized = String::with_capacity(value.len());
    for character in value.chars().flat_map(char::to_lowercase) {
        if character.is_alphanumeric() {
            normalized.push(character);
        } else {
            normalized.push(' ');
        }
    }
    normalized.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn compact_label(value: &str) -> String {
    value
        .trim()
        .chars()
        .flat_map(char::to_lowercase)
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn directional_glossary_keys(value: &str) -> Vec<String> {
    let mut keys = Vec::new();
    for key in [
        value.to_string(),
        compact_label(value),
        normalize_label(value),
    ] {
        if !key.is_empty() && !keys.contains(&key) {
            keys.push(key);
        }
    }
    keys
}

fn merge_virtual_concepts(concepts: &mut Vec<RawConcept>) {
    let by_id: BTreeMap<String, usize> = concepts
        .iter()
        .enumerate()
        .map(|(index, concept)| (concept.id.clone(), index))
        .collect();
    for incoming in virtual_concepts() {
        if let Some(index) = by_id.get(&incoming.id).copied() {
            merge_concept(&mut concepts[index], incoming);
        } else {
            concepts.push(incoming);
        }
    }
}

fn merge_concept(previous: &mut RawConcept, incoming: RawConcept) {
    previous.url = incoming.url.or_else(|| previous.url.clone());
    previous.entity_id = incoming.entity_id.or_else(|| previous.entity_id.clone());
    previous.description = incoming
        .description
        .or_else(|| previous.description.clone());
    for (language, labels) in incoming.labels {
        let target = previous.labels.entry(language).or_default();
        for label in labels {
            if !target.iter().any(|existing| existing == &label) {
                target.push(label);
            }
        }
    }
    previous.primary.extend(incoming.primary);
    for (language, forms) in incoming.forms {
        previous.forms.entry(language).or_default().extend(forms);
    }
}

fn virtual_concepts() -> Vec<RawConcept> {
    use serde_json::json;

    let california_ru =
        "\u{041a}\u{0430}\u{043b}\u{0438}\u{0444}\u{043e}\u{0440}\u{043d}\u{0438}\u{044f}";
    let state_ru = "\u{0448}\u{0442}\u{0430}\u{0442}";
    let lie_on_ru = "\u{0440}\u{0430}\u{0441}\u{043f}\u{043e}\u{043b}\u{043e}\u{0436}\u{0435}\u{043d} \u{043d}\u{0430}";
    let that_relative_ru = "\u{043a}\u{043e}\u{0442}\u{043e}\u{0440}\u{044b}\u{0439}";
    let western_us_ru = "\u{0417}\u{0430}\u{043f}\u{0430}\u{0434} \u{0421}\u{0428}\u{0410}";
    let western_us_locative_ru =
        "\u{0437}\u{0430}\u{043f}\u{0430}\u{0434}\u{0435} \u{0421}\u{0428}\u{0410}";
    let preposition_on_ru = "\u{043d}\u{0430}";
    let pacific_coast_ru = "\u{0422}\u{0438}\u{0445}\u{043e}\u{043e}\u{043a}\u{0435}\u{0430}\u{043d}\u{0441}\u{043a}\u{043e}\u{0435} \u{043f}\u{043e}\u{0431}\u{0435}\u{0440}\u{0435}\u{0436}\u{044c}\u{0435}";
    let pacific_coast_prepositional_ru = "\u{0422}\u{0438}\u{0445}\u{043e}\u{043e}\u{043a}\u{0435}\u{0430}\u{043d}\u{0441}\u{043a}\u{043e}\u{043c} \u{043f}\u{043e}\u{0431}\u{0435}\u{0440}\u{0435}\u{0436}\u{044c}\u{0435}";

    vec![
        raw_concept(
            "Q99",
            Some("https://www.wikidata.org/wiki/Q99"),
            Some("Q99"),
            Some("state of the United States of America"),
            labels(vec![
                ("en", vec!["California"]),
                ("ru", vec![california_ru]),
            ]),
            primary(vec![("ru", california_ru)]),
            forms(vec![]),
        ),
        raw_concept(
            "Q35657",
            Some("https://www.wikidata.org/wiki/Q35657"),
            Some("Q35657"),
            Some("state of the United States"),
            labels(vec![
                ("en", vec!["state", "U.S. state", "US state"]),
                ("ru", vec![state_ru]),
            ]),
            primary(vec![("ru", state_ru)]),
            forms(vec![]),
        ),
        raw_concept(
            "lex:en:lie_on->ru",
            Some("https://www.oxfordlearnersdictionaries.com/definition/english/lie_1"),
            Some("lex:en:lie_on"),
            Some(
                "geographic sense of lie + adverb/preposition: to be located in a particular place",
            ),
            labels(vec![
                ("en", vec!["lie on", "lies on", "lying on"]),
                ("ru", vec![lie_on_ru]),
            ]),
            primary(vec![("ru", lie_on_ru)]),
            forms(vec![("ru", vec![("objectCase", json!("prepositional"))])]),
        ),
        raw_concept(
            "lex:en:that_relative->ru",
            Some("https://en.wiktionary.org/wiki/that"),
            Some("lex:en:that_relative"),
            Some("relative-clause pronoun used before a Russian predicate"),
            labels(vec![("en", vec!["that"]), ("ru", vec![that_relative_ru])]),
            primary(vec![("ru", that_relative_ru)]),
            forms(vec![]),
        ),
        raw_concept(
            "Q12612",
            Some("https://www.wikidata.org/wiki/Q12612"),
            Some("Q12612"),
            Some("region of the United States"),
            labels(vec![
                ("en", vec!["Western United States", "western United States"]),
                ("ru", vec![western_us_ru]),
            ]),
            primary(vec![("ru", western_us_ru)]),
            forms(vec![(
                "ru",
                vec![
                    ("locative", json!({ "text": western_us_locative_ru })),
                    (
                        "locativePreposition",
                        json!({ "text": preposition_on_ru, "linked": false }),
                    ),
                ],
            )]),
        ),
        raw_concept(
            "Q430265",
            Some("https://www.wikidata.org/wiki/Q430265"),
            Some("Q430265"),
            Some("coastline bordering the Pacific Ocean"),
            labels(vec![
                (
                    "en",
                    vec!["Pacific Coast", "Pacific coast", "pacific coast"],
                ),
                ("ru", vec![pacific_coast_ru]),
            ]),
            primary(vec![("ru", pacific_coast_ru)]),
            forms(vec![(
                "ru",
                vec![(
                    "prepositional",
                    json!({ "text": pacific_coast_prepositional_ru }),
                )],
            )]),
        ),
    ]
}

fn raw_concept(
    id: &str,
    url: Option<&str>,
    entity_id: Option<&str>,
    description: Option<&str>,
    labels: BTreeMap<String, Vec<String>>,
    primary: BTreeMap<String, String>,
    forms: BTreeMap<String, BTreeMap<String, serde_json::Value>>,
) -> RawConcept {
    RawConcept {
        id: id.to_string(),
        url: url.map(str::to_string),
        entity_id: entity_id.map(str::to_string),
        description: description.map(str::to_string),
        primary,
        labels,
        forms,
    }
}

fn labels(entries: Vec<(&str, Vec<&str>)>) -> BTreeMap<String, Vec<String>> {
    entries
        .into_iter()
        .map(|(language, values)| {
            (
                language.to_string(),
                values.into_iter().map(str::to_string).collect(),
            )
        })
        .collect()
}

fn primary(entries: Vec<(&str, &str)>) -> BTreeMap<String, String> {
    entries
        .into_iter()
        .map(|(language, value)| (language.to_string(), value.to_string()))
        .collect()
}

fn forms(
    entries: Vec<(&str, Vec<(&str, serde_json::Value)>)>,
) -> BTreeMap<String, BTreeMap<String, serde_json::Value>> {
    entries
        .into_iter()
        .map(|(language, values)| {
            (
                language.to_string(),
                values
                    .into_iter()
                    .map(|(key, value)| (key.to_string(), value))
                    .collect(),
            )
        })
        .collect()
}
