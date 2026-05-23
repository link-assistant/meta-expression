use meta_expression_core::meta_expression_weighted_support_ratio;

#[test]
fn weighted_support_ratio_extern_matches_safe_helper() {
    let ratio = meta_expression_weighted_support_ratio(1.0, 0.0, 0.01);
    assert!((ratio - 0.99).abs() < 1e-9);
    let opposite = meta_expression_weighted_support_ratio(0.0, 1.0, 0.01);
    assert!((opposite - 0.01).abs() < 1e-9);
}

#[test]
fn weighted_support_ratio_extern_returns_nan_when_undefined() {
    let result = meta_expression_weighted_support_ratio(0.0, 0.0, 0.01);
    assert!(result.is_nan());
}
