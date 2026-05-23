use meta_expression_core::bounded_weighted_support_ratio;

#[test]
fn bounds_real_world_confidence() {
    assert_eq!(bounded_weighted_support_ratio(1.0, 0.0, 0.01), Some(0.99));
    assert_eq!(bounded_weighted_support_ratio(0.0, 1.0, 0.01), Some(0.01));
    assert_eq!(bounded_weighted_support_ratio(0.0, 0.0, 0.01), None);
}

#[test]
fn returns_none_when_total_weight_is_not_finite() {
    assert!(bounded_weighted_support_ratio(f64::INFINITY, 0.0, 0.01).is_none());
    assert!(bounded_weighted_support_ratio(0.0, f64::NAN, 0.01).is_none());
}

#[test]
fn caps_uncertainty_below_one_half() {
    let high_uncertainty = bounded_weighted_support_ratio(1.0, 0.0, 1.0).unwrap();
    assert!((high_uncertainty - 0.51).abs() < 1e-9);
}
