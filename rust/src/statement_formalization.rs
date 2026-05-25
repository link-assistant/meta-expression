use crate::formal_ai_support::{
    extract_linguistic_metadata, LinguisticFragment, LinguisticMetadata,
};
use serde_json::{json, Value};

pub(crate) fn statement_meaning_metadata(text: &str) -> Value {
    let metadata = extract_linguistic_metadata(text);
    let ast = metadata.ast.clone();
    let meaning_links = statement_meaning_links(&metadata);
    let (variables, questions) = open_meaning_questions(&meaning_links);
    let tokens = metadata
        .fragments
        .iter()
        .filter(|fragment| fragment.kind == "word")
        .map(|fragment| fragment.text.clone())
        .collect::<Vec<_>>();

    json!({
        "ast": ast.clone(),
        "linguisticMetadata": metadata.clone(),
        "meaningLinks": meaning_links.clone(),
        "variables": variables.clone(),
        "questions": questions.clone(),
        "cst": {
            "type": "statement-formalization",
            "version": 1,
            "text": text,
            "tokens": tokens,
            "ast": ast,
            "linguisticMetadata": metadata,
            "meaningLinks": meaning_links,
            "variables": variables,
            "questions": questions
        }
    })
}

pub(crate) fn unknowns_from_structured_metadata(structured: &Value) -> Vec<String> {
    let mut unknowns = if let Some(variables) = structured["variables"].as_array() {
        variables
            .iter()
            .filter_map(|variable| variable["name"].as_str().map(str::to_string))
            .collect::<Vec<_>>()
    } else {
        Vec::new()
    };
    unknowns.push("evidence source mapping".to_string());
    unknowns
}

pub(crate) fn questions_from_structured_metadata(structured: &Value) -> Vec<String> {
    if let Some(questions) = structured["questions"].as_array() {
        questions
            .iter()
            .filter_map(|question| question["text"].as_str().map(str::to_string))
            .collect()
    } else {
        Vec::new()
    }
}

fn statement_meaning_links(metadata: &LinguisticMetadata) -> Vec<Value> {
    selected_meaning_fragments(metadata)
        .into_iter()
        .enumerate()
        .map(|(index, fragment)| {
            let target = meaning_target(&fragment.text, &fragment.role);
            let status = if target["source"] == "wikidata" {
                "linked"
            } else {
                "needs-disambiguation"
            };
            json!({
                "id": format!("meaning-link-{}", index + 1),
                "text": fragment.text,
                "role": fragment.role,
                "fragmentId": fragment.id,
                "tokenStart": fragment.token_start,
                "tokenEnd": fragment.token_end,
                "sourceStart": fragment.source_start,
                "sourceEnd": fragment.source_end,
                "status": status,
                "target": target.clone(),
                "candidates": [target.clone()],
                "selectedTargetId": target["id"].clone()
            })
        })
        .collect()
}

fn selected_meaning_fragments(metadata: &LinguisticMetadata) -> Vec<&LinguisticFragment> {
    let semantic = metadata
        .fragments
        .iter()
        .filter(|fragment| matches!(fragment.role.as_str(), "subject" | "predicate" | "object"))
        .collect::<Vec<_>>();
    if !semantic.is_empty() {
        return semantic;
    }

    let structural = metadata
        .fragments
        .iter()
        .filter(|fragment| matches!(fragment.role.as_str(), "noun-phrase" | "verb-phrase"))
        .collect::<Vec<_>>();
    if !structural.is_empty() {
        return structural;
    }

    metadata
        .fragments
        .iter()
        .filter(|fragment| fragment.kind == "word" && !is_stop_word(&fragment.text))
        .collect()
}

