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
import { createPreferenceEvidence } from './preferences.js';
import { scoreEvidenceItems } from './evidence-scoring.js';
import { createProbabilityCalculation } from './probability.js';
import { knownEvidence, knownRealWorldClaims } from './known-evidence.js';
import { buildStatementMeaningMetadata } from './statement-formalization.js';
import * as formalReasoning from './formal-reasoning.js';
import { evaluateArithmeticWithRelativeMetaLogic } from './relative-meta-logic-adapter.js';

export {
  createWikimediaEvidenceClient,
  resolveLiveEvidence,
} from './wikimedia-evidence.js';
export { computeEvidenceConfidence } from './evidence-scoring.js';
export {
  createProbabilityCalculation,
  normalizeTruthValue,
} from './probability.js';
export { createIssueReportUrl, serializeLinksNotation } from './reporting.js';
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
  INTERPRETATION_DISPLAY_MODES,
  markdownFromFormalizationCst,
  formatInterpretationPhrase,
  interpretationKey,
  tokenize as tokenizeForFormalize,
  generateNgrams as generateFormalizeNgrams,
  buildMarkdownLink as buildFormalizeMarkdownLink,
  buildHtmlLink as buildFormalizeHtmlLink,
  resolveLinkTarget as resolveFormalizeLinkTarget,
} from './formalize.js';
export {
  FORMALIZATION_PROVIDER_STATUS,
  collectFormalizationProviderCandidates,
  createFixtureFormalizationProvider,
} from './formalization-providers.js';
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
export { translateText, translateTextWith } from './translate.js';
export {
  deformalizeExpression,
  deformalizeExpressionWith,
  naturalizeExpression,
  naturalizeExpressionWith,
} from './naturalize.js';
export {
  parseFormalAiTranslationPrompt,
  SUPPORTED_FORMAL_AI_TRANSLATION_LANGUAGES,
  translateFormalAiPrompt,
  translateFormalAiPromptWith,
} from './formal-ai-prompts.js';
export { applyTranslationQuestionAnswers } from './translation-answers.js';
export {
  listTranslationStrategies,
  TRANSLATION_STRATEGIES,
} from './translation-strategies.js';
export {
  assessArticleTranslation,
  assessArticleSet,
  selectLanguagePair,
  summarizeAssessment,
  extractFirstStatement,
  extractFirstParagraph,
  extractParagraphs,
  normalizeParagraphText,
  tokenCoverage,
  tokenizeForMatch,
  assessReferenceAlignment,
  normalizeStatementKey,
} from './translation-quality.js';
export { checkText, checkTextWithLiveEvidence } from './check.js';
export {
  exportClaimReviewJsonLd,
  importClaimReviewJsonLd,
  parseClaimReviewJsonLd,
} from './claim-review.js';
export {
  exportEvidenceJsonLd,
  exportEvidenceProvJsonLd,
} from './provenance-jsonld.js';
export {
  exportEvidencePropertyGraph,
  exportEvidenceRdfTriples,
  exportScopedSparqlEvidence,
  importEvidencePropertyGraph,
  importEvidenceRdfTriples,
} from './graph-interchange.js';
export {
  createLiteratureEvidenceItems,
  exportLiteratureBibliography,
  exportLiteratureBibTeX,
  exportLiteratureCsv,
  exportLiteratureRis,
  reviewClaimAgainstLiterature,
} from './literature-review.js';
export {
  createCrossrefUniquenessSource,
  createDefaultUniquenessSources,
  createDuckDuckGoUniquenessSource,
  createOpenAlexUniquenessSource,
  createWikipediaUniquenessSource,
  searchTextUniqueness,
} from './uniqueness.js';
export {
  aggregateBigContexts,
  aggregateBigContextsFromGraph,
} from './formalize-contexts.js';
export {
  annotateLinguisticMetadataPhraseRefs,
  extractLinguisticMetadata,
} from './linguistic-metadata.js';
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
  applyObjectTransformationRules,
  applySentenceTextTransformationRules,
  applyTextTransformationRules,
  rewriteLinksNotation,
  simplifyLinksNotation,
} from './transformation-rules.js';
export * from './formal-reasoning.js';
export {
  RELATIVE_META_LOGIC_UPSTREAM,
  mapFormalizationToRelativeMetaLogicInput,
} from './relative-meta-logic-adapter.js';
export {
  PROOF_SOLVER_ARTIFACT_FORMATS,
  PROOF_SOLVER_ARTIFACT_STATUS,
  collectProofSolverArtifactEvidence,
  createFixtureProofSolverArtifactAdapter,
  createLeanProofArtifactAdapter,
  createSmtLibSolverArtifactAdapter,
} from './proof-solver-artifacts.js';
export {
  WRITING_ASSISTANT_GUARDRAILS,
  WRITING_ASSISTANT_OPERATIONS,
  WRITING_ASSISTANT_SURFACES,
  createMockWritingAssistantExtensionHarness,
  createWritingAssistantSurface,
  listWritingAssistantCapabilities,
  runWritingAssistantOperation,
  verifyWritingAssistantEmbeddedExports,
} from './writing-assistant.js';
export {
  createDefaultPreferenceProfile,
  createPreferenceEvidence,
  getPreferenceEvidenceSituationProbability,
  getPreferenceBeliefProbability,
  isPreferenceBeliefVisible,
  listVisiblePreferenceBeliefs,
  normalizePreferenceProfile,
  parsePreferenceProfile,
  preferenceBeliefDefinitions,
  preferenceContextDefinitions,
  preferenceEvidenceSituationDefinitions,
  serializePreferenceProfile,
  setPreferenceBelief,
  setPreferenceContext,
  setPreferenceEvidenceSituation,
} from './preferences.js';
export {
  createDoubletStore,
  encodeAsDoublets,
  decodeFromDoublets,
  DOUBLET_TAGS,
} from './doublets.js';
export {
  exportPortableCaseData,
  importPortableCaseData,
  loadPortableCaseFromDoublets,
  savePortableCaseToDoublets,
} from './durable-storage.js';
export { createWasmCore, loadWasmCore } from './wasm-core.js';
const arithmeticEqualityPattern =
  /^\s*(-?\d+(?:\.\d+)?)\s*([+*/-])\s*(-?\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)\s*$/;
