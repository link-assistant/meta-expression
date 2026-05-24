use doublets::Doublet;

mod issue52;
mod wikimedia_plan;

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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LinguisticFragment {
    pub id: String,
    pub kind: String,
    pub role: String,
    pub text: String,
    pub tokens: Vec<String>,
    pub token_start: Option<usize>,
    pub token_end: Option<usize>,
    pub source_start: Option<usize>,
    pub source_end: Option<usize>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LinguisticDependency {
    pub id: String,
    pub relation: String,
    pub head_fragment_id: String,
    pub dependent_fragment_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LinguisticRelation {
    pub id: String,
    pub kind: String,
    pub subject_fragment_id: String,
    pub predicate_fragment_id: String,
    pub object_fragment_id: Option<String>,
    pub text: String,
    pub source_start: usize,
    pub source_end: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LinguisticAstSentence {
    pub id: String,
    pub text: String,
    pub subject_fragment_id: Option<String>,
    pub predicate_fragment_id: Option<String>,
    pub object_fragment_id: Option<String>,
    pub relation_id: Option<String>,
    pub dependency_ids: Vec<String>,
    pub source_start: usize,
    pub source_end: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LinguisticMetadata {
    pub text: String,
    pub language: String,
    pub fragments: Vec<LinguisticFragment>,
    pub dependencies: Vec<LinguisticDependency>,
    pub relations: Vec<LinguisticRelation>,
    pub ast: Vec<LinguisticAstSentence>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct LinguisticToken {
    text: String,
    start: usize,
    end: usize,
    sentence_boundary_after: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct FragmentRef {
    id: String,
    text: String,
    source_start: usize,
    source_end: usize,
}

#[derive(Debug)]
struct SentenceSpan {
    start_token: usize,
    end_token: usize,
    sentence_index: usize,
}

struct LinguisticExtractionState<'a> {
    fragments: &'a mut Vec<LinguisticFragment>,
    dependencies: &'a mut Vec<LinguisticDependency>,
    relations: &'a mut Vec<LinguisticRelation>,
    ast: &'a mut Vec<LinguisticAstSentence>,
}

struct LinguisticFragmentDraft<'a> {
    kind: &'a str,
    role: &'a str,
    text: String,
    tokens: Vec<String>,
    token_start: Option<usize>,
    token_end: Option<usize>,
    source_start: Option<usize>,
    source_end: Option<usize>,
}

pub fn extract_linguistic_metadata(input: &str) -> LinguisticMetadata {
    let text = input.to_string();
    let tokens = tokenize_linguistic_tokens(input);
    let mut fragments = Vec::new();
    let mut dependencies = Vec::new();
    let mut relations = Vec::new();
    let mut ast = Vec::new();

    for (index, token) in tokens.iter().enumerate() {
        push_linguistic_fragment(
            &mut fragments,
            LinguisticFragmentDraft {
                kind: "word",
                role: "word",
                text: token.text.clone(),
                tokens: vec![token.text.clone()],
                token_start: Some(index),
                token_end: Some(index),
                source_start: Some(token.start),
                source_end: Some(token.end),
            },
        );
    }

    for (symbol, start, end) in linguistic_symbol_spans(input) {
        push_linguistic_fragment(
            &mut fragments,
            LinguisticFragmentDraft {
                kind: "symbol",
                role: "symbol",
                text: symbol,
                tokens: Vec::new(),
                token_start: None,
                token_end: None,
                source_start: Some(start),
                source_end: Some(end),
            },
        );
    }

    let mut sentence_start = 0;
    let mut state = LinguisticExtractionState {
        fragments: &mut fragments,
        dependencies: &mut dependencies,
        relations: &mut relations,
        ast: &mut ast,
    };
    for index in 0..tokens.len() {
        if tokens[index].sentence_boundary_after || index + 1 == tokens.len() {
            extract_linguistic_sentence(
                input,
                &tokens,
                SentenceSpan {
                    start_token: sentence_start,
                    end_token: index,
                    sentence_index: state.ast.len(),
                },
                &mut state,
            );
            sentence_start = index + 1;
        }
    }

    LinguisticMetadata {
        text,
        language: "en".to_string(),
        fragments,
        dependencies,
        relations,
        ast,
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TextTransformationRule {
    pub id: String,
    pub from: String,
    pub to: String,
}

impl TextTransformationRule {
    pub fn new(id: impl Into<String>, from: impl Into<String>, to: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            from: from.into(),
            to: to.into(),
        }
    }
}

pub fn apply_text_transformation_rules(input: &str, rules: &[TextTransformationRule]) -> String {
    rules.iter().fold(input.to_string(), |current, rule| {
        if rule.from.is_empty() {
            current
        } else {
            current.replace(&rule.from, &rule.to)
        }
    })
}

pub fn naturalize_semantic_translation(translation: &SemanticTranslation) -> &str {
    &translation.target_text
}

pub fn deformalize_semantic_translation(translation: &SemanticTranslation) -> &str {
    naturalize_semantic_translation(translation)
}

fn extract_linguistic_sentence(
    input: &str,
    tokens: &[LinguisticToken],
    span: SentenceSpan,
    state: &mut LinguisticExtractionState<'_>,
) {
    let start_token = span.start_token;
    let end_token = span.end_token;
    if start_token > end_token || end_token >= tokens.len() {
        return;
    }

    let sentence_start = tokens[start_token].start;
    let sentence_end = sentence_end_offset(input, tokens[end_token].end);
    let mut dependency_ids = Vec::new();
    let mut subject = None;
    let mut predicate = None;
    let mut object = None;
    let mut relation_id = None;

    if let Some(predicate_index) = find_linguistic_predicate(tokens, start_token, end_token) {
        if predicate_index > start_token {
            if let Some(subject_range) =
                trim_linguistic_nominal_range(tokens, start_token, predicate_index - 1, true)
            {
                push_token_range_linguistic_fragment(
                    state.fragments,
                    input,
                    tokens,
                    "noun-phrase",
                    "noun-phrase",
                    subject_range,
                );
                subject = Some(push_token_range_linguistic_fragment(
                    state.fragments,
                    input,
                    tokens,
                    "subject",
                    "subject",
                    subject_range,
                ));
            }
        }

        let predicate_range = (predicate_index, predicate_index);
        push_token_range_linguistic_fragment(
            state.fragments,
            input,
            tokens,
            "verb-phrase",
            "verb-phrase",
            predicate_range,
        );
        predicate = Some(push_token_range_linguistic_fragment(
            state.fragments,
            input,
            tokens,
            "predicate",
            "predicate",
            predicate_range,
        ));

        if predicate_index < end_token {
            if let Some(raw_object_range) =
                trim_linguistic_nominal_range(tokens, predicate_index + 1, end_token, false)
            {
                push_token_range_linguistic_fragment(
                    state.fragments,
                    input,
                    tokens,
                    "noun-phrase",
                    "noun-phrase",
                    raw_object_range,
                );
                object = trim_linguistic_nominal_range(
                    tokens,
                    raw_object_range.0,
                    raw_object_range.1,
                    true,
                )
                .map(|object_range| {
                    push_token_range_linguistic_fragment(
                        state.fragments,
                        input,
                        tokens,
                        "object",
                        "object",
                        object_range,
                    )
                });
            }
        }

        if let (Some(subject), Some(predicate)) = (&subject, &predicate) {
            dependency_ids.push(push_linguistic_dependency(
                state.dependencies,
                "nsubj",
                &predicate.id,
                &subject.id,
            ));
            dependency_ids.push(push_linguistic_dependency(
                state.dependencies,
                "root",
                &predicate.id,
                &predicate.id,
            ));
            if let Some(object) = &object {
                dependency_ids.push(push_linguistic_dependency(
                    state.dependencies,
                    "obj",
                    &predicate.id,
                    &object.id,
                ));
            }
            relation_id = Some(push_linguistic_relation(
                state.relations,
                input,
                subject,
                predicate,
                object.as_ref(),
            ));
        }
    } else if let Some(range) = trim_linguistic_nominal_range(tokens, start_token, end_token, false)
    {
        push_token_range_linguistic_fragment(
            state.fragments,
            input,
            tokens,
            "noun-phrase",
            "noun-phrase",
            range,
        );
    }

    state.ast.push(LinguisticAstSentence {
        id: format!("sentence-{}", span.sentence_index + 1),
        text: input[sentence_start..sentence_end].to_string(),
        subject_fragment_id: subject.map(|fragment| fragment.id),
        predicate_fragment_id: predicate.map(|fragment| fragment.id),
        object_fragment_id: object.map(|fragment| fragment.id),
        relation_id,
        dependency_ids,
        source_start: sentence_start,
        source_end: sentence_end,
    });
}

fn push_linguistic_fragment(
    fragments: &mut Vec<LinguisticFragment>,
    draft: LinguisticFragmentDraft,
) -> FragmentRef {
    let id = format!("fragment-{}", fragments.len() + 1);
    fragments.push(LinguisticFragment {
        id: id.clone(),
        kind: draft.kind.to_string(),
        role: draft.role.to_string(),
        text: draft.text.clone(),
        tokens: draft.tokens,
        token_start: draft.token_start,
        token_end: draft.token_end,
        source_start: draft.source_start,
        source_end: draft.source_end,
    });
    FragmentRef {
        id,
        text: draft.text,
        source_start: draft.source_start.unwrap_or_default(),
        source_end: draft.source_end.unwrap_or_default(),
    }
}

fn push_token_range_linguistic_fragment(
    fragments: &mut Vec<LinguisticFragment>,
    input: &str,
    tokens: &[LinguisticToken],
    kind: &str,
    role: &str,
    range: (usize, usize),
) -> FragmentRef {
    let first = &tokens[range.0];
    let last = &tokens[range.1];
    push_linguistic_fragment(
        fragments,
        LinguisticFragmentDraft {
            kind,
            role,
            text: input[first.start..last.end].to_string(),
            tokens: tokens[range.0..=range.1]
                .iter()
                .map(|token| token.text.clone())
                .collect(),
            token_start: Some(range.0),
            token_end: Some(range.1),
            source_start: Some(first.start),
            source_end: Some(last.end),
        },
    )
}

fn push_linguistic_dependency(
    dependencies: &mut Vec<LinguisticDependency>,
    relation: &str,
    head_fragment_id: &str,
    dependent_fragment_id: &str,
) -> String {
    let id = format!("dependency-{}", dependencies.len() + 1);
    dependencies.push(LinguisticDependency {
        id: id.clone(),
        relation: relation.to_string(),
        head_fragment_id: head_fragment_id.to_string(),
        dependent_fragment_id: dependent_fragment_id.to_string(),
    });
    id
}

fn push_linguistic_relation(
    relations: &mut Vec<LinguisticRelation>,
    input: &str,
    subject: &FragmentRef,
    predicate: &FragmentRef,
    object: Option<&FragmentRef>,
) -> String {
    let source_start = subject.source_start.min(predicate.source_start).min(
        object
            .map(|fragment| fragment.source_start)
            .unwrap_or(predicate.source_start),
    );
    let source_end = subject.source_end.max(predicate.source_end).max(
        object
            .map(|fragment| fragment.source_end)
            .unwrap_or(predicate.source_end),
    );
    let id = format!("relation-{}", relations.len() + 1);
    relations.push(LinguisticRelation {
        id: id.clone(),
        kind: if object.is_some() {
            "subject-predicate-object".to_string()
        } else {
            "subject-predicate".to_string()
        },
        subject_fragment_id: subject.id.clone(),
        predicate_fragment_id: predicate.id.clone(),
        object_fragment_id: object.map(|fragment| fragment.id.clone()),
        text: input[source_start..source_end].to_string(),
        source_start,
        source_end,
    });
    id
}

fn tokenize_linguistic_tokens(input: &str) -> Vec<LinguisticToken> {
    let mut tokens = Vec::new();
    let mut token_start = None;

    for (index, character) in input.char_indices() {
        if is_linguistic_token_char(character) {
            if token_start.is_none() {
                token_start = Some(index);
            }
            continue;
        }
        if let Some(start) = token_start.take() {
            tokens.push(LinguisticToken {
                text: input[start..index].to_string(),
                start,
                end: index,
                sentence_boundary_after: false,
            });
        }
    }

    if let Some(start) = token_start {
        tokens.push(LinguisticToken {
            text: input[start..].to_string(),
            start,
            end: input.len(),
            sentence_boundary_after: false,
        });
    }

    for index in 0..tokens.len().saturating_sub(1) {
        tokens[index].sentence_boundary_after =
            input[tokens[index].end..tokens[index + 1].start].contains(['.', '!', '?']);
    }
    if let Some(last) = tokens.last_mut() {
        last.sentence_boundary_after = input[last.end..].contains(['.', '!', '?']);
    }

    tokens
}

fn linguistic_symbol_spans(input: &str) -> Vec<(String, usize, usize)> {
    input
        .char_indices()
        .filter_map(|(start, character)| {
            if character.is_whitespace() || is_linguistic_token_char(character) {
                None
            } else {
                Some((character.to_string(), start, start + character.len_utf8()))
            }
        })
        .collect()
}

fn sentence_end_offset(input: &str, token_end: usize) -> usize {
    input[token_end..]
        .char_indices()
        .take_while(|(_, character)| {
            character.is_whitespace() || matches!(character, '.' | '!' | '?')
        })
        .last()
        .map(|(offset, character)| token_end + offset + character.len_utf8())
        .unwrap_or(token_end)
}

fn find_linguistic_predicate(
    tokens: &[LinguisticToken],
    start: usize,
    end: usize,
) -> Option<usize> {
    ((start + 1)..=end)
        .find(|index| is_linguistic_verb_candidate(&tokens[*index].text))
        .or_else(|| (start..=end).find(|index| is_linguistic_verb_candidate(&tokens[*index].text)))
}

fn trim_linguistic_nominal_range(
    tokens: &[LinguisticToken],
    start: usize,
    end: usize,
    strip_articles: bool,
) -> Option<(usize, usize)> {
    if start > end {
        return None;
    }
    let mut left = start;
    let mut right = end;
    while left <= right && should_trim_linguistic_left(&tokens[left].text, strip_articles) {
        left += 1;
    }
    while right >= left && should_trim_linguistic_right(&tokens[right].text) {
        if right == 0 {
            return None;
        }
        right -= 1;
    }
    (left <= right).then_some((left, right))
}

fn should_trim_linguistic_left(token: &str, strip_articles: bool) -> bool {
    let token = normalize_linguistic_token(token);
    is_english_preposition(&token)
        || is_english_conjunction(&token)
        || (strip_articles && is_english_article(&token))
}

fn should_trim_linguistic_right(token: &str) -> bool {
    let token = normalize_linguistic_token(token);
    is_english_preposition(&token) || is_english_conjunction(&token) || is_english_article(&token)
}

fn is_linguistic_verb_candidate(token: &str) -> bool {
    let token = normalize_linguistic_token(token);
    if token.is_empty() {
        return false;
    }
    if is_english_copula(&token) || is_english_verb_lexeme(&token) {
        return true;
    }
    !is_linguistic_grammar_glue(&token)
        && token.len() > 3
        && (token.ends_with("ed")
            || token.ends_with("ing")
            || token.ends_with("ize")
            || token.ends_with("ise")
            || token.ends_with("es"))
}

fn is_linguistic_grammar_glue(token: &str) -> bool {
    is_english_article(token) || is_english_preposition(token) || is_english_conjunction(token)
}

fn normalize_linguistic_token(token: &str) -> String {
    token
        .chars()
        .filter(|character| character.is_alphanumeric() || matches!(character, '\'' | '_' | '-'))
        .collect::<String>()
        .to_lowercase()
}

fn is_linguistic_token_char(character: char) -> bool {
    !character.is_whitespace() && !matches!(character, '.' | ',' | '!' | '?' | ';' | ':' | '"')
}

fn is_english_article(token: &str) -> bool {
    matches!(token, "a" | "an" | "the")
}

fn is_english_conjunction(token: &str) -> bool {
    matches!(token, "and" | "or" | "but")
}

fn is_english_copula(token: &str) -> bool {
    matches!(
        token,
        "am" | "is" | "are" | "was" | "were" | "be" | "being" | "been"
    )
}

fn is_english_preposition(token: &str) -> bool {
    matches!(
        token,
        "about"
            | "above"
            | "after"
            | "against"
            | "around"
            | "as"
            | "at"
            | "before"
            | "behind"
            | "below"
            | "between"
            | "by"
            | "for"
            | "from"
            | "in"
            | "into"
            | "near"
            | "of"
            | "on"
            | "onto"
            | "over"
            | "through"
            | "to"
            | "under"
            | "with"
    )
}

fn is_english_verb_lexeme(token: &str) -> bool {
    matches!(
        token,
        "add"
            | "adds"
            | "apply"
            | "applies"
            | "belong"
            | "belongs"
            | "check"
            | "checks"
            | "compare"
            | "compares"
            | "contain"
            | "contains"
            | "create"
            | "created"
            | "creates"
            | "discover"
            | "discovered"
            | "discovers"
            | "find"
            | "finds"
            | "formalize"
            | "formalizes"
            | "has"
            | "have"
            | "had"
            | "invent"
            | "invented"
            | "invents"
            | "orbit"
            | "orbits"
            | "own"
            | "owned"
            | "owns"
            | "relate"
            | "related"
            | "relates"
            | "run"
            | "runs"
            | "search"
            | "searches"
            | "support"
            | "supports"
            | "translate"
            | "translated"
            | "translates"
            | "write"
            | "writes"
            | "wrote"
    )
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
