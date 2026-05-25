use wasm_bindgen::prelude::*;

fn to_json<T: serde::Serialize>(value: T) -> Result<String, JsValue> {
    serde_json::to_string(&value).map_err(|error| JsValue::from_str(&error.to_string()))
}

fn index(value: u32) -> usize {
    usize::try_from(value).unwrap_or(usize::MAX)
}

#[wasm_bindgen(js_name = createStatementDraftJson)]
pub fn create_statement_draft_json(input: &str) -> Result<String, JsValue> {
    to_json(crate::create_statement_draft(input).map_err(|error| JsValue::from_str(&error))?)
}

#[wasm_bindgen(js_name = selectInterpretationJson)]
pub fn select_interpretation_json(
    input: &str,
    interpretation_index: u32,
) -> Result<String, JsValue> {
    to_json(
        crate::select_interpretation(input, index(interpretation_index))
            .map_err(|error| JsValue::from_str(&error))?,
    )
}

#[wasm_bindgen(js_name = formalizeStatementJson)]
pub fn formalize_statement_json(input: &str, interpretation_index: u32) -> Result<String, JsValue> {
    to_json(
        crate::formalize_statement(input, index(interpretation_index))
            .map_err(|error| JsValue::from_str(&error))?,
    )
}

#[wasm_bindgen(js_name = evaluateStatementJson)]
pub fn evaluate_statement_json(input: &str, interpretation_index: u32) -> Result<String, JsValue> {
    to_json(
        crate::evaluate_statement(input, index(interpretation_index))
            .map_err(|error| JsValue::from_str(&error))?,
    )
}

#[wasm_bindgen(js_name = analyzeStatementJson)]
pub fn analyze_statement_json(input: &str, interpretation_index: u32) -> Result<String, JsValue> {
    to_json(
        crate::analyze_statement(input, index(interpretation_index))
            .map_err(|error| JsValue::from_str(&error))?,
    )
}

#[wasm_bindgen(js_name = statementConfidence)]
pub fn statement_confidence(input: &str, interpretation_index: u32) -> Result<f64, JsValue> {
    Ok(
        crate::statement_confidence(input, index(interpretation_index))
            .map_err(|error| JsValue::from_str(&error))?
            .unwrap_or(f64::NAN),
    )
}

#[wasm_bindgen(js_name = serializeLinksNotation)]
pub fn serialize_links_notation(input: &str, interpretation_index: u32) -> Result<String, JsValue> {
    crate::serialize_statement_links_notation(input, index(interpretation_index))
        .map_err(|error| JsValue::from_str(&error))
}

#[wasm_bindgen(js_name = translateKnownSemanticTextJson)]
pub fn translate_known_semantic_text_json(
    input: &str,
    source_language: &str,
    target_language: &str,
) -> Result<String, JsValue> {
    let translation = crate::translate_known_semantic_text(input, source_language, target_language)
        .ok_or_else(|| JsValue::from_str("No known semantic translation for input."))?;
    to_json(translation)
}

#[wasm_bindgen(js_name = naturalizeFormalExpression)]
pub fn naturalize_formal_expression(input: &str) -> String {
    crate::naturalize_formal_expression(input)
}

#[wasm_bindgen(js_name = deformalizeFormalExpression)]
pub fn deformalize_formal_expression(input: &str) -> String {
    crate::deformalize_formal_expression(input)
}
