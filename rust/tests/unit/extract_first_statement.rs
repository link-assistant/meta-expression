use meta_expression_core::extract_first_statement;

#[test]
fn extracts_first_statement_from_multi_paragraph_extract() {
    let text = "Hello world. Second sentence.\n\nNext paragraph that should not appear.";
    assert_eq!(extract_first_statement(text), "Hello world.");
}

#[test]
fn drops_parenthetical_glosses_from_leading_statement() {
    let text = "Артемида-2 (англ. Artemis II) — миссия по пилотируемому облёту Луны.";
    assert_eq!(
        extract_first_statement(text),
        "Артемида-2 — миссия по пилотируемому облёту Луны."
    );
}

#[test]
fn returns_empty_statement_for_blank_text() {
    assert_eq!(extract_first_statement(""), "");
    assert_eq!(extract_first_statement("   \n\n  "), "");
}
