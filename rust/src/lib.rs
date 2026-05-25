use doublets::Doublet;

mod analysis;
mod formal_ai_support;
mod issue52;
mod statement_formalization;
#[cfg(target_arch = "wasm32")]
mod wasm;
mod wikimedia_plan;

pub use analysis::{
    analyze_statement, create_statement_draft, evaluate_statement, formalize_statement,
    select_interpretation, serialize_links_notation, serialize_statement_links_notation,
    statement_confidence, BeliefSystem, EvaluationResult, EvidenceItem, Formalization,
    Interpretation, LinkProvenance, LinkRecord, LinksNetwork, StatementAnalysis, StatementDraft,
};
pub use issue52::{
    issue52_english_text, issue52_russian_text, issue52_translation_relations,
    translate_issue52_semantic_text,
};
pub use wikimedia_plan::{
    plan_wikidata_entity_batches, stable_wikimedia_cache_ttl_days, stable_wikimedia_cache_ttl_ms,
    wikimedia_cache_ttl_days_from_hash, WikidataEntityBatch, WIKIDATA_DEFAULT_ENTITY_BATCH_LIMIT,
    WIKIMEDIA_CACHE_BASE_TTL_DAYS, WIKIMEDIA_CACHE_MAX_JITTER_DAYS,
    WIKIMEDIA_CACHE_MIN_JITTER_DAYS,
};

