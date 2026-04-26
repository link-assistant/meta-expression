const arithmeticEqualityPattern =
  /^\s*(-?\d+(?:\.\d+)?)\s*([+*/-])\s*(-?\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)\s*$/;

const knownEvidence = [
  {
    key: 'earth orbits the sun',
    polarity: 'support',
    weight: 1,
    sourceType: 'wikidata',
    sourceUrl: 'https://www.wikidata.org/wiki/Q2#P397',
    retrievedAt: '2026-04-26',
    claim:
      'Wikidata Q2 Earth has parent astronomical body P397 with value Q525 Sun.',
    identifiers: {
      subject: 'Q2',
      property: 'P397',
      object: 'Q525',
    },
  },
];

export const defaultBeliefSystem = Object.freeze({
  id: 'default-scientific',
  name: 'Default scientific prototype',
  probabilityStrategy: 'weighted-support-ratio',
  sourceWeights: Object.freeze({
    computed: 1,
    wikidata: 1,
    algorithm: 0.6,
    user: 0.25,
  }),
});

export const FORMALIZATION_LEVELS = Object.freeze({
  RAW_TEXT: 1,
  STRUCTURED_MEANING_LINKS: 2,
  PARTIAL_FORMAL_EXPRESSION: 3,
  FULLY_COMPUTABLE_EXPRESSION: 4,
});

/**
 * Example function kept for backward compatibility with the template tests.
 * @param {number} a First number
 * @param {number} b Second number
 * @returns {number} Sum of a and b
 */
export const add = (a, b) => a + b;

/**
 * Example function kept for backward compatibility with the template tests.
 * @param {number} a First number
 * @param {number} b Second number
 * @returns {number} Product of a and b
 */
export const multiply = (a, b) => a * b;

/**
 * Example async helper kept for backward compatibility.
 * @param {number} ms Milliseconds to wait
 * @returns {Promise<void>} Promise that resolves after the delay
 */
export const delay = (ms) =>
  new Promise((resolve) => globalThis.setTimeout(resolve, ms));

export function createStatementDraft(input, options = {}) {
  const text = normalizeInput(input);
  const context = createContext(options.beliefSystem);
  const statement = addLink(context, {
    role: 'statement',
    references: [],
    value: {
      text,
      formalizationLevel: FORMALIZATION_LEVELS.RAW_TEXT,
      version: 1,
    },
    provenance: algorithmProvenance('input-normalization'),
  });
  const interpretations = generateInterpretations(text, options).map(
    (interpretation, index) => ({
      ...interpretation,
      id: `interpretation-${index + 1}`,
      statementId: statement.id,
    })
  );

  for (const interpretation of interpretations) {
    addLink(context, {
      id: interpretation.id,
      role: 'interpretation',
      references: [statement.id],
      value: interpretation,
      provenance: algorithmProvenance('deterministic-interpretation'),
    });
  }

  return {
    status: 'selection-required',
    statement,
    interpretations,
    linksNetwork: context.linksNetwork,
  };
}

export function analyzeStatement(input, options = {}) {
  const draft = createStatementDraft(input, options);
  const selectedInterpretation = selectInterpretationFromDraft(draft, options);
  const context = cloneContext(draft.linksNetwork, options.beliefSystem);
  const statement = draft.statement;

  addLink(context, {
    role: 'selection',
    references: [statement.id, selectedInterpretation.id],
    value: {
      selectedInterpretationId: selectedInterpretation.id,
      selectedBy: options.selectedBy ?? 'prototype-default',
    },
    provenance: algorithmProvenance('interpretation-selection'),
  });

  const formalization = formalizeInterpretation(
    draft.statement.value.text,
    selectedInterpretation
  );
  const formalizationLink = addLink(context, {
    role: 'formalization',
    references: [selectedInterpretation.id],
    value: formalization,
    provenance: algorithmProvenance('formalization'),
  });

  addFormalizationDependencies(context, formalizationLink, formalization);

  const result = formalization.computable
    ? evaluateComputableFormalization(formalization)
    : estimateFromEvidence(formalization, options.evidence ?? knownEvidence);

  const resultLink = addResultLinks(
    context,
    statement,
    formalizationLink,
    result
  );

  return {
    status: 'completed',
    statement,
    interpretations: draft.interpretations,
    selectedInterpretation,
    formalization,
    result,
    resultLink,
    linksNetwork: context.linksNetwork,
  };
}

