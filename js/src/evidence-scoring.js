import {
  getPreferenceEvidenceSituationProbability,
  preferenceEvidenceSituationDefinitions,
} from './preferences.js';

const fallbackRealWorldUncertainty = 0.01;

export function scoreEvidenceItems(evidenceItems, options = {}) {
  const beliefSystem = options.beliefSystem ?? options.defaultBeliefSystem;
  const weightedEvidence = applySourceWeights(
    applyEvidenceSituationScoring(evidenceItems, options),
    beliefSystem
  );
  const confidence = computeEvidenceConfidence(weightedEvidence);
  const realWorldUncertainty =
    options.realWorldUncertainty ??
    beliefSystem?.realWorldUncertainty ??
    options.defaultRealWorldUncertainty ??
    fallbackRealWorldUncertainty;
  const boundedConfidence = boundRealWorldConfidence(
    confidence.confidence,
    realWorldUncertainty
  );

  return {
    weightedEvidence,
    confidence,
    boundedConfidence,
    calculation: createEvidenceCalculation(
      weightedEvidence,
      confidence,
      boundedConfidence,
      beliefSystem,
      realWorldUncertainty
    ),
  };
}

export function computeEvidenceConfidence(evidenceItems) {
  const totals = evidenceItems.reduce(
    (accumulator, evidence) => {
      const weight = Number(evidence.weight ?? 0);
      if (evidence.polarity === 'support') {
        accumulator.support += weight;
      } else if (evidence.polarity === 'refute') {
        accumulator.refute += weight;
      }
      return accumulator;
    },
    { support: 0, refute: 0 }
  );
  const total = totals.support + totals.refute;

  if (total === 0) {
    return {
      confidence: null,
      rawBalance: null,
      supportWeight: 0,
      refuteWeight: 0,
    };
  }

  return {
    confidence: clamp(totals.support / total, 0, 1),
    rawBalance: clamp((totals.support - totals.refute) / total, -1, 1),
    supportWeight: totals.support,
    refuteWeight: totals.refute,
  };
}

function applySourceWeights(evidenceItems, beliefSystem) {
  return evidenceItems.map((evidence) => {
    const sourceWeight = Number(
      beliefSystem?.sourceWeights?.[evidence.sourceType] ?? 1
    );
    return {
      ...evidence,
      weight: Number(evidence.weight ?? 0) * sourceWeight,
    };
  });
}

function applyEvidenceSituationScoring(evidenceItems, options) {
  return evidenceItems.flatMap((evidence) => {
    const situationId = evidence.situation?.id ?? evidence.situation;
    if (!situationId) {
      return [evidence];
    }

    const probability = evidenceSituationProbability(situationId, options);
    if (!Number.isFinite(probability)) {
      return [evidence];
    }

    const clampedProbability = clamp(probability, 0, 1);
    const baseWeight = Number(evidence.weight ?? 1);
    const normalizedBaseWeight = Number.isFinite(baseWeight) ? baseWeight : 0;
    const label = evidenceSituationLabel(situationId);
    const score = {
      situationId,
      label,
      probability: clampedProbability,
      baseWeight: normalizedBaseWeight,
    };
    const mainEvidence = {
      ...evidence,
      weight: normalizedBaseWeight * clampedProbability,
      score,
    };
    const residualWeight = normalizedBaseWeight * (1 - clampedProbability);
    if (residualWeight <= 0) {
      return [mainEvidence];
    }

    return [
      mainEvidence,
      {
        ...evidence,
        id: `${evidence.id ?? safeReference(evidence.claim)}-residual`,
        polarity: oppositePolarity(evidence.polarity),
        weight: residualWeight,
        claim: `Residual uncertainty from configured "${label}" probability (${Math.round(
          clampedProbability * 100
        )}%) for: ${evidence.claim}`,
        identifiers: {
          ...(evidence.identifiers ?? {}),
          residual: 'uncertainty',
        },
        context: {
          reasoningSteps: [
            {
              text: `Configured "${label}" situation probability leaves ${Math.round(
                (1 - clampedProbability) * 100
              )}% residual uncertainty.`,
              sourceUrl: evidence.sourceUrl,
            },
          ],
        },
        score: {
          ...score,
          residual: true,
          probability: 1 - clampedProbability,
        },
      },
    ];
  });
}

function evidenceSituationProbability(situationId, options) {
  const explicit = Number(options.evidenceScoring?.[situationId]);
  if (Number.isFinite(explicit)) {
    return explicit;
  }
  const beliefSystemValue = Number(
    options.beliefSystem?.evidenceScoring?.[situationId]
  );
  if (Number.isFinite(beliefSystemValue)) {
    return beliefSystemValue;
  }
  return getPreferenceEvidenceSituationProbability(
    options.preferenceProfile,
    situationId
  );
}

function evidenceSituationLabel(situationId) {
  return (
    preferenceEvidenceSituationDefinitions.find(
      (definition) => definition.id === situationId
    )?.label ?? situationId
  );
}

function oppositePolarity(polarity) {
  return polarity === 'support' ? 'refute' : 'support';
}

function boundRealWorldConfidence(confidence, uncertainty) {
  if (confidence === null) {
    return null;
  }
  const parsed = Number(uncertainty);
  const epsilon = Number.isFinite(parsed)
    ? clamp(parsed, 0, 0.49)
    : fallbackRealWorldUncertainty;
  return clamp(confidence, epsilon, 1 - epsilon);
}

function createEvidenceCalculation(
  weightedEvidence,
  confidence,
  boundedConfidence,
  beliefSystem,
  realWorldUncertainty
) {
  return {
    strategy: beliefSystem?.probabilityStrategy ?? 'weighted-support-ratio',
    supportWeight: confidence.supportWeight,
    refuteWeight: confidence.refuteWeight,
    rawConfidence: confidence.confidence,
    boundedConfidence,
    realWorldUncertainty,
    evidence: weightedEvidence.map((evidence) => ({
      id: evidence.id,
      polarity: evidence.polarity,
      sourceType: evidence.sourceType,
      sourceUrl: evidence.sourceUrl,
      weight: evidence.weight,
      situationId: evidence.score?.situationId ?? evidence.situation ?? null,
      situationLabel: evidence.score?.label ?? null,
      situationProbability: evidence.score?.probability ?? null,
      residual: evidence.score?.residual === true,
      claim: evidence.claim,
    })),
  };
}

function safeReference(value) {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'value'
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
