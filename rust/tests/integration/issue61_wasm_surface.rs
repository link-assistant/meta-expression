use meta_expression_core::{
    analyze_statement, create_statement_draft, evaluate_statement, formalize_statement,
    select_interpretation, serialize_statement_links_notation, statement_confidence,
    translate_known_semantic_text,
};

#[test]
fn exposes_analysis_pipeline_surface_for_wasm() {
    let draft = create_statement_draft("1 + 1 = 2").expect("draft");
    let selected = select_interpretation("1 + 1 = 2", 0).expect("selection");
    let formalization = formalize_statement("1 + 1 = 2", 0).expect("formalization");
    let evaluation = evaluate_statement("1 + 1 = 2", 0).expect("evaluation");
    let confidence = statement_confidence("1 + 1 = 2", 0).expect("confidence");
    let lino = serialize_statement_links_notation("1 + 1 = 2", 0).expect("links notation");

    assert_eq!(draft.status, "selection-required");
    assert_eq!(draft.interpretations.len(), 3);
    assert_eq!(selected.kind, "arithmetic-equality");
    assert_eq!(formalization.expression["type"], "arithmetic-equality");
    assert_eq!(evaluation.value, true);
    assert_eq!(confidence, Some(1.0));
    assert!(lino.contains("links-network"));
    assert!(lino.contains("supports"));
}

#[test]
fn covers_requirements_acceptance_examples_without_network() {
    for input in [
        "1 + 1 = 2",
        "1 + 1 = 1",
        "1 + 1",
        "Earth orbits the Sun",
        "Moon orbits the Sun",
        "Elon Musk is alive",
        "this statement is false",
        "Paris is the capital of France",
    ] {
        let analysis = analyze_statement(input, 0).expect(input);
        assert_eq!(analysis.status, "completed");
        assert!(!analysis.links_network.links.is_empty());
    }

    let hawaii = translate_known_semantic_text("Hawaii", "en", "ru").expect("Hawaii");
    let sentence =
        translate_known_semantic_text("Hawaii is a state.", "en", "ru").expect("sentence");

    assert_eq!(hawaii.target_text, "Гавайи");
    assert_eq!(hawaii.source_phrases[0].meaning_id, "Q782");
    assert_eq!(sentence.target_text, "Гавайи это штат.");
    assert_eq!(sentence.target_phrases[1].meaning_id, "Q35657");
}
