use meta_expression_core::{classify_statement, StatementTemplate};

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
fn statement_template_codes_round_trip() {
    assert_eq!(StatementTemplate::ArithmeticEquality.code(), 1);
    assert_eq!(StatementTemplate::ArithmeticQuestion.code(), 2);
    assert_eq!(StatementTemplate::PersonLiveness.code(), 3);
    assert_eq!(StatementTemplate::Capital.code(), 4);
    assert_eq!(StatementTemplate::Orbit.code(), 5);
    assert_eq!(StatementTemplate::Unknown.code(), 0);
}
