const stepRoles = Object.freeze({
  disambiguation: ['meaning'],
  selection: ['selection'],
  formalization: ['formalization', 'expression-part', 'depends-on'],
  evidence: ['evidence', 'reasoning-step', 'support', 'refute'],
  result: ['result'],
});

export const reasoningStrategies = Object.freeze({
  'disambiguation-first': Object.freeze({
    id: 'disambiguation-first',
    name: 'Disambiguation first',
    summary:
      'Map the largest possible phrases to Wikidata Q/P ids, then formalize, then evaluate evidence.',
    order: Object.freeze([
      'disambiguation',
      'selection',
      'formalization',
      'evidence',
      'result',
    ]),
  }),
  'evidence-first': Object.freeze({
    id: 'evidence-first',
    name: 'Evidence first',
    summary:
      'Look up evidence early to detect contradictions, then disambiguate and formalize the selected interpretation.',
    order: Object.freeze([
      'evidence',
      'disambiguation',
      'selection',
      'formalization',
      'result',
    ]),
  }),
  'formalization-first': Object.freeze({
    id: 'formalization-first',
    name: 'Formalization first',
    summary:
      'Try to formalize the statement before evaluating evidence; useful for arithmetic-style statements.',
    order: Object.freeze([
      'selection',
      'formalization',
      'disambiguation',
      'evidence',
      'result',
    ]),
  }),
});

export const defaultReasoningStrategyId = 'disambiguation-first';

export function getReasoningStrategy(strategyId) {
  return (
    reasoningStrategies[strategyId] ??
    reasoningStrategies[defaultReasoningStrategyId]
  );
}

export function listReasoningStrategies() {
  return Object.values(reasoningStrategies).map((strategy) => ({
    ...strategy,
    order: [...strategy.order],
  }));
}

export function classifyReasoningPhase(role) {
  for (const [phase, roles] of Object.entries(stepRoles)) {
    if (roles.includes(role)) {
      return phase;
    }
  }
  return 'context';
}

export function orderReasoningSteps(links, strategyId) {
  const strategy = getReasoningStrategy(strategyId);
  const phaseIndex = new Map(
    strategy.order.map((phase, index) => [phase, index])
  );
  const annotated = links.map((link, originalIndex) => ({
    link,
    originalIndex,
    phase: classifyReasoningPhase(link.role),
  }));
  const contextRank = strategy.order.length + 1;

  return annotated
    .sort((a, b) => {
      const rankA = phaseIndex.has(a.phase)
        ? phaseIndex.get(a.phase)
        : contextRank;
      const rankB = phaseIndex.has(b.phase)
        ? phaseIndex.get(b.phase)
        : contextRank;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.originalIndex - b.originalIndex;
    })
    .map(({ link, phase }, index) => ({
      ...link,
      reasoningPhase: phase,
      executionOrder: index + 1,
    }));
}
