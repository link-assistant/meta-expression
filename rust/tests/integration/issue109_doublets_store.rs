use meta_expression_core::{
    analyze_statement, decode_json_value_from_doublets, encode_json_value_to_doublets,
    load_meta_language_links_from_doublets, load_term_data_from_doublets,
    save_meta_language_links_to_doublets, save_term_data_to_doublets, DoubletsLink,
    PortableCaseOptions, DOUBLETS_BOOL_TAG, DOUBLETS_NUMBER_TAG, DOUBLETS_OBJECT_TAG,
    DOUBLETS_STRING_TAG,
};
use serde_json::json;

#[cfg(not(target_arch = "wasm32"))]
use meta_expression_core::{
    read_file_mapped_doublets_links, save_json_value_to_file_mapped_doublets,
};

#[test]
fn rust_doublets_store_matches_js_unicode_and_scalar_shapes() {
    let encoded = encode_json_value_to_doublets(&json!("Hi 🌍")).unwrap();

    assert_eq!(
        encoded.links,
        vec![
            DoubletsLink {
                index: 1,
                source: DOUBLETS_STRING_TAG,
                target: 72
            },
            DoubletsLink {
                index: 2,
                source: 0,
                target: 1
            },
            DoubletsLink {
                index: 3,
                source: DOUBLETS_STRING_TAG,
                target: 105
            },
            DoubletsLink {
                index: 4,
                source: 2,
                target: 3
            },
            DoubletsLink {
                index: 5,
                source: DOUBLETS_STRING_TAG,
                target: 32
            },
            DoubletsLink {
                index: 6,
                source: 4,
                target: 5
            },
            DoubletsLink {
                index: 7,
                source: DOUBLETS_STRING_TAG,
                target: 127_757
            },
            DoubletsLink {
                index: 8,
                source: 6,
                target: 7
            },
            DoubletsLink {
                index: 9,
                source: DOUBLETS_STRING_TAG,
                target: 8
            },
        ]
    );
    assert_eq!(
        decode_json_value_from_doublets(&encoded.binary, Some(encoded.root_index)).unwrap(),
        json!("Hi 🌍")
    );

    let scalar = encode_json_value_to_doublets(&json!({
        "flag": true,
        "weight": 0.75
    }))
    .unwrap();

    assert!(scalar
        .links
        .iter()
        .any(|link| link.source == DOUBLETS_BOOL_TAG && link.target == 1));
    assert!(scalar
        .links
        .iter()
        .any(|link| link.source == DOUBLETS_NUMBER_TAG));
    assert!(scalar
        .links
        .iter()
        .any(|link| link.source == DOUBLETS_OBJECT_TAG));
}

#[test]
fn rust_doublets_store_round_trips_portable_meta_language_links() {
    let analysis = analyze_statement("Paris is the capital of France", 0).unwrap();
    let saved = save_meta_language_links_to_doublets(
        &analysis.links_network,
        PortableCaseOptions {
            case_id: Some("issue-109-paris".to_string()),
            exported_at: Some("2026-05-26T00:00:00.000Z".to_string()),
            migrated_from: None,
        },
    )
    .unwrap();
    let loaded = load_meta_language_links_from_doublets(&saved).unwrap();

    assert_eq!(saved.format, "meta-expression.portable-case");
    assert!(saved.links_notation.starts_with("(doublets: "));
    assert_eq!(loaded["schema"], "meta-expression.portable-case");
    assert_eq!(loaded["caseId"], "issue-109-paris");
    assert_eq!(loaded["storage"]["backend"], "doublets");
    assert_eq!(loaded["storage"]["implementation"], "doublets-rs");
    assert_eq!(loaded["linksNetwork"]["kind"], "links-network");
    assert_eq!(
        loaded["linksNetwork"]["links"][0]["value"]["text"],
        "Paris is the capital of France"
    );
    assert_eq!(loaded["linksNetwork"]["links"][0]["version"], 1);
}

#[test]
fn rust_doublets_store_round_trips_unified_term_data_cache_records() {
    let term = json!({
        "kind": "term-data",
        "version": 1,
        "term": "apple",
        "language": "en",
        "fields": {
            "id": "Q89",
            "label": "apple",
            "wikipediaSummary": "An apple is an edible fruit.",
            "aliases": ["malus domestica"]
        },
        "provenance": {
            "fields": {
                "label": [{
                    "source": "wikidata",
                    "sourceField": "label",
                    "targetField": "fields.label",
                    "mergeStrategy": "prefer-wikidata-label"
                }]
            }
        }
    });

    let saved = save_term_data_to_doublets(&term).unwrap();
    let loaded = load_term_data_from_doublets(&saved).unwrap();

    assert_eq!(saved.format, "meta-expression.term-data");
    assert!(saved.links_notation.contains("(doublets:"));
    assert_eq!(loaded["kind"], "term-data");
    assert_eq!(loaded["fields"]["id"], "Q89");
    assert_eq!(loaded["fields"]["aliases"][0], "malus domestica");
    assert_eq!(
        loaded["provenance"]["fields"]["label"][0]["mergeStrategy"],
        "prefer-wikidata-label"
    );
}

#[cfg(not(target_arch = "wasm32"))]
#[test]
fn rust_doublets_store_persists_through_file_mapped_unit_store() {
    let path = std::env::temp_dir().join(format!(
        "meta-expression-issue109-{}.links",
        std::process::id()
    ));
    let value = json!({
        "kind": "term-data-request",
        "request": {
            "url": "https://www.wikidata.org/wiki/Q89",
            "cacheHit": false
        }
    });

    let saved = save_json_value_to_file_mapped_doublets(&value, &path).unwrap();
    let persisted = read_file_mapped_doublets_links(&path).unwrap();
    let _ = std::fs::remove_file(path);

    assert_eq!(persisted, saved.links);
    assert_eq!(
        decode_json_value_from_doublets(&saved.binary, Some(saved.root_index)).unwrap(),
        value
    );
}
