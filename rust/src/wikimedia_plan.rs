pub const WIKIMEDIA_CACHE_BASE_TTL_DAYS: u32 = 7;
pub const WIKIMEDIA_CACHE_MIN_JITTER_DAYS: u32 = 1;
pub const WIKIMEDIA_CACHE_MAX_JITTER_DAYS: u32 = 3;
pub const WIKIDATA_DEFAULT_ENTITY_BATCH_LIMIT: usize = 50;
const MILLIS_PER_DAY: u64 = 24 * 60 * 60 * 1000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WikidataEntityBatch {
    pub ids: Vec<String>,
    pub request_parameter: String,
}

pub fn plan_wikidata_entity_batches<'a, I>(
    ids: I,
    max_batch_size: usize,
) -> Vec<WikidataEntityBatch>
where
    I: IntoIterator<Item = &'a str>,
{
    let batch_size = if max_batch_size == 0 {
        WIKIDATA_DEFAULT_ENTITY_BATCH_LIMIT
    } else {
        max_batch_size
    };
    let mut unique_ids = Vec::new();
    for id in ids {
        if let Some(normalized) = normalize_wikidata_entity_id(id) {
            if !unique_ids.contains(&normalized) {
                unique_ids.push(normalized);
            }
        }
    }
    unique_ids
        .chunks(batch_size)
        .map(|chunk| WikidataEntityBatch {
            ids: chunk.to_vec(),
            request_parameter: chunk.join("|"),
        })
        .collect()
}

pub fn stable_wikimedia_cache_ttl_days(cache_key: &str) -> u32 {
    wikimedia_cache_ttl_days_from_hash(stable_fnv1a_hash(cache_key.as_bytes()))
}

pub fn stable_wikimedia_cache_ttl_ms(cache_key: &str) -> u64 {
    stable_wikimedia_cache_ttl_days(cache_key) as u64 * MILLIS_PER_DAY
}

pub fn wikimedia_cache_ttl_days_from_hash(hash: u64) -> u32 {
    let jitter_span = WIKIMEDIA_CACHE_MAX_JITTER_DAYS - WIKIMEDIA_CACHE_MIN_JITTER_DAYS + 1;
    WIKIMEDIA_CACHE_BASE_TTL_DAYS
        + WIKIMEDIA_CACHE_MIN_JITTER_DAYS
        + (hash % jitter_span as u64) as u32
}

fn normalize_wikidata_entity_id(value: &str) -> Option<String> {
    let trimmed = value.trim();
    let mut chars = trimmed.chars();
    let prefix = chars.next()?.to_ascii_uppercase();
    if !matches!(prefix, 'P' | 'Q') {
        return None;
    }
    let digits = chars.collect::<String>();
    if digits.is_empty() || !digits.chars().all(|ch| ch.is_ascii_digit()) {
        return None;
    }
    Some(format!("{prefix}{digits}"))
}

fn stable_fnv1a_hash(bytes: &[u8]) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}
