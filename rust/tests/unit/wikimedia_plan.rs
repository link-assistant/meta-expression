use meta_expression_core::{
    plan_wikidata_entity_batches, stable_wikimedia_cache_ttl_days, stable_wikimedia_cache_ttl_ms,
    wikimedia_cache_ttl_days_from_hash, WIKIDATA_DEFAULT_ENTITY_BATCH_LIMIT,
    WIKIMEDIA_CACHE_BASE_TTL_DAYS, WIKIMEDIA_CACHE_MAX_JITTER_DAYS,
    WIKIMEDIA_CACHE_MIN_JITTER_DAYS,
};

#[test]
fn wikidata_entity_batches_dedupe_normalize_and_chunk_ids() {
    let batches = plan_wikidata_entity_batches([" q1 ", "P31", "Q1", "bad", "q2"], 2);

    assert_eq!(batches.len(), 2);
    assert_eq!(batches[0].ids, ["Q1", "P31"]);
    assert_eq!(batches[0].request_parameter, "Q1|P31");
    assert_eq!(batches[1].ids, ["Q2"]);
    assert_eq!(batches[1].request_parameter, "Q2");
}

#[test]
fn wikidata_entity_batches_use_default_limit_when_zero_is_requested() {
    let ids = (1..=WIKIDATA_DEFAULT_ENTITY_BATCH_LIMIT + 1)
        .map(|index| format!("Q{index}"))
        .collect::<Vec<_>>();
    let borrowed = ids.iter().map(String::as_str);
    let batches = plan_wikidata_entity_batches(borrowed, 0);

    assert_eq!(batches.len(), 2);
    assert_eq!(batches[0].ids.len(), WIKIDATA_DEFAULT_ENTITY_BATCH_LIMIT);
    assert_eq!(batches[1].ids, ["Q51"]);
}

#[test]
fn wikimedia_cache_ttl_is_stable_and_spread_across_jitter_window() {
    let first = stable_wikimedia_cache_ttl_days("wikidata:Q42:ru");
    let second = stable_wikimedia_cache_ttl_days("wikidata:Q42:ru");

    assert_eq!(first, second);
    assert!(first >= WIKIMEDIA_CACHE_BASE_TTL_DAYS + WIKIMEDIA_CACHE_MIN_JITTER_DAYS);
    assert!(first <= WIKIMEDIA_CACHE_BASE_TTL_DAYS + WIKIMEDIA_CACHE_MAX_JITTER_DAYS);
    assert_eq!(
        stable_wikimedia_cache_ttl_ms("wikidata:Q42:ru"),
        u64::from(first) * 24 * 60 * 60 * 1000
    );
}

#[test]
fn cache_ttl_hash_adapter_matches_the_documented_one_to_three_day_jitter() {
    assert_eq!(
        wikimedia_cache_ttl_days_from_hash(0),
        WIKIMEDIA_CACHE_BASE_TTL_DAYS + 1
    );
    assert_eq!(
        wikimedia_cache_ttl_days_from_hash(1),
        WIKIMEDIA_CACHE_BASE_TTL_DAYS + 2
    );
    assert_eq!(
        wikimedia_cache_ttl_days_from_hash(2),
        WIKIMEDIA_CACHE_BASE_TTL_DAYS + 3
    );
}
