use meta_expression_core::{
    find_translation_fix, statement_in_skip_list, summarize_translation_quality,
    translation_meets_threshold, TokenCoverage, TranslationFix, TranslationQualityStatus,
    TranslationQualitySummary, DEFAULT_TRANSLATION_MATCH_THRESHOLD,
};

#[test]
fn default_translation_match_threshold_matches_javascript() {
    assert!((DEFAULT_TRANSLATION_MATCH_THRESHOLD - 0.5).abs() < f64::EPSILON);
}

#[test]
fn translation_meets_threshold_compares_against_supplied_threshold() {
    let coverage = TokenCoverage {
        ratio: 0.6,
        found: Vec::new(),
        missing: Vec::new(),
    };
    assert!(translation_meets_threshold(&coverage, 0.5));
    assert!(!translation_meets_threshold(&coverage, 0.75));
}

#[test]
fn summarize_translation_quality_counts_statuses_by_kind() {
    let statuses = [
        TranslationQualityStatus::Matched,
        TranslationQualityStatus::Matched,
        TranslationQualityStatus::Skipped,
        TranslationQualityStatus::TranslationFix,
        TranslationQualityStatus::FixSuggested,
        TranslationQualityStatus::Failed,
        TranslationQualityStatus::NoStatement,
    ];

    let summary = summarize_translation_quality(&statuses);

    assert_eq!(
        summary,
        TranslationQualitySummary {
            total: 7,
            matched: 2,
            skipped: 1,
            translation_fix: 1,
            fix_suggested: 1,
            failed: 1,
            no_statement: 1,
        }
    );
}

#[test]
fn statement_in_skip_list_normalizes_punctuation_and_whitespace() {
    let skip_list = ["Hawaii  is a state."];
    assert!(statement_in_skip_list("Hawaii is a state", &skip_list));
    assert!(!statement_in_skip_list("Texas is a state", &skip_list));
}

#[test]
fn find_translation_fix_returns_matching_entry_or_none() {
    let fixes = [TranslationFix {
        source: "Hawaii is a state.".to_string(),
        target: "Гавайи это штат.".to_string(),
        note: Some("issue-43".to_string()),
    }];

    let hit = find_translation_fix(&fixes, "Hawaii is a state").unwrap();
    assert_eq!(hit.target, "Гавайи это штат.");
    assert_eq!(hit.note.as_deref(), Some("issue-43"));

    assert!(find_translation_fix(&fixes, "Texas is a state").is_none());
}
