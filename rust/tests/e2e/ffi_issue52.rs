use meta_expression_core::{
    meta_expression_issue52_sentence_count, meta_expression_issue52_source_phrase_count,
    meta_expression_issue52_target_phrase_count,
    meta_expression_wikidata_default_entity_batch_limit,
    meta_expression_wikimedia_cache_base_ttl_days, meta_expression_wikimedia_cache_max_jitter_days,
    meta_expression_wikimedia_cache_min_jitter_days,
    meta_expression_wikimedia_cache_ttl_days_from_hash,
};

#[test]
fn issue52_and_wikimedia_planning_values_are_exposed_through_extern() {
    assert_eq!(meta_expression_issue52_sentence_count(), 7);
    assert_eq!(meta_expression_issue52_source_phrase_count(), 24);
    assert_eq!(meta_expression_issue52_target_phrase_count(), 24);
    assert_eq!(meta_expression_wikimedia_cache_base_ttl_days(), 7);
    assert_eq!(meta_expression_wikimedia_cache_min_jitter_days(), 1);
    assert_eq!(meta_expression_wikimedia_cache_max_jitter_days(), 3);
    assert_eq!(meta_expression_wikimedia_cache_ttl_days_from_hash(0), 8);
    assert_eq!(meta_expression_wikidata_default_entity_batch_limit(), 50);
}
