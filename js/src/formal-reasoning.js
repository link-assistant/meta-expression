import {
  Link,
  Parser as LinksNotationParser,
  formatLinks,
} from 'links-notation';
import {
  createProbabilityCalculation,
  normalizeTruthValue,
} from './probability.js';

const parser = new LinksNotationParser();
const rmlSourceUrl = 'https://github.com/link-foundation/relative-meta-logic';
const formalRelationIds = new Set(['entails', 'implies']);

export function isFormalReasoningInput(input) {
  const text = String(input ?? '').trim();
  return (
    text.startsWith('(') &&
    (/\(\s*\?(\s|\()/u.test(text) ||
      /\bhas\s+probability\b/iu.test(text) ||
      /^\(\s*(entails|contradicts|depends-on|implies|not)\b/iu.test(text))
  );
}

export function summarizeFormalReasoningProgram(input) {
  const parsed = parseFormalProgram(input);
  return {
    query: parsed.query ? formatTerm(parsed.query) : null,
    dependencies: parsed.rules.map((rule) => ({
      source: formatTerm(rule.source),
      target: formatTerm(rule.target),
      relation: rule.relation,
    })),
    facts: parsed.facts.map((fact) => ({
      statement: formatTerm(fact.term),
      probability: fact.probability,
    })),
  };
}

export function createFormalReasoningInterpretations(
  text,
  formalizationLevels
) {
  return [
    {
      kind: 'formal-reasoning-program',
      paraphrase:
        'Evaluate the formal Links Notation statements with the relative-meta-logic adapter.',
      examples: ['(? (p = true))', '((p = true) has probability 1)'],
      confidence: 0.95,
      source: 'relative-meta-logic-adapter',
      formalizationLevel: formalizationLevels.FULLY_COMPUTABLE_EXPRESSION,
    },
    {
      kind: 'quoted-text',
      paraphrase: 'Preserve the formal input as text without evaluating it.',
      examples: ['Useful for documentation or later refinement'],
      confidence: 0.2,
      source: 'deterministic-rule',
      formalizationLevel: formalizationLevels.RAW_TEXT,
    },
  ];
}

export function createFormalReasoningFormalization(text, level) {
  const summary = summarizeFormalReasoningProgram(text);
  return {
    level,
    computable: true,
    expression: {
      type: 'formal-reasoning-program',
      program: text,
      query: summary.query,
      dependencies: summary.dependencies,
      facts: summary.facts,
    },
    unknowns: [],
    refinementSuggestions: [],
  };
}

export function reasonFormalStatements(input, options = {}) {
  const program = normalizeProgramInput(input);
  const engine = resolveRelativeMetaLogicEngine(options);
  const evaluated = evaluateWithEngine(engine, program, options);
  const local = evaluated.formalReasoning
    ? evaluated
    : evaluateFormalProgramLocally(program);
  const proof = proveWithEngine(engine, local.formalReasoning);
  const trace = [...(local.trace ?? []), ...proof.trace];
  const calculation =
    local.formalReasoning.calculation ??
    createFormalProbabilityCalculation(local.formalReasoning);

  return {
    kind: 'formal-reasoning',
    engine: {
      name: 'relative-meta-logic',
      mode: engine.mode,
      sourceUrl: rmlSourceUrl,
    },
    program,
    query: local.formalReasoning.query,
    value: local.formalReasoning.value,
    confidence: local.formalReasoning.confidence,
    correctness: local.formalReasoning.confidence,
    signedConfidence: confidenceToSigned(local.formalReasoning.confidence),
    rawBalance: confidenceToSigned(local.formalReasoning.confidence),
    probability: local.formalReasoning.confidence,
    calculation,
    dependencies: local.formalReasoning.dependencies,
    relations: local.formalReasoning.relations,
    facts: local.formalReasoning.facts,
    diagnostics: [...(evaluated.diagnostics ?? []), ...proof.diagnostics],
    trace,
    proof,
    evaluation: {
      results: evaluated.results ?? local.results,
      diagnostics: evaluated.diagnostics ?? [],
    },
  };
}

export function formalReasoningToEvaluationResult(reasoning) {
  const value = reasoning.value;
  const evidence = createFormalReasoningEvidence(reasoning);
  const supports = value === true ? [evidence] : [];
  const refutes = value === false ? [evidence] : [];

  return {
    kind: 'computed',
    value,
    actual: value,
    expected: true,
    confidence: reasoning.confidence,
    correctness: reasoning.correctness,
    signedConfidence: reasoning.signedConfidence,
    rawBalance: reasoning.rawBalance,
    probability: reasoning.probability,
    calculation: reasoning.calculation,
    supportingEvidence: supports,
    refutingEvidence: refutes,
    explanation: formalReasoningExplanation(reasoning),
  };
}

function resolveRelativeMetaLogicEngine(options) {
  const provided = options.relativeMetaLogic ?? options.rmlEngine;
  if (provided?.evaluate || provided?.runTactics) {
    return {
      evaluate: provided.evaluate ?? createLocalRmlEngine().evaluate,
      runTactics: provided.runTactics ?? createLocalRmlEngine().runTactics,
      mode: 'provided',
    };
  }
  return createLocalRmlEngine();
}

function createLocalRmlEngine() {
  return {
    mode: 'local-adapter',
    evaluate: (program) => evaluateFormalProgramLocally(program),
    runTactics: runLocalTactics,
  };
}

function evaluateWithEngine(engine, program, options) {
  try {
    return (
      engine.evaluate?.(program, {
        trace: true,
        withProofs: true,
        ...options.relativeMetaLogicOptions,
      }) ?? {}
    );
  } catch (error) {
    return {
      diagnostics: [
        {
          code: 'RML_EVALUATE_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

function evaluateFormalProgramLocally(input) {
  try {
    const parsed = parseFormalProgram(input);
    const state = createReasoningState(parsed);
    const query = parsed.query ?? parsed.forms.at(-1) ?? new Link('unknown');
    const evaluated = evaluateTerm(query, state);
    const confidence =
      evaluated.confidence ?? truthValueConfidence(evaluated.value);
    const truthValue =
      evaluated.truthValue ??
      parsed.logic.truthRange[0] +
        confidence * (parsed.logic.truthRange[1] - parsed.logic.truthRange[0]);
    const contradictions = findContradictions(state);
    const relations = {
      contradictions: [
        ...contradictions,
        ...evaluated.relations.contradictions,
      ],
    };
    const formalReasoning = {
      query: formatTerm(query),
      value: evaluated.value,
      confidence,
      truthValue,
      truthRange: parsed.logic.truthRange,
      valence: parsed.logic.valence,
      dependencies: uniqueDependencies(evaluated.dependencies),
      relations,
      facts: parsed.facts.map((fact) => ({
        statement: formatTerm(fact.term),
        probability: fact.probability,
        truthValue: fact.truthValue,
        truthRange: fact.truthRange,
        valence: fact.valence,
      })),
      queryTerm: query,
    };
    formalReasoning.calculation =
      createFormalProbabilityCalculation(formalReasoning);
    return {
      results: [confidenceToRmlResult(formalReasoning.confidence)],
      diagnostics: [],
      trace: [
        traceEvent(
          'evaluate',
          `relative-meta-logic evaluate() resolved ${formalReasoning.query} as ${String(
            formalReasoning.value
          )}.`
        ),
        ...evaluated.trace,
      ],
      formalReasoning,
    };
  } catch (error) {
    return unknownFormalReasoning(input, error);
  }
}

function parseFormalProgram(input) {
  const program = normalizeProgramInput(input);
  const forms = parser.parse(program);
  const facts = [];
  const rules = [];
  const logic = { truthRange: [0, 1], valence: 0 };
  let query = null;

  for (const [index, form] of forms.entries()) {
    const config = logicConfiguration(form);
    if (config) {
      Object.assign(logic, config);
      continue;
    }

    const assignment = probabilityAssignment(form, logic);
    if (assignment) {
      const relation = relationTerm(assignment.term);
      if (relation && formalRelationIds.has(relation.id)) {
        rules.push({
          id: `formal-rule-${rules.length + 1}`,
          source: relation.args[0],
          target: relation.args[1],
          relation: 'entails',
          probability: assignment.probability,
          truthValue: assignment.truthValue,
          truthRange: assignment.truthRange,
          valence: assignment.valence,
          form,
        });
      } else {
        facts.push({
          id: `formal-fact-${facts.length + 1}`,
          term: assignment.term,
          probability: assignment.probability,
          truthValue: assignment.truthValue,
          truthRange: assignment.truthRange,
          valence: assignment.valence,
          form,
        });
      }
      continue;
    }

    const queryTerm = queryTermFromForm(form);
    if (queryTerm) {
      query = queryTerm;
    } else if (index === forms.length - 1 && forms.length === 1) {
      query = form;
    }
  }

  return { forms, facts, rules, query, logic };
}

function createReasoningState(parsed) {
  const factsByKey = new Map();
  for (const fact of parsed.facts) {
    const key = formatTerm(fact.term);
    const entries = factsByKey.get(key) ?? [];
    entries.push({
      ...fact,
      key,
      truth: probabilityToTruth(fact.probability),
    });
    factsByKey.set(key, entries);
  }
  return {
    factsByKey,
    rules: parsed.rules
      .filter((rule) => probabilityToTruth(rule.probability) === true)
      .map((rule) => ({
        ...rule,
        sourceKey: formatTerm(rule.source),
        targetKey: formatTerm(rule.target),
      })),
  };
}

function evaluateTerm(term, state, assumptions = new Map(), stack = new Set()) {
  const key = formatTerm(term);
  if (stack.has(key)) {
    return unknownTerm(key);
  }
  const nextStack = new Set([...stack, key]);
  const relation = relationTerm(term);
  const relationEvaluation = evaluateFormalRelation(
    relation,
    state,
    assumptions,
    nextStack
  );
  if (relationEvaluation) {
    return relationEvaluation;
  }

  if (isReference(term, 'true')) {
    return knownTerm(true, [], []);
  }
  if (isReference(term, 'false')) {
    return knownTerm(false, [], []);
  }

  const fact = evaluateFact(key, state, assumptions);
  if (fact.value !== 'unknown') {
    return fact;
  }
  if (isReflexiveEquality(term)) {
    return knownTerm(
      true,
      [],
      [traceEvent('runTactics', `Reflexivity closes ${key}.`)]
    );
  }

  return evaluateRulesForTerm(key, state, assumptions, nextStack);
}

function evaluateFormalRelation(relation, state, assumptions, nextStack) {
  if (!relation) {
    return null;
  }
  if (relation.id === 'not') {
    return invertEvaluation(
      evaluateTerm(relation.args[0], state, assumptions, nextStack)
    );
  }
  if (relation.id === 'entails' || relation.id === 'implies') {
    return evaluateEntailment(relation.args[0], relation.args[1], state);
  }
  if (relation.id === 'contradicts') {
    return evaluateContradiction(relation.args[0], relation.args[1], state);
  }
  if (relation.id === 'depends-on') {
    return evaluateDependency(relation.args[0], relation.args[1], state);
  }
  return null;
}

function evaluateRulesForTerm(key, state, assumptions, nextStack) {
  for (const rule of state.rules) {
    if (rule.targetKey !== key) {
      continue;
    }
    const source = evaluateTerm(rule.source, state, assumptions, nextStack);
    if (source.value === true) {
      return knownTerm(
        true,
        [
          ...source.dependencies,
          {
            source: rule.sourceKey,
            target: rule.targetKey,
            relation: rule.relation,
          },
        ],
        [
          ...source.trace,
          traceEvent(
            'evaluate',
            `${rule.targetKey} follows from ${rule.sourceKey}.`
          ),
        ]
      );
    }
  }

  return unknownTerm(key);
}

function evaluateFact(key, state, assumptions) {
  if (assumptions.has(key)) {
    return knownTerm(true, [], []);
  }

  const entries = state.factsByKey.get(key) ?? [];
  const trueEntry = entries.find((entry) => entry.truth === true);
  const falseEntry = entries.find((entry) => entry.truth === false);
  if (trueEntry && falseEntry) {
    return knownTerm(
      'undetermined',
      [],
      [
        traceEvent(
          'evaluate',
          `${key} has conflicting formal probability assignments.`
        ),
      ]
    );
  }
  if (trueEntry) {
    return knownTerm(
      true,
      [{ source: key, target: key, relation: 'asserted' }],
      [traceEvent('evaluate', `${key} is asserted with probability 1.`)],
      {},
      trueEntry.probability,
      trueEntry.truthValue
    );
  }
  if (falseEntry) {
    return knownTerm(
      false,
      [{ source: key, target: key, relation: 'refuted' }],
      [traceEvent('evaluate', `${key} is asserted with probability 0.`)],
      {},
      falseEntry.probability,
      falseEntry.truthValue
    );
  }
  if (entries.length > 0) {
    const probability = average(entries.map((entry) => entry.probability));
    const truthValue = average(entries.map((entry) => entry.truthValue));
    return knownTerm(
      'unknown',
      [{ source: key, target: key, relation: 'asserted-probability' }],
      [
        traceEvent(
          'evaluate',
          `${key} is asserted with reproducible probability ${probability}.`
        ),
      ],
      {},
      probability,
      truthValue
    );
  }
  return unknownTerm(key);
}

function evaluateEntailment(source, target, state) {
  const sourceKey = formatTerm(source);
  const targetKey = formatTerm(target);
  if (sourceKey === targetKey) {
    return knownTerm(
      true,
      [{ source: sourceKey, target: targetKey, relation: 'entails' }],
      [traceEvent('runTactics', `${sourceKey} entails itself.`)]
    );
  }

  const assumptions = new Map([[sourceKey, source]]);
  const targetEvaluation = evaluateTerm(target, state, assumptions);
  if (targetEvaluation.value === true) {
    return knownTerm(
      true,
      uniqueDependencies([
        { source: sourceKey, target: targetKey, relation: 'entails' },
        ...targetEvaluation.dependencies,
      ]),
      targetEvaluation.trace
    );
  }
  return knownTerm(false, [], targetEvaluation.trace);
}

function evaluateContradiction(left, right, state) {
  const leftKey = formatTerm(left);
  const rightKey = formatTerm(right);
  if (areDirectNegations(left, right)) {
    return knownTerm(
      true,
      [],
      [traceEvent('evaluate', `${leftKey} contradicts ${rightKey}.`)],
      { contradictions: [{ left: leftKey, right: rightKey }] }
    );
  }

  const leftImpliesNotRight = evaluateEntailment(
    left,
    new Link(null, [new Link('not'), right]),
    state
  );
  if (leftImpliesNotRight.value === true) {
    return knownTerm(
      true,
      leftImpliesNotRight.dependencies,
      leftImpliesNotRight.trace,
      { contradictions: [{ left: leftKey, right: rightKey }] }
    );
  }
  return knownTerm(false, [], []);
}

function evaluateDependency(target, source, state) {
  const sourceKey = formatTerm(source);
  const targetKey = formatTerm(target);
  const targetEvaluation = evaluateTerm(target, state);
  const depends = targetEvaluation.dependencies.some(
    (dependency) => dependency.source === sourceKey
  );
  return knownTerm(
    depends,
    depends
      ? [{ source: sourceKey, target: targetKey, relation: 'depends-on' }]
      : [],
    targetEvaluation.trace
  );
}

function proveWithEngine(engine, reasoning) {
  if (!reasoning?.queryTerm || reasoning.value !== true) {
    return { closed: false, diagnostics: [], trace: [] };
  }
  try {
    const out = engine.runTactics?.({ goals: [reasoning.queryTerm] }, [
      new Link(null, [new Link('by'), new Link('reflexivity')]),
    ]);
    const diagnostics = out?.diagnostics ?? [];
    return {
      closed: diagnostics.length === 0,
      diagnostics,
      trace: [
        traceEvent(
          'runTactics',
          `relative-meta-logic runTactics() checked ${reasoning.query}.`
        ),
      ],
    };
  } catch (error) {
    return {
      closed: false,
      diagnostics: [
        {
          code: 'RML_TACTIC_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
      trace: [],
    };
  }
}

function runLocalTactics() {
  return { state: { goals: [], proof: [] }, diagnostics: [] };
}

function logicConfiguration(form) {
  if (!isLink(form)) {
    return null;
  }
  if (form.id === 'range' && form.values.length === 2) {
    return {
      truthRange: [
        numericLinkValue(form.values[0]),
        numericLinkValue(form.values[1]),
      ],
    };
  }
  if (form.id === 'valence' && form.values.length === 1) {
    return { valence: numericLinkValue(form.values[0]) };
  }
  return null;
}

function probabilityAssignment(form, logic) {
  if (
    !isLink(form) ||
    form.id !== null ||
    form.values.length !== 4 ||
    !isReference(form.values[1], 'has') ||
    !isReference(form.values[2], 'probability')
  ) {
    return null;
  }
  const truthValue = numericLinkValue(form.values[3]);
  const normalized = normalizeTruthValue(truthValue, logic);
  return {
    term: form.values[0],
    probability: normalized.probability,
    truthValue: normalized.truthValue,
    truthRange: normalized.truthRange,
    valence: normalized.valence,
  };
}

function numericLinkValue(link) {
  return Number(link.id ?? formatTerm(link));
}

function queryTermFromForm(form) {
  if (
    isLink(form) &&
    form.id === null &&
    form.values.length === 2 &&
    isReference(form.values[0], '?')
  ) {
    return form.values[1];
  }
  return null;
}

function relationTerm(term) {
  if (!isLink(term) || term.id !== null || term.values.length === 0) {
    return null;
  }
  const [head, ...args] = term.values;
  if (!isLink(head) || head.id === null || head.values.length > 0) {
    return null;
  }
  return { id: head.id, args };
}

function findContradictions(state) {
  const contradictions = [];
  for (const [key, entries] of state.factsByKey.entries()) {
    if (
      entries.some((entry) => entry.truth === true) &&
      entries.some((entry) => entry.truth === false)
    ) {
      contradictions.push({ left: key, right: key });
    }
  }
  return contradictions;
}

function areDirectNegations(left, right) {
  const leftRelation = relationTerm(left);
  const rightRelation = relationTerm(right);
  return (
    (leftRelation?.id === 'not' &&
      formatTerm(leftRelation.args[0]) === formatTerm(right)) ||
    (rightRelation?.id === 'not' &&
      formatTerm(rightRelation.args[0]) === formatTerm(left))
  );
}

function isReflexiveEquality(term) {
  if (!isLink(term) || term.id !== null || term.values.length !== 3) {
    return false;
  }
  return (
    isReference(term.values[1], '=') && sameTerm(term.values[0], term.values[2])
  );
}

function sameTerm(left, right) {
  return formatTerm(left) === formatTerm(right);
}

function knownTerm(
  value,
  dependencies,
  trace,
  relations = {},
  confidence,
  truthValue
) {
  return {
    value,
    dependencies,
    trace,
    confidence,
    truthValue,
    relations: { contradictions: relations.contradictions ?? [] },
  };
}

function unknownTerm(key) {
  return knownTerm(
    'unknown',
    [],
    [traceEvent('evaluate', `${key} is not entailed by the formal context.`)]
  );
}

function invertEvaluation(evaluation) {
  const value =
    evaluation.value === true
      ? false
      : evaluation.value === false
        ? true
        : evaluation.value;
  const confidence =
    evaluation.confidence === undefined ? undefined : 1 - evaluation.confidence;
  return {
    ...evaluation,
    value,
    confidence,
    truthValue: undefined,
    trace: [
      ...evaluation.trace,
      traceEvent('evaluate', `Applied formal negation to ${String(value)}.`),
    ],
  };
}

function uniqueDependencies(dependencies) {
  const seen = new Set();
  return dependencies.filter((dependency) => {
    const key = `${dependency.source}\0${dependency.target}\0${dependency.relation}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return null;
  }
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function createFormalProbabilityCalculation(reasoning) {
  return createProbabilityCalculation({
    strategy: 'relative-meta-logic-truth-value',
    truthValue: reasoning.truthValue,
    truthRange: reasoning.truthRange,
    valence: reasoning.valence,
    probability: reasoning.confidence,
    deterministic: reasoning.value === true || reasoning.value === false,
    inputs: [
      {
        kind: 'truth-range',
        value: reasoning.truthRange ?? [0, 1],
      },
      {
        kind: 'valence',
        value: reasoning.valence ?? 0,
      },
      {
        kind: 'query',
        value: reasoning.query,
      },
      ...(reasoning.facts ?? []).map((fact) => ({
        kind: 'formal-fact',
        statement: fact.statement,
        truthValue: fact.truthValue,
        probability: fact.probability,
      })),
      ...(reasoning.dependencies ?? []).map((dependency) => ({
        kind: 'formal-dependency',
        ...dependency,
      })),
    ],
  });
}

function probabilityToTruth(probability) {
  if (probability >= 1) {
    return true;
  }
  if (probability <= 0) {
    return false;
  }
  return 'unknown';
}

function truthValueConfidence(value) {
  if (value === true) {
    return 1;
  }
  if (value === false) {
    return 0;
  }
  return 0.5;
}

function confidenceToSigned(confidence) {
  return confidence === null ? null : 2 * confidence - 1;
}

function confidenceToRmlResult(confidence) {
  if (confidence === 1) {
    return 1;
  }
  if (confidence === 0) {
    return 0;
  }
  return 0.5;
}

function createFormalReasoningEvidence(reasoning) {
  const valueText =
    reasoning.value === true
      ? 'entailed'
      : reasoning.value === false
        ? 'refuted'
        : 'undetermined';
  return {
    id: 'formal-reasoning-evidence-1',
    polarity: reasoning.value === false ? 'refute' : 'support',
    weight: 1,
    sourceType: 'relative-meta-logic',
    sourceUrl: rmlSourceUrl,
    retrievedAt: reasoning.engine.mode,
    claim: `relative-meta-logic ${reasoning.engine.mode} ${valueText} ${reasoning.query}.`,
    identifiers: {
      engine: 'relative-meta-logic',
      query: reasoning.query,
    },
    context: {
      reasoningSteps: reasoning.trace.map((event) => ({
        text: event.text,
        method: event.method,
        sourceType: 'relative-meta-logic',
      })),
    },
  };
}

function formalReasoningExplanation(reasoning) {
  if (reasoning.value === true) {
    return 'The formal query is entailed by the selected formal statements.';
  }
  if (reasoning.value === false) {
    return 'The formal query is refuted by the selected formal statements.';
  }
  return 'The formal query is undetermined by the selected formal statements.';
}

function unknownFormalReasoning(input, error) {
  const message = error instanceof Error ? error.message : String(error);
  const query = normalizeProgramInput(input);
  return {
    results: [0.5],
    diagnostics: [{ code: 'FORMAL_REASONING_PARSE_ERROR', message }],
    trace: [
      traceEvent('evaluate', `Formal reasoning parse failed: ${message}`),
    ],
    formalReasoning: {
      query,
      value: 'unknown',
      confidence: 0.5,
      dependencies: [],
      relations: { contradictions: [] },
      facts: [],
      queryTerm: null,
    },
  };
}

function traceEvent(method, text) {
  return {
    method,
    text,
    sourceType: 'relative-meta-logic',
    sourceUrl: rmlSourceUrl,
  };
}

function normalizeProgramInput(input) {
  const text = String(input ?? '').trim();
  if (!text) {
    throw new Error('Formal reasoning input cannot be empty.');
  }
  return text.replace(/\)\s+\(/gu, ')\n(');
}

function formatTerm(term) {
  return formatLinks([term]);
}

function isReference(term, id) {
  return isLink(term) && term.id === id && term.values.length === 0;
}

function isLink(value) {
  return (
    Boolean(value) && typeof value === 'object' && Array.isArray(value.values)
  );
}
