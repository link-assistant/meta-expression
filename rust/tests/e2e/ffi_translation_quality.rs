use meta_expression_core::{
    meta_expression_relation_source, meta_expression_relation_target,
    meta_expression_translation_quality_status_code, TranslationQualityStatus,
};

#[test]
fn translation_quality_status_codes_round_trip_through_extern() {
    assert_eq!(TranslationQualityStatus::Matched.code(), 1);
    assert_eq!(TranslationQualityStatus::Skipped.code(), 2);
    assert_eq!(TranslationQualityStatus::TranslationFix.code(), 3);
    assert_eq!(TranslationQualityStatus::FixSuggested.code(), 4);
    assert_eq!(TranslationQualityStatus::Failed.code(), 5);
    assert_eq!(TranslationQualityStatus::NoStatement.code(), 6);
    for code in 1u32..=6 {
        assert_eq!(meta_expression_translation_quality_status_code(code), code);
    }
    assert_eq!(meta_expression_translation_quality_status_code(0), 0);
    assert_eq!(meta_expression_translation_quality_status_code(7), 0);
}

#[test]
fn relation_source_and_target_match_the_doublet_constructor() {
    assert_eq!(meta_expression_relation_source(11, 22), 11);
    assert_eq!(meta_expression_relation_target(11, 22), 22);
}
