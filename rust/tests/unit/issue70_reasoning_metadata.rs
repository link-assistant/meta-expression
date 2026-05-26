use meta_expression_core::extract_linguistic_metadata;

#[test]
fn linguistic_metadata_has_parser_cst_and_artifact_provenance() {
    let metadata = extract_linguistic_metadata("OpenAI creates useful tools.");
    let subject = metadata
        .fragments
        .iter()
        .find(|fragment| fragment.role == "subject")
        .expect("subject fragment should be extracted");
    let predicate = metadata
        .fragments
        .iter()
        .find(|fragment| fragment.role == "predicate")
        .expect("predicate fragment should be extracted");
    let object = metadata
        .fragments
        .iter()
        .find(|fragment| fragment.role == "object")
        .expect("object fragment should be extracted");
    let sentence = metadata
        .ast
        .first()
        .expect("a sentence AST node should be extracted");

    assert_eq!(metadata.version, 1);
    assert_eq!(metadata.parser.id, "meta-expression-linguistic-parser");
    assert_eq!(metadata.parser.version, 1);
    assert_eq!(metadata.provenance.parser_id, metadata.parser.id);
    assert_eq!(metadata.cst.kind, "document-cst");
    assert_eq!(metadata.cst.parser, metadata.parser);
    assert_eq!(
        metadata
            .cst
            .tokens
            .iter()
            .map(|token| token.text.as_str())
            .collect::<Vec<_>>(),
        vec!["OpenAI", "creates", "useful", "tools"]
    );
    assert_eq!(metadata.cst.sentences[0].predicate_token, Some(1));

    assert_eq!(subject.text, "OpenAI");
    assert_eq!(predicate.text, "creates");
    assert_eq!(object.text, "useful tools");
    assert_eq!(sentence.version, 1);
    assert_eq!(sentence.provenance.parser_id, metadata.parser.id);
    assert_eq!(
        sentence.subject_fragment_id.as_deref(),
        Some(subject.id.as_str())
    );
    assert_eq!(
        sentence.predicate_fragment_id.as_deref(),
        Some(predicate.id.as_str())
    );
    assert_eq!(
        sentence.object_fragment_id.as_deref(),
        Some(object.id.as_str())
    );

    assert!(metadata.fragments.iter().all(|fragment| {
        fragment.version == 1 && fragment.provenance.parser_id == metadata.parser.id
    }));
    assert!(metadata.dependencies.iter().all(|dependency| {
        dependency.version == 1
            && dependency.source == metadata.parser.id
            && dependency.provenance.parser_id == metadata.parser.id
    }));
    assert!(metadata.relations.iter().all(|relation| {
        relation.version == 1 && relation.provenance.parser_id == metadata.parser.id
    }));
}
