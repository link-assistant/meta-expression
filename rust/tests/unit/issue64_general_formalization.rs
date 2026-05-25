use meta_expression_core::{analyze_statement, formalize_statement};

#[test]
fn arbitrary_text_reaches_partial_structured_meaning_links() {
    let analysis = analyze_statement("OpenAI creates useful tools", 0).unwrap();
    let expression = &analysis.formalization.expression;

    assert_eq!(analysis.formalization.level, 3);
    assert_eq!(expression["type"], "partial-claim");
    assert_eq!(expression["cst"]["type"], "statement-formalization");
    assert_eq!(
        expression["linguisticMetadata"]["relations"][0]["type"],
        "subject-predicate-object"
    );
    assert!(expression["meaningLinks"]
        .as_array()
        .is_some_and(|links| links.len() >= 3));
    assert!(expression["variables"]
        .as_array()
        .is_some_and(|variables| variables
            .iter()
            .any(|variable| variable["name"] == "?subject")));
    assert!(expression["questions"]
        .as_array()
        .is_some_and(|questions| questions.len() >= 3));
    assert!(analysis
        .links_network
        .links
        .iter()
        .any(|link| link.role == "meaning" && link.value["text"] == "OpenAI -> lex:en:openai"));
}

#[test]
fn known_claims_keep_their_wikidata_expression_type() {
    let formalization = formalize_statement("Earth orbits the Sun", 0).unwrap();

    assert_eq!(formalization.expression["type"], "wikidata-claim");
    assert_eq!(formalization.expression["wikidata"]["subject"], "Q2");
    assert!(formalization.expression["meaningLinks"]
        .as_array()
        .is_some_and(|links| links.iter().any(|link| link["target"]["id"] == "Q2")));
}
