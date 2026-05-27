//! Rust counterpart of `js/src/formalize-contexts.js` (issue #126).
//!
//! This module mirrors the *pure*, network-free helpers that decide a word's
//! context during formalization: detecting scholarly-publication candidates so
//! a common phrase no longer resolves to a paper title, surfacing the per-word
//! context breakdown for the UI / debug log, building persistent
//! context-selection questions, and re-picking a user-chosen sense.
//!
//! The functions operate on `serde_json::Value` rather than typed structs so
//! the Rust engine reads and writes the *same* phrase/candidate JSON shapes the
//! JavaScript engine uses, keeping the two implementations byte-compatible. The
//! big-context BFS aggregator in the JavaScript module is intentionally not
//! ported here because it performs cached network traversal; only the
//! deterministic decision helpers — the part the issue #126 bug lived in — are
//! shared between the engines and gated by the JS/Rust parity check.

use serde_json::{json, Map, Value};
use std::collections::BTreeMap;

/// `P31` (instance of) targets that mark a Wikidata entity as a publication
/// rather than the everyday sense of the searched words. Mirrors
/// `scholarlyInstanceIds` in the JavaScript module.
const SCHOLARLY_INSTANCE_IDS: [&str; 9] = [
    "Q13442814", // scholarly article
    "Q18918145", // academic journal article
    "Q5633421",  // scientific journal
    "Q737498",   // academic journal
    "Q1002697",  // periodical
    "Q571",      // book
    "Q3331189",  // version, edition, or translation
    "Q191067",   // article
    "Q1980247",  // chapter
];

/// Qualifiers that, when followed by a publication noun, mark a description as a
/// scholarly work. Mirrors the leading alternation of
/// `publicationDescriptionPattern`. `peer[-\s]?reviewed` is expanded into its
/// three surface forms so the dependency-free check stays faithful to the regex.
const PUBLICATION_QUALIFIERS: [&str; 8] = [
    "scientific",
    "scholarly",
    "research",
    "review",
    "academic",
    "peerreviewed",
    "peer-reviewed",
    "peer reviewed",
];

/// Publication nouns paired with a qualifier (e.g. "scientific article").
const PUBLICATION_NOUNS: [&str; 4] = ["article", "paper", "publication", "journal"];

/// Standalone publication phrases from `publicationDescriptionPattern` that do
/// not need a separate qualifier word.
const PUBLICATION_PHRASES: [&str; 11] = [
    "article published",
    "paper published",
    "journal article",
    "conference paper",
    "proceedings article",
    "doctoral thesis",
    "master's thesis",
    "masters thesis",
    "preprint",
    "scientific journal",
    "academic journal",
];

/// Faithful, dependency-free port of `publicationDescriptionPattern`. Returns
/// `true` when the (case-insensitive) description names a scholarly work.
fn matches_publication_description(description: &str) -> bool {
    let lowered = description.to_lowercase();
    for qualifier in PUBLICATION_QUALIFIERS {
        for noun in PUBLICATION_NOUNS {
            if lowered.contains(&format!("{qualifier} {noun}")) {
                return true;
            }
        }
    }
    PUBLICATION_PHRASES
        .iter()
        .any(|phrase| lowered.contains(phrase))
}

/// Detect whether a candidate is a scholarly publication (article, journal,
/// book, …) rather than the everyday sense of the searched words. Uses the
/// Wikidata description first, falling back to hydrated `P31` claims. Mirrors
/// `isScholarlyPublicationCandidate` in `js/src/formalize-contexts.js`.
pub fn is_scholarly_publication_candidate(candidate: &Value) -> bool {
    if candidate.is_null() {
        return false;
    }
    let description = candidate
        .get("description")
        .and_then(Value::as_str)
        .unwrap_or("");
    if matches_publication_description(description) {
        return true;
    }
    match candidate.get("contextLabels").and_then(Value::as_array) {
        Some(labels) => labels.iter().any(|label| {
            label.get("property").and_then(Value::as_str) == Some("P31")
                && label
                    .get("targetId")
                    .and_then(Value::as_str)
                    .map(|target| SCHOLARLY_INSTANCE_IDS.contains(&target))
                    .unwrap_or(false)
        }),
        None => false,
    }
}

fn is_present(value: Option<&Value>) -> bool {
    matches!(value, Some(found) if !found.is_null())
}

fn candidate_list(phrase: &Value) -> Vec<Value> {
    match phrase.get("candidates").and_then(Value::as_array) {
        Some(list) if !list.is_empty() => list.clone(),
        _ => vec![phrase.get("entity").cloned().unwrap_or(Value::Null)],
    }
}

