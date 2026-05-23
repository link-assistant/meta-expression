use meta_expression_core::token_coverage;

#[test]
fn computes_token_coverage_as_overlap_ratio() {
    let coverage = token_coverage(
        "Find synonyms of agreement",
        "You can find synonyms here and search for examples of agreement",
    );
    assert!(coverage.ratio > 0.6);
    assert!(coverage.missing.is_empty());
    assert!(coverage.found.iter().any(|t| t == "synonyms"));
    assert!(coverage.found.iter().any(|t| t == "agreement"));
}

#[test]
fn reports_zero_coverage_for_disjoint_text() {
    let coverage = token_coverage("alpha beta gamma", "дельта эпсилон зета");
    assert_eq!(coverage.ratio, 0.0);
    assert_eq!(coverage.missing, vec!["alpha", "beta", "gamma"]);
}
