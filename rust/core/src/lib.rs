use doublets::Doublet;

const REAL_WORLD_EPSILON: f64 = 0.01;
const ISSUE35_SOURCE_SENTENCE_NODE: u64 = 35_000;
const ISSUE35_TARGET_SENTENCE_NODE: u64 = 35_001;
const ISSUE35_HAWAII_MEANING_ID: u64 = 782;
const ISSUE35_STATE_MEANING_ID: u64 = 7275;
const ISSUE35_US_STATE_MEANING_ID: u64 = 35657;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SemanticPhrase {
    pub text: String,
    pub meaning_id: String,
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SemanticTranslation {
    pub source_text: String,
    pub source_language: String,
    pub target_language: String,
    pub target_text: String,
    pub source_phrases: Vec<SemanticPhrase>,
    pub target_phrases: Vec<SemanticPhrase>,
    pub transformation_steps: Vec<String>,
}

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
    let source_language = normalize_language_key(source_language);
    let target_language = normalize_language_key(target_language);
    let sentence_key = normalize_sentence_key(input);

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
        ("en", "ru", "hawaii is a state") => Some(issue35_english_to_russian(input)),
        ("ru", "en", "гавайи это штат") => Some(issue35_russian_to_english(input)),
        _ => None,
    }
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

    let mut transformation_steps = Vec::new();
    if source_language == "ru" && target_language == "en" {
        if insert_russian_examples_of(&tokens, &mut target_tokens) {
            transformation_steps.push("russian-examples-genitive-to-english-of-phrase".to_string());
        }
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
        ("en", "ru", "add") => Some("добавьте"),
        ("en", "ru", "example") => Some("пример"),
        ("en", "ru", "examples") => Some("примеры"),
        _ => None,
    }
}

fn insert_russian_examples_of(
    source_tokens: &[TranslationToken],
    target_tokens: &mut Vec<TargetToken>,
) -> bool {
    for index in 0..source_tokens.len().saturating_sub(1) {
        if source_tokens[index].normalized != "примеры" {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_supported_statement_templates() {
        assert_eq!(
            classify_statement("1 + 1 = 2"),
            StatementTemplate::ArithmeticEquality
        );
        assert_eq!(
            classify_statement("1 + 1"),
            StatementTemplate::ArithmeticQuestion
        );
        assert_eq!(
            classify_statement("Elon Musk is alive"),
            StatementTemplate::PersonLiveness
        );
        assert_eq!(
            classify_statement("Paris is the capital of France"),
            StatementTemplate::Capital
        );
        assert_eq!(
            classify_statement("Earth orbits the Sun"),
            StatementTemplate::Orbit
        );
        assert_eq!(classify_statement("unknown"), StatementTemplate::Unknown);
    }

    #[test]
    fn bounds_real_world_confidence() {
        assert_eq!(bounded_weighted_support_ratio(1.0, 0.0, 0.01), Some(0.99));
        assert_eq!(bounded_weighted_support_ratio(0.0, 1.0, 0.01), Some(0.01));
        assert_eq!(bounded_weighted_support_ratio(0.0, 0.0, 0.01), None);
    }

    #[test]
    fn encodes_relation_as_doublet() {
        let relation = relation_doublet(10, 20);

        assert_eq!(relation.source, 10);
        assert_eq!(relation.target, 20);
    }

    #[test]
    fn translates_issue35_sentence_through_semantic_ids() {
        let translation =
            translate_known_semantic_sentence("Hawaii is a state.", "en", "ru").unwrap();

        assert_eq!(translation.target_text, "Гавайи это штат.");
        assert_eq!(translation.source_phrases[0].text, "Hawaii");
        assert_eq!(translation.source_phrases[0].meaning_id, "Q782");
        assert_eq!(translation.source_phrases[1].text, "state");
        assert_eq!(translation.source_phrases[1].meaning_id, "Q7275");
        assert_eq!(translation.target_phrases[0].text, "Гавайи");
        assert_eq!(translation.target_phrases[0].meaning_id, "Q782");
        assert_eq!(translation.target_phrases[1].text, "штат");
        assert_eq!(translation.target_phrases[1].meaning_id, "Q35657");
        assert_eq!(
            translation.transformation_steps,
            [
                "english-article-omission",
                "english-copula-to-russian-eto",
                "english-us-state-predicate-to-russian-shtat"
            ]
        );

        let round_trip =
            translate_known_semantic_sentence(&translation.target_text, "ru", "en").unwrap();

        assert_eq!(round_trip.target_text, "Hawaii is a state.");
    }

    #[test]
    fn translates_issue41_glossary_examples_through_semantic_links() {
        let examples = [
            ("Найти синонимы", "ru", "en", "Find synonyms"),
            (
                "Найти примеры перевода",
                "ru",
                "en",
                "Find examples of translation",
            ),
            ("Перевести текст", "ru", "en", "Translate text"),
            ("Формализовать текст", "ru", "en", "Formalize text"),
            ("Проверить утверждение", "ru", "en", "Check statement"),
            ("Сравнить значения", "ru", "en", "Compare values"),
            ("Показать вопросы", "ru", "en", "Show questions"),
            ("Открыть страницу", "ru", "en", "Open page"),
            ("Сохранить результат", "ru", "en", "Save result"),
            ("Add examples", "en", "ru", "Добавьте примеры"),
        ];

        for (source, from, to, expected) in examples {
            let translation = translate_known_semantic_sentence(source, from, to).unwrap();

            assert_eq!(translation.target_text, expected);
            assert!(translation
                .source_phrases
                .iter()
                .all(|phrase| phrase.meaning_id.starts_with("lex:")));
            assert!(!translation.target_phrases.is_empty());
        }
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
        assert_eq!(
            relations[1].target,
            meta_expression_issue35_state_meaning_id()
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
        assert_eq!(meta_expression_issue35_phrase_count(), 2);
        assert_eq!(meta_expression_issue35_rule_count(), 3);
    }
}
