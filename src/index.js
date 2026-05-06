import { createWikimediaEvidenceClient } from './wikimedia-evidence.js';
import {
  disambiguatePhrases,
  describeDisambiguation,
} from './disambiguation.js';
import {
  defaultReasoningStrategyId,
  getReasoningStrategy,
  orderReasoningSteps,
} from './reasoning-strategies.js';
import { findExampleOpposite } from './examples.js';

export {
  createWikimediaEvidenceClient,
  resolveLiveEvidence,
} from './wikimedia-evidence.js';
export {
  disambiguatePhrases,
  describeDisambiguation,
} from './disambiguation.js';
export {
  reasoningStrategies,
  defaultReasoningStrategyId,
  getReasoningStrategy,
  listReasoningStrategies,
  orderReasoningSteps,
  classifyReasoningPhase,
} from './reasoning-strategies.js';
export {
  getPreparedExamples,
  getRandomExamples,
  findExampleOpposite,
  createSeededRandom,
} from './examples.js';
export {
  formalizeText,
  formalizeTextWith,
  FORMALIZE_LINK_TARGETS,
  FORMALIZE_SOURCE_KIND,
  tokenize as tokenizeForFormalize,
  generateNgrams as generateFormalizeNgrams,
  buildMarkdownLink as buildFormalizeMarkdownLink,
  buildHtmlLink as buildFormalizeHtmlLink,
  resolveLinkTarget as resolveFormalizeLinkTarget,
} from './formalize.js';
export {
  SOURCE_KIND as FORMALIZE_SOURCES,
  createWikidataSource,
  createWikipediaSource,
  createWiktionarySource,
  createWordNetSource,
  createFandomSource,
  createSourceRegistry,
  createDefaultSourceTiers,
  parseSourceSpec,
} from './formalize-sources.js';
export {
  aggregateBigContexts,
  aggregateBigContextsFromGraph,
} from './formalize-contexts.js';
export {
  buildOverrideMap,
  lookupOverride,
  overrideToCandidate,
  overrideToEntity,
  loadRepoOverrides,
  loadUserOverrides,
  decodeOverridesText,
  encodeOverridesAsLino,
} from './formalize-overrides.js';
export {
  parseLino,
  serializeLino,
  parseLinoEntries,
  serializeLinoEntries,
  decodeToken as decodeLinoToken,
  tokenizeLino,
} from './lino.js';
export {
  createDoubletStore,
  encodeAsDoublets,
  decodeFromDoublets,
  DOUBLET_TAGS,
} from './doublets.js';
export {
  SNAPSHOT_MODES,
  snapshotKey,
  loadSnapshotMap,
  createSnapshotCache,
  createSnapshotFetch,
  createSnapshotLayer,
  writeSnapshot,
} from './formalize-snapshots.js';

const arithmeticEqualityPattern =
  /^\s*(-?\d+(?:\.\d+)?)\s*([+*/-])\s*(-?\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)\s*$/;
const arithmeticQuestionPattern =
  /^\s*(?:what\s+is\s+)?(-?\d+(?:\.\d+)?)\s*([+*/-])\s*(-?\d+(?:\.\d+)?)\??\s*$/i;
