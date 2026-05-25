const defaultTruthRange = Object.freeze([0, 1]);

export function normalizeTruthValue(value, options = {}) {
  const truthRange = normalizeTruthRange(options.truthRange);
  const valence = normalizeValence(options.valence);
  const truthValue = finiteNumber(value);
  const probability =
    truthValue === null
      ? null
      : quantizeProbability(
          clamp(
            (truthValue - truthRange[0]) / (truthRange[1] - truthRange[0]),
            0,
            1
          ),
          valence
        );

  return {
    truthValue,
    truthRange,
    valence,
    probability,
    correctness: probability,
    signedConfidence: probability === null ? null : 2 * probability - 1,
  };
}

export function createProbabilityCalculation(options = {}) {
  const truthRange = normalizeTruthRange(options.truthRange);
  const valence = normalizeValence(options.valence);
  const truthValue = finiteNumber(
    options.truthValue ??
      denormalizeProbability(options.probability, truthRange)
  );
  const normalized = normalizeTruthValue(truthValue, { truthRange, valence });
  const probability =
    normalized.probability ?? finiteNumber(options.probability);
  const correctness = probability;

  return {
    strategy: options.strategy ?? 'truth-value-normalization',
    truthValue,
    truthRange,
    valence,
    probability,
    correctness,
    signedConfidence: probability === null ? null : 2 * probability - 1,
    deterministic: options.deterministic === true,
    bounded: options.bounded === true,
    inputs: Array.isArray(options.inputs) ? options.inputs : [],
    evidence: [],
    ...options.extra,
  };
}

function normalizeTruthRange(range = defaultTruthRange) {
  const lo = finiteNumber(range?.[0]) ?? 0;
  const hi = finiteNumber(range?.[1]) ?? 1;
  if (lo === hi) {
    return [...defaultTruthRange];
  }
  return lo < hi ? [lo, hi] : [hi, lo];
}

function normalizeValence(value) {
  const valence = finiteNumber(value);
  return valence === null ? 0 : Math.max(0, Math.trunc(valence));
}

function quantizeProbability(probability, valence) {
  if (valence <= 1 || probability === null) {
    return probability;
  }
  const steps = valence - 1;
  return Math.round(probability * steps) / steps;
}

function denormalizeProbability(probability, truthRange) {
  const value = finiteNumber(probability);
  if (value === null) {
    return null;
  }
  return truthRange[0] + clamp(value, 0, 1) * (truthRange[1] - truthRange[0]);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