const REAL_WORLD_EPSILON: f64 = 0.01;
const ISSUE35_SOURCE_SENTENCE_NODE: u64 = 35_000;
const ISSUE35_TARGET_SENTENCE_NODE: u64 = 35_001;
const ISSUE35_HAWAII_MEANING_ID: u64 = 782;
const ISSUE35_STATE_MEANING_ID: u64 = 7275;
const ISSUE35_US_STATE_MEANING_ID: u64 = 35657;

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticPhrase {
    pub text: String,
    pub meaning_id: String,
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticTranslation {
    pub source_text: String,
    pub source_language: String,
    pub target_language: String,
    pub target_text: String,
    pub source_phrases: Vec<SemanticPhrase>,
    pub target_phrases: Vec<SemanticPhrase>,
    pub transformation_steps: Vec<String>,
}

pub use formal_ai_support::{
    apply_text_transformation_rules, deformalize_formal_expression,
    deformalize_semantic_translation, extract_linguistic_metadata, naturalize_formal_expression,
    naturalize_semantic_translation, LinguisticAstSentence, LinguisticDependency,
    LinguisticFragment, LinguisticMetadata, LinguisticRelation, TextTransformationRule,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StatementTemplate {
    ArithmeticEquality,
    ArithmeticQuestion,
    PersonLiveness,
    Capital,
    Orbit,
    Unknown,
}

impl StatementTemplate {
    pub const fn code(self) -> u32 {
        match self {
            Self::ArithmeticEquality => 1,
            Self::ArithmeticQuestion => 2,
            Self::PersonLiveness => 3,
            Self::Capital => 4,
            Self::Orbit => 5,
            Self::Unknown => 0,
        }
    }
}

pub fn classify_statement(input: &str) -> StatementTemplate {
    let normalized = normalize_text(input);

    if is_arithmetic_equality(&normalized) {
        return StatementTemplate::ArithmeticEquality;
    }
    if is_arithmetic_question(&normalized) {
        return StatementTemplate::ArithmeticQuestion;
    }
    if normalized.ends_with(" is alive") || normalized.ends_with(" is dead") {
        return StatementTemplate::PersonLiveness;
    }
    if normalized.contains(" is the capital of ") || normalized.contains(" is capital of ") {
        return StatementTemplate::Capital;
    }
    if normalized.contains(" orbits ") {
        return StatementTemplate::Orbit;
    }

    StatementTemplate::Unknown
}

pub fn bounded_weighted_support_ratio(
    support_weight: f64,
    refute_weight: f64,
    uncertainty: f64,
) -> Option<f64> {
    let total = support_weight + refute_weight;
    if total <= 0.0 || !total.is_finite() {
        return None;
    }

    let epsilon = if uncertainty.is_finite() {
        uncertainty.clamp(0.0, 0.49)
    } else {
        REAL_WORLD_EPSILON
    };
    Some((support_weight / total).clamp(epsilon, 1.0 - epsilon))
}

pub fn relation_doublet(source: u64, target: u64) -> Doublet<u64> {
    Doublet::new(source, target)
}

pub fn translate_known_semantic_sentence(
    input: &str,
    source_language: &str,
    target_language: &str,
) -> Option<SemanticTranslation> {
    if let Some(translation) =
        translate_issue52_semantic_text(input, source_language, target_language)
    {
        return Some(translation);
    }

    let source_language = normalize_language_key(source_language);
    let target_language = normalize_language_key(target_language);
    let sentence_key = normalize_sentence_key(input);

    if let Some(translation) = translate_formal_ai_phrase_sentence(
        input,
        &source_language,
        &target_language,
        &sentence_key,
    ) {
        return Some(translation);
    }

    if let Some(translation) =
        translate_glossary_semantic_sentence(input, &source_language, &target_language)
    {
        return Some(translation);
    }

    match (
        source_language.as_str(),
        target_language.as_str(),
        sentence_key.as_str(),
    ) {
        ("en", "ru", "hawaii") => Some(issue61_hawaii_english_to_russian(input)),
        ("en", "ru", "hawaii is a state") => Some(issue35_english_to_russian(input)),
        ("ru", "en", "гавайи это штат") => Some(issue35_russian_to_english(input)),
        _ => None,
    }
}

fn translate_formal_ai_phrase_sentence(
    input: &str,
    source_language: &str,
    target_language: &str,
    sentence_key: &str,
) -> Option<SemanticTranslation> {
    let target =
        lookup_formal_ai_phrase_translation(source_language, target_language, sentence_key)?;
    let source_text = input.trim();
    let source_phrase_text = source_text.trim_end_matches(['.', '!', '?']);
    let mut target_base = target.to_string();
    if starts_with_uppercase(source_text) {
        target_base = uppercase_first(&target_base);
    }
    let target_text = append_terminal_punctuation(&target_base, source_text);
    let target_phrase_text = target_text.trim_end_matches(['.', '!', '?']);
    let meaning_id = lexical_meaning_id(source_language, sentence_key);

    Some(SemanticTranslation {
        source_text: source_text.to_string(),
        source_language: source_language.to_string(),
        target_language: target_language.to_string(),
        target_text: target_text.clone(),
        source_phrases: vec![semantic_phrase_in_text_with_id(
            source_phrase_text,
            meaning_id.clone(),
            source_text,
            0,
        )],
        target_phrases: vec![semantic_phrase_in_text_with_id(
            target_phrase_text,
            meaning_id,
            &target_text,
            0,
        )],
        transformation_steps: vec!["formal-ai-phrase-glossary".to_string()],
    })
}

fn lookup_formal_ai_phrase_translation(
    source_language: &str,
    target_language: &str,
    sentence_key: &str,
) -> Option<&'static str> {
    match (source_language, target_language, sentence_key) {
        ("ru", "en", "как у тебя дела") => Some("how are you"),
        ("ru", "en", "как дела") => Some("how are you"),
        ("ru", "en", "кто ты такой") => Some("who are you"),
        ("ru", "en", "что это такое") => Some("what is this"),
        ("ru", "en", "доброе яблоко") => Some("good apple"),
        ("en", "ru", "thank you") => Some("спасибо"),
        _ => None,
    }
}

pub fn translate_known_semantic_text(
    input: &str,
    source_language: &str,
    target_language: &str,
) -> Option<SemanticTranslation> {
    translate_issue52_semantic_text(input, source_language, target_language)
        .or_else(|| translate_known_semantic_sentence(input, source_language, target_language))
}

pub fn translate_glossary_semantic_sentence(
    input: &str,
    source_language: &str,
    target_language: &str,
) -> Option<SemanticTranslation> {
    let source_language = normalize_language_key(source_language);
    let target_language = normalize_language_key(target_language);
    let source_text = input.trim();
    let tokens = tokenize_translation_words(source_text);
    if tokens.is_empty() {
        return None;
    }

    let mut target_tokens = Vec::new();
    for (index, token) in tokens.iter().enumerate() {
        let translated =
            lookup_lexical_translation(&source_language, &target_language, &token.normalized)?;
        target_tokens.push(TargetToken {
            text: translated.to_string(),
            source_index: Some(index),
        });
    }

    let mut transformation_steps = vec!["lexical-glossary".to_string()];
    if source_language == "ru"
        && target_language == "en"
        && insert_russian_examples_of(&tokens, &mut target_tokens)
    {
        transformation_steps.push("russian-examples-genitive-to-english-of-phrase".to_string());
    }

    if starts_with_uppercase(source_text) {
        if let Some(first) = target_tokens.first_mut() {
            first.text = uppercase_first(&first.text);
        }
    }

    let target_text = append_terminal_punctuation(
        &target_tokens
            .iter()
            .map(|token| token.text.as_str())
            .collect::<Vec<_>>()
            .join(" "),
        source_text,
    );
    let source_phrases = tokens
        .iter()
        .map(|token| SemanticPhrase {
            text: token.text.clone(),
            meaning_id: lexical_meaning_id(&source_language, &token.normalized),
            start: token.start,
            end: token.end,
        })
        .collect::<Vec<_>>();
    let target_phrases = target_tokens
        .iter()
        .filter_map(|target| {
            target.source_index.map(|source_index| {
                let source = &tokens[source_index];
                semantic_phrase_in_text_with_id(
                    &target.text,
                    lexical_meaning_id(&source_language, &source.normalized),
                    &target_text,
                    0,
                )
            })
        })
        .collect::<Vec<_>>();

    Some(SemanticTranslation {
        source_text: source_text.to_string(),
        source_language,
        target_language,
        target_text,
        source_phrases,
        target_phrases,
        transformation_steps,
    })
}

pub fn issue35_translation_relations() -> Vec<Doublet<u64>> {
    vec![
        relation_doublet(ISSUE35_SOURCE_SENTENCE_NODE, ISSUE35_HAWAII_MEANING_ID),
        relation_doublet(ISSUE35_SOURCE_SENTENCE_NODE, ISSUE35_STATE_MEANING_ID),
        relation_doublet(ISSUE35_TARGET_SENTENCE_NODE, ISSUE35_HAWAII_MEANING_ID),
        relation_doublet(ISSUE35_TARGET_SENTENCE_NODE, ISSUE35_US_STATE_MEANING_ID),
    ]
}

#[no_mangle]
pub extern "C" fn meta_expression_issue35_hawaii_meaning_id() -> u64 {
    ISSUE35_HAWAII_MEANING_ID
}

#[no_mangle]
pub extern "C" fn meta_expression_issue35_state_meaning_id() -> u64 {
    ISSUE35_STATE_MEANING_ID
}

#[no_mangle]
pub extern "C" fn meta_expression_issue35_us_state_meaning_id() -> u64 {
    ISSUE35_US_STATE_MEANING_ID
}

#[no_mangle]
pub extern "C" fn meta_expression_issue35_phrase_count() -> u32 {
    2
}

#[no_mangle]
pub extern "C" fn meta_expression_issue35_rule_count() -> u32 {
    3
}

#[no_mangle]
pub extern "C" fn meta_expression_issue52_sentence_count() -> u32 {
    7
}

#[no_mangle]
pub extern "C" fn meta_expression_issue52_source_phrase_count() -> u32 {
    24
}

#[no_mangle]
pub extern "C" fn meta_expression_issue52_target_phrase_count() -> u32 {
    24
}

#[no_mangle]
pub extern "C" fn meta_expression_wikimedia_cache_base_ttl_days() -> u32 {
    WIKIMEDIA_CACHE_BASE_TTL_DAYS
}

#[no_mangle]
pub extern "C" fn meta_expression_wikimedia_cache_min_jitter_days() -> u32 {
    WIKIMEDIA_CACHE_MIN_JITTER_DAYS
}

#[no_mangle]
pub extern "C" fn meta_expression_wikimedia_cache_max_jitter_days() -> u32 {
    WIKIMEDIA_CACHE_MAX_JITTER_DAYS
}

#[no_mangle]
pub extern "C" fn meta_expression_wikimedia_cache_ttl_days_from_hash(hash: u64) -> u32 {
    wikimedia_cache_ttl_days_from_hash(hash)
}

#[no_mangle]
pub extern "C" fn meta_expression_wikidata_default_entity_batch_limit() -> u32 {
    WIKIDATA_DEFAULT_ENTITY_BATCH_LIMIT as u32
}

#[no_mangle]
pub extern "C" fn meta_expression_weighted_support_ratio(
    support_weight: f64,
    refute_weight: f64,
    uncertainty: f64,
) -> f64 {
    bounded_weighted_support_ratio(support_weight, refute_weight, uncertainty).unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "C" fn meta_expression_relation_source(source: u64, target: u64) -> u64 {
    relation_doublet(source, target).source
}

#[no_mangle]
pub extern "C" fn meta_expression_relation_target(source: u64, target: u64) -> u64 {
    relation_doublet(source, target).target
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TranslationQualityStatus {
    Matched,
    Skipped,
    TranslationFix,
    FixSuggested,
    Failed,
    NoStatement,
}

impl TranslationQualityStatus {
    pub const fn code(self) -> u32 {
        match self {
            Self::Matched => 1,
            Self::Skipped => 2,
            Self::TranslationFix => 3,
            Self::FixSuggested => 4,
            Self::Failed => 5,
            Self::NoStatement => 6,
        }
    }
}

pub fn extract_first_statement(text: &str) -> String {
    let normalized = strip_parenthetical_glosses(text);
    if normalized.is_empty() {
        return String::new();
    }
    let mut end = normalized.len();
    let bytes = normalized.as_bytes();
    for (index, byte) in bytes.iter().enumerate() {
        if matches!(byte, b'.' | b'!' | b'?') {
            let after = bytes.get(index + 1).copied().unwrap_or(b' ');
            if after == b' ' || index + 1 == bytes.len() {
                end = index + 1;
                break;
            }
        }
    }
    normalized[..end].trim().to_string()
}

fn strip_parenthetical_glosses(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut depth = 0usize;
    let mut buffer = String::new();
    for ch in text.chars() {
        if ch == '(' {
            depth += 1;
            buffer.clear();
            continue;
        }
        if ch == ')' {
            depth = depth.saturating_sub(1);
            let contains_letters = buffer.chars().any(|c| c.is_alphabetic());
            if !contains_letters {
                result.push('(');
                result.push_str(&buffer);
                result.push(')');
            }
            buffer.clear();
            continue;
        }
        if depth > 0 {
            buffer.push(ch);
            continue;
        }
        result.push(ch);
    }
    result
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}

pub fn tokenize_for_match(text: &str) -> Vec<String> {
    let stopwords: &[&str] = &[
        "a",
        "an",
        "the",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "as",
        "of",
        "in",
        "on",
        "at",
        "to",
        "and",
        "or",
        "for",
        "by",
        "with",
        "from",
        "this",
        "that",
        "it",
        "its",
        "also",
        "но",
        "не",
        "и",
        "или",
        "для",
        "по",
        "в",
        "на",
        "из",
        "с",
        "о",
        "об",
        "это",
        "как",
        "что",
        "который",
        "которая",
        "которое",
    ];
    let mut tokens = Vec::new();
    let mut current = String::new();
    for ch in text.chars() {
        if ch.is_alphanumeric() {
            current.extend(ch.to_lowercase());
        } else if !current.is_empty() {
            tokens.push(std::mem::take(&mut current));
        }
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
        .into_iter()
        .filter(|token| {
            if token.len() < 2 {
                return false;
            }
            if token.chars().all(|c| c.is_ascii_digit()) {
                return false;
            }
            !stopwords.contains(&token.as_str())
        })
        .collect()
}

#[derive(Debug, Clone, PartialEq)]
pub struct TokenCoverage {
    pub ratio: f64,
    pub found: Vec<String>,
    pub missing: Vec<String>,
}

pub fn token_coverage(candidate: &str, target: &str) -> TokenCoverage {
    let mut unique_candidates = Vec::new();
    for token in tokenize_for_match(candidate) {
        if !unique_candidates.contains(&token) {
            unique_candidates.push(token);
        }
    }
    if unique_candidates.is_empty() {
        return TokenCoverage {
            ratio: 0.0,
            found: Vec::new(),
            missing: Vec::new(),
        };
    }
    let target_tokens: std::collections::HashSet<String> =
        tokenize_for_match(target).into_iter().collect();
    let mut found = Vec::new();
    let mut missing = Vec::new();
    for token in unique_candidates.iter() {
        if target_tokens.contains(token) {
            found.push(token.clone());
        } else {
            missing.push(token.clone());
        }
    }
    let ratio = found.len() as f64 / unique_candidates.len() as f64;
    TokenCoverage {
        ratio,
        found,
        missing,
    }
}

pub fn normalize_statement_key(text: &str) -> String {
    let collapsed = text.split_whitespace().collect::<Vec<_>>().join(" ");
    collapsed.trim_end_matches(['.', '!', '?', ' ']).to_string()
}

pub const DEFAULT_TRANSLATION_MATCH_THRESHOLD: f64 = 0.5;

pub fn translation_meets_threshold(coverage: &TokenCoverage, threshold: f64) -> bool {
    coverage.ratio >= threshold
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct TranslationQualitySummary {
    pub total: u32,
    pub matched: u32,
    pub skipped: u32,
    pub translation_fix: u32,
    pub fix_suggested: u32,
    pub failed: u32,
    pub no_statement: u32,
}

pub fn summarize_translation_quality(
    statuses: &[TranslationQualityStatus],
) -> TranslationQualitySummary {
    let mut summary = TranslationQualitySummary {
        total: statuses.len() as u32,
        ..TranslationQualitySummary::default()
    };
    for status in statuses {
        match status {
            TranslationQualityStatus::Matched => summary.matched += 1,
            TranslationQualityStatus::Skipped => summary.skipped += 1,
            TranslationQualityStatus::TranslationFix => summary.translation_fix += 1,
            TranslationQualityStatus::FixSuggested => summary.fix_suggested += 1,
            TranslationQualityStatus::Failed => summary.failed += 1,
            TranslationQualityStatus::NoStatement => summary.no_statement += 1,
        }
    }
    summary
}

pub fn statement_in_skip_list(statement: &str, skip_list: &[&str]) -> bool {
    let key = normalize_statement_key(statement);
    skip_list
        .iter()
        .any(|entry| normalize_statement_key(entry) == key)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TranslationFix {
    pub source: String,
    pub target: String,
    pub note: Option<String>,
}

pub fn find_translation_fix<'a>(
    fixes: &'a [TranslationFix],
    statement: &str,
) -> Option<&'a TranslationFix> {
    let key = normalize_statement_key(statement);
    fixes
        .iter()
        .find(|fix| normalize_statement_key(&fix.source) == key)
}

#[no_mangle]
pub extern "C" fn meta_expression_default_translation_match_threshold() -> f64 {
    DEFAULT_TRANSLATION_MATCH_THRESHOLD
}

#[no_mangle]
pub extern "C" fn meta_expression_translation_quality_status_code(code: u32) -> u32 {
    match code {
        1 => TranslationQualityStatus::Matched.code(),
        2 => TranslationQualityStatus::Skipped.code(),
        3 => TranslationQualityStatus::TranslationFix.code(),
        4 => TranslationQualityStatus::FixSuggested.code(),
        5 => TranslationQualityStatus::Failed.code(),
        6 => TranslationQualityStatus::NoStatement.code(),
        _ => 0,
    }
}

fn normalize_text(input: &str) -> String {
    input
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn normalize_language_key(input: &str) -> String {
    input
        .trim()
        .split(['-', '_'])
        .next()
        .unwrap_or_default()
        .to_lowercase()
}

fn normalize_sentence_key(input: &str) -> String {
    normalize_text(input.trim().trim_end_matches(['.', '!', '?']))
}

fn issue35_english_to_russian(input: &str) -> SemanticTranslation {
    let source_text = input.trim();
    let target_text = "Гавайи это штат.";
    SemanticTranslation {
        source_text: source_text.to_string(),
        source_language: "en".to_string(),
        target_language: "ru".to_string(),
        target_text: target_text.to_string(),
        source_phrases: vec![
            semantic_phrase_in_text("Hawaii", ISSUE35_HAWAII_MEANING_ID, source_text, 0),
            semantic_phrase_in_text("state", ISSUE35_STATE_MEANING_ID, source_text, 12),
        ],
        target_phrases: vec![
            semantic_phrase_in_text("Гавайи", ISSUE35_HAWAII_MEANING_ID, target_text, 0),
            semantic_phrase_in_text(
                "штат",
                ISSUE35_US_STATE_MEANING_ID,
                target_text,
                "Гавайи это ".len(),
            ),
        ],
        transformation_steps: vec![
            "english-article-omission".to_string(),
            "english-copula-to-russian-eto".to_string(),
            "english-us-state-predicate-to-russian-shtat".to_string(),
        ],
    }
}

fn issue61_hawaii_english_to_russian(input: &str) -> SemanticTranslation {
    let source_text = input.trim();
    let target_text = "Гавайи";
    SemanticTranslation {
        source_text: source_text.to_string(),
        source_language: "en".to_string(),
        target_language: "ru".to_string(),
        target_text: target_text.to_string(),
        source_phrases: vec![semantic_phrase_in_text(
            "Hawaii",
            ISSUE35_HAWAII_MEANING_ID,
            source_text,
            0,
        )],
        target_phrases: vec![semantic_phrase_in_text(
            "Гавайи",
            ISSUE35_HAWAII_MEANING_ID,
            target_text,
            0,
        )],
        transformation_steps: vec!["wikidata-target-label".to_string()],
    }
}

fn issue35_russian_to_english(input: &str) -> SemanticTranslation {
    let source_text = input.trim();
    let target_text = "Hawaii is a state.";
    SemanticTranslation {
        source_text: source_text.to_string(),
        source_language: "ru".to_string(),
        target_language: "en".to_string(),
        target_text: target_text.to_string(),
        source_phrases: vec![
            semantic_phrase_in_text("Гавайи", ISSUE35_HAWAII_MEANING_ID, source_text, 0),
            semantic_phrase_in_text(
                "штат",
                ISSUE35_US_STATE_MEANING_ID,
                source_text,
                "Гавайи это ".len(),
            ),
        ],
        target_phrases: vec![
            semantic_phrase_in_text("Hawaii", ISSUE35_HAWAII_MEANING_ID, target_text, 0),
            semantic_phrase_in_text("state", ISSUE35_STATE_MEANING_ID, target_text, 12),
        ],
        transformation_steps: vec![
            "russian-copula-to-english-be".to_string(),
            "english-indefinite-article-insertion".to_string(),
        ],
    }
}

fn semantic_phrase_in_text(
    text: &str,
    meaning: u64,
    source_text: &str,
    fallback_start: usize,
) -> SemanticPhrase {
    semantic_phrase(
        text,
        meaning,
        source_text.find(text).unwrap_or(fallback_start),
    )
}

fn semantic_phrase_in_text_with_id(
    text: &str,
    meaning_id: String,
    source_text: &str,
    fallback_start: usize,
) -> SemanticPhrase {
    let start = source_text.find(text).unwrap_or(fallback_start);
    SemanticPhrase {
        text: text.to_string(),
        meaning_id,
        start,
        end: start + text.len(),
    }
}

fn semantic_phrase(text: &str, meaning: u64, start: usize) -> SemanticPhrase {
    SemanticPhrase {
        text: text.to_string(),
        meaning_id: format!("Q{meaning}"),
        start,
        end: start + text.len(),
    }
}

#[derive(Debug, Clone)]
struct TranslationToken {
    text: String,
    normalized: String,
    start: usize,
    end: usize,
}

#[derive(Debug, Clone)]
struct TargetToken {
    text: String,
    source_index: Option<usize>,
}

fn tokenize_translation_words(source: &str) -> Vec<TranslationToken> {
    let mut tokens = Vec::new();
    let mut cursor = 0;
    for raw in source.split_whitespace() {
        let text = raw.trim_matches([',', '.', '!', '?', ';', ':']);
        if text.is_empty() {
            continue;
        }
        let start = source[cursor..]
            .find(text)
            .map(|offset| cursor + offset)
            .unwrap_or(cursor);
        let end = start + text.len();
        cursor = end;
        tokens.push(TranslationToken {
            text: text.to_string(),
            normalized: normalize_text(text),
            start,
            end,
        });
    }
    tokens
}

fn lookup_lexical_translation(
    source_language: &str,
    target_language: &str,
    word: &str,
) -> Option<&'static str> {
    match (source_language, target_language, word) {
        ("ru", "en", "добавить") => Some("add"),
        ("ru", "en", "найти") => Some("find"),
        ("ru", "en", "синоним") => Some("synonym"),
        ("ru", "en", "синонимы") => Some("synonyms"),
        ("ru", "en", "или") => Some("or"),
        ("ru", "en", "пример") => Some("example"),
        ("ru", "en", "примеры") => Some("examples"),
        ("ru", "en", "согласование") => Some("agreement"),
        ("ru", "en", "согласования") => Some("agreement"),
        ("ru", "en", "перевод") => Some("translation"),
        ("ru", "en", "перевода") => Some("translation"),
        ("ru", "en", "перевести") => Some("translate"),
        ("ru", "en", "формализовать") => Some("formalize"),
        ("ru", "en", "текст") => Some("text"),
        ("ru", "en", "проверить") => Some("check"),
        ("ru", "en", "утверждение") => Some("statement"),
        ("ru", "en", "сравнить") => Some("compare"),
        ("ru", "en", "значение") => Some("value"),
        ("ru", "en", "значения") => Some("values"),
        ("ru", "en", "показать") => Some("show"),
        ("ru", "en", "вопрос") => Some("question"),
        ("ru", "en", "вопросы") => Some("questions"),
        ("ru", "en", "открыть") => Some("open"),
        ("ru", "en", "страница") => Some("page"),
        ("ru", "en", "страницу") => Some("page"),
        ("ru", "en", "сохранить") => Some("save"),
        ("ru", "en", "результат") => Some("result"),
        ("ru", "en", "спасибо") => Some("thank you"),
        ("ru", "en", "да") => Some("yes"),
        ("ru", "en", "нет") => Some("no"),
        ("ru", "en", "привет") => Some("hello"),
        ("ru", "en", "яблоко") => Some("apple"),
        ("ru", "en", "помидор") => Some("tomato"),
        ("ru", "en", "огурец") => Some("cucumber"),
        ("ru", "en", "картофель") => Some("potato"),
        ("ru", "en", "морковь") => Some("carrot"),
        ("ru", "en", "хлеб") => Some("bread"),
        ("ru", "en", "вода") => Some("water"),
        ("en", "ru", "add") => Some("добавьте"),
        ("en", "ru", "example") => Some("пример"),
        ("en", "ru", "examples") => Some("примеры"),
        ("en", "ru", "hello") => Some("привет"),
        ("en", "ru", "apple") => Some("яблоко"),
        ("en", "ru", "tomato") => Some("помидор"),
        ("en", "ru", "cucumber") => Some("огурец"),
        ("en", "ru", "potato") => Some("картофель"),
        ("en", "ru", "carrot") => Some("морковь"),
        ("en", "ru", "bread") => Some("хлеб"),
        ("en", "ru", "water") => Some("вода"),
        ("en", "hi", "hello") => Some("नमस्ते"),
        ("en", "hi", "apple") => Some("सेब"),
        ("en", "zh", "hello") => Some("你好"),
        ("en", "zh", "apple") => Some("苹果"),
        _ => None,
    }
}

fn insert_russian_examples_of(
    source_tokens: &[TranslationToken],
    target_tokens: &mut Vec<TargetToken>,
) -> bool {
    let last_index = source_tokens.len().saturating_sub(1);
    for (index, source_token) in source_tokens.iter().enumerate().take(last_index) {
        if source_token.normalized != "примеры" {
            continue;
        }
        let target_index = target_tokens
            .iter()
            .position(|target| target.source_index == Some(index));
        if let Some(target_index) = target_index {
            target_tokens.insert(
                target_index + 1,
                TargetToken {
                    text: "of".to_string(),
                    source_index: None,
                },
            );
            return true;
        }
    }
    false
}

fn lexical_meaning_id(language: &str, normalized: &str) -> String {
    format!("lex:{language}:{}", normalized.replace(' ', "_"))
}

fn starts_with_uppercase(value: &str) -> bool {
    value
        .chars()
        .next()
        .map(|first| first.is_uppercase())
        .unwrap_or(false)
}

fn uppercase_first(value: &str) -> String {
    let mut chars = value.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().chain(chars).collect(),
        None => String::new(),
    }
}

fn append_terminal_punctuation(value: &str, source: &str) -> String {
    let punctuation = source
        .chars()
        .rev()
        .find(|ch| matches!(ch, '.' | '!' | '?'));
    match punctuation {
        Some(mark) if !value.ends_with(mark) => format!("{value}{mark}"),
        _ => value.to_string(),
    }
}

fn is_arithmetic_equality(input: &str) -> bool {
    let mut parts = input.split('=');
    let left = parts.next().unwrap_or_default().trim();
    let right = parts.next().unwrap_or_default().trim();

    parts.next().is_none() && is_binary_arithmetic(left) && is_number(right)
}

fn is_arithmetic_question(input: &str) -> bool {
    is_binary_arithmetic(input.trim_end_matches('?').trim())
}

fn is_binary_arithmetic(input: &str) -> bool {
    let parts = input.split_whitespace().collect::<Vec<_>>();
    parts.len() == 3
        && is_number(parts[0])
        && matches!(parts[1], "+" | "-" | "*" | "/")
        && is_number(parts[2])
}

fn is_number(value: &str) -> bool {
    value.parse::<f64>().is_ok()
}