const realWorldConfidenceEpsilon = 0.01;
const issueReportRepoUrl = 'https://github.com/link-assistant/meta-expression';
const selfReferentialFalseStatements = new Set([
  'this statement is false',
  'this sentence is false',
  'this is false statement',
]);

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
  {
    key: 'moon orbits the sun',
    polarity: 'support',
    weight: 1,
    sourceType: 'wikidata',
    sourceUrl: 'https://www.wikidata.org/wiki/Q405#P397',
    retrievedAt: '2026-04-26',
    claim:
      'Wikidata Q405 Moon has parent astronomical body P397 Q2 Earth, and Q2 Earth has parent astronomical body P397 Q525 Sun.',
    identifiers: {
      subject: 'Q405',
      property: 'P397',
      object: 'Q525',
      path: 'Q405>P397>Q2>P397>Q525',
    },
    context: {
      phraseMappings: [
        {
          text: 'Moon -> Q405',
          phrase: 'Moon',
          role: 'subject noun phrase',
          wikidataId: 'Q405',
          sourceUrl: 'https://www.wikidata.org/wiki/Q405',
        },
        {
          text: 'orbits -> P397',
          phrase: 'orbits',
          role: 'verb phrase',
          wikidataId: 'P397',
          sourceUrl: 'https://www.wikidata.org/wiki/Property:P397',
        },
        {
          text: 'Sun -> Q525',
          phrase: 'Sun',
          role: 'object noun phrase',
          wikidataId: 'Q525',
          sourceUrl: 'https://www.wikidata.org/wiki/Q525',
        },
      ],
      reasoningSteps: [
        {
          text: 'Q405 Moon -> P397 -> Q2 Earth',
          sourceUrl: 'https://www.wikidata.org/wiki/Q405#P397',
        },
        {
          text: 'Q2 Earth -> P397 -> Q525 Sun',
          sourceUrl: 'https://www.wikidata.org/wiki/Q2#P397',
        },
      ],
      orbitPath: [
        { id: 'Q405', label: 'Moon' },
        { id: 'Q2', label: 'Earth' },
        { id: 'Q525', label: 'Sun' },
      ],
    },
  },
  {
    key: 'elon musk is alive',
    polarity: 'support',
    weight: 1,
    sourceType: 'wikidata',
    sourceUrl: 'https://www.wikidata.org/wiki/Q317521#P570',
    retrievedAt: '2026-04-26',
    claim:
      'Wikidata Q317521 identifies Elon Musk as a human born in 1971 and does not expose a date of death (P570) statement in the captured entity data.',
    identifiers: {
      subject: 'Q317521',
      property: 'P570',
      object: 'missing',
    },
  },
];

const knownRealWorldClaims = Object.freeze({
  'earth orbits the sun': Object.freeze({
    interpretationKind: 'wikidata-astronomy-claim',
    paraphrase: 'Earth has the Sun as its parent astronomical body.',
    examples: Object.freeze(['Earth -> parent astronomical body -> Sun']),
    expressionType: 'wikidata-claim',
    wikidata: Object.freeze({
      subject: 'Q2',
      property: 'P397',
      object: 'Q525',
    }),
  }),
  'moon orbits the sun': Object.freeze({
    interpretationKind: 'wikidata-astronomy-chain-claim',
    paraphrase:
      'The Moon reaches the Sun through the parent astronomical body chain Moon -> Earth -> Sun.',
    examples: Object.freeze([
      'Moon -> parent astronomical body -> Earth -> Sun',
    ]),
    expressionType: 'wikidata-claim',
    wikidata: Object.freeze({
      subject: 'Q405',
      property: 'P397',
      object: 'Q525',
      path: Object.freeze(['Q405', 'Q2', 'Q525']),
    }),
  }),
  'elon musk is alive': Object.freeze({
    interpretationKind: 'wikidata-person-liveness-claim',
    paraphrase:
      'Elon Musk is a person whose Wikidata item has no date of death statement in the captured data.',
    examples: Object.freeze(['Elon Musk -> date of death -> missing']),
    expressionType: 'wikidata-person-liveness-claim',
    wikidata: Object.freeze({
      subject: 'Q317521',
      property: 'P570',
      object: 'missing',
    }),
  }),
});

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

