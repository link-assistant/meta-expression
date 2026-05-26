use crate::SemanticTranslation;

const LINGUISTIC_PARSER_ID: &str = "meta-expression-linguistic-parser";
const LINGUISTIC_PARSER_VERSION: u32 = 1;
const LINGUISTIC_PARSER_STRATEGY: &str = "deterministic-english-dependency-parser";

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticParserDescriptor {
    pub id: String,
    pub version: u32,
    pub language: String,
    pub strategy: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticProvenance {
    pub source_type: String,
    pub method: String,
    pub parser_id: String,
    pub parser_version: u32,
    pub layer: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticTokenRange {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticCstDependency {
    pub relation: String,
    pub head: String,
    pub dependent: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticCstToken {
    #[serde(rename = "type")]
    pub kind: String,
    pub id: String,
    pub version: u32,
    pub text: String,
    pub index: usize,
    pub source_start: usize,
    pub source_end: usize,
    pub sentence_boundary_after: bool,
    pub provenance: LinguisticProvenance,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticCstSymbol {
    #[serde(rename = "type")]
    pub kind: String,
    pub id: String,
    pub version: u32,
    pub text: String,
    pub source_start: usize,
    pub source_end: usize,
    pub provenance: LinguisticProvenance,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticCstSentence {
    #[serde(rename = "type")]
    pub kind: String,
    pub id: String,
    pub version: u32,
    pub text: String,
    pub token_start: usize,
    pub token_end: usize,
    pub source_start: usize,
    pub source_end: usize,
    pub predicate_token: Option<usize>,
    pub subject_range: Option<LinguisticTokenRange>,
    pub predicate_range: Option<LinguisticTokenRange>,
    pub object_phrase_range: Option<LinguisticTokenRange>,
    pub object_range: Option<LinguisticTokenRange>,
    pub noun_phrase_ranges: Vec<LinguisticTokenRange>,
    pub verb_phrase_range: Option<LinguisticTokenRange>,
    pub dependencies: Vec<LinguisticCstDependency>,
    pub relation_type: Option<String>,
    pub subject_fragment_id: Option<String>,
    pub predicate_fragment_id: Option<String>,
    pub object_fragment_id: Option<String>,
    pub relation_id: Option<String>,
    pub dependency_ids: Vec<String>,
    pub provenance: LinguisticProvenance,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticCst {
    #[serde(rename = "type")]
    pub kind: String,
    pub version: u32,
    pub text: String,
    pub language: String,
    pub parser: LinguisticParserDescriptor,
    pub tokens: Vec<LinguisticCstToken>,
    pub symbols: Vec<LinguisticCstSymbol>,
    pub sentences: Vec<LinguisticCstSentence>,
    pub provenance: LinguisticProvenance,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticFragment {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub role: String,
    pub text: String,
    pub tokens: Vec<String>,
    pub token_start: Option<usize>,
    pub token_end: Option<usize>,
    pub source_start: Option<usize>,
    pub source_end: Option<usize>,
    pub version: u32,
    pub provenance: LinguisticProvenance,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticDependency {
    pub id: String,
    pub relation: String,
    pub head_fragment_id: String,
    pub dependent_fragment_id: String,
    pub source: String,
    pub version: u32,
    pub provenance: LinguisticProvenance,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticRelation {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub subject_fragment_id: String,
    pub predicate_fragment_id: String,
    pub object_fragment_id: Option<String>,
    pub text: String,
    pub source_start: usize,
    pub source_end: usize,
    pub version: u32,
    pub provenance: LinguisticProvenance,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticAstSentence {
    #[serde(rename = "type")]
    pub kind: String,
    pub id: String,
    pub version: u32,
    pub text: String,
    pub token_start: usize,
    pub token_end: usize,
    pub subject_fragment_id: Option<String>,
    pub predicate_fragment_id: Option<String>,
    pub object_fragment_id: Option<String>,
    pub predicate_token: Option<usize>,
    pub relation_id: Option<String>,
    pub dependency_ids: Vec<String>,
    pub source_start: usize,
    pub source_end: usize,
    pub provenance: LinguisticProvenance,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinguisticMetadata {
    pub version: u32,
    pub text: String,
    pub language: String,
    pub parser: LinguisticParserDescriptor,
    pub provenance: LinguisticProvenance,
    pub fragments: Vec<LinguisticFragment>,
    pub dependencies: Vec<LinguisticDependency>,
    pub relations: Vec<LinguisticRelation>,
    pub ast: Vec<LinguisticAstSentence>,
    pub cst: LinguisticCst,
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
    cst_sentences: &'a mut Vec<LinguisticCstSentence>,
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

fn linguistic_parser_descriptor(language: &str) -> LinguisticParserDescriptor {
    LinguisticParserDescriptor {
        id: LINGUISTIC_PARSER_ID.to_string(),
        version: LINGUISTIC_PARSER_VERSION,
        language: language.to_string(),
        strategy: LINGUISTIC_PARSER_STRATEGY.to_string(),
    }
}

fn linguistic_provenance(layer: impl Into<String>) -> LinguisticProvenance {
    LinguisticProvenance {
        source_type: "algorithm".to_string(),
        method: LINGUISTIC_PARSER_ID.to_string(),
        parser_id: LINGUISTIC_PARSER_ID.to_string(),
        parser_version: LINGUISTIC_PARSER_VERSION,
        layer: layer.into(),
    }
}

pub fn extract_linguistic_metadata(input: &str) -> LinguisticMetadata {
    let text = input.to_string();
    let language = "en".to_string();
    let parser = linguistic_parser_descriptor(&language);
    let tokens = tokenize_linguistic_tokens(input);
    let symbols = linguistic_symbol_spans(input);
    let mut fragments = Vec::new();
    let mut dependencies = Vec::new();
    let mut relations = Vec::new();
    let mut ast = Vec::new();
    let mut cst_sentences = Vec::new();
    let cst_tokens = tokens
        .iter()
        .enumerate()
        .map(|(index, token)| LinguisticCstToken {
            kind: "token-cst".to_string(),
            id: format!("token-{}", index + 1),
            version: 1,
            text: token.text.clone(),
            index,
            source_start: token.start,
            source_end: token.end,
            sentence_boundary_after: token.sentence_boundary_after,
            provenance: linguistic_provenance("cst-token"),
        })
        .collect::<Vec<_>>();
    let cst_symbols = symbols
        .iter()
        .enumerate()
        .map(|(index, (symbol, start, end))| LinguisticCstSymbol {
            kind: "symbol-cst".to_string(),
            id: format!("symbol-{}", index + 1),
            version: 1,
            text: symbol.clone(),
            source_start: *start,
            source_end: *end,
            provenance: linguistic_provenance("cst-symbol"),
        })
        .collect::<Vec<_>>();

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

    for (symbol, start, end) in &symbols {
        push_linguistic_fragment(
            &mut fragments,
            LinguisticFragmentDraft {
                kind: "symbol",
                role: "symbol",
                text: symbol.clone(),
                tokens: Vec::new(),
                token_start: None,
                token_end: None,
                source_start: Some(*start),
                source_end: Some(*end),
            },
        );
    }

    let mut sentence_start = 0;
    let mut state = LinguisticExtractionState {
        fragments: &mut fragments,
        dependencies: &mut dependencies,
        relations: &mut relations,
        ast: &mut ast,
        cst_sentences: &mut cst_sentences,
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

    let cst = LinguisticCst {
        kind: "document-cst".to_string(),
        version: 1,
        text: text.clone(),
        language: language.clone(),
        parser: parser.clone(),
        tokens: cst_tokens,
        symbols: cst_symbols,
        sentences: cst_sentences,
        provenance: linguistic_provenance("cst"),
    };

    LinguisticMetadata {
        version: 1,
        text,
        language,
        parser,
        provenance: linguistic_provenance("metadata"),
        fragments,
        dependencies,
        relations,
        ast,
        cst,
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

pub fn naturalize_formal_expression(input: &str) -> String {
    let tokens = tokenize_formal_expression(input);
    let units: Vec<String> = ["subject", "predicate", "object"]
        .iter()
        .filter_map(|field| extract_formal_expression_field(&tokens, field))
        .collect();

    if units.is_empty() {
        return tokens.join(" ");
    }

    units.join(" ")
}

pub fn deformalize_formal_expression(input: &str) -> String {
    naturalize_formal_expression(input)
}

fn extract_formal_expression_field(tokens: &[String], field: &str) -> Option<String> {
    let start = tokens.iter().position(|token| token == field)? + 1;
    let end = tokens[start..]
        .iter()
        .position(|token| is_formal_expression_field_marker(token))
        .map(|offset| start + offset)
        .unwrap_or(tokens.len());
    let value = tokens[start..end].join(" ");
    (!value.is_empty()).then_some(value)
}

fn is_formal_expression_field_marker(token: &str) -> bool {
    matches!(token, "subject" | "predicate" | "object")
}

fn tokenize_formal_expression(input: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();

    for character in input.chars() {
        if character.is_whitespace() || matches!(character, '(' | ')' | ':' | ',') {
            if !current.is_empty() {
                tokens.push(std::mem::take(&mut current));
            }
            continue;
        }
        current.push(character);
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    tokens
}

fn token_range(range: (usize, usize)) -> LinguisticTokenRange {
    LinguisticTokenRange {
        start: range.0,
        end: range.1,
    }
}

fn cst_dependency(relation: &str, head: &str, dependent: &str) -> LinguisticCstDependency {
    LinguisticCstDependency {
        relation: relation.to_string(),
        head: head.to_string(),
        dependent: dependent.to_string(),
    }
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
    let mut predicate_token = None;
    let mut subject_range = None;
    let mut predicate_range = None;
    let mut object_phrase_range = None;
    let mut object_range = None;
    let mut noun_phrase_ranges = Vec::new();
    let mut verb_phrase_range = None;
    let mut cst_dependencies = Vec::new();

    if let Some(predicate_index) = find_linguistic_predicate(tokens, start_token, end_token) {
        predicate_token = Some(predicate_index);
        if predicate_index > start_token {
            if let Some(subject_fragment_range) =
                trim_linguistic_nominal_range(tokens, start_token, predicate_index - 1, true)
            {
                let cst_subject_range = token_range(subject_fragment_range);
                noun_phrase_ranges.push(cst_subject_range);
                subject_range = Some(cst_subject_range);
                push_token_range_linguistic_fragment(
                    state.fragments,
                    input,
                    tokens,
                    "noun-phrase",
                    "noun-phrase",
                    subject_fragment_range,
                );
                subject = Some(push_token_range_linguistic_fragment(
                    state.fragments,
                    input,
                    tokens,
                    "subject",
                    "subject",
                    subject_fragment_range,
                ));
            }
        }

        let predicate_fragment_range = (predicate_index, predicate_index);
        let cst_predicate_range = token_range(predicate_fragment_range);
        predicate_range = Some(cst_predicate_range);
        verb_phrase_range = Some(cst_predicate_range);
        push_token_range_linguistic_fragment(
            state.fragments,
            input,
            tokens,
            "verb-phrase",
            "verb-phrase",
            predicate_fragment_range,
        );
        predicate = Some(push_token_range_linguistic_fragment(
            state.fragments,
            input,
            tokens,
            "predicate",
            "predicate",
            predicate_fragment_range,
        ));

        if predicate_index < end_token {
            if let Some(raw_object_range) =
                trim_linguistic_nominal_range(tokens, predicate_index + 1, end_token, false)
            {
                let cst_object_phrase_range = token_range(raw_object_range);
                object_phrase_range = Some(cst_object_phrase_range);
                noun_phrase_ranges.push(cst_object_phrase_range);
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
                .map(|range| {
                    object_range = Some(token_range(range));
                    push_token_range_linguistic_fragment(
                        state.fragments,
                        input,
                        tokens,
                        "object",
                        "object",
                        range,
                    )
                });
            }
        }

        if let (Some(subject), Some(predicate)) = (&subject, &predicate) {
            cst_dependencies.push(cst_dependency("nsubj", "predicate", "subject"));
            dependency_ids.push(push_linguistic_dependency(
                state.dependencies,
                "nsubj",
                &predicate.id,
                &subject.id,
            ));
            cst_dependencies.push(cst_dependency("root", "predicate", "predicate"));
            dependency_ids.push(push_linguistic_dependency(
                state.dependencies,
                "root",
                &predicate.id,
                &predicate.id,
            ));
            if let Some(object) = &object {
                cst_dependencies.push(cst_dependency("obj", "predicate", "object"));
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
        noun_phrase_ranges.push(token_range(range));
        push_token_range_linguistic_fragment(
            state.fragments,
            input,
            tokens,
            "noun-phrase",
            "noun-phrase",
            range,
        );
    }

    let subject_fragment_id = subject.as_ref().map(|fragment| fragment.id.clone());
    let predicate_fragment_id = predicate.as_ref().map(|fragment| fragment.id.clone());
    let object_fragment_id = object.as_ref().map(|fragment| fragment.id.clone());
    let relation_type = relation_id.as_ref().map(|_| {
        if object_fragment_id.is_some() {
            "subject-predicate-object".to_string()
        } else {
            "subject-predicate".to_string()
        }
    });

    state.cst_sentences.push(LinguisticCstSentence {
        kind: "sentence-cst".to_string(),
        id: format!("sentence-{}", span.sentence_index + 1),
        version: 1,
        text: input[sentence_start..sentence_end].to_string(),
        token_start: start_token,
        token_end: end_token,
        source_start: sentence_start,
        source_end: sentence_end,
        predicate_token,
        subject_range,
        predicate_range,
        object_phrase_range,
        object_range,
        noun_phrase_ranges,
        verb_phrase_range,
        dependencies: cst_dependencies,
        relation_type,
        subject_fragment_id: subject_fragment_id.clone(),
        predicate_fragment_id: predicate_fragment_id.clone(),
        object_fragment_id: object_fragment_id.clone(),
        relation_id: relation_id.clone(),
        dependency_ids: dependency_ids.clone(),
        provenance: linguistic_provenance("cst-sentence"),
    });

    state.ast.push(LinguisticAstSentence {
        kind: "sentence".to_string(),
        id: format!("sentence-{}", span.sentence_index + 1),
        version: 1,
        text: input[sentence_start..sentence_end].to_string(),
        token_start: start_token,
        token_end: end_token,
        subject_fragment_id,
        predicate_fragment_id,
        object_fragment_id,
        predicate_token,
        relation_id,
        dependency_ids,
        source_start: sentence_start,
        source_end: sentence_end,
        provenance: linguistic_provenance("ast-sentence"),
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
        version: 1,
        provenance: linguistic_provenance(format!("fragment:{}", draft.role)),
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
        source: LINGUISTIC_PARSER_ID.to_string(),
        version: 1,
        provenance: linguistic_provenance(format!("dependency:{relation}")),
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
        version: 1,
        provenance: linguistic_provenance(if object.is_some() {
            "relation:subject-predicate-object"
        } else {
            "relation:subject-predicate"
        }),
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
