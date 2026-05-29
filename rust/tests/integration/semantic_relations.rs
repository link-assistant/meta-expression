use meta_expression_core::{
    issue35_translation_relations, meta_expression_issue35_hawaii_meaning_id,
    meta_expression_issue35_phrase_count, meta_expression_issue35_rule_count,
    meta_expression_issue35_state_meaning_id, meta_expression_issue35_us_state_meaning_id,
    relation_doublet,
};

#[test]
fn encodes_relation_as_doublet() {
    let relation = relation_doublet(10, 20);

    assert_eq!(relation.source, 10);
    assert_eq!(relation.target, 20);
}

#[test]
fn encodes_issue35_translation_phrase_relations_as_doublets() {
    let relations = issue35_translation_relations();

    assert_eq!(relations[0].source, 35_000);
    assert_eq!(
        relations[0].target,
        meta_expression_issue35_hawaii_meaning_id()
    );
    assert_eq!(relations[1].source, 35_000);
    // After contextual disambiguation the source "state" resolves to the
    // U.S.-state sense (Q35657), matching the target phrase (issue #128).
    assert_eq!(
        relations[1].target,
        meta_expression_issue35_us_state_meaning_id()
    );
    assert_eq!(relations[2].source, 35_001);
    assert_eq!(
        relations[2].target,
        meta_expression_issue35_hawaii_meaning_id()
    );
    assert_eq!(
        relations[3].target,
        meta_expression_issue35_us_state_meaning_id()
    );
    // The generic federated-state concept (Q7275) remains available as a
    // distinct reference value, separate from the resolved U.S.-state sense.
    assert_ne!(
        meta_expression_issue35_state_meaning_id(),
        meta_expression_issue35_us_state_meaning_id()
    );
    assert_eq!(meta_expression_issue35_phrase_count(), 2);
    assert_eq!(meta_expression_issue35_rule_count(), 2);
}