export function generateInterpretations(input, options = {}) {
  const text = normalizeInput(input);
  const topK = Math.max(1, Math.min(options.topK ?? 3, 10));
  const interpretations = arithmeticEqualityPattern.test(text)
    ? arithmeticInterpretations(text)
    : realWorldInterpretations(text);

  return interpretations.slice(0, topK);
}

export function serializeLinksNotation(linksNetwork) {
  const header = [
    `(links-network: ${safeReference(linksNetwork.id)} ${safeReference(
      linksNetwork.beliefSystem.id
    )})`,
  ];
  const lines = linksNetwork.links.map((link) => {
    const references =
      link.references.length > 0
        ? link.references.map(safeReference).join(' ')
        : 'self';
    const value = summarizeLinkValue(link);
    return `(${safeReference(link.id)}: ${safeReference(
      link.role
    )} ${references} ${value})`;
  });
  return [...header, ...lines].join('\n');
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

function arithmeticInterpretations(text) {
  return [
    {
      kind: 'arithmetic-equality',
      paraphrase: `Check whether "${text}" is an exact arithmetic equality.`,
      examples: ['1 + 1 = 2 is true', '1 + 1 = 1 is false'],
      confidence: 1,
      source: 'deterministic-rule',
      formalizationLevel: FORMALIZATION_LEVELS.FULLY_COMPUTABLE_EXPRESSION,
    },
    {
      kind: 'notation-claim',
      paraphrase:
        'Treat the input as a claim about symbols rather than a calculation.',
      examples: ['The expression may be quoted in a document'],
      confidence: 0.35,
      source: 'deterministic-rule',
      formalizationLevel: FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION,
    },
    {
      kind: 'raw-statement',
      paraphrase:
        'Preserve the text as an underspecified human-language statement.',
      examples: ['Ask the user what the expression should mean'],
      confidence: 0.2,
      source: 'deterministic-rule',
      formalizationLevel: FORMALIZATION_LEVELS.RAW_TEXT,
    },
  ];
}

function realWorldInterpretations(text) {
  const known = normalizeKey(text) === 'earth orbits the sun';

  return [
    {
      kind: known ? 'wikidata-astronomy-claim' : 'real-world-claim',
      paraphrase: known
        ? 'Earth has the Sun as its parent astronomical body.'
        : `Treat "${text}" as a factual claim that needs evidence.`,
      examples: known
        ? ['Earth -> parent astronomical body -> Sun']
        : ['Evidence may support or refute the claim'],
      confidence: known ? 0.95 : 0.5,
      source: 'deterministic-rule',
      formalizationLevel: known
        ? FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION
        : FORMALIZATION_LEVELS.STRUCTURED_MEANING_LINKS,
    },
    {
      kind: 'ambiguous-claim',
      paraphrase: 'The statement may need a more specific subject or relation.',
      examples: ['Specify time, place, source, or intended meaning'],
      confidence: 0.4,
      source: 'deterministic-rule',
      formalizationLevel: FORMALIZATION_LEVELS.STRUCTURED_MEANING_LINKS,
    },
    {
      kind: 'quoted-text',
      paraphrase: 'Preserve the input as quoted text without evaluating it.',
      examples: ['Useful for translation or later refinement'],
      confidence: 0.25,
      source: 'deterministic-rule',
      formalizationLevel: FORMALIZATION_LEVELS.RAW_TEXT,
    },
  ];
}

function formalizeInterpretation(text, interpretation) {
  if (interpretation.kind === 'arithmetic-equality') {
    const match = text.match(arithmeticEqualityPattern);
    const leftOperand = Number(match[1]);
    const rightOperand = Number(match[3]);
    const expected = Number(match[4]);
    return {
      level: FORMALIZATION_LEVELS.FULLY_COMPUTABLE_EXPRESSION,
      computable: true,
      expression: {
        type: 'arithmetic-equality',
        operator: match[2],
        leftOperand,
        rightOperand,
        expected,
      },
      unknowns: [],
      refinementSuggestions: [],
    };
  }

  const normalized = normalizeKey(text);
  const known = normalized === 'earth orbits the sun';

  return {
    level: known
      ? FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION
      : interpretation.formalizationLevel,
    computable: false,
    expression: {
      type: known ? 'wikidata-claim' : 'partial-claim',
      text,
      normalized,
      wikidata: known
        ? { subject: 'Q2', property: 'P397', object: 'Q525' }
        : null,
    },
    unknowns: known ? [] : ['formal predicate', 'evidence source mapping'],
    refinementSuggestions: known
      ? []
      : [
          'Choose a specific subject.',
          'Choose a relation that can be checked against evidence.',
        ],
  };
}

function evaluateComputableFormalization(formalization) {
  const expression = formalization.expression;
  const actual = evaluateArithmeticExpression(expression);
  const value = Object.is(actual, expression.expected);
  const evidence = {
    id: 'computed-evidence-1',
    polarity: value ? 'support' : 'refute',
    weight: 1,
    sourceType: 'computed',
    sourceUrl: null,
    retrievedAt: 'local',
    claim: `${expression.leftOperand} ${expression.operator} ${expression.rightOperand} evaluates to ${actual}.`,
  };

  return {
    kind: 'computed',
    value,
    actual,
    expected: expression.expected,
    confidence: value ? 1 : 0,
    rawBalance: value ? 1 : -1,
    supportingEvidence: value ? [evidence] : [],
    refutingEvidence: value ? [] : [evidence],
    explanation: value
      ? 'The computed value matches the expected value.'
      : 'The computed value does not match the expected value.',
  };
}

function estimateFromEvidence(formalization, evidenceFixtures) {
  const evidence = evidenceFixtures.filter(
    (item) => item.key === formalization.expression.normalized
  );
  const confidence = computeEvidenceConfidence(evidence);

  return {
    kind: 'evidence-estimate',
    value: confidence.confidence === null ? 'unknown' : confidence.confidence,
    confidence: confidence.confidence,
    rawBalance: confidence.rawBalance,
    supportWeight: confidence.supportWeight,
    refuteWeight: confidence.refuteWeight,
    supportingEvidence: evidence.filter((item) => item.polarity === 'support'),
    refutingEvidence: evidence.filter((item) => item.polarity === 'refute'),
    explanation:
      confidence.confidence === null
        ? 'No configured evidence was found for the selected interpretation.'
        : 'Confidence is the weighted support ratio over configured evidence.',
  };
}

function addFormalizationDependencies(
  context,
  formalizationLink,
  formalization
) {
  if (formalization.expression.type !== 'arithmetic-equality') {
    addLink(context, {
      role: 'depends-on',
      references: [formalizationLink.id],
      value: {
        relation: 'depends-on',
        target: 'selected interpretation and evidence mapping',
      },
      provenance: algorithmProvenance('dependency-extraction'),
    });
    return;
  }

  const expression = formalization.expression;
  const dependencyValues = [
    String(expression.leftOperand),
    expression.operator,
    String(expression.rightOperand),
    String(expression.expected),
  ];

  for (const value of dependencyValues) {
    const dependency = addLink(context, {
      role: 'expression-part',
      references: [formalizationLink.id],
      value: { text: value },
      provenance: algorithmProvenance('dependency-extraction'),
    });
    addLink(context, {
      role: 'depends-on',
      references: [formalizationLink.id, dependency.id],
      value: { relation: 'depends-on' },
      provenance: algorithmProvenance('dependency-extraction'),
    });
  }
}

function addResultLinks(context, statement, formalizationLink, result) {
  const resultLink = addLink(context, {
    role: 'result',
    references: [statement.id, formalizationLink.id],
    value: {
      kind: result.kind,
      value: result.value,
      confidence: result.confidence,
    },
    provenance: algorithmProvenance('evaluation'),
  });
  const allEvidence = [
    ...result.supportingEvidence,
    ...result.refutingEvidence,
  ];

  for (const evidence of allEvidence) {
    const evidenceLink = addLink(context, {
      id: evidence.id,
      role: 'evidence',
      references: [statement.id],
      value: evidence,
      provenance: evidenceProvenance(evidence),
    });
    addLink(context, {
      role: evidence.polarity,
      references: [evidenceLink.id, resultLink.id],
      value: {
        relation: evidence.polarity === 'support' ? 'supports' : 'refutes',
        weight: evidence.weight,
      },
      provenance: evidenceProvenance(evidence),
    });
  }

  return resultLink;
}

function evaluateArithmeticExpression(expression) {
  if (expression.operator === '+') {
    return expression.leftOperand + expression.rightOperand;
  }
  if (expression.operator === '-') {
    return expression.leftOperand - expression.rightOperand;
  }
  if (expression.operator === '*') {
    return expression.leftOperand * expression.rightOperand;
  }
  if (expression.operator === '/') {
    return expression.leftOperand / expression.rightOperand;
  }
  throw new Error(`Unsupported operator: ${expression.operator}`);
}

function selectInterpretationFromDraft(draft, options) {
  if (options.interpretationId) {
    const selected = draft.interpretations.find(
      (interpretation) => interpretation.id === options.interpretationId
    );
    if (!selected) {
      throw new Error(`Unknown interpretation id: ${options.interpretationId}`);
    }
    return selected;
  }

  const index = options.interpretationIndex ?? 0;
  const selected = draft.interpretations[index];
  if (!selected) {
    throw new Error(`Unknown interpretation index: ${index}`);
  }
  return selected;
}

function createContext(beliefSystem = defaultBeliefSystem) {
  return {
    nextId: createIdFactory(),
    linksNetwork: {
      id: 'prototype-links-network',
      kind: 'links-network',
      version: 1,
      beliefSystem,
      links: [],
    },
  };
}

function cloneContext(linksNetwork, beliefSystem = linksNetwork.beliefSystem) {
  return {
    nextId: createIdFactory(linksNetwork.links),
    linksNetwork: {
      ...linksNetwork,
      beliefSystem,
      links: linksNetwork.links.map((link) => ({
        ...link,
        references: [...link.references],
      })),
    },
  };
}

function addLink(context, link) {
  const normalizedLink = {
    id: link.id ?? context.nextId(link.role),
    role: link.role,
    references: link.references ?? [],
    value: link.value ?? null,
    provenance: link.provenance ?? algorithmProvenance('unknown'),
  };
  context.linksNetwork.links.push(normalizedLink);
  return normalizedLink;
}

function createIdFactory(existingLinks = []) {
  const counters = new Map();
  for (const link of existingLinks) {
    const role = link.role;
    const match = link.id.match(new RegExp(`^${escapeRegExp(role)}-(\\d+)$`));
    if (match) {
      counters.set(role, Math.max(counters.get(role) ?? 0, Number(match[1])));
    }
  }
  return (role) => {
    const next = (counters.get(role) ?? 0) + 1;
    counters.set(role, next);
    return `${role}-${next}`;
  };
}

function summarizeLinkValue(link) {
  const value = link.value;
  if (value === null) {
    return safeReference(link.role);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return toLinoText(value);
  }
  if (value.relation) {
    return safeReference(value.relation);
  }
  if (value.text) {
    return toLinoText(value.text);
  }
  if (value.paraphrase) {
    return toLinoText(value.paraphrase);
  }
  if (value.claim) {
    return toLinoText(value.claim);
  }
  if (value.expression?.type) {
    return safeReference(value.expression.type);
  }
  if (value.kind) {
    return safeReference(value.kind);
  }
  return safeReference(link.role);
}

function toLinoText(value) {
  return `(${String(value).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()})`;
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

function normalizeInput(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Statement input must be a string.');
  }
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) {
    throw new Error('Statement input cannot be empty.');
  }
  return text;
}

function normalizeKey(input) {
  return normalizeInput(input)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function algorithmProvenance(method) {
  return {
    sourceType: 'algorithm',
    method,
  };
}

function evidenceProvenance(evidence) {
  return {
    sourceType: evidence.sourceType,
    sourceUrl: evidence.sourceUrl,
    retrievedAt: evidence.retrievedAt,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