fn meaning_target(text: &str, role: &str) -> Value {
    match normalize_key(text).as_str() {
        "earth" => wikidata_target("Q2", "Earth", "entity", "https://www.wikidata.org/wiki/Q2"),
        "moon" => wikidata_target(
            "Q405",
            "Moon",
            "entity",
            "https://www.wikidata.org/wiki/Q405",
        ),
        "sun" => wikidata_target(
            "Q525",
            "Sun",
            "entity",
            "https://www.wikidata.org/wiki/Q525",
        ),
        "paris" => wikidata_target(
            "Q90",
            "Paris",
            "entity",
            "https://www.wikidata.org/wiki/Q90",
        ),
        "france" => wikidata_target(
            "Q142",
            "France",
            "entity",
            "https://www.wikidata.org/wiki/Q142",
        ),
        "elon musk" => wikidata_target(
            "Q317521",
            "Elon Musk",
            "entity",
            "https://www.wikidata.org/wiki/Q317521",
        ),
        "orbits" | "orbit" => wikidata_target(
            "P397",
            "parent astronomical body",
            "property",
            "https://www.wikidata.org/wiki/Property:P397",
        ),
        _ => lexical_target(text, role),
    }
}

fn wikidata_target(id: &str, label: &str, kind: &str, source_url: &str) -> Value {
    json!({
        "id": id,
        "label": label,
        "description": Value::Null,
        "kind": kind,
        "source": "wikidata",
        "sourceUrl": source_url
    })
}

fn lexical_target(text: &str, role: &str) -> Value {
    let normalized = normalize_key(text).replace(' ', "_");
    let id = format!("lex:en:{normalized}");
    let kind = if expected_kind_for_role(role) == "property" {
        "property"
    } else {
        "entity"
    };
    json!({
        "id": id,
        "label": text,
        "description": format!("Lexical en {}", expected_kind_for_role(role)),
        "kind": kind,
        "source": "lexical",
        "sourceUrl": format!("https://en.wiktionary.org/wiki/{}", normalized)
    })
}

fn open_meaning_questions(meaning_links: &[Value]) -> (Vec<Value>, Vec<Value>) {
    let mut variables = Vec::new();
    let mut questions = Vec::new();
    let mut names = std::collections::BTreeMap::<String, usize>::new();

    for link in meaning_links {
        if link["status"] == "linked" {
            continue;
        }
        let role = link["role"].as_str().unwrap_or("meaning");
        let base = variable_base_for_role(role);
        let next = names.get(&base).copied().unwrap_or(0) + 1;
        names.insert(base.clone(), next);
        let name = if next == 1 {
            format!("?{base}")
        } else {
            format!("?{base}-{next}")
        };
        let expected_kind = expected_kind_for_role(role);
        let question_id = format!("question-{}", questions.len() + 1);
        questions.push(json!({
            "id": question_id.clone(),
            "variableName": name,
            "text": format!("Which {expected_kind} does \"{}\" mean?", link["text"].as_str().unwrap_or_default()),
            "expectedKind": expected_kind,
            "meaningLinkId": link["id"],
            "fragmentId": link["fragmentId"]
        }));
        variables.push(json!({
            "id": format!("variable-{}", variables.len() + 1),
            "name": name,
            "role": role,
            "text": link["text"],
            "expectedKind": expected_kind,
            "meaningLinkId": link["id"],
            "fragmentId": link["fragmentId"],
            "sourceStart": link["sourceStart"],
            "sourceEnd": link["sourceEnd"],
            "candidateTargetIds": [link["target"]["id"].clone()],
            "questionId": question_id
        }));
    }

    (variables, questions)
}

fn expected_kind_for_role(role: &str) -> &'static str {
    if matches!(role, "predicate" | "verb-phrase") {
        "property"
    } else {
        "entity"
    }
}

fn variable_base_for_role(role: &str) -> String {
    match role {
        "subject" | "predicate" | "object" => role.to_string(),
        _ => expected_kind_for_role(role).to_string(),
    }
}

fn is_stop_word(text: &str) -> bool {
    matches!(
        normalize_key(text).as_str(),
        "the"
            | "a"
            | "an"
            | "and"
            | "or"
            | "but"
            | "is"
            | "are"
            | "was"
            | "were"
            | "of"
            | "to"
            | "in"
            | "on"
            | "with"
    )
}

fn normalize_key(input: &str) -> String {
    input
        .trim()
        .to_lowercase()
        .chars()
        .map(|ch| if ch.is_alphanumeric() { ch } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}
