//! Rust mirror of the JavaScript issue #126 context tests
//! (`js/tests/integration/issue-126-context-detection.test.js` and
//! `issue-126-context-selection.test.js`).
//!
//! The JavaScript tests drive the whole network-backed `formalizeTextWith`
//! pipeline; the Rust counterpart exercises the same *pure* decision helpers
//! the pipeline delegates to, so both engines agree on:
//!
//!   1. rejecting scholarly-publication candidates that merely *contain* the
//!      searched phrase (the "developing systems" -> Q41668433 bug),
//!   2. surfacing the per-word context breakdown for the UI / debug log,
//!   3. building persistent context-selection questions, and
//!   4. re-pinning a user-chosen sense by phrase start index or by text.

use meta_expression_core::{
    apply_context_selections, build_context_questions, build_word_contexts,
    is_scholarly_publication_candidate, normalize_context_selections,
};
use serde_json::{json, Value};

/// The clinical-trials article whose title merely *contains* "developing
/// systems" — the wrong sense reported in issue #126.
fn scholarly_article_candidate() -> Value {
    json!({
        "id": "Q41668433",
        "label": "Developing systems for cost-effective auditing of clinical trials",
        "description": "scientific article published on December 1, 1997",
        "contextLabels": [
            { "property": "P31", "propertyLabel": "instance of", "targetId": "Q13442814" }
        ],
    })
}

/// The everyday "system" concept that must survive instead.
fn system_candidate() -> Value {
    json!({
        "id": "Q58778",
        "label": "system",
        "description": "group of interacting entities",
        "score": 5,
        "contextLabels": [
            { "property": "P31", "propertyLabel": "instance of", "targetId": "Q16889133" },
            { "property": "P279", "propertyLabel": "subclass of", "targetId": "Q35120" }
        ],
    })
}

#[test]
fn detects_scholarly_article_from_description() {
    assert!(is_scholarly_publication_candidate(
        &scholarly_article_candidate()
    ));
}

#[test]
fn detects_scholarly_article_from_p31_claim() {
    // Even without a give-away description, a hydrated P31 -> scholarly-article
    // claim flags the candidate.
    let candidate = json!({
        "id": "Q41668433",
        "label": "Developing systems for cost-effective auditing of clinical trials",
        "description": "",
        "contextLabels": [
            { "property": "P31", "propertyLabel": "instance of", "targetId": "Q13442814" }
        ],
    });
    assert!(is_scholarly_publication_candidate(&candidate));
}

#[test]
fn everyday_word_is_not_a_publication() {
    assert!(!is_scholarly_publication_candidate(&system_candidate()));
    assert!(!is_scholarly_publication_candidate(&Value::Null));
}

#[test]
fn surfaces_per_word_context_detection() {
    let phrases = vec![json!({
        "text": "systems",
        "start": 0,
        "end": 7,
        "entity": system_candidate(),
        "candidates": [system_candidate()],
    })];

    let word_contexts = build_word_contexts(&phrases);
    assert_eq!(word_contexts.len(), 1);
    let systems = &word_contexts[0];
    assert_eq!(systems["text"], json!("systems"));

    let top = &systems["candidates"][0];
    assert_eq!(top["id"], json!("Q58778"));
    assert_eq!(top["selected"], json!(true));
    assert_eq!(top["isPublication"], json!(false));

    let contexts = top["contexts"].as_array().expect("contexts array");
    assert!(contexts
        .iter()
        .any(|ctx| ctx["targetId"] == json!("Q16889133")));
}

/// Two senses of "bank" sharing the same label form a genuine homonym, so both
/// are plausible candidates of the single-word phrase.
fn bank_phrase(selected_id: &str, candidate_order: &[&str]) -> Value {
    let candidates: Vec<Value> = candidate_order
        .iter()
        .map(|id| bank_candidate(id))
        .collect();
    let entity = bank_candidate(selected_id);
    json!({
        "text": "bank",
        "start": 0,
        "end": 4,
        "entity": entity,
        "candidates": candidates,
    })
}

fn bank_candidate(id: &str) -> Value {
    match id {
        "Q100" => json!({
            "id": "Q100",
            "label": "bank",
            "description": "financial institution",
            "score": 9,
            "contextLabels": [
                { "property": "P31", "propertyLabel": "instance of", "targetId": "Q22687" }
            ],
        }),
        "Q200" => json!({
            "id": "Q200",
            "label": "bank",
            "description": "land alongside a river",
            "score": 4,
            "contextLabels": [
                { "property": "P31", "propertyLabel": "instance of", "targetId": "Q9430" }
            ],
        }),
        other => json!({ "id": other }),
    }
}

#[test]
fn builds_persistent_context_question_for_homonym() {
    let phrases = vec![bank_phrase("Q100", &["Q100", "Q200"])];
    let questions = build_context_questions(&phrases);
    assert_eq!(questions.len(), 1);

    let question = &questions[0];
    assert_eq!(question["kind"], json!("context-selection"));
    assert_eq!(question["phraseText"], json!("bank"));
    assert_eq!(question["selectedEntityId"], json!("Q100"));

    let options = question["options"].as_array().expect("options array");
    assert_eq!(options.len(), 2);
    let selected = options
        .iter()
        .find(|opt| opt["selected"] == json!(true))
        .expect("a selected option");
    assert_eq!(selected["entityId"], json!("Q100"));
}

#[test]
fn single_candidate_word_gets_no_question() {
    let phrases = vec![json!({
        "text": "systems",
        "start": 0,
        "end": 7,
        "entity": system_candidate(),
        "candidates": [system_candidate()],
    })];
    assert!(build_context_questions(&phrases).is_empty());
}

#[test]
fn re_pins_chosen_sense_by_phrase_start_index() {
    let phrases = vec![bank_phrase("Q100", &["Q100", "Q200"])];
    let selections = normalize_context_selections(&json!({ "0": "Q200" }));
    let pinned = apply_context_selections(&phrases, &selections);

    let entity = &pinned[0]["entity"];
    assert_eq!(entity["id"], json!("Q200"));
    assert_eq!(entity["description"], json!("land alongside a river"));
    // The chosen candidate is promoted to the front of the list.
    assert_eq!(pinned[0]["candidates"][0]["id"], json!("Q200"));

    // The question now reports the user's choice as selected.
    let questions = build_context_questions(&pinned);
    assert_eq!(questions[0]["selectedEntityId"], json!("Q200"));
}

#[test]
fn re_pins_chosen_sense_by_phrase_text() {
    let phrases = vec![bank_phrase("Q100", &["Q100", "Q200"])];
    let selections = normalize_context_selections(&json!({ "bank": "Q200" }));
    let pinned = apply_context_selections(&phrases, &selections);
    assert_eq!(pinned[0]["entity"]["id"], json!("Q200"));
}

#[test]
fn accepts_array_of_selection_entries() {
    let phrases = vec![bank_phrase("Q100", &["Q100", "Q200"])];
    let selections = normalize_context_selections(&json!([{ "start": 0, "entityId": "Q200" }]));
    let pinned = apply_context_selections(&phrases, &selections);
    assert_eq!(pinned[0]["entity"]["id"], json!("Q200"));
}

#[test]
fn leaves_phrases_untouched_without_selections() {
    let phrases = vec![bank_phrase("Q100", &["Q100", "Q200"])];
    let pinned = apply_context_selections(&phrases, &normalize_context_selections(&Value::Null));
    assert_eq!(pinned[0]["entity"]["id"], json!("Q100"));
}