export const FORMALIZATION_LEVEL_DETAILS = Object.freeze({
  [FORMALIZATION_LEVELS.RAW_TEXT]: Object.freeze({
    level: FORMALIZATION_LEVELS.RAW_TEXT,
    name: 'Raw text',
    summary: 'The input is preserved as text and still needs interpretation.',
    executable: false,
  }),
  [FORMALIZATION_LEVELS.STRUCTURED_MEANING_LINKS]: Object.freeze({
    level: FORMALIZATION_LEVELS.STRUCTURED_MEANING_LINKS,
    name: 'Structured meaning links',
    summary:
      'The selected meaning is represented as links, but is not yet formal enough to execute.',
    executable: false,
  }),
  [FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION]: Object.freeze({
    level: FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION,
    name: 'Partial formal expression',
    summary:
      'The expression has a structured formal shape with explicit unknowns or external evidence needs.',
    executable: false,
  }),
  [FORMALIZATION_LEVELS.FULLY_COMPUTABLE_EXPRESSION]: Object.freeze({
    level: FORMALIZATION_LEVELS.FULLY_COMPUTABLE_EXPRESSION,
    name: 'Fully computable expression',
    summary:
      'The selected expression is specific enough for deterministic local evaluation.',
    executable: true,
  }),
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

export function describeFormalizationLevel(level) {
  return (
    FORMALIZATION_LEVEL_DETAILS[level] ?? {
      level,
      name: 'Unknown level',
      summary: 'The formalization level is not recognized by this prototype.',
      executable: false,
    }
  );
}

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

  const evidence = [
    ...(options.evidence ?? knownEvidence),
    ...createUserBeliefEvidence(formalization, options.userBeliefs),
  ];
  const result = formalization.computable
    ? evaluateComputableFormalization(formalization)
    : estimateFromEvidence(formalization, evidence, options);

  const resultLink = addResultLinks(
    context,
    statement,
    formalizationLink,
    result
  );

  const strategyId = options.reasoningStrategyId ?? defaultReasoningStrategyId;
  const reasoningStrategy = getReasoningStrategy(strategyId);
  const reasoningSteps = orderReasoningSteps(
    context.linksNetwork.links,
    strategyId
  );
  const alternatives = buildAlternatives(
    draft.statement.value.text,
    selectedInterpretation,
    formalization
  );
  const dependencies = buildDependencies(
    draft.statement.value.text,
    selectedInterpretation,
    formalization
  );
  const definitions = buildDefinitions(draft.statement.value.text);
  const confirmations = buildConfirmations(result);
  const refutations = buildRefutations(result);
  const opposite = findExampleOpposite(draft.statement.value.text);

  return {
    status: 'completed',
    statement,
    interpretations: draft.interpretations,
    selectedInterpretation,
    formalization,
    result,
    resultLink,
    linksNetwork: context.linksNetwork,
    reasoningStrategy,
    reasoningSteps,
    alternatives,
    dependencies,
    definitions,
    confirmations,
    refutations,
    opposite,
  };
}

function buildAlternatives(text, interpretation, formalization) {
  const alternatives = [];
  const normalized = normalizeKey(text);
  if (normalized === 'moon orbits the sun') {
    alternatives.push({
      text: 'Moon orbits Earth, which orbits the Sun',
      reason:
        'A more precise restatement that exposes the Moon -> Earth -> Sun parent astronomical body chain.',
      confidence: 0.97,
    });
  }
  if (normalized === 'moon does not orbit the sun') {
    alternatives.push({
      text: 'Moon orbits Earth, not the Sun directly',
      reason:
        'Distinguishes the indirect parent-body chain from a direct orbital relationship.',
      confidence: 0.95,
    });
  }
  if (normalized === 'earth orbits the sun') {
    alternatives.push({
      text: 'Earth has the Sun as its parent astronomical body',
      reason: 'Restates the claim using the Wikidata relation explicitly.',
      confidence: 0.97,
    });
  }
  if (
    interpretation.kind === 'wikidata-person-liveness-claim' ||
    /\bis\s+(alive|dead)\b/i.test(text)
  ) {
    const positive = /alive/i.test(text);
    alternatives.push({
      text: positive
        ? `${capitalizeFirstWord(text.replace(/\bis\s+alive\b/i, ''))} has no recorded date of death (P570)`
        : `${capitalizeFirstWord(text.replace(/\bis\s+dead\b/i, ''))} has a recorded date of death (P570)`,
      reason:
        'Restates the claim using the Wikidata property that the prototype actually checks.',
      confidence: 0.9,
    });
  }
  if (formalization.expression?.type === 'arithmetic-equality') {
    const expression = formalization.expression;
    alternatives.push({
      text: `Compute ${expression.leftOperand} ${expression.operator} ${expression.rightOperand} and compare with ${expression.expected}`,
      reason: 'Splits the claim into a computation and a comparison.',
      confidence: 1,
    });
  }
  return alternatives;
}

function buildDependencies(text, interpretation, formalization) {
  const dependencies = [];
  const normalized = normalizeKey(text);
  if (formalization.expression?.type === 'arithmetic-equality') {
    const expression = formalization.expression;
    dependencies.push(
      `Operator "${expression.operator}" defined as standard arithmetic`
    );
    dependencies.push(`Operand "${expression.leftOperand}" parsed as a number`);
    dependencies.push(
      `Operand "${expression.rightOperand}" parsed as a number`
    );
    dependencies.push(
      `Expected value "${expression.expected}" parsed as a number`
    );
    return dependencies;
  }
  if (formalization.expression?.type === 'arithmetic-question') {
    const expression = formalization.expression;
    dependencies.push(
      `Operator "${expression.operator}" defined as standard arithmetic`
    );
    dependencies.push(`Operand "${expression.leftOperand}" parsed as a number`);
    dependencies.push(
      `Operand "${expression.rightOperand}" parsed as a number`
    );
    return dependencies;
  }

  const phraseMappings = describeDisambiguation(text);
  for (const mapping of phraseMappings) {
    if (mapping.role.includes('noun')) {
      dependencies.push(`${mapping.label} (${mapping.wikidataId}) exists`);
    }
    if (mapping.role.includes('verb')) {
      dependencies.push(
        `${mapping.label} (${mapping.wikidataId}) defined as the relation`
      );
    }
  }
  if (dependencies.length === 0) {
    dependencies.push('Selected interpretation can be mapped to evidence');
  }
  if (interpretation.kind === 'self-referential-truth-claim') {
    dependencies.push(
      'Self-reference resolution strategy (Tarski-style truth gap)'
    );
  }
  if (normalized.includes('does not')) {
    dependencies.push('Negation operator applied to the underlying claim');
  }
  return dependencies;
}

function buildDefinitions(text) {
  return describeDisambiguation(text).map((mapping) => ({
    phrase: mapping.phrase,
    label: mapping.label,
    wikidataId: mapping.wikidataId,
    sourceUrl: mapping.sourceUrl,
    role: mapping.role,
  }));
}

function buildConfirmations(result) {
  return (result.supportingEvidence ?? []).map((evidence) => ({
    quote: evidence.claim,
    sourceType: evidence.sourceType,
    sourceUrl: evidence.sourceUrl,
    weight: evidence.weight,
  }));
}

function buildRefutations(result) {
  return (result.refutingEvidence ?? []).map((evidence) => ({
    quote: evidence.claim,
    sourceType: evidence.sourceType,
    sourceUrl: evidence.sourceUrl,
    weight: evidence.weight,
  }));
}

function capitalizeFirstWord(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

export async function analyzeStatementWithLiveEvidence(input, options = {}) {
  const client =
    options.wikimediaClient ?? createWikimediaEvidenceClient(options);
  const liveEvidence = await client.resolveEvidence(input, options);
  const baseEvidence =
    options.includeFixtureEvidence === false
      ? []
      : (options.evidence ?? knownEvidence);

  return analyzeStatement(input, {
    ...options,
    evidence: [...baseEvidence, ...liveEvidence],
  });
}

export function generateInterpretations(input, options = {}) {
  const text = normalizeInput(input);
  const topK = Math.max(1, Math.min(options.topK ?? 3, 10));
  const interpretations = arithmeticEqualityPattern.test(text)
    ? arithmeticInterpretations(text)
    : arithmeticQuestionPattern.test(text)
      ? arithmeticQuestionInterpretations(text)
      : isSelfReferentialFalseStatement(text)
        ? selfReferenceInterpretations(text)
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

export function createIssueReportUrl(analysis, options = {}) {
  const repoUrl = options.repoUrl ?? issueReportRepoUrl;
  const params = new globalThis.URLSearchParams({
    title: createIssueReportTitle(analysis.statement.value.text),
    body: createIssueReportBody(analysis, options),
    labels: options.labels ?? 'bug',
  });

  return `${repoUrl.replace(/\/$/, '')}/issues/new?${params.toString()}`;
}

function createIssueReportTitle(statement) {
  const text = normalizeInput(statement);
  const shortened = text.length > 50 ? `${text.slice(0, 50)}...` : text;
  return `Issue with statement: ${shortened}`;
}

function createIssueReportBody(analysis, options) {
  const lines = [];
  const level = describeFormalizationLevel(analysis.formalization.level);
  const confidence =
    analysis.result.confidence === null
      ? 'unknown'
      : `${Math.round(analysis.result.confidence * 100)}%`;

  lines.push('## Environment');
  lines.push('');
  if (options.pageUrl) {
    lines.push(`- **URL**: ${options.pageUrl}`);
  }
  if (options.userAgent) {
    lines.push(`- **User Agent**: ${options.userAgent}`);
  }
  lines.push(
    `- **Timestamp**: ${options.timestamp ?? new Date().toISOString()}`
  );
  lines.push('');
  lines.push('## Statement');
  lines.push('');
  lines.push('```');
  lines.push(analysis.statement.value.text);
  lines.push('```');
  lines.push('');
  lines.push('## Interpretation');
  lines.push('');
  lines.push(analysis.selectedInterpretation.paraphrase);
  lines.push('');
  appendInterpretationLines(lines, analysis.interpretations);
  lines.push('## Result');
  lines.push('');
  lines.push(`- **Value**: ${analysis.result.value}`);
  lines.push(`- **Confidence**: ${confidence}`);
  lines.push(`- **Formalization level**: ${level.level} - ${level.name}`);
  lines.push(`- **Explanation**: ${analysis.result.explanation}`);
  lines.push('');
  lines.push('## Evidence');
  lines.push('');
  appendEvidenceLines(
    lines,
    'Supporting evidence',
    analysis.result.supportingEvidence
  );
  appendEvidenceLines(
    lines,
    'Refuting evidence',
    analysis.result.refutingEvidence
  );
  appendReasoningTraceLines(lines, analysis.linksNetwork.links);
  lines.push('');
  lines.push('## Links Notation');
  lines.push('');
  lines.push('```');
  lines.push(serializeLinksNotation(analysis.linksNetwork));
  lines.push('```');
  lines.push('');
  lines.push('## Description');
  lines.push('');
  lines.push('<!-- Please describe what looked wrong or incomplete. -->');
  lines.push('');

  return lines.join('\n');
}

function appendInterpretationLines(lines, interpretations) {
  if (!Array.isArray(interpretations) || interpretations.length <= 1) {
    return;
  }

  lines.push('## Candidate Interpretations');
  lines.push('');
  for (const interpretation of interpretations) {
    lines.push(
      `- **${interpretation.id}** (${interpretation.kind}): ${interpretation.paraphrase}`
    );
  }
  lines.push('');
}

function appendEvidenceLines(lines, heading, evidenceItems) {
  lines.push(`### ${heading}`);
  if (evidenceItems.length === 0) {
    lines.push('');
    lines.push('None.');
    lines.push('');
    return;
  }

  for (const evidence of evidenceItems) {
    const source = evidence.sourceUrl
      ? `[${evidence.sourceType}](${evidence.sourceUrl})`
      : evidence.sourceType;
    lines.push(`- ${source}: ${evidence.claim}`);
  }
  lines.push('');
}

function appendReasoningTraceLines(lines, links) {
  const traceLinks = links.filter((link) =>
    ['meaning', 'reasoning-step'].includes(link.role)
  );
  if (traceLinks.length === 0) {
    return;
  }

  lines.push('## Reasoning Trace');
  lines.push('');
  for (const link of traceLinks) {
    const source = link.value?.sourceUrl
      ? ` ([source](${link.value.sourceUrl}))`
      : '';
    lines.push(
      `- **${link.role}**: ${summarizeReportValue(link.value)}${source}`
    );
  }
  lines.push('');
}

function summarizeReportValue(value) {
  if (value === null) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return (
    value.text ??
    value.paraphrase ??
    value.claim ??
    value.relation ??
    value.kind ??
    value.expression?.type ??
    ''
  );
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
      beliefSystem.sourceWeights?.[evidence.sourceType] ?? 1
    );
    return {
      ...evidence,
      weight: Number(evidence.weight ?? 0) * sourceWeight,
    };
  });
}