const arithmeticQuestionPattern =
  /^\s*(?:what\s+is\s+)?(-?\d+(?:\.\d+)?)\s*([+*/-])\s*(-?\d+(?:\.\d+)?)\??\s*$/i;
const realWorldConfidenceEpsilon = 0.01;
const selfReferentialFalseStatements = new Set([
  'this statement is false',
  'this statement is true',
  'this sentence is false',
  'this sentence is true',
  'this is false statement',
  'this is true statement',
]);

export const defaultBeliefSystem = Object.freeze({
  id: 'default-scientific',
  name: 'Default scientific prototype',
  probabilityStrategy: 'weighted-support-ratio',
  sourceWeights: Object.freeze({
    computed: 1,
    wikidata: 1,
    algorithm: 0.6,
    literature: 1,
    user: 0.25,
    preference: 1,
    'derived-preference': 0.85,
    context: 0.85,
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

export const add = (a, b) => a + b;

export const multiply = (a, b) => a * b;

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
    ...createPreferenceEvidence(options.preferenceProfile),
  ];
  const result = formalization.computable
    ? evaluateComputableFormalization(formalization, options)
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
  if (formalization.expression?.type === 'formal-reasoning-program') {
    return formalization.expression.dependencies.map(
      (dependency) => `${dependency.target} depends on ${dependency.source}`
    );
  }
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
  const interpretations = formalReasoning.isFormalReasoningInput(text)
    ? formalReasoning.createFormalReasoningInterpretations(
        text,
        FORMALIZATION_LEVELS
      )
    : arithmeticEqualityPattern.test(text)
      ? arithmeticInterpretations(text)
      : arithmeticQuestionPattern.test(text)
        ? arithmeticQuestionInterpretations(text)
        : isSelfReferentialFalseStatement(text)
          ? selfReferenceInterpretations(text)
          : realWorldInterpretations(text);

  return interpretations.slice(0, topK);
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
      kind: knownClaim?.interpretationKind ?? 'general-human-language-claim',
      paraphrase:
        knownClaim?.paraphrase ??
        `Treat "${text}" as a human-language claim with structured meaning links that still needs evidence.`,
      examples: knownClaim?.examples ?? [
        'Extract subject, predicate, object, and lexical meaning candidates',
      ],
      confidence: knownClaim ? 0.95 : 0.5,
      source: knownClaim ? 'deterministic-rule' : 'general-formalizer',
      formalizationLevel: FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION,
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
  if (interpretation.kind === 'formal-reasoning-program') {
    return formalReasoning.createFormalReasoningFormalization(
      text,
      FORMALIZATION_LEVELS.FULLY_COMPUTABLE_EXPRESSION
    );
  }
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
  const structured = buildStatementMeaningMetadata(text);

  return {
    level: FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION,
    computable: false,
    expression: {
      type: knownClaim?.expressionType ?? 'partial-claim',
      text,
      normalized,
      wikidata: knownClaim?.wikidata ?? null,
      ast: structured.ast,
      cst: structured.cst,
      linguisticMetadata: structured.linguisticMetadata,
      meaningLinks: structured.meaningLinks,
      variables: structured.variables,
      questions: structured.questions,
    },
    unknowns: knownClaim
      ? []
      : [
          ...structured.variables.map((variable) => variable.name),
          'evidence source mapping',
        ],
    refinementSuggestions: knownClaim
      ? []
      : structured.questions.map((question) => question.text),
  };
}

function evaluateComputableFormalization(formalization, options = {}) {
  const expression = formalization.expression;
  if (expression.type === 'formal-reasoning-program') {
    return formalReasoning.formalReasoningToEvaluationResult(
      formalReasoning.reasonFormalStatements(expression.program, options)
    );
  }
  const rmlEvaluation = evaluateArithmeticWithRelativeMetaLogic(
    expression,
    options
  );
  const actual =
    rmlEvaluation?.actual ?? evaluateArithmeticExpression(expression);
  if (expression.type === 'arithmetic-question') {
    return evaluateArithmeticQuestion(expression, actual, rmlEvaluation);
  }

  return evaluateArithmeticEquality(expression, actual, rmlEvaluation);
}

function evaluateArithmeticQuestion(expression, actual, rmlEvaluation = null) {
  const evidence = {
    id: 'computed-evidence-1',
    polarity: 'support',
    weight: 1,
    sourceType: arithmeticEvidenceSourceType(rmlEvaluation),
    sourceUrl: arithmeticEvidenceSourceUrl(rmlEvaluation),
    retrievedAt: arithmeticEvidenceRetrievedAt(rmlEvaluation),
    claim: `${expression.leftOperand} ${expression.operator} ${expression.rightOperand} evaluates to ${actual}.`,
  };

  return {
    kind: 'computed',
    value: actual,
    actual,
    expected: undefined,
    confidence: 1,
    probability: 1,
    correctness: 1,
    signedConfidence: 1,
    rawBalance: 1,
    calculation: createProbabilityCalculation({
      strategy: arithmeticCalculationStrategy('question', rmlEvaluation),
      truthValue: 1,
      deterministic: true,
      inputs: arithmeticCalculationInputs(expression, actual),
      extra: {
        supportWeight: 1,
        refuteWeight: 0,
        rawConfidence: 1,
        boundedConfidence: 1,
      },
    }),
    supportingEvidence: [evidence],
    refutingEvidence: [],
    explanation: arithmeticEvaluationExplanation(rmlEvaluation),
  };
}

function evaluateArithmeticEquality(expression, actual, rmlEvaluation = null) {
  const value = Object.is(actual, expression.expected);
  const evidence = {
    id: 'computed-evidence-1',
    polarity: value ? 'support' : 'refute',
    weight: 1,
    sourceType: arithmeticEvidenceSourceType(rmlEvaluation),
    sourceUrl: arithmeticEvidenceSourceUrl(rmlEvaluation),
    retrievedAt: arithmeticEvidenceRetrievedAt(rmlEvaluation),
    claim: `${expression.leftOperand} ${expression.operator} ${expression.rightOperand} evaluates to ${actual}.`,
  };
  const metrics = arithmeticEqualityMetrics(value, evidence);

  return {
    kind: 'computed',
    value,
    actual,
    expected: expression.expected,
    confidence: metrics.confidence,
    probability: metrics.probability,
    correctness: metrics.correctness,
    signedConfidence: metrics.signedConfidence,
    rawBalance: metrics.rawBalance,
    calculation: createProbabilityCalculation({
      strategy: arithmeticCalculationStrategy('equality', rmlEvaluation),
      truthValue: metrics.truthValue,
      deterministic: true,
      inputs: arithmeticCalculationInputs(expression, actual),
      extra: {
        supportWeight: metrics.supportWeight,
        refuteWeight: metrics.refuteWeight,
        rawConfidence: metrics.confidence,
        boundedConfidence: metrics.confidence,
      },
    }),
    supportingEvidence: metrics.supportingEvidence,
    refutingEvidence: metrics.refutingEvidence,
    explanation: value
      ? 'The computed value matches the expected value.'
      : 'The computed value does not match the expected value.',
  };
}

function arithmeticEqualityMetrics(value, evidence) {
  if (value) {
    return {
      confidence: 1,
      probability: 1,
      correctness: 1,
      signedConfidence: 1,
      rawBalance: 1,
      truthValue: 1,
      supportWeight: 1,
      refuteWeight: 0,
      supportingEvidence: [evidence],
      refutingEvidence: [],
    };
  }
  return {
    confidence: 0,
    probability: 0,
    correctness: 0,
    signedConfidence: -1,
    rawBalance: -1,
    truthValue: 0,
    supportWeight: 0,
    refuteWeight: 1,
    supportingEvidence: [],
    refutingEvidence: [evidence],
  };
}

function arithmeticCalculationStrategy(kind, rmlEvaluation) {
  if (hasRelativeMetaLogicArithmeticValue(rmlEvaluation)) {
    return `relative-meta-logic-arithmetic-${kind}`;
  }
  return `deterministic-arithmetic-${kind}`;
}

function arithmeticEvidenceSourceType(rmlEvaluation) {
  return hasRelativeMetaLogicArithmeticValue(rmlEvaluation)
    ? 'relative-meta-logic'
    : 'computed';
}

function arithmeticEvidenceSourceUrl(rmlEvaluation) {
  return hasRelativeMetaLogicArithmeticValue(rmlEvaluation)
    ? rmlEvaluation.engine.sourceUrl
    : null;
}

function arithmeticEvidenceRetrievedAt(rmlEvaluation) {
  return hasRelativeMetaLogicArithmeticValue(rmlEvaluation)
    ? rmlEvaluation.engine.mode
    : 'local';
}

function hasRelativeMetaLogicArithmeticValue(rmlEvaluation) {
  return rmlEvaluation?.actual !== null && rmlEvaluation?.actual !== undefined;
}

function arithmeticEvaluationExplanation(rmlEvaluation) {
  return hasRelativeMetaLogicArithmeticValue(rmlEvaluation)
    ? 'The expression was computed through the relative-meta-logic adapter.'
    : 'The expression was computed locally.';
}

function estimateFromEvidence(formalization, evidenceFixtures, options = {}) {
  if (formalization.expression.type === 'self-reference-paradox') {
    return {
      kind: 'evidence-estimate',
      value: 'undetermined',
      confidence: 0.5,
      probability: 0.5,
      correctness: 0.5,
      signedConfidence: 0,
      rawBalance: 0,
      supportWeight: 0,
      refuteWeight: 0,
      calculation: createProbabilityCalculation({
        strategy: 'self-reference-truth-gap',
        truthValue: 0.5,
        valence: 3,
        inputs: [
          {
            kind: 'statement',
            value: formalization.expression.text,
          },
          {
            kind: 'resolution',
            value: 'truth-gap',
          },
        ],
        extra: {
          supportWeight: 0,
          refuteWeight: 0,
          rawConfidence: 0.5,
          boundedConfidence: 0.5,
        },
      }),
      supportingEvidence: [],
      refutingEvidence: [],
      explanation:
        'The selected interpretation is self-referential, so this prototype marks its truth value as undetermined instead of treating missing evidence as unknown.',
    };
  }

  const evidence = evidenceFixtures.filter(
    (item) => item.key === formalization.expression.normalized
  );
  const { weightedEvidence, confidence, boundedConfidence, calculation } =
    scoreEvidenceItems(evidence, {
      ...options,
      defaultBeliefSystem,
      defaultRealWorldUncertainty: realWorldConfidenceEpsilon,
    });

  const boundedSignedConfidence =
    boundedConfidence === null ? null : 2 * boundedConfidence - 1;

  return {
    kind: 'evidence-estimate',
    value: boundedConfidence === null ? 'unknown' : boundedConfidence,
    confidence: boundedConfidence,
    probability: boundedConfidence,
    correctness: boundedConfidence,
    signedConfidence: boundedSignedConfidence,
    rawBalance: confidence.rawBalance,
    supportWeight: confidence.supportWeight,
    refuteWeight: confidence.refuteWeight,
    calculation,
    supportingEvidence: weightedEvidence.filter(
      (item) => item.polarity === 'support'
    ),
    refutingEvidence: weightedEvidence.filter(
      (item) => item.polarity === 'refute'
    ),
    explanation:
      confidence.confidence === null
        ? 'No configured evidence was found for the selected interpretation.'
        : 'Confidence is the weighted support ratio over configured evidence situations, bounded away from absolute certainty for real-world claims.',
  };
}

function addFormalizationDependencies(
  context,
  formalizationLink,
  formalization
) {
  addStructuredMeaningLinks(context, formalizationLink, formalization);
  if (formalization.expression.type === 'formal-reasoning-program') {
    for (const dependency of formalization.expression.dependencies) {
      addLink(context, {
        role: 'depends-on',
        references: [formalizationLink.id],
        value: { relation: dependency.relation, ...dependency },
        provenance: algorithmProvenance('relative-meta-logic-adapter'),
      });
    }
    return;
  }
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

function addStructuredMeaningLinks(context, formalizationLink, formalization) {
  for (const link of formalization.expression.meaningLinks ?? []) {
    addLink(context, {
      role: 'meaning',
      references: [formalizationLink.id],
      value: {
        text: `${link.text} -> ${link.target.id}`,
        phrase: link.text,
        role: link.role,
        targetId: link.target.id,
        targetLabel: link.target.label,
        targetSource: link.target.source,
        sourceUrl: link.target.sourceUrl,
        status: link.status,
        questionIds: (formalization.expression.questions ?? [])
          .filter((question) => question.meaningLinkId === link.id)
          .map((question) => question.id),
      },
      provenance: algorithmProvenance('general-formalization'),
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
      probability: result.probability,
      correctness: result.correctness,
      signedConfidence: result.signedConfidence,
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

function arithmeticCalculationInputs(expression, actual) {
  const inputs = [
    { kind: 'operand', id: 'left', value: expression.leftOperand },
    { kind: 'operator', value: expression.operator },
    { kind: 'operand', id: 'right', value: expression.rightOperand },
    { kind: 'computed-result', value: actual },
  ];
  if (expression.expected !== undefined) {
    inputs.push({ kind: 'expected-result', value: expression.expected });
  }
  return inputs;
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
  const trimmed = input.trim();
  const text = formalReasoning.isFormalReasoningInput(trimmed)
    ? trimmed
    : trimmed.replace(/\s+/g, ' ');
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
