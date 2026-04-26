use doublets::Doublet;

const REAL_WORLD_EPSILON: f64 = 0.01;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StatementTemplate {
    ArithmeticEquality,
    ArithmeticQuestion,
    PersonLiveness,
    Capital,
    Orbit,
    Unknown,
}

impl StatementTemplate {
    pub const fn code(self) -> u32 {
        match self {
            Self::ArithmeticEquality => 1,
            Self::ArithmeticQuestion => 2,
            Self::PersonLiveness => 3,
            Self::Capital => 4,
            Self::Orbit => 5,
            Self::Unknown => 0,
        }
    }
}

pub fn classify_statement(input: &str) -> StatementTemplate {
    let normalized = normalize_text(input);

    if is_arithmetic_equality(&normalized) {
        return StatementTemplate::ArithmeticEquality;
    }
    if is_arithmetic_question(&normalized) {
        return StatementTemplate::ArithmeticQuestion;
    }
    if normalized.ends_with(" is alive") || normalized.ends_with(" is dead") {
        return StatementTemplate::PersonLiveness;
    }
    if normalized.contains(" is the capital of ") || normalized.contains(" is capital of ") {
        return StatementTemplate::Capital;
    }
    if normalized.contains(" orbits ") {
        return StatementTemplate::Orbit;
    }

    StatementTemplate::Unknown
}

pub fn bounded_weighted_support_ratio(
    support_weight: f64,
    refute_weight: f64,
    uncertainty: f64,
) -> Option<f64> {
    let total = support_weight + refute_weight;
    if total <= 0.0 || !total.is_finite() {
        return None;
    }

    let epsilon = if uncertainty.is_finite() {
        uncertainty.clamp(0.0, 0.49)
    } else {
        REAL_WORLD_EPSILON
    };
    Some((support_weight / total).clamp(epsilon, 1.0 - epsilon))
}

pub fn relation_doublet(source: u64, target: u64) -> Doublet<u64> {
    Doublet::new(source, target)
}

#[no_mangle]
pub extern "C" fn meta_expression_weighted_support_ratio(
    support_weight: f64,
    refute_weight: f64,
    uncertainty: f64,
) -> f64 {
    bounded_weighted_support_ratio(support_weight, refute_weight, uncertainty).unwrap_or(f64::NAN)
}

#[no_mangle]
pub extern "C" fn meta_expression_relation_source(source: u64, target: u64) -> u64 {
    relation_doublet(source, target).source
}

#[no_mangle]
pub extern "C" fn meta_expression_relation_target(source: u64, target: u64) -> u64 {
    relation_doublet(source, target).target
}

fn normalize_text(input: &str) -> String {
    input
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn is_arithmetic_equality(input: &str) -> bool {
    let mut parts = input.split('=');
    let left = parts.next().unwrap_or_default().trim();
    let right = parts.next().unwrap_or_default().trim();

    parts.next().is_none() && is_binary_arithmetic(left) && is_number(right)
}

fn is_arithmetic_question(input: &str) -> bool {
    is_binary_arithmetic(input.trim_end_matches('?').trim())
}

fn is_binary_arithmetic(input: &str) -> bool {
    let parts = input.split_whitespace().collect::<Vec<_>>();
    parts.len() == 3
        && is_number(parts[0])
        && matches!(parts[1], "+" | "-" | "*" | "/")
        && is_number(parts[2])
}

fn is_number(value: &str) -> bool {
    value.parse::<f64>().is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn bounds_real_world_confidence() {
        assert_eq!(bounded_weighted_support_ratio(1.0, 0.0, 0.01), Some(0.99));
        assert_eq!(bounded_weighted_support_ratio(0.0, 1.0, 0.01), Some(0.01));
        assert_eq!(bounded_weighted_support_ratio(0.0, 0.0, 0.01), None);
    }

    #[test]
    fn encodes_relation_as_doublet() {
        let relation = relation_doublet(10, 20);

        assert_eq!(relation.source, 10);
        assert_eq!(relation.target, 20);
    }
}