function boundRealWorldConfidence(confidence, uncertainty) {
  if (confidence === null) {
    return null;
  }
  const parsed = Number(uncertainty);
  const epsilon = Number.isFinite(parsed)
    ? clamp(parsed, 0, 0.49)
    : realWorldConfidenceEpsilon;
  return clamp(confidence, epsilon, 1 - epsilon);
}

function createUserBeliefEvidence(formalization, userBeliefs) {
  const normalized = formalization.expression.normalized;
  if (!normalized || !userBeliefs) {
    return [];
  }

  const rawProbability = findUserBelief(userBeliefs, normalized);
  if (rawProbability === undefined) {
    return [];
  }

  const probability = clamp(Number(rawProbability), 0, 1);
  if (!Number.isFinite(probability) || probability === 0.5) {
    return [];
  }

  const polarity = probability > 0.5 ? 'support' : 'refute';
  const weight = Math.abs(probability - 0.5) * 2;
  const displayText = formalization.expression.text ?? normalized;

  return [
    {
      id: `user-belief-${safeReference(normalized)}`,
      key: normalized,
      polarity,
      weight,
      sourceType: 'user',
      sourceUrl: null,
      retrievedAt: 'local-storage',
      claim: `User configured "${displayText}" at ${Math.round(
        probability * 100
      )}% on the local belief slider.`,
      identifiers: {
        statement: normalized,
      },
    },
  ];
}

