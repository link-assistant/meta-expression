use serde::Serialize;
use serde_json::{json, Value};

const RAW_TEXT: u32 = 1;
const STRUCTURED_MEANING_LINKS: u32 = 2;
const PARTIAL_FORMAL_EXPRESSION: u32 = 3;
const FULLY_COMPUTABLE_EXPRESSION: u32 = 4;
const WIKIDATA_STRUCTURED_PROBABILITY: f64 = 0.74;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BeliefSystem {
    pub id: String,
    pub name: String,
    pub probability_strategy: String,
    pub source_weights: std::collections::BTreeMap<String, f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkProvenance {
    pub source_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retrieved_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkRecord {
    pub id: String,
    pub role: String,
    pub references: Vec<String>,
    pub value: Value,
    pub provenance: LinkProvenance,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinksNetwork {
    pub id: String,
    pub kind: String,
    pub version: u32,
    pub belief_system: BeliefSystem,
    pub links: Vec<LinkRecord>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Interpretation {
    pub id: String,
    pub statement_id: String,
    pub kind: String,
    pub paraphrase: String,
    pub examples: Vec<String>,
    pub confidence: f64,
    pub source: String,
    pub formalization_level: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatementDraft {
    pub status: String,
    pub statement: LinkRecord,
    pub interpretations: Vec<Interpretation>,
    pub links_network: LinksNetwork,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Formalization {
    pub level: u32,
    pub computable: bool,
    pub expression: Value,
    pub unknowns: Vec<String>,
    pub refinement_suggestions: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceItem {
    pub id: String,
    pub key: String,
    pub polarity: String,
    pub weight: f64,
    pub source_type: String,
    pub situation: String,
    pub source_url: Option<String>,
    pub retrieved_at: String,
    pub claim: String,
    pub identifiers: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<Value>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvaluationResult {
    pub kind: String,
    pub value: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actual: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected: Option<f64>,
    pub confidence: Option<f64>,
    pub correctness: Option<f64>,
    pub signed_confidence: Option<f64>,
    pub raw_balance: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_weight: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refute_weight: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub calculation: Option<Value>,
    pub supporting_evidence: Vec<EvidenceItem>,
    pub refuting_evidence: Vec<EvidenceItem>,
    pub explanation: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatementAnalysis {
    pub status: String,
    pub statement: LinkRecord,
    pub interpretations: Vec<Interpretation>,
    pub selected_interpretation: Interpretation,
    pub formalization: Formalization,
    pub result: EvaluationResult,
    pub result_link: LinkRecord,
    pub links_network: LinksNetwork,
}

#[derive(Debug, Clone, Copy, PartialEq)]
struct ArithmeticExpression {
    left: f64,
    operator: char,
    right: f64,
    expected: Option<f64>,
}

struct Context {
    links_network: LinksNetwork,
}

pub fn create_statement_draft(input: &str) -> Result<StatementDraft, String> {
    let text = normalize_input(input)?;
    let mut context = Context {
        links_network: LinksNetwork {
            id: "prototype-links-network".to_string(),
            kind: "links-network".to_string(),
            version: 1,
            belief_system: default_belief_system(),
            links: Vec::new(),
        },
    };
    let statement = add_link(
        &mut context,
        None,
        "statement",
        Vec::new(),
        json!({
            "text": text,
            "formalizationLevel": RAW_TEXT,
            "version": 1
        }),
        algorithm_provenance("input-normalization"),
    );
    let interpretations = generate_interpretations(&text)
        .into_iter()
        .enumerate()
        .map(|(index, mut interpretation)| {
            interpretation.id = format!("interpretation-{}", index + 1);
            interpretation.statement_id = statement.id.clone();
            interpretation
        })
        .collect::<Vec<_>>();

    for interpretation in &interpretations {
        add_link(
            &mut context,
            Some(interpretation.id.clone()),
            "interpretation",
            vec![statement.id.clone()],
            json!(interpretation),
            algorithm_provenance("deterministic-interpretation"),
        );
    }

    Ok(StatementDraft {
        status: "selection-required".to_string(),
        statement,
        interpretations,
        links_network: context.links_network,
    })
}

pub fn select_interpretation(input: &str, index: usize) -> Result<Interpretation, String> {
    let draft = create_statement_draft(input)?;
    draft
        .interpretations
        .get(index)
        .cloned()
        .ok_or_else(|| format!("Unknown interpretation index: {index}"))
}

pub fn formalize_statement(input: &str, index: usize) -> Result<Formalization, String> {
    let draft = create_statement_draft(input)?;
    let selected = draft
        .interpretations
        .get(index)
        .ok_or_else(|| format!("Unknown interpretation index: {index}"))?;
    Ok(formalize_interpretation(
        draft.statement.value["text"].as_str().unwrap_or_default(),
        selected,
    ))
}

pub fn evaluate_statement(input: &str, index: usize) -> Result<EvaluationResult, String> {
    let formalization = formalize_statement(input, index)?;
    Ok(if formalization.computable {
        evaluate_computable_formalization(&formalization)
    } else {
        estimate_from_evidence(&formalization)
    })
}

pub fn statement_confidence(input: &str, index: usize) -> Result<Option<f64>, String> {
    Ok(evaluate_statement(input, index)?.confidence)
}

pub fn analyze_statement(input: &str, index: usize) -> Result<StatementAnalysis, String> {
    let draft = create_statement_draft(input)?;
    let selected = draft
        .interpretations
        .get(index)
        .cloned()
        .ok_or_else(|| format!("Unknown interpretation index: {index}"))?;
    let mut context = Context {
        links_network: draft.links_network.clone(),
    };
    let statement = draft.statement.clone();

    add_link(
        &mut context,
        None,
        "selection",
        vec![statement.id.clone(), selected.id.clone()],
        json!({
            "selectedInterpretationId": selected.id,
            "selectedBy": "prototype-default"
        }),
        algorithm_provenance("interpretation-selection"),
    );

    let formalization = formalize_interpretation(
        statement.value["text"].as_str().unwrap_or_default(),
        &selected,
    );
    let formalization_link = add_link(
        &mut context,
        None,
        "formalization",
        vec![selected.id.clone()],
        json!(formalization),
        algorithm_provenance("formalization"),
    );
    add_formalization_dependencies(&mut context, &formalization_link, &formalization);

    let result = if formalization.computable {
        evaluate_computable_formalization(&formalization)
    } else {
        estimate_from_evidence(&formalization)
    };
    let result_link = add_result_links(&mut context, &statement, &formalization_link, &result);

    Ok(StatementAnalysis {
        status: "completed".to_string(),
        statement,
        interpretations: draft.interpretations,
        selected_interpretation: selected,
        formalization,
        result,
        result_link,
        links_network: context.links_network,
    })
}

pub fn serialize_statement_links_notation(input: &str, index: usize) -> Result<String, String> {
    let analysis = analyze_statement(input, index)?;
    Ok(serialize_links_notation(&analysis.links_network))
}

pub fn serialize_links_notation(links_network: &LinksNetwork) -> String {
    let mut lines = vec![format!(
        "(links-network: {} {})",
        safe_reference(&links_network.id),
        safe_reference(&links_network.belief_system.id)
    )];
    lines.extend(links_network.links.iter().map(|link| {
        let references = if link.references.is_empty() {
            "self".to_string()
        } else {
            link.references
                .iter()
                .map(|reference| safe_reference(reference))
                .collect::<Vec<_>>()
                .join(" ")
        };
        format!(
            "({}: {} {} {})",
            safe_reference(&link.id),
            safe_reference(&link.role),
            references,
            summarize_link_value(link)
        )
    }));
    lines.join("\n")
}

fn default_belief_system() -> BeliefSystem {
    BeliefSystem {
        id: "default-scientific".to_string(),
        name: "Default scientific prototype".to_string(),
        probability_strategy: "weighted-support-ratio".to_string(),
        source_weights: std::collections::BTreeMap::from([
            ("computed".to_string(), 1.0),
            ("wikidata".to_string(), 1.0),
            ("algorithm".to_string(), 0.6),
            ("user".to_string(), 0.25),
            ("preference".to_string(), 1.0),
            ("derived-preference".to_string(), 0.85),
            ("context".to_string(), 0.85),
        ]),
    }
}

fn generate_interpretations(input: &str) -> Vec<Interpretation> {
    if parse_arithmetic_equality(input).is_some() {
        return vec![
            interpretation(
                "arithmetic-equality",
                format!("Check whether \"{input}\" is an exact arithmetic equality."),
                vec!["1 + 1 = 2 is true", "1 + 1 = 1 is false"],
                1.0,
                FULLY_COMPUTABLE_EXPRESSION,
            ),
            interpretation(
                "notation-claim",
                "Treat the input as a claim about symbols rather than a calculation.",
                vec!["The expression may be quoted in a document"],
                0.35,
                PARTIAL_FORMAL_EXPRESSION,
            ),
            raw_statement_interpretation(),
        ];
    }
    if parse_arithmetic_question(input).is_some() {
        return vec![
            interpretation(
                "arithmetic-question",
                format!("Compute the value of \"{input}\"."),
                vec!["1 + 1 asks for the number 2", "6 / 3 asks for the number 2"],
                1.0,
                FULLY_COMPUTABLE_EXPRESSION,
            ),
            interpretation(
                "notation-fragment",
                "Treat the input as a symbolic fragment that may need a surrounding statement.",
                vec!["The expression may be part of a larger equation"],
                0.3,
                PARTIAL_FORMAL_EXPRESSION,
            ),
            raw_statement_interpretation(),
        ];
    }
    if is_self_referential_false_statement(input) {
        return vec![
            interpretation(
                "self-referential-truth-claim",
                "Treat the statement as referring to its own truth value.",
                vec!["This statement is false cannot be assigned a stable truth value"],
                0.9,
                PARTIAL_FORMAL_EXPRESSION,
            ),
            interpretation(
                "quoted-text",
                "Preserve the input as quoted text without evaluating it.",
                vec!["Useful for translation or later refinement"],
                0.25,
                RAW_TEXT,
            ),
            interpretation(
                "real-world-claim",
                "Treat the words as an ordinary factual claim that needs evidence.",
                vec!["Evidence may support or refute the claim"],
                0.15,
                STRUCTURED_MEANING_LINKS,
            ),
        ];
    }

    let known = known_claim(input);
    let known_ref = known.as_ref();
    vec![
        interpretation(
            known_ref
                .map(|claim| claim.interpretation_kind)
                .unwrap_or("real-world-claim"),
            known_ref
                .map(|claim| claim.paraphrase.to_string())
                .unwrap_or_else(|| {
                    format!("Treat \"{input}\" as a factual claim that needs evidence.")
                }),
            known_ref
                .map(|claim| claim.examples.to_vec())
                .unwrap_or_else(|| vec!["Evidence may support or refute the claim"]),
            if known.is_some() { 0.95 } else { 0.5 },
            if known.is_some() {
                PARTIAL_FORMAL_EXPRESSION
            } else {
                STRUCTURED_MEANING_LINKS
            },
        ),
        interpretation(
            "ambiguous-claim",
            "The statement may need a more specific subject or relation.",
            vec!["Specify time, place, source, or intended meaning"],
            0.4,
            STRUCTURED_MEANING_LINKS,
        ),
        interpretation(
            "quoted-text",
            "Preserve the input as quoted text without evaluating it.",
            vec!["Useful for translation or later refinement"],
            0.25,
            RAW_TEXT,
        ),
    ]
}

fn interpretation(
    kind: &str,
    paraphrase: impl Into<String>,
    examples: Vec<&str>,
    confidence: f64,
    formalization_level: u32,
) -> Interpretation {
    Interpretation {
        id: String::new(),
        statement_id: String::new(),
        kind: kind.to_string(),
        paraphrase: paraphrase.into(),
        examples: examples.into_iter().map(str::to_string).collect(),
        confidence,
        source: "deterministic-rule".to_string(),
        formalization_level,
    }
}

fn raw_statement_interpretation() -> Interpretation {
    interpretation(
        "raw-statement",
        "Preserve the text as an underspecified human-language statement.",
        vec!["Ask the user what the expression should mean"],
        0.2,
        RAW_TEXT,
    )
}

fn formalize_interpretation(text: &str, interpretation: &Interpretation) -> Formalization {
    if interpretation.kind == "arithmetic-equality" {
        let expression = parse_arithmetic_equality(text).expect("validated arithmetic equality");
        return Formalization {
            level: FULLY_COMPUTABLE_EXPRESSION,
            computable: true,
            expression: json!({
                "type": "arithmetic-equality",
                "operator": expression.operator.to_string(),
                "leftOperand": expression.left,
                "rightOperand": expression.right,
                "expected": expression.expected.unwrap_or_default()
            }),
            unknowns: Vec::new(),
            refinement_suggestions: Vec::new(),
        };
    }
    if interpretation.kind == "arithmetic-question" {
        let expression = parse_arithmetic_question(text).expect("validated arithmetic question");
        return Formalization {
            level: FULLY_COMPUTABLE_EXPRESSION,
            computable: true,
            expression: json!({
                "type": "arithmetic-question",
                "operator": expression.operator.to_string(),
                "leftOperand": expression.left,
                "rightOperand": expression.right
            }),
            unknowns: Vec::new(),
            refinement_suggestions: Vec::new(),
        };
    }
    if interpretation.kind == "self-referential-truth-claim" {
        return Formalization {
            level: PARTIAL_FORMAL_EXPRESSION,
            computable: false,
            expression: json!({
                "type": "self-reference-paradox",
                "text": text,
                "normalized": normalize_key(text)
            }),
            unknowns: vec!["stable truth value".to_string()],
            refinement_suggestions: vec![
                "Quote the sentence if it should be treated as text.".to_string(),
                "Rewrite it as a non-self-referential claim if evidence should be checked."
                    .to_string(),
            ],
        };
    }

    let normalized = normalize_key(text);
    let known = known_claim(text);
    let known_ref = known.as_ref();
    Formalization {
        level: known_ref
            .map(|_| PARTIAL_FORMAL_EXPRESSION)
            .unwrap_or(interpretation.formalization_level),
        computable: false,
        expression: json!({
            "type": known_ref.map(|claim| claim.expression_type).unwrap_or("partial-claim"),
            "text": text,
            "normalized": normalized,
            "wikidata": known_ref
                .map(|claim| claim.wikidata.clone())
                .unwrap_or(Value::Null)
        }),
        unknowns: if known.is_some() {
            Vec::new()
        } else {
            vec![
                "formal predicate".to_string(),
                "evidence source mapping".to_string(),
            ]
        },
        refinement_suggestions: if known.is_some() {
            Vec::new()
        } else {
            vec![
                "Choose a specific subject.".to_string(),
                "Choose a relation that can be checked against evidence.".to_string(),
            ]
        },
    }
}

fn evaluate_computable_formalization(formalization: &Formalization) -> EvaluationResult {
    let expression = &formalization.expression;
    let left = expression["leftOperand"].as_f64().unwrap_or_default();
    let right = expression["rightOperand"].as_f64().unwrap_or_default();
    let operator = expression["operator"]
        .as_str()
        .and_then(|value| value.chars().next())
        .unwrap_or('+');
    let actual = evaluate_arithmetic(left, operator, right);
    let claim = format!(
        "{} {} {} evaluates to {}.",
        format_number(left),
        operator,
        format_number(right),
        format_number(actual)
    );
    let mut evidence = computed_evidence("support", 1.0, claim);

    if expression["type"] == "arithmetic-question" {
        return EvaluationResult {
            kind: "computed".to_string(),
            value: json!(actual),
            actual: Some(actual),
            expected: None,
            confidence: Some(1.0),
            correctness: Some(1.0),
            signed_confidence: Some(1.0),
            raw_balance: Some(1.0),
            support_weight: None,
            refute_weight: None,
            calculation: None,
            supporting_evidence: vec![evidence],
            refuting_evidence: Vec::new(),
            explanation: "The expression was computed locally.".to_string(),
        };
    }

    let expected = expression["expected"].as_f64().unwrap_or_default();
    let value = actual == expected;
    evidence.polarity = if value { "support" } else { "refute" }.to_string();
    EvaluationResult {
        kind: "computed".to_string(),
        value: json!(value),
        actual: Some(actual),
        expected: Some(expected),
        confidence: Some(if value { 1.0 } else { 0.0 }),
        correctness: Some(if value { 1.0 } else { 0.0 }),
        signed_confidence: Some(if value { 1.0 } else { -1.0 }),
        raw_balance: Some(if value { 1.0 } else { -1.0 }),
        support_weight: None,
        refute_weight: None,
        calculation: None,
        supporting_evidence: if value {
            vec![evidence.clone()]
        } else {
            Vec::new()
        },
        refuting_evidence: if value { Vec::new() } else { vec![evidence] },
        explanation: if value {
            "The computed value matches the expected value."
        } else {
            "The computed value does not match the expected value."
        }
        .to_string(),
    }
}

fn estimate_from_evidence(formalization: &Formalization) -> EvaluationResult {
    if formalization.expression["type"] == "self-reference-paradox" {
        return EvaluationResult {
            kind: "evidence-estimate".to_string(),
            value: json!("undetermined"),
            actual: None,
            expected: None,
            confidence: Some(0.5),
            correctness: Some(0.5),
            signed_confidence: Some(0.0),
            raw_balance: Some(0.0),
            support_weight: Some(0.0),
            refute_weight: Some(0.0),
            calculation: None,
            supporting_evidence: Vec::new(),
            refuting_evidence: Vec::new(),
            explanation: "The selected interpretation is self-referential, so this prototype marks its truth value as undetermined instead of treating missing evidence as unknown.".to_string(),
        };
    }

    let normalized = formalization.expression["normalized"]
        .as_str()
        .unwrap_or_default();
    let Some(evidence) = fixture_evidence(normalized) else {
        return EvaluationResult {
            kind: "evidence-estimate".to_string(),
            value: json!("unknown"),
            actual: None,
            expected: None,
            confidence: None,
            correctness: None,
            signed_confidence: None,
            raw_balance: None,
            support_weight: Some(0.0),
            refute_weight: Some(0.0),
            calculation: None,
            supporting_evidence: Vec::new(),
            refuting_evidence: Vec::new(),
            explanation: "No configured evidence was found for the selected interpretation."
                .to_string(),
        };
    };

    let mut support = evidence;
    support.weight = WIKIDATA_STRUCTURED_PROBABILITY;
    support.score = Some(evidence_score(false));
    let mut residual = support.clone();
    residual.id = format!("{}-residual", residual.id);
    residual.polarity = "refute".to_string();
    residual.weight = 1.0 - WIKIDATA_STRUCTURED_PROBABILITY;
    residual.claim = format!(
        "Residual uncertainty from configured \"Wikidata structured statement\" probability (74%) for: {}",
        support.claim
    );
    residual.identifiers["residual"] = json!("uncertainty");
    residual.context = Some(json!({
        "reasoningSteps": [{
            "text": "Configured \"Wikidata structured statement\" situation probability leaves 26% residual uncertainty.",
            "sourceUrl": support.source_url
        }]
    }));
    residual.score = Some(evidence_score(true));

    EvaluationResult {
        kind: "evidence-estimate".to_string(),
        value: json!(WIKIDATA_STRUCTURED_PROBABILITY),
        actual: None,
        expected: None,
        confidence: Some(WIKIDATA_STRUCTURED_PROBABILITY),
        correctness: Some(WIKIDATA_STRUCTURED_PROBABILITY),
        signed_confidence: Some(2.0 * WIKIDATA_STRUCTURED_PROBABILITY - 1.0),
        raw_balance: Some(2.0 * WIKIDATA_STRUCTURED_PROBABILITY - 1.0),
        support_weight: Some(WIKIDATA_STRUCTURED_PROBABILITY),
        refute_weight: Some(1.0 - WIKIDATA_STRUCTURED_PROBABILITY),
        calculation: Some(json!({
            "strategy": "weighted-support-ratio",
            "supportWeight": WIKIDATA_STRUCTURED_PROBABILITY,
            "refuteWeight": 1.0 - WIKIDATA_STRUCTURED_PROBABILITY,
            "rawConfidence": WIKIDATA_STRUCTURED_PROBABILITY,
            "boundedConfidence": WIKIDATA_STRUCTURED_PROBABILITY,
            "realWorldUncertainty": 0.01,
            "evidence": [calculation_evidence(&support), calculation_evidence(&residual)]
        })),
        supporting_evidence: vec![support],
        refuting_evidence: vec![residual],
        explanation: "Confidence is the weighted support ratio over configured evidence situations, bounded away from absolute certainty for real-world claims.".to_string(),
    }
}

fn add_formalization_dependencies(
    context: &mut Context,
    formalization_link: &LinkRecord,
    formalization: &Formalization,
) {
    let expression_type = formalization.expression["type"]
        .as_str()
        .unwrap_or_default();
    if !matches!(
        expression_type,
        "arithmetic-equality" | "arithmetic-question"
    ) {
        add_link(
            context,
            None,
            "depends-on",
            vec![formalization_link.id.clone()],
            json!({
                "relation": "depends-on",
                "target": "selected interpretation and evidence mapping"
            }),
            algorithm_provenance("dependency-extraction"),
        );
        return;
    }

    let mut parts = vec![
        format_number(
            formalization.expression["leftOperand"]
                .as_f64()
                .unwrap_or_default(),
        ),
        formalization.expression["operator"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        format_number(
            formalization.expression["rightOperand"]
                .as_f64()
                .unwrap_or_default(),
        ),
    ];
    if expression_type == "arithmetic-equality" {
        parts.push(format_number(
            formalization.expression["expected"]
                .as_f64()
                .unwrap_or_default(),
        ));
    }

    for part in parts {
        let dependency = add_link(
            context,
            None,
            "expression-part",
            vec![formalization_link.id.clone()],
            json!({ "text": part }),
            algorithm_provenance("dependency-extraction"),
        );
        add_link(
            context,
            None,
            "depends-on",
            vec![formalization_link.id.clone(), dependency.id],
            json!({ "relation": "depends-on" }),
            algorithm_provenance("dependency-extraction"),
        );
    }
}

fn add_result_links(
    context: &mut Context,
    statement: &LinkRecord,
    formalization_link: &LinkRecord,
    result: &EvaluationResult,
) -> LinkRecord {
    let result_link = add_link(
        context,
        None,
        "result",
        vec![statement.id.clone(), formalization_link.id.clone()],
        json!({
            "kind": result.kind,
            "value": result.value,
            "confidence": result.confidence
        }),
        algorithm_provenance("evaluation"),
    );

    for evidence in result
        .supporting_evidence
        .iter()
        .chain(result.refuting_evidence.iter())
    {
        let evidence_link = add_link(
            context,
            Some(evidence.id.clone()),
            "evidence",
            vec![statement.id.clone()],
            json!(evidence),
            evidence_provenance(evidence),
        );
        if let Some(phrase_mappings) = evidence
            .context
            .as_ref()
            .and_then(|context| context["phraseMappings"].as_array())
        {
            for mapping in phrase_mappings {
                add_link(
                    context,
                    None,
                    "meaning",
                    vec![evidence_link.id.clone()],
                    mapping.clone(),
                    evidence_provenance(evidence),
                );
            }
        }
        if let Some(reasoning_steps) = evidence
            .context
            .as_ref()
            .and_then(|context| context["reasoningSteps"].as_array())
        {
            for step in reasoning_steps {
                add_link(
                    context,
                    None,
                    "reasoning-step",
                    vec![evidence_link.id.clone()],
                    step.clone(),
                    evidence_provenance(evidence),
                );
            }
        }
        add_link(
            context,
            None,
            &evidence.polarity,
            vec![evidence_link.id.clone(), result_link.id.clone()],
            json!({
                "relation": if evidence.polarity == "support" { "supports" } else { "refutes" },
                "weight": evidence.weight
            }),
            evidence_provenance(evidence),
        );
    }

    result_link
}

fn add_link(
    context: &mut Context,
    id: Option<String>,
    role: &str,
    references: Vec<String>,
    value: Value,
    provenance: LinkProvenance,
) -> LinkRecord {
    let link = LinkRecord {
        id: id.unwrap_or_else(|| next_id(&context.links_network.links, role)),
        role: role.to_string(),
        references,
        value,
        provenance,
    };
    context.links_network.links.push(link.clone());
    link
}

fn next_id(links: &[LinkRecord], role: &str) -> String {
    let prefix = format!("{role}-");
    let next = links
        .iter()
        .filter_map(|link| link.id.strip_prefix(&prefix))
        .filter_map(|suffix| suffix.parse::<u32>().ok())
        .max()
        .unwrap_or(0)
        + 1;
    format!("{prefix}{next}")
}

fn parse_arithmetic_equality(input: &str) -> Option<ArithmeticExpression> {
    let mut parts = input.split('=');
    let left = parts.next()?.trim();
    let right = parts.next()?.trim();
    if parts.next().is_some() {
        return None;
    }
    let (left, operator, right_operand) = parse_binary_arithmetic(left)?;
    Some(ArithmeticExpression {
        left,
        operator,
        right: right_operand,
        expected: Some(right.parse::<f64>().ok()?),
    })
}

fn parse_arithmetic_question(input: &str) -> Option<ArithmeticExpression> {
    let question = input.trim().trim_end_matches('?').trim();
    let (left, operator, right) = parse_binary_arithmetic(question)?;
    Some(ArithmeticExpression {
        left,
        operator,
        right,
        expected: None,
    })
}

fn parse_binary_arithmetic(input: &str) -> Option<(f64, char, f64)> {
    let parts = input.split_whitespace().collect::<Vec<_>>();
    if parts.len() != 3 {
        return None;
    }
    let operator = parts[1].chars().next()?;
    if !matches!(operator, '+' | '-' | '*' | '/') || parts[1].len() != 1 {
        return None;
    }
    Some((
        parts[0].parse::<f64>().ok()?,
        operator,
        parts[2].parse::<f64>().ok()?,
    ))
}

fn evaluate_arithmetic(left: f64, operator: char, right: f64) -> f64 {
    match operator {
        '+' => left + right,
        '-' => left - right,
        '*' => left * right,
        '/' => left / right,
        _ => f64::NAN,
    }
}

fn computed_evidence(polarity: &str, weight: f64, claim: String) -> EvidenceItem {
    EvidenceItem {
        id: "computed-evidence-1".to_string(),
        key: "computed".to_string(),
        polarity: polarity.to_string(),
        weight,
        source_type: "computed".to_string(),
        situation: "computed".to_string(),
        source_url: None,
        retrieved_at: "local".to_string(),
        claim,
        identifiers: json!({}),
        context: None,
        score: None,
    }
}

fn fixture_evidence(normalized: &str) -> Option<EvidenceItem> {
    let (source_url, claim, identifiers, context) = match normalized {
        "earth orbits the sun" => (
            "https://www.wikidata.org/wiki/Q2#P397",
            "Wikidata Q2 Earth has parent astronomical body P397 with value Q525 Sun.",
            json!({ "subject": "Q2", "property": "P397", "object": "Q525" }),
            None,
        ),
        "moon orbits the sun" => (
            "https://www.wikidata.org/wiki/Q405#P397",
            "Wikidata Q405 Moon has parent astronomical body P397 Q2 Earth, and Q2 Earth has parent astronomical body P397 Q525 Sun.",
            json!({
                "subject": "Q405",
                "property": "P397",
                "object": "Q525",
                "path": "Q405>P397>Q2>P397>Q525"
            }),
            Some(json!({
                "phraseMappings": [
                    {
                        "text": "Moon -> Q405",
                        "phrase": "Moon",
                        "role": "subject noun phrase",
                        "wikidataId": "Q405",
                        "sourceUrl": "https://www.wikidata.org/wiki/Q405"
                    },
                    {
                        "text": "orbits -> P397",
                        "phrase": "orbits",
                        "role": "verb phrase",
                        "wikidataId": "P397",
                        "sourceUrl": "https://www.wikidata.org/wiki/Property:P397"
                    },
                    {
                        "text": "Sun -> Q525",
                        "phrase": "Sun",
                        "role": "object noun phrase",
                        "wikidataId": "Q525",
                        "sourceUrl": "https://www.wikidata.org/wiki/Q525"
                    }
                ],
                "reasoningSteps": [
                    {
                        "text": "Q405 Moon -> P397 -> Q2 Earth",
                        "sourceUrl": "https://www.wikidata.org/wiki/Q405#P397"
                    },
                    {
                        "text": "Q2 Earth -> P397 -> Q525 Sun",
                        "sourceUrl": "https://www.wikidata.org/wiki/Q2#P397"
                    }
                ],
                "orbitPath": [
                    { "id": "Q405", "label": "Moon" },
                    { "id": "Q2", "label": "Earth" },
                    { "id": "Q525", "label": "Sun" }
                ]
            })),
        ),
        "elon musk is alive" => (
            "https://www.wikidata.org/wiki/Q317521#P570",
            "Wikidata Q317521 identifies Elon Musk as a human born in 1971 and does not expose a date of death (P570) statement in the captured entity data.",
            json!({ "subject": "Q317521", "property": "P570", "object": "missing" }),
            None,
        ),
        "paris is the capital of france" => (
            "https://www.wikidata.org/wiki/Q142#P36",
            "Wikidata Q142 France has capital P36 with value Q90 Paris.",
            json!({ "subject": "Q142", "property": "P36", "object": "Q90" }),
            None,
        ),
        _ => return None,
    };

    Some(EvidenceItem {
        id: format!("{}-evidence-1", safe_reference(normalized)),
        key: normalized.to_string(),
        polarity: "support".to_string(),
        weight: 1.0,
        source_type: "wikidata".to_string(),
        situation: "wikidata-structured-claim".to_string(),
        source_url: Some(source_url.to_string()),
        retrieved_at: "2026-04-26".to_string(),
        claim: claim.to_string(),
        identifiers,
        context,
        score: None,
    })
}

fn evidence_score(residual: bool) -> Value {
    json!({
        "situationId": "wikidata-structured-claim",
        "label": "Wikidata structured statement",
        "probability": if residual { 0.26 } else { 0.74 },
        "baseWeight": 1,
        "residual": residual
    })
}

fn calculation_evidence(evidence: &EvidenceItem) -> Value {
    json!({
        "id": evidence.id,
        "polarity": evidence.polarity,
        "sourceType": evidence.source_type,
        "sourceUrl": evidence.source_url,
        "weight": evidence.weight,
        "situationId": "wikidata-structured-claim",
        "situationLabel": "Wikidata structured statement",
        "situationProbability": evidence.score.as_ref().and_then(|score| score["probability"].as_f64()),
        "residual": evidence.score.as_ref().and_then(|score| score["residual"].as_bool()).unwrap_or(false),
        "claim": evidence.claim
    })
}

#[derive(Clone)]
struct KnownClaim {
    interpretation_kind: &'static str,
    paraphrase: &'static str,
    examples: &'static [&'static str],
    expression_type: &'static str,
    wikidata: Value,
}

fn known_claim(input: &str) -> Option<KnownClaim> {
    match normalize_key(input).as_str() {
        "earth orbits the sun" => Some(KnownClaim {
            interpretation_kind: "wikidata-astronomy-claim",
            paraphrase: "Earth has the Sun as its parent astronomical body.",
            examples: &["Earth -> parent astronomical body -> Sun"],
            expression_type: "wikidata-claim",
            wikidata: json!({ "subject": "Q2", "property": "P397", "object": "Q525" }),
        }),
        "moon orbits the sun" => Some(KnownClaim {
            interpretation_kind: "wikidata-astronomy-chain-claim",
            paraphrase: "The Moon reaches the Sun through the parent astronomical body chain Moon -> Earth -> Sun.",
            examples: &["Moon -> parent astronomical body -> Earth -> Sun"],
            expression_type: "wikidata-claim",
            wikidata: json!({
                "subject": "Q405",
                "property": "P397",
                "object": "Q525",
                "path": ["Q405", "Q2", "Q525"]
            }),
        }),
        "elon musk is alive" => Some(KnownClaim {
            interpretation_kind: "wikidata-person-liveness-claim",
            paraphrase: "Elon Musk is a person whose Wikidata item has no date of death statement in the captured data.",
            examples: &["Elon Musk -> date of death -> missing"],
            expression_type: "wikidata-person-liveness-claim",
            wikidata: json!({ "subject": "Q317521", "property": "P570", "object": "missing" }),
        }),
        _ => None,
    }
}

fn algorithm_provenance(method: &str) -> LinkProvenance {
    LinkProvenance {
        source_type: "algorithm".to_string(),
        method: Some(method.to_string()),
        source_url: None,
        retrieved_at: None,
    }
}

fn evidence_provenance(evidence: &EvidenceItem) -> LinkProvenance {
    LinkProvenance {
        source_type: evidence.source_type.clone(),
        method: None,
        source_url: evidence.source_url.clone(),
        retrieved_at: Some(evidence.retrieved_at.clone()),
    }
}

fn summarize_link_value(link: &LinkRecord) -> String {
    let value = &link.value;
    if value.is_null() {
        return safe_reference(&link.role);
    }
    if let Some(text) = value.as_str() {
        return to_lino_text(text);
    }
    if let Some(number) = value.as_f64() {
        return to_lino_text(&format_number(number));
    }
    for key in ["relation", "text", "paraphrase", "claim", "kind"] {
        if let Some(text) = value[key].as_str() {
            return if key == "relation" || key == "kind" {
                safe_reference(text)
            } else {
                to_lino_text(text)
            };
        }
    }
    if let Some(expression_type) = value["expression"]["type"].as_str() {
        return safe_reference(expression_type);
    }
    safe_reference(&link.role)
}

fn to_lino_text(value: &str) -> String {
    format!(
        "({})",
        value
            .replace(['(', ')'], " ")
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    )
}

fn normalize_input(input: &str) -> Result<String, String> {
    let text = input.split_whitespace().collect::<Vec<_>>().join(" ");
    if text.is_empty() {
        Err("Statement input cannot be empty.".to_string())
    } else {
        Ok(text)
    }
}

fn normalize_key(input: &str) -> String {
    input
        .trim()
        .to_lowercase()
        .chars()
        .map(|ch| if ch.is_alphanumeric() { ch } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn is_self_referential_false_statement(input: &str) -> bool {
    matches!(
        normalize_key(input).as_str(),
        "this statement is false" | "this sentence is false" | "this is false statement"
    )
}

fn safe_reference(value: &str) -> String {
    let mut out = String::new();
    let mut last_dash = false;
    for ch in value.trim().to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' {
            out.push(ch);
            last_dash = false;
        } else if !last_dash && !out.is_empty() {
            out.push('-');
            last_dash = true;
        }
    }
    while out.ends_with('-') {
        out.pop();
    }
    if out.is_empty() {
        "value".to_string()
    } else {
        out
    }
}

fn format_number(value: f64) -> String {
    if value.fract() == 0.0 {
        format!("{}", value as i64)
    } else {
        value.to_string()
    }
}