fn candidates_len(phrase: &Value) -> usize {
    phrase
        .get("candidates")
        .and_then(Value::as_array)
        .map(Vec::len)
        .unwrap_or(0)
}

/// `value ?? null`: keep the value unless it is missing or JSON `null`.
fn or_null(value: Option<&Value>) -> Value {
    match value {
        Some(found) if !found.is_null() => found.clone(),
        _ => Value::Null,
    }
}

/// `left ?? right`: the first non-nullish of two optional values, else `null`.
fn coalesce(left: Option<&Value>, right: Option<&Value>) -> Value {
    match left {
        Some(found) if !found.is_null() => found.clone(),
        _ => or_null(right),
    }
}

fn detected_contexts(candidate: &Value) -> Vec<Value> {
    candidate
        .get("contextLabels")
        .and_then(Value::as_array)
        .map(|labels| {
            labels
                .iter()
                .map(|label| {
                    json!({
                        "property": or_null(label.get("property")),
                        "propertyLabel": or_null(label.get("propertyLabel")),
                        "targetId": or_null(label.get("targetId")),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Expose, per word, the contexts that were detected for each candidate sense
/// and which sense was finally selected. Mirrors `buildWordContexts`.
pub fn build_word_contexts(phrases: &[Value]) -> Vec<Value> {
    phrases
        .iter()
        .filter(|phrase| is_present(phrase.get("entity")))
        .map(|phrase| {
            let selected_id = or_null(phrase.get("entity").and_then(|entity| entity.get("id")));
            let candidates = candidate_list(phrase)
                .iter()
                .map(|candidate| {
                    let selected = candidate
                        .get("id")
                        .map(|id| *id == selected_id)
                        .unwrap_or(false);
                    json!({
                        "id": or_null(candidate.get("id")),
                        "label": or_null(candidate.get("label")),
                        "description": or_null(candidate.get("description")),
                        "score": or_null(candidate.get("score")),
                        "selected": selected,
                        "isPublication": is_scholarly_publication_candidate(candidate),
                        "contexts": detected_contexts(candidate),
                    })
                })
                .collect::<Vec<_>>();
            json!({
                "text": or_null(phrase.get("text")),
                "start": or_null(phrase.get("start")),
                "end": or_null(phrase.get("end")),
                "selectedId": selected_id,
                "candidates": candidates,
            })
        })
        .collect()
}

/// Build context-selection questions for every word with more than one
/// plausible sense. Mirrors `buildContextQuestions`; the questions persist so
/// selecting an option re-pins that sense rather than consuming the question.
pub fn build_context_questions(phrases: &[Value]) -> Vec<Value> {
    phrases
        .iter()
        .filter(|phrase| is_present(phrase.get("entity")) && candidates_len(phrase) > 1)
        .map(|phrase| {
            let selected_entity_id =
                or_null(phrase.get("entity").and_then(|entity| entity.get("id")));
            let phrase_text = or_null(phrase.get("text"));
            let text_label = phrase_text.as_str().unwrap_or_default();
            let options = phrase
                .get("candidates")
                .and_then(Value::as_array)
                .map(|candidates| {
                    candidates
                        .iter()
                        .map(|candidate| {
                            let selected = candidate
                                .get("id")
                                .map(|id| *id == selected_entity_id)
                                .unwrap_or(false);
                            json!({
                                "id": or_null(candidate.get("id")),
                                "entityId": or_null(candidate.get("id")),
                                "label": coalesce(candidate.get("label"), candidate.get("id")),
                                "description": or_null(candidate.get("description")),
                                "score": or_null(candidate.get("score")),
                                "selected": selected,
                                "isPublication": is_scholarly_publication_candidate(candidate),
                            })
                        })
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            json!({
                "kind": "context-selection",
                "phraseStart": or_null(phrase.get("start")),
                "phraseText": phrase_text,
                "selectedEntityId": selected_entity_id,
                "question": format!("Which meaning of \"{text_label}\" did you intend?"),
                "options": options,
            })
        })
        .collect()
}

fn value_to_key(value: &Value) -> Option<String> {
    match value {
        Value::Null => None,
        Value::String(text) => Some(text.clone()),
        Value::Number(number) => Some(number.to_string()),
        Value::Bool(flag) => Some(flag.to_string()),
        _ => None,
    }
}

fn selection_entity_id(value: &Value) -> Option<String> {
    match value {
        Value::String(text) => Some(text.clone()),
        other => other
            .get("entityId")
            .and_then(Value::as_str)
            .map(str::to_string),
    }
}

/// Normalize user-pinned context selections into a map keyed by phrase start
/// index (stringified) or phrase text, each value the chosen candidate id.
/// Mirrors `normalizeContextSelections`; accepts a JSON object (the JS `Map` /
/// plain-object form) or an array of `{ start?, text?, entityId }` entries.
pub fn normalize_context_selections(input: &Value) -> BTreeMap<String, String> {
    let mut selections = BTreeMap::new();
    let entries: Vec<(Value, Value)> = match input {
        Value::Array(items) => items
            .iter()
            .map(|entry| {
                let key = match entry.get("start") {
                    Some(start) if !start.is_null() => start.clone(),
                    _ => or_null(entry.get("text")),
                };
                (key, entry.clone())
            })
            .collect(),
        Value::Object(map) => map
            .iter()
            .map(|(key, value)| (Value::String(key.clone()), value.clone()))
            .collect(),
        _ => return selections,
    };
    for (key, value) in entries {
        if let (Some(key), Some(entity_id)) = (value_to_key(&key), selection_entity_id(&value)) {
            selections.insert(key, entity_id);
        }
    }
    selections
}

fn lookup_context_selection(
    selections: &BTreeMap<String, String>,
    phrase: &Value,
) -> Option<String> {
    if let Some(start) = phrase.get("start") {
        if !start.is_null() {
            if let Some(key) = value_to_key(start) {
                if let Some(found) = selections.get(&key) {
                    return Some(found.clone());
                }
            }
        }
    }
    phrase
        .get("text")
        .and_then(Value::as_str)
        .and_then(|text| selections.get(text).cloned())
}

fn select_phrase_candidate(phrase: &Value, selections: &BTreeMap<String, String>) -> Value {
    if !is_present(phrase.get("entity")) {
        return phrase.clone();
    }
    let candidates = match phrase.get("candidates").and_then(Value::as_array) {
        Some(list) if list.len() > 1 => list,
        _ => return phrase.clone(),
    };
    let entity = phrase.get("entity").cloned().unwrap_or(Value::Null);
    let entity_id = entity.get("id").and_then(Value::as_str);
    let chosen_id = match lookup_context_selection(selections, phrase) {
        Some(id) => id,
        None => return phrase.clone(),
    };
    if Some(chosen_id.as_str()) == entity_id {
        return phrase.clone();
    }
    let chosen_index = candidates
        .iter()
        .position(|candidate| candidate.get("id").and_then(Value::as_str) == Some(&chosen_id));
    let chosen_index = match chosen_index {
        Some(index) => index,
        None => return phrase.clone(),
    };
    let chosen = candidates[chosen_index].clone();

    let mut reordered = vec![chosen.clone()];
    for (index, candidate) in candidates.iter().enumerate() {
        if index != chosen_index {
            reordered.push(candidate.clone());
        }
    }

    let mut new_entity: Map<String, Value> = entity.as_object().cloned().unwrap_or_default();
    new_entity.insert("id".into(), or_null(chosen.get("id")));
    new_entity.insert("label".into(), or_null(chosen.get("label")));
    new_entity.insert("description".into(), or_null(chosen.get("description")));
    new_entity.insert("kind".into(), or_null(chosen.get("kind")));
    new_entity.insert(
        "source".into(),
        coalesce(chosen.get("source"), entity.get("source")),
    );
    new_entity.insert(
        "sourceUrl".into(),
        coalesce(chosen.get("sourceUrl"), entity.get("sourceUrl")),
    );
    new_entity.insert("score".into(), or_null(chosen.get("score")));
    new_entity.insert(
        "contextLabels".into(),
        coalesce(chosen.get("contextLabels"), entity.get("contextLabels")),
    );
    new_entity.insert("wikipediaUrl".into(), or_null(chosen.get("wikipediaUrl")));
    new_entity.insert(
        "wikipediaTitle".into(),
        or_null(chosen.get("wikipediaTitle")),
    );

    let mut new_phrase: Map<String, Value> = phrase.as_object().cloned().unwrap_or_default();
    new_phrase.insert("candidates".into(), Value::Array(reordered));
    new_phrase.insert("entity".into(), Value::Object(new_entity));
    Value::Object(new_phrase)
}

/// Re-pick the chosen entity for any phrase the user pinned to a specific
/// candidate sense, promoting the picked candidate to the front. Mirrors
/// `applyContextSelections`.
pub fn apply_context_selections(
    phrases: &[Value],
    selections: &BTreeMap<String, String>,
) -> Vec<Value> {
    if selections.is_empty() {
        return phrases.to_vec();
    }
    phrases
        .iter()
        .map(|phrase| select_phrase_candidate(phrase, selections))
        .collect()
}
