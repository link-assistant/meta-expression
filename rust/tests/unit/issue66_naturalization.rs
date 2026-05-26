use meta_expression_core::{deformalize_formal_expression, naturalize_formal_expression};

#[test]
fn naturalizes_links_notation_claims_back_to_text() {
    let expression = "(claim: subject (OpenAI) predicate (creates) object (useful tools))";

    assert_eq!(
        naturalize_formal_expression(expression),
        "OpenAI creates useful tools"
    );
}

#[test]
fn deformalization_is_alias_for_formal_expression_naturalization() {
    let expression = "(claim: subject (OpenAI) predicate (creates) object (useful tools))";

    assert_eq!(
        deformalize_formal_expression(expression),
        naturalize_formal_expression(expression)
    );
}