function findUserBelief(userBeliefs, normalized) {
  if (userBeliefs instanceof Map) {
    for (const [key, value] of userBeliefs.entries()) {
      if (normalizeKey(key) === normalized) {
        return value;
      }
    }
    return undefined;
  }

  for (const [key, value] of Object.entries(userBeliefs)) {
    if (normalizeKey(key) === normalized) {
      return value;
    }
  }
  return undefined;
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

function arithmeticQuestionInterpretations(text) {
  return [
    {
      kind: 'arithmetic-question',
      paraphrase: `Compute the value of "${text}".`,
      examples: ['1 + 1 asks for the number 2', '6 / 3 asks for the number 2'],
      confidence: 1,
      source: 'deterministic-rule',
      formalizationLevel: FORMALIZATION_LEVELS.FULLY_COMPUTABLE_EXPRESSION,
    },
    {
      kind: 'notation-fragment',
      paraphrase:
        'Treat the input as a symbolic fragment that may need a surrounding statement.',
      examples: ['The expression may be part of a larger equation'],
      confidence: 0.3,
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

function selfReferenceInterpretations() {
  return [
    {
      kind: 'self-referential-truth-claim',
      paraphrase: 'Treat the statement as referring to its own truth value.',
      examples: [
        'This statement is false cannot be assigned a stable truth value',
      ],
      confidence: 0.9,
      source: 'deterministic-rule',
      formalizationLevel: FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION,
    },
    {
      kind: 'quoted-text',
      paraphrase: 'Preserve the input as quoted text without evaluating it.',
      examples: ['Useful for translation or later refinement'],
      confidence: 0.25,
      source: 'deterministic-rule',
      formalizationLevel: FORMALIZATION_LEVELS.RAW_TEXT,
    },
    {
      kind: 'real-world-claim',
      paraphrase:
        'Treat the words as an ordinary factual claim that needs evidence.',
      examples: ['Evidence may support or refute the claim'],
      confidence: 0.15,
      source: 'deterministic-rule',
      formalizationLevel: FORMALIZATION_LEVELS.STRUCTURED_MEANING_LINKS,
    },
  ];
}

function realWorldInterpretations(text) {
  const knownClaim = knownRealWorldClaims[normalizeKey(text)];
  const interpretations = [
    {
      kind: knownClaim?.interpretationKind ?? 'real-world-claim',
      paraphrase:
        knownClaim?.paraphrase ??
        `Treat "${text}" as a factual claim that needs evidence.`,
      examples: knownClaim?.examples ?? [
        'Evidence may support or refute the claim',
      ],
      confidence: knownClaim ? 0.95 : 0.5,
      source: 'deterministic-rule',
      formalizationLevel: knownClaim
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

  const subPhraseCandidates = disambiguatePhrases(text).candidates;
  for (const candidate of subPhraseCandidates) {
    interpretations.push(candidate);
  }
  return interpretations;
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
  if (interpretation.kind === 'arithmetic-question') {
    const match = text.match(arithmeticQuestionPattern);
    const leftOperand = Number(match[1]);
    const rightOperand = Number(match[3]);
    return {
      level: FORMALIZATION_LEVELS.FULLY_COMPUTABLE_EXPRESSION,
      computable: true,
      expression: {
        type: 'arithmetic-question',
        operator: match[2],
        leftOperand,
        rightOperand,
      },
      unknowns: [],
      refinementSuggestions: [],
    };
  }
  if (interpretation.kind === 'self-referential-truth-claim') {
    return {
      level: FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION,
      computable: false,
      expression: {
        type: 'self-reference-paradox',
        text,
        normalized: normalizeKey(text),
      },
      unknowns: ['stable truth value'],
      refinementSuggestions: [
        'Quote the sentence if it should be treated as text.',
        'Rewrite it as a non-self-referential claim if evidence should be checked.',
      ],
    };
  }

  const normalized = normalizeKey(text);
  const knownClaim = knownRealWorldClaims[normalized];

  return {
    level: knownClaim
      ? FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION
      : interpretation.formalizationLevel,
    computable: false,
    expression: {
      type: knownClaim?.expressionType ?? 'partial-claim',
      text,
      normalized,
      wikidata: knownClaim?.wikidata ?? null,
    },
    unknowns: knownClaim ? [] : ['formal predicate', 'evidence source mapping'],
    refinementSuggestions: knownClaim
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
  if (expression.type === 'arithmetic-question') {
    const evidence = {
      id: 'computed-evidence-1',
      polarity: 'support',
      weight: 1,
      sourceType: 'computed',
      sourceUrl: null,
      retrievedAt: 'local',
      claim: `${expression.leftOperand} ${expression.operator} ${expression.rightOperand} evaluates to ${actual}.`,
    };

    return {
      kind: 'computed',
      value: actual,
      actual,
      expected: undefined,
      confidence: 1,
      correctness: 1,
      signedConfidence: 1,
      rawBalance: 1,
      supportingEvidence: [evidence],
      refutingEvidence: [],
      explanation: 'The expression was computed locally.',
    };
  }

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
    correctness: value ? 1 : 0,
    signedConfidence: value ? 1 : -1,
    rawBalance: value ? 1 : -1,
    supportingEvidence: value ? [evidence] : [],
    refutingEvidence: value ? [] : [evidence],
    explanation: value
      ? 'The computed value matches the expected value.'
      : 'The computed value does not match the expected value.',
  };
}

function estimateFromEvidence(formalization, evidenceFixtures, options = {}) {
  if (formalization.expression.type === 'self-reference-paradox') {
    return {
      kind: 'evidence-estimate',
      value: 'undetermined',
      confidence: 0.5,
      correctness: 0.5,
      signedConfidence: 0,
      rawBalance: 0,
      supportWeight: 0,
      refuteWeight: 0,
      supportingEvidence: [],
      refutingEvidence: [],
      explanation:
        'The selected interpretation is self-referential, so this prototype marks its truth value as undetermined instead of treating missing evidence as unknown.',
    };
  }

  const evidence = evidenceFixtures.filter(
    (item) => item.key === formalization.expression.normalized
  );
  const weightedEvidence = applySourceWeights(
    evidence,
    options.beliefSystem ?? defaultBeliefSystem
  );
  const confidence = computeEvidenceConfidence(weightedEvidence);
  const boundedConfidence = boundRealWorldConfidence(
    confidence.confidence,
    options.realWorldUncertainty ??
      options.beliefSystem?.realWorldUncertainty ??
      realWorldConfidenceEpsilon
  );

  const boundedSignedConfidence =
    boundedConfidence === null ? null : 2 * boundedConfidence - 1;

  return {
    kind: 'evidence-estimate',
    value: boundedConfidence === null ? 'unknown' : boundedConfidence,
    confidence: boundedConfidence,
    correctness: boundedConfidence,
    signedConfidence: boundedSignedConfidence,
    rawBalance: confidence.rawBalance,
    supportWeight: confidence.supportWeight,
    refuteWeight: confidence.refuteWeight,
    supportingEvidence: weightedEvidence.filter(
      (item) => item.polarity === 'support'
    ),
    refutingEvidence: weightedEvidence.filter(
      (item) => item.polarity === 'refute'
    ),
    explanation:
      confidence.confidence === null
        ? 'No configured evidence was found for the selected interpretation.'
        : 'Confidence is the weighted support ratio over configured evidence, bounded away from absolute certainty for real-world claims.',
  };
}

function addFormalizationDependencies(
  context,
  formalizationLink,
  formalization
) {
  if (
    !['arithmetic-equality', 'arithmetic-question'].includes(
      formalization.expression.type
    )
  ) {
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
  ];
  if (expression.type === 'arithmetic-equality') {
    dependencyValues.push(String(expression.expected));
  }

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
    addEvidenceContextLinks(context, evidenceLink, evidence);
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

function addEvidenceContextLinks(context, evidenceLink, evidence) {
  const provenance = evidenceProvenance(evidence);
  const phraseMappings = evidence.context?.phraseMappings ?? [];
  const reasoningSteps = evidence.context?.reasoningSteps ?? [];

  if (Array.isArray(phraseMappings)) {
    for (const mapping of phraseMappings) {
      addLink(context, {
        role: 'meaning',
        references: [evidenceLink.id],
        value: mapping,
        provenance,
      });
    }
  }

  if (Array.isArray(reasoningSteps)) {
    for (const step of reasoningSteps) {
      addLink(context, {
        role: 'reasoning-step',
        references: [evidenceLink.id],
        value: step,
        provenance,
      });
    }
  }
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

function isSelfReferentialFalseStatement(input) {
  return selfReferentialFalseStatements.has(normalizeKey(input));
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
