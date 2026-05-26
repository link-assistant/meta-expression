export interface BeliefSystem {
  id: string;
  name: string;
  probabilityStrategy: string;
  sourceWeights: Record<string, number>;
  evidenceScoring?: Record<string, number>;
  realWorldUncertainty?: number;
}

export interface LinkProvenance {
  sourceType: string;
  method?: string;
  sourceUrl?: string | null;
  retrievedAt?: string | null;
}

export interface LinkRecord<T = unknown> {
  id: string;
  role: string;
  references: string[];
  version?: number;
  value: T;
  provenance: LinkProvenance;
}

export interface LinksNetwork {
  id: string;
  kind: 'links-network';
  version: number;
  beliefSystem: BeliefSystem;
  links: LinkRecord[];
}

export interface Interpretation {
  id: string;
  statementId: string;
  kind: string;
  paraphrase: string;
  examples: string[];
  confidence: number;
  source: string;
  formalizationLevel: number;
}

export interface StatementDraft {
  status: 'selection-required';
  statement: LinkRecord;
  interpretations: Interpretation[];
  linksNetwork: LinksNetwork;
}

export interface Formalization {
  level: number;
  computable: boolean;
  expression: Record<string, unknown>;
  unknowns: string[];
  refinementSuggestions: string[];
}

export interface EvidenceItem {
  id?: string;
  key?: string;
  polarity: 'support' | 'refute';
  weight: number;
  sourceType: string;
  situation?: string | { id: string };
  sourceUrl: string | null;
  retrievedAt: string;
  claim: string;
  identifiers?: Record<string, string>;
  context?: Record<string, unknown>;
  score?: {
    situationId: string;
    label: string;
    probability: number;
    baseWeight: number;
    residual?: boolean;
  };
}

export type TruthRange = [number, number];

export interface ProbabilityCalculationInput {
  kind: string;
  id?: string | null;
  value?: unknown;
  [key: string]: unknown;
}

export interface EvidenceCalculation {
  strategy: string;
  truthValue: number | null;
  truthRange: TruthRange;
  valence: number;
  probability: number | null;
  correctness: number | null;
  signedConfidence: number | null;
  deterministic: boolean;
  bounded: boolean;
  inputs: ProbabilityCalculationInput[];
  supportWeight?: number;
  refuteWeight?: number;
  rawConfidence?: number | null;
  boundedConfidence?: number | null;
  realWorldUncertainty?: number;
  evidence: Array<{
    id?: string;
    polarity: EvidenceItem['polarity'];
    sourceType: string;
    sourceUrl: string | null;
    weight: number;
    situationId: string | null;
    situationLabel: string | null;
    situationProbability: number | null;
    residual: boolean;
    claim: string;
  }>;
}

export interface EvaluationResult {
  kind: 'computed' | 'evidence-estimate';
  value: boolean | number | string | null;
  actual?: number;
  expected?: number;
  confidence: number | null;
  probability: number | null;
  correctness: number | null;
  signedConfidence: number | null;
  rawBalance: number | null;
  supportWeight?: number;
  refuteWeight?: number;
  calculation: EvidenceCalculation;
  supportingEvidence: EvidenceItem[];
  refutingEvidence: EvidenceItem[];
  explanation: string;
}

export interface RelativeMetaLogicEngine {
  evaluate?: (program: string, options?: Record<string, unknown>) => unknown;
  runTactics?: (state: unknown, tactics: unknown[]) => unknown;
  Env?: new (options?: Record<string, unknown>) => unknown;
  createEnv?: (options?: Record<string, unknown>) => unknown;
  evalNode?: (ast: unknown, env: unknown) => unknown;
  parseOne?: (tokens: unknown) => unknown;
  tokenizeOne?: (source: string) => unknown;
  evaluateFormalization?: (
    formalization: unknown,
    options?: Record<string, unknown>
  ) => unknown;
}

export interface RelativeMetaLogicUpstream {
  name: 'relative-meta-logic';
  version: string;
  repository: string;
  commit: string;
  packagePath: string;
  npmPublished: boolean;
  packageSpec: string;
}

export interface RelativeMetaLogicInputMapping {
  supported: boolean;
  inputKind:
    | 'arithmetic'
    | 'formal-reasoning-program'
    | 'partial-formalization';
  formalizationLevel: number | null;
  program?: string;
  ast?: unknown;
  valueKind?: 'truth-value' | 'number';
  query?: string | null;
  dependencies?: FormalReasoningDependency[];
  facts?: FormalReasoningFact[];
  unknowns?: string[];
  refinementSuggestions?: string[];
  engine: RelativeMetaLogicUpstream;
}

export interface FormalReasoningDependency {
  source: string;
  target: string;
  relation: string;
}

export interface FormalReasoningFact {
  statement: string;
  probability: number;
  truthValue?: number | null;
  truthRange?: TruthRange;
  valence?: number;
}

export interface FormalReasoningTraceEvent {
  method: string;
  text: string;
  sourceType: 'relative-meta-logic';
  sourceUrl: string;
}

export interface FormalReasoningSummary {
  query: string | null;
  dependencies: FormalReasoningDependency[];
  facts: FormalReasoningFact[];
}

export interface FormalReasoningResult {
  kind: 'formal-reasoning';
  engine: {
    name: 'relative-meta-logic';
    mode: string;
    sourceUrl: string;
  };
  program: string;
  query: string;
  value: boolean | 'unknown' | 'undetermined';
  confidence: number;
  correctness: number;
  signedConfidence: number | null;
  rawBalance: number | null;
  probability: number | null;
  calculation: EvidenceCalculation;
  truthValue?: number | null;
  truthRange?: TruthRange;
  valence?: number;
  dependencies: FormalReasoningDependency[];
  relations: {
    contradictions: FormalReasoningDependency[];
  };
  facts: FormalReasoningFact[];
  diagnostics: Array<{ code: string; message: string }>;
  trace: FormalReasoningTraceEvent[];
  proof: {
    closed: boolean;
    diagnostics: Array<{ code: string; message: string }>;
    trace: FormalReasoningTraceEvent[];
  };
  evaluation: {
    results: unknown[];
    diagnostics: Array<{ code: string; message: string }>;
  };
}

export interface StatementAnalysis {
  status: 'completed';
  statement: LinkRecord;
  interpretations: Interpretation[];
  selectedInterpretation: Interpretation;
  formalization: Formalization;
  result: EvaluationResult;
  resultLink: LinkRecord;
  linksNetwork: LinksNetwork;
  reasoningStrategy: ReasoningStrategy;
  reasoningSteps: ReasoningStep[];
  alternatives: AlternativeStatement[];
  dependencies: string[];
  definitions: DefinitionEntry[];
  confirmations: ConfirmationOrRefutation[];
  refutations: ConfirmationOrRefutation[];
  opposite: string | null;
}

export interface WasmStatementAnalysis {
  status: 'completed';
  statement: LinkRecord;
  interpretations: Interpretation[];
  selectedInterpretation: Interpretation;
  formalization: Formalization;
  result: EvaluationResult;
  resultLink: LinkRecord;
  linksNetwork: LinksNetwork;
}

export interface AnalysisOptions {
  topK?: number;
  interpretationId?: string;
  interpretationIndex?: number;
  selectedBy?: string;
  beliefSystem?: BeliefSystem;
  evidence?: EvidenceItem[];
  evidenceScoring?: Record<string, number>;
  userBeliefs?: Record<string, number> | Map<string, number>;
  realWorldUncertainty?: number;
  includeFixtureEvidence?: boolean;
  wikimediaClient?: WikimediaEvidenceClient;
  fetch?: typeof fetch;
  cache?: Map<string, unknown>;
  cacheTtlMs?: number;
  now?: () => number;
  reasoningStrategyId?: string;
  preferenceProfile?: PreferenceProfile;
  relativeMetaLogic?: RelativeMetaLogicEngine;
  rmlEngine?: RelativeMetaLogicEngine;
  relativeMetaLogicOptions?: Record<string, unknown>;
}

export interface PreferenceBeliefDefinition {
  id: string;
  statement: string;
  label: string;
  group: 'worldview' | 'religion';
  defaultProbability: number;
  visibleWhen?: {
    beliefId: string;
    greaterThan: number;
  };
}

export interface PreferenceContextDefinition {
  id: string;
  label: string;
  beliefs: Array<{
    statement: string;
    probability: number;
  }>;
}

export interface PreferenceEvidenceSituationDefinition {
  id: string;
  label: string;
  group: 'knowledge-source';
  defaultProbability: number;
}

export interface PreferenceProfile {
  version?: number;
  activeContextId?: string;
  beliefs?: Record<string, number> | Array<{ id: string; probability: number }>;
  evidenceScoring?:
    | Record<string, number>
    | Array<{ id: string; probability: number }>;
}

export interface NormalizedPreferenceProfile {
  version: number;
  activeContextId: string;
  beliefs: Record<string, number>;
  evidenceScoring: Record<string, number>;
}

export interface PreparedExample {
  input: string;
  label: string;
  category: string;
  description: string;
  opposite: string | null;
}

export interface ReasoningStrategy {
  id: string;
  name: string;
  summary: string;
  order: string[];
}

export interface ReasoningStep extends LinkRecord {
  reasoningPhase: string;
  executionOrder: number;
}

export interface AlternativeStatement {
  text: string;
  reason: string;
  confidence: number;
}

export interface DefinitionEntry {
  phrase: string;
  label: string;
  wikidataId: string;
  sourceUrl: string;
  role: string;
}

export interface ConfirmationOrRefutation {
  quote: string;
  sourceType: string;
  sourceUrl: string | null;
  weight: number;
}

export interface FormalizationLevelDetail {
  level: number;
  name: string;
  summary: string;
  executable: boolean;
}

export interface IssueReportOptions {
  repoUrl?: string;
  labels?: string;
  pageUrl?: string;
  userAgent?: string;
  timestamp?: string;
}

export interface WikimediaEvidenceClient {
  cache: Map<string, unknown>;
  resolveEvidence(
    input: string,
    options?: AnalysisOptions
  ): Promise<EvidenceItem[]>;
}

export declare const defaultBeliefSystem: BeliefSystem;

export declare const preferenceBeliefDefinitions: readonly PreferenceBeliefDefinition[];

export declare const preferenceContextDefinitions: readonly PreferenceContextDefinition[];

export declare const preferenceEvidenceSituationDefinitions: readonly PreferenceEvidenceSituationDefinition[];

export declare function createDefaultPreferenceProfile(): NormalizedPreferenceProfile;

export declare function normalizePreferenceProfile(
  profile?: PreferenceProfile
): NormalizedPreferenceProfile;

export declare function getPreferenceBeliefProbability(
  profile: PreferenceProfile,
  beliefId: string
): number;

export declare function getPreferenceEvidenceSituationProbability(
  profile: PreferenceProfile,
  situationId: string
): number;

export declare function setPreferenceBelief(
  profile: PreferenceProfile,
  beliefId: string,
  probability: number
): NormalizedPreferenceProfile;

export declare function setPreferenceEvidenceSituation(
  profile: PreferenceProfile,
  situationId: string,
  probability: number
): NormalizedPreferenceProfile;

export declare function setPreferenceContext(
  profile: PreferenceProfile,
  contextId: string
): NormalizedPreferenceProfile;

export declare function isPreferenceBeliefVisible(
  definitionOrId: PreferenceBeliefDefinition | string,
  profile: PreferenceProfile
): boolean;

export declare function listVisiblePreferenceBeliefs(
  profile: PreferenceProfile
): PreferenceBeliefDefinition[];

export declare function serializePreferenceProfile(
  profile: PreferenceProfile
): string;

export declare function parsePreferenceProfile(
  text: string
): NormalizedPreferenceProfile;

export declare function createPreferenceEvidence(
  profile?: PreferenceProfile
): EvidenceItem[];

export declare const FORMALIZATION_LEVELS: {
  readonly RAW_TEXT: 1;
  readonly STRUCTURED_MEANING_LINKS: 2;
  readonly PARTIAL_FORMAL_EXPRESSION: 3;
  readonly FULLY_COMPUTABLE_EXPRESSION: 4;
};

export declare const FORMALIZATION_LEVEL_DETAILS: Record<
  number,
  FormalizationLevelDetail
>;

export declare const add: (a: number, b: number) => number;

export declare const multiply: (a: number, b: number) => number;

export declare const delay: (ms: number) => Promise<void>;

export declare function getPreparedExamples(): PreparedExample[];

export declare function getRandomExamples(
  count?: number,
  options?: {
    random?: () => number;
    pool?: PreparedExample[];
  }
): PreparedExample[];

export declare function findExampleOpposite(input: string): string | null;

export declare function createSeededRandom(seed: number): () => number;

export declare const reasoningStrategies: Record<string, ReasoningStrategy>;

export declare const defaultReasoningStrategyId: string;

export declare function getReasoningStrategy(
  strategyId: string
): ReasoningStrategy;

export declare function listReasoningStrategies(): ReasoningStrategy[];

export declare function orderReasoningSteps(
  links: LinkRecord[],
  strategyId: string
): ReasoningStep[];

export declare function classifyReasoningPhase(role: string): string;

export interface DisambiguationMatch {
  kind: 'entity' | 'predicate';
  phrase: string;
  tokens: string[];
  position: number;
  wikidata: {
    id: string;
    label: string;
    description?: string;
    sourceUrl: string;
  };
}

export interface DisambiguationResult {
  text: string;
  tokens: string[];
  matches: DisambiguationMatch[];
  candidates: Interpretation[];
}

export declare function disambiguatePhrases(
  text: string,
  options?: {
    entities?: Record<string, unknown>;
    predicates?: Record<string, unknown>;
    maxNgramSize?: number;
  }
): DisambiguationResult;

export declare function describeDisambiguation(text: string): Array<{
  phrase: string;
  role: string;
  wikidataId: string;
  label: string;
  sourceUrl: string;
  text: string;
}>;

export declare function describeFormalizationLevel(
  level: number
): FormalizationLevelDetail;

export declare function createStatementDraft(
  input: string,
  options?: AnalysisOptions
): StatementDraft;

export declare function analyzeStatement(
  input: string,
  options?: AnalysisOptions
): StatementAnalysis;

export declare function analyzeStatementWithLiveEvidence(
  input: string,
  options?: AnalysisOptions
): Promise<StatementAnalysis>;

export declare function createWikimediaEvidenceClient(
  options?: AnalysisOptions
): WikimediaEvidenceClient;

export declare function resolveLiveEvidence(
  input: string,
  options?: AnalysisOptions
): Promise<EvidenceItem[]>;

export declare function generateInterpretations(
  input: string,
  options?: AnalysisOptions
): Interpretation[];

export declare function serializeLinksNotation(
  linksNetwork: LinksNetwork
): string;

export declare function createIssueReportUrl(
  analysis: StatementAnalysis,
  options?: IssueReportOptions
): string;

export declare function computeEvidenceConfidence(
  evidenceItems: EvidenceItem[]
): {
  confidence: number | null;
  rawBalance: number | null;
  supportWeight: number;
  refuteWeight: number;
};

export declare function normalizeTruthValue(
  value: unknown,
  options?: { truthRange?: TruthRange; valence?: number }
): {
  truthValue: number | null;
  truthRange: TruthRange;
  valence: number;
  probability: number | null;
  correctness: number | null;
  signedConfidence: number | null;
};

export declare function createProbabilityCalculation(options?: {
  strategy?: string;
  truthValue?: unknown;
  truthRange?: TruthRange;
  valence?: number;
  probability?: number | null;
  deterministic?: boolean;
  bounded?: boolean;
  inputs?: ProbabilityCalculationInput[];
  extra?: Record<string, unknown>;
}): EvidenceCalculation;

export declare const RELATIVE_META_LOGIC_UPSTREAM: RelativeMetaLogicUpstream;

export declare function mapFormalizationToRelativeMetaLogicInput(
  formalization: Formalization
): RelativeMetaLogicInputMapping;

export declare function isFormalReasoningInput(input: unknown): boolean;

export declare function summarizeFormalReasoningProgram(
  input: string
): FormalReasoningSummary;

export declare function createFormalReasoningInterpretations(
  text: string,
  formalizationLevels: typeof FORMALIZATION_LEVELS
): Interpretation[];

export declare function createFormalReasoningFormalization(
  text: string,
  level: number
): Formalization;

export declare function reasonFormalStatements(
  input: string,
  options?: AnalysisOptions
): FormalReasoningResult;

export declare function formalReasoningToEvaluationResult(
  reasoning: FormalReasoningResult
): EvaluationResult;

export type FormalizeLinkTargetMode = 'wikipedia' | 'wikidata' | 'local-viewer';

export declare const FORMALIZE_LINK_TARGETS: {
  readonly WIKIPEDIA: 'wikipedia';
  readonly WIKIDATA: 'wikidata';
  readonly LOCAL: 'local-viewer';
};

export type FormalizationProviderStatus =
  | 'candidate'
  | 'selected'
  | 'validated';

export declare const FORMALIZATION_PROVIDER_STATUS: {
  readonly CANDIDATE: 'candidate';
  readonly SELECTED: 'selected';
  readonly VALIDATED: 'validated';
};

export type InterpretationDisplayMode =
  | 'id'
  | 'name'
  | 'name+meaning'
  | 'meaning'
  | 'replace';

export declare const INTERPRETATION_DISPLAY_MODES: {
  readonly ID: 'id';
  readonly NAME: 'name';
  readonly NAME_AND_MEANING: 'name+meaning';
  readonly MEANING: 'meaning';
  readonly REPLACE: 'replace';
};

export declare function formatInterpretationPhrase(
  phrase: {
    text: string;
    entityId?: string | null;
    entityLabel?: string | null;
    entityDescription?: string | null;
  },
  mode?: InterpretationDisplayMode
): string;

export declare function interpretationKey(interpretation: {
  phrases?: Array<{ entityId?: string | null }>;
}): string;

export interface FormalizeNgram {
  text: string;
  tokens: string[];
  start: number;
  end: number;
  size: number;
}

export interface FormalizeCandidate {
  id: string;
  label: string;
  description: string;
  kind: 'entity' | 'property';
  source?: string | null;
  sourceUrl?: string | null;
  matchText?: string;
  score: number;
  ngramSize: number;
}

export interface FormalizePhraseEntity {
  id: string;
  label: string;
  description: string;
  kind: 'entity' | 'property';
  source?: string | null;
  sourceUrl?: string | null;
  score: number;
  wikipediaUrl: string | null;
  wikipediaTitle: string | null;
  contextLabels: Array<{
    property: string;
    propertyLabel: string;
    targetId: string;
  }>;
}

export interface LinguisticFragment {
  id: string;
  type:
    | 'word'
    | 'symbol'
    | 'noun-phrase'
    | 'verb-phrase'
    | 'subject'
    | 'predicate'
    | 'object'
    | string;
  role: string;
  text: string;
  tokens: string[];
  tokenStart: number | null;
  tokenEnd: number | null;
  sourceStart: number | null;
  sourceEnd: number | null;
  phraseIds: string[];
  version: number;
  provenance: LinguisticProvenance;
}

export interface LinguisticDependency {
  id: string;
  relation: 'nsubj' | 'root' | 'obj' | string;
  headFragmentId: string;
  dependentFragmentId: string;
  source: string;
  version: number;
  provenance: LinguisticProvenance;
}

export interface LinguisticRelation {
  id: string;
  type: 'subject-predicate-object' | 'subject-predicate' | string;
  subjectFragmentId: string;
  predicateFragmentId: string;
  objectFragmentId: string | null;
  text: string;
  sourceStart: number;
  sourceEnd: number;
  version: number;
  provenance: LinguisticProvenance;
}

export interface LinguisticParserDescriptor {
  id: string;
  version: number;
  language: string;
  strategy: string;
}

export interface LinguisticProvenance {
  sourceType: 'algorithm' | string;
  method: string;
  parserId: string;
  parserVersion: number;
  layer: string;
}

export interface LinguisticCstToken {
  type: 'token-cst' | string;
  id: string;
  version: number;
  text: string;
  index: number;
  sourceStart: number | null;
  sourceEnd: number | null;
  sentenceBoundaryAfter: boolean;
  provenance: LinguisticProvenance;
}

export interface LinguisticCstSymbol {
  type: 'symbol-cst' | string;
  id: string;
  version: number;
  text: string;
  sourceStart: number;
  sourceEnd: number;
  provenance: LinguisticProvenance;
}

export interface LinguisticCstSentence {
  type: 'sentence-cst' | string;
  id: string;
  version: number;
  text: string;
  tokenStart: number;
  tokenEnd: number;
  sourceStart: number;
  sourceEnd: number;
  predicateToken: number | null;
  subjectRange: Record<string, number> | null;
  predicateRange: Record<string, number> | null;
  objectPhraseRange: Record<string, number> | null;
  objectRange: Record<string, number> | null;
  nounPhraseRanges: Array<Record<string, number>>;
  verbPhraseRange: Record<string, number> | null;
  dependencies: Array<Record<string, string>>;
  relationType: string | null;
  subjectFragmentId?: string | null;
  predicateFragmentId?: string | null;
  objectFragmentId?: string | null;
  relationId?: string | null;
  dependencyIds?: string[];
  provenance: LinguisticProvenance;
}

export interface LinguisticCst {
  type: 'document-cst' | string;
  version: number;
  text: string;
  language: string;
  parser: LinguisticParserDescriptor;
  tokens: LinguisticCstToken[];
  symbols: LinguisticCstSymbol[];
  sentences: LinguisticCstSentence[];
  provenance: LinguisticProvenance;
}

export interface LinguisticAstNode {
  type: string;
  id?: string;
  version?: number;
  parser?: LinguisticParserDescriptor;
  provenance?: LinguisticProvenance;
  text: string;
  body?: LinguisticAstNode[];
  tokenStart?: number;
  tokenEnd?: number;
  sourceStart?: number;
  sourceEnd?: number;
  subject?: Record<string, unknown> | null;
  predicate?: Record<string, unknown> | null;
  object?: Record<string, unknown> | null;
  relationId?: string | null;
  dependencyIds?: string[];
}

export interface LinguisticMetadata {
  version: number;
  language: string;
  parser: LinguisticParserDescriptor;
  provenance: LinguisticProvenance;
  text: string;
  fragments: LinguisticFragment[];
  dependencies: LinguisticDependency[];
  relations: LinguisticRelation[];
  ast: LinguisticAstNode;
  cst: LinguisticCst;
}

export interface FormalizePhrase {
  text: string;
  tokens: string[];
  start: number;
  end: number;
  size: number;
  candidates: FormalizeCandidate[];
  entity: FormalizePhraseEntity | null;
}

export interface FormalizeContext {
  id: string;
  property: string;
  propertyLabel: string;
  weight: number;
  probability: number;
  phrases: Array<{ text: string; entityId: string }>;
}

export interface FormalizationProviderTruthScoring {
  included: false;
  eligible: boolean;
  reason: string;
}

export interface FormalizationProviderProvenance {
  sourceType: string;
  method: string;
  providerId: string;
  providerVersion: string | null;
  retrievedAt: string | null;
  sourceUrl?: string | null;
}

export interface FormalizationProviderTarget {
  id: string | null;
  label: string | null;
  description: string | null;
  kind: string | null;
  source: string | null;
  sourceUrl: string | null;
}

export interface FormalizationProviderPart {
  text: string;
  sourceStart: number | null;
  sourceEnd: number | null;
  target: FormalizationProviderTarget | null;
}

export interface FormalizationProviderCandidateBase {
  id: string;
  providerId: string;
  kind: string;
  confidence: number | null;
  status: FormalizationProviderStatus;
  selected: boolean;
  validated: boolean;
  truthScoring: FormalizationProviderTruthScoring;
  provenance: FormalizationProviderProvenance;
}

export interface FormalizationProviderTriple extends FormalizationProviderCandidateBase {
  kind: 'triple';
  subject: FormalizationProviderPart;
  predicate: FormalizationProviderPart;
  object: FormalizationProviderPart;
}

export interface FormalizationProviderRoleArgument extends FormalizationProviderPart {
  id: string;
  role: string;
}

export interface FormalizationProviderRole extends FormalizationProviderCandidateBase {
  kind: 'semantic-role-frame';
  predicate: FormalizationProviderPart;
  arguments: FormalizationProviderRoleArgument[];
}

export interface FormalizationProviderEntityLink
  extends FormalizationProviderCandidateBase, FormalizationProviderPart {
  kind: 'entity-link';
  target: FormalizationProviderTarget | null;
}

export interface FormalizationProviderGraph extends FormalizationProviderCandidateBase {
  kind: 'semantic-graph';
  format: string;
  text: string;
  nodes: unknown[];
  edges: unknown[];
}

export interface FormalizationProviderDiagnostic {
  id: string;
  providerId: string;
  level: string;
  message: string;
}

export interface FormalizationProviderSummary {
  id: string;
  name: string;
  kind: string;
  sourceType: string;
  version: string | null;
  status: FormalizationProviderStatus;
  retrievedAt: string | null;
  confidence: number | null;
  truthScoring: FormalizationProviderTruthScoring;
  provenance: FormalizationProviderProvenance;
  diagnostics: FormalizationProviderDiagnostic[];
  candidateCounts: {
    triples: number;
    roles: number;
    entityLinks: number;
    graphs: number;
  };
}

export interface FormalizationProviderCandidates {
  type: 'formalization-provider-candidates';
  version: number;
  status: 'candidate-only' | 'empty';
  truthScoring: FormalizationProviderTruthScoring;
  providers: FormalizationProviderSummary[];
  triples: FormalizationProviderTriple[];
  roles: FormalizationProviderRole[];
  entityLinks: FormalizationProviderEntityLink[];
  graphs: FormalizationProviderGraph[];
  diagnostics: FormalizationProviderDiagnostic[];
}

export interface FormalizationProviderContext {
  language: string;
  now?: () => number;
}

export type FormalizationProviderOutput =
  | FormalizationProviderCandidates
  | Record<string, unknown>
  | Array<Record<string, unknown>>;

export interface FormalizationProvider {
  id?: string;
  name?: string;
  kind?: string;
  sourceType?: string;
  version?: string | null;
  extract(
    text: string,
    context: FormalizationProviderContext
  ): FormalizationProviderOutput | Promise<FormalizationProviderOutput>;
}

export type TransformationRule =
  | {
      id?: string;
      pattern: string | RegExp;
      replacement?: string;
      flags?: string;
    }
  | {
      id?: string;
      assign: Record<string, unknown>;
    }
  | LinksNotationRewriteTransformationRule
  | LinksNotationSimplifyTransformationRule
  | {
      id?: string;
      apply(
        value: unknown,
        context: TransformationContext
      ): unknown | Promise<unknown>;
    }
  | ((
      value: unknown,
      context: TransformationContext
    ) => unknown | Promise<unknown>);

export interface TransformationContext {
  phase: string;
  steps: TranslationStep[];
  trace?: boolean;
}

export type LinksNotationRewriteDirection =
  | 'forward'
  | 'left-to-right'
  | '->'
  | 'backward'
  | 'right-to-left'
  | '<-'
  | 'reverse';

export type LinksNotationRewriteOccurrence = 'all' | 'first' | number | string;

export type LinksNotationRewriteEquality =
  | string
  | {
      from: string;
      to: string;
    }
  | {
      left: string;
      right: string;
    };

export interface LinksNotationRewriteOptions {
  direction?: LinksNotationRewriteDirection;
  occurrence?: LinksNotationRewriteOccurrence;
  at?: LinksNotationRewriteOccurrence;
}

export interface LinksNotationSimplifyOptions {
  direction?: LinksNotationRewriteDirection;
  maxSteps?: number;
  simplifyMaxSteps?: number;
}

export interface LinksNotationRewriteTransformationRule extends LinksNotationRewriteOptions {
  id?: string;
  rewrite:
    | LinksNotationRewriteEquality
    | ({
        equality?: LinksNotationRewriteEquality;
      } & LinksNotationRewriteOptions)
    | ({ rule?: LinksNotationRewriteEquality } & LinksNotationRewriteOptions)
    | ({ eq?: LinksNotationRewriteEquality } & LinksNotationRewriteOptions);
  target?: string | string[];
  path?: string | string[];
}

export interface LinksNotationSimplifyTransformationRule extends LinksNotationSimplifyOptions {
  id?: string;
  simplify:
    | true
    | LinksNotationRewriteEquality
    | LinksNotationRewriteEquality[]
    | ({
        rules?: LinksNotationRewriteEquality | LinksNotationRewriteEquality[];
        rewriteRules?:
          | LinksNotationRewriteEquality
          | LinksNotationRewriteEquality[];
      } & LinksNotationSimplifyOptions);
  rules?: LinksNotationRewriteEquality | LinksNotationRewriteEquality[];
  rewriteRules?: LinksNotationRewriteEquality | LinksNotationRewriteEquality[];
  target?: string | string[];
  path?: string | string[];
}

export declare function rewriteLinksNotation(
  value: string,
  equality: LinksNotationRewriteEquality,
  options?: LinksNotationRewriteOptions
): string;

export declare function simplifyLinksNotation(
  value: string,
  rules: LinksNotationRewriteEquality | LinksNotationRewriteEquality[],
  options?: LinksNotationSimplifyOptions
): string;

export declare function applyTextTransformationRules(
  value: unknown,
  rules?: TransformationRule | TransformationRule[],
  context?: Partial<TransformationContext>
): Promise<string>;

export declare function applyObjectTransformationRules<T>(
  value: T,
  rules?: TransformationRule | TransformationRule[],
  context?: Partial<TransformationContext>
): Promise<T>;

export declare function applySentenceTextTransformationRules(
  sentences: TranslationSentence[],
  rules?: TransformationRule | TransformationRule[],
  context?: Partial<TransformationContext>
): Promise<TranslationSentence[]>;

export interface FormalizeInterpretation {
  rank: number;
  score: number;
  phrases: Array<{
    text: string;
    entityId: string | null;
    kind?: 'entity' | 'property' | null;
    entityLabel?: string | null;
    entityDescription?: string | null;
  }>;
}

export interface FormalizationCstEntity {
  id: string;
  label: string;
  description: string;
  kind: 'entity' | 'property' | string;
  source: string | null;
  sourceUrl: string | null;
  wikipediaUrl: string | null;
  wikipediaTitle: string | null;
  score: number;
  url: string;
}

export interface FormalizationCstCandidate {
  id: string;
  label: string;
  description: string;
  kind: 'entity' | 'property' | string;
  score: number;
  source: string | null;
  sourceUrl: string | null;
  url: string;
}

export interface FormalizationCstPhrase {
  type: 'phrase';
  id: string;
  text: string;
  tokens: string[];
  start: number;
  end: number;
  sourceStart: number | null;
  sourceEnd: number | null;
  size: number;
  linguisticRole: string | null;
  linguisticFragmentIds: string[];
  entity: FormalizationCstEntity | null;
  candidates: FormalizationCstCandidate[];
}

export interface FormalizationCst {
  type: 'formalization';
  version: number;
  text: string;
  tokens: string[];
  linkTargetMode: FormalizeLinkTargetMode;
  ast: LinguisticAstNode;
  linguisticMetadata: LinguisticMetadata;
  providerCandidates: FormalizationProviderCandidates;
  phrases: FormalizationCstPhrase[];
  contexts: FormalizeContext[];
}

export interface FormalizeOptions {
  fetch?: typeof fetch | null;
  cache?: Map<string, unknown>;
  cacheTtlMs?: number;
  now?: () => number;
  maxNgramSize?: number;
  searchLimit?: number;
  searchConcurrency?: number;
  topKCandidates?: number;
  maxInterpretations?: number;
  linkTargetMode?: FormalizeLinkTargetMode;
  contextLens?: string | { id: string } | null;
  language?: string;
  beforeFormalizationRules?: TransformationRule | TransformationRule[];
  preFormalizationRules?: TransformationRule | TransformationRule[];
  afterFormalizationRules?: TransformationRule | TransformationRule[];
  postFormalizationRules?: TransformationRule | TransformationRule[];
  providers?: FormalizationProvider | FormalizationProvider[];
  providerOutputs?: FormalizationProviderOutput | FormalizationProviderOutput[];
}

export interface FormalizeResult {
  text: string;
  tokens: string[];
  ast: LinguisticAstNode;
  linguisticMetadata: LinguisticMetadata;
  phrases: FormalizePhrase[];
  contexts: FormalizeContext[];
  mainContext: FormalizeContext | null;
  additionalContexts: FormalizeContext[];
  providerCandidates: FormalizationProviderCandidates;
  interpretations: FormalizeInterpretation[];
  markdown: string;
  html: string;
  linksNotation: string;
  cst: FormalizationCst;
  linksNetwork: LinksNetwork;
  linkTargetMode: FormalizeLinkTargetMode;
  steps: TranslationStep[];
}

export declare function formalizeText(
  input: string,
  options?: FormalizeOptions
): Promise<FormalizeResult>;

export declare function formalizeTextWith(
  input: string,
  options?: FormalizeOptions
): Promise<FormalizeResult>;

export declare function markdownFromFormalizationCst(
  cst: FormalizationCst
): string;

export declare function createFixtureFormalizationProvider(
  fixture: FormalizationProviderOutput
): FormalizationProvider;

export declare function collectFormalizationProviderCandidates(
  text: string,
  options?: Partial<FormalizeOptions>
): Promise<FormalizationProviderCandidates>;

export declare function extractLinguisticMetadata(
  input: string,
  options?: {
    language?: string;
    tokenSpans?: Array<Record<string, unknown>>;
  }
): LinguisticMetadata;

export declare function annotateLinguisticMetadataPhraseRefs<
  T extends { start: number; end: number; id: string },
>(metadata: LinguisticMetadata, phrases: T[]): LinguisticMetadata;

export interface TranslateOptions extends FormalizeOptions {
  sourceLanguage?: string;
  targetLanguage?: string;
  from?: string;
  to?: string;
  translationStrategy?: TranslationStrategyId;
  strategy?: TranslationStrategyId;
  beforeTranslationRules?: TransformationRule | TransformationRule[];
  preTranslationRules?: TransformationRule | TransformationRule[];
  afterTranslationRules?: TransformationRule | TransformationRule[];
  postTranslationRules?: TransformationRule | TransformationRule[];
  beforeNaturalizationRules?: TransformationRule | TransformationRule[];
  preNaturalizationRules?: TransformationRule | TransformationRule[];
  naturalizationRules?: TransformationRule | TransformationRule[];
  afterNaturalizationRules?: TransformationRule | TransformationRule[];
  postNaturalizationRules?: TransformationRule | TransformationRule[];
  beforeDeformalizationRules?: TransformationRule | TransformationRule[];
  preDeformalizationRules?: TransformationRule | TransformationRule[];
  deformalizationRules?: TransformationRule | TransformationRule[];
  afterDeformalizationRules?: TransformationRule | TransformationRule[];
  postDeformalizationRules?: TransformationRule | TransformationRule[];
}

export interface NaturalizeOptions {
  sourceLanguage?: string;
  targetLanguage?: string;
  from?: string;
  to?: string;
  trace?: boolean;
  beforeNaturalizationRules?: TransformationRule | TransformationRule[];
  preNaturalizationRules?: TransformationRule | TransformationRule[];
  naturalizationRules?: TransformationRule | TransformationRule[];
  afterNaturalizationRules?: TransformationRule | TransformationRule[];
  postNaturalizationRules?: TransformationRule | TransformationRule[];
  beforeDeformalizationRules?: TransformationRule | TransformationRule[];
  preDeformalizationRules?: TransformationRule | TransformationRule[];
  deformalizationRules?: TransformationRule | TransformationRule[];
  afterDeformalizationRules?: TransformationRule | TransformationRule[];
  postDeformalizationRules?: TransformationRule | TransformationRule[];
}

export type TranslationStrategyId =
  | 'contextual-glossary'
  | 'semantic-label'
  | 'lexical-glossary';

export declare const TRANSLATION_STRATEGIES: Readonly<{
  CONTEXTUAL_GLOSSARY: 'contextual-glossary';
  SEMANTIC_LABEL: 'semantic-label';
  LEXICAL_GLOSSARY: 'lexical-glossary';
}>;

export interface TranslationStrategy {
  id: TranslationStrategyId;
  label: string;
  description: string;
}

export declare function listTranslationStrategies(): TranslationStrategy[];

export interface TranslationAnswer {
  optionId?: string | null;
  selectedOptionId?: string | null;
  targetText?: string | null;
  entityId?: string | null;
  targetUrl?: string | null;
  description?: string | null;
}

export declare function applyTranslationQuestionAnswers(
  result: TranslateResult,
  answers:
    | Record<string, string | TranslationAnswer>
    | Map<string, string | TranslationAnswer>
    | Array<TranslationAnswer & { variableName: string }>
): TranslateResult;

export interface TranslationVariable {
  name: string;
  sourceText: string;
  entityId: string | null;
  reason: string;
  resolvedByRule?: boolean;
  resolvedByAnswer?: boolean;
}

export interface TranslationPhrase {
  id: string;
  entityId: string | null;
  source: {
    text: string;
    start: number;
    end: number;
    sourceStart: number | null;
    sourceEnd: number | null;
    language: string;
    entityId: string | null;
    label: string | null;
    description: string | null;
    url: string | null;
    source: string | null;
  };
  target: {
    text: string;
    language: string | null;
    entityId: string | null;
    description: string | null;
    url: string | null;
    source?: string | null;
    sourceUrl?: string | null;
    status: string;
    strategy?: string | null;
  };
  variable: TranslationVariable | null;
}

export interface SemanticPhrase {
  text: string;
  meaningId: string;
  start: number;
  end: number;
}

export interface SemanticTranslation {
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  targetText: string;
  sourcePhrases: SemanticPhrase[];
  targetPhrases: SemanticPhrase[];
  transformationSteps: string[];
}

export interface TranslationTargetUnit {
  id: string;
  kind: string;
  phraseId: string | null;
  semanticLinkId: string | null;
  sourceText: string | null;
  targetText: string;
  plainText: string;
  markdown: string;
  html: string;
  targetEntityId: string | null;
  targetUrl: string | null;
}

export interface TranslationQuestionOption {
  id: string;
  label: string;
  targetText: string | null;
  entityId?: string | null;
  targetUrl?: string | null;
  description: string;
  confidence: number;
}

export interface TranslationQuestion {
  variableName: string;
  sourceText: string;
  entityId: string | null;
  reason: string;
  question: string;
  selectedOptionId: string;
  options: TranslationQuestionOption[];
}

export interface TranslationSentence {
  id: string;
  source: {
    text: string;
    start: number;
    end: number;
    language: string;
  };
  target: {
    text: string;
    markdown: string;
    html: string;
    language: string;
  };
  phrases: TranslationPhrase[];
  transformations: string[];
  resolvedVariableNames: string[];
  targetUnits: TranslationTargetUnit[];
  plainText: string;
  markdown: string;
  html: string;
}

export interface SemanticMetaLanguageLink {
  id: string;
  sourceText: string;
  sourceStart: number | null;
  sourceEnd: number | null;
  tokenStart: number;
  tokenEnd: number;
  sourceLanguage: string;
  sourceFragment: {
    phraseId: string;
    role: string | null;
    fragmentIds: string[];
  } | null;
  meaning: {
    id: string | null;
    label: string | null;
    description: string | null;
    url: string | null;
    source: string | null;
  };
  targetHint: string | null;
  status: string;
}

export interface SemanticMetaLanguage {
  type: 'semantic-meta-language';
  version: number;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  representation: 'links-notation';
  sourceLinksNotation: string;
  links: SemanticMetaLanguageLink[];
  linksNotation: string;
}

export interface TranslationNaturalizationSentence {
  id: string;
  semanticLinkIds: string[];
  targetText: string;
  targetMarkdown: string;
  targetHtml: string;
  targetUnits: TranslationTargetUnit[];
  transformations: string[];
}

export interface TranslationNaturalization {
  type: 'naturalization';
  version: number;
  sourceLanguage: string;
  targetLanguage: string;
  semanticMetaLanguageId: string;
  semanticLinkIds: string[];
  targetText: string;
  targetMarkdown: string;
  targetHtml: string;
  sentences: TranslationNaturalizationSentence[];
  linksNotation: string;
}

export interface TranslationStep {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface TranslationCstSentence {
  type: 'sentence';
  id: string;
  sourceText: string;
  sourceStart: number;
  sourceEnd: number;
  targetText: string;
  targetMarkdown: string;
  targetHtml: string;
  targetUnits: TranslationTargetUnit[];
  transformations: string[];
  phraseIds: string[];
}

export interface TranslationCst {
  type: 'translation';
  version: number;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  formalization: FormalizationCst;
  semanticMetaLanguage: SemanticMetaLanguage;
  naturalization: TranslationNaturalization;
  deformalization: TranslationNaturalization;
  phrases: TranslationPhrase[];
  variables: TranslationVariable[];
  sentences: TranslationCstSentence[];
  steps: TranslationStep[];
}

export interface NaturalizationCstUnit {
  type: 'naturalization-unit';
  id: string;
  role: string | null;
  sourceText: string;
  targetText: string;
  semanticLinkId: string | null;
  targetEntityId: string | null;
  targetUrl: string | null;
}

export interface NaturalizationCst {
  type: 'naturalization';
  version: number;
  inputFormat: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceExpression: unknown;
  sourceLinksNotation: string | null;
  naturalization: TranslationNaturalization;
  deformalization: TranslationNaturalization;
  units: NaturalizationCstUnit[];
  steps: TranslationStep[];
}

export interface TranslateResult {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  formalization: FormalizeResult;
  semanticMetaLanguage: SemanticMetaLanguage;
  naturalization: TranslationNaturalization;
  deformalization: TranslationNaturalization;
  cst: TranslationCst;
  phrases: TranslationPhrase[];
  sentences: TranslationSentence[];
  plainText: string;
  markdown: string;
  html: string;
  linksNotation: string;
  variables: TranslationVariable[];
  questions: string[];
  questionDetails: TranslationQuestion[];
  steps: TranslationStep[];
}

export interface NaturalizeResult {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  naturalization: TranslationNaturalization;
  deformalization: TranslationNaturalization;
  cst: NaturalizationCst;
  units: NaturalizationCstUnit[];
  plainText: string;
  markdown: string;
  html: string;
  linksNotation: string;
  steps: TranslationStep[];
}

export interface FormalAiTranslationPrompt {
  type: 'translation';
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  promptLanguage: string;
}

export interface FormalAiTranslationPromptResult extends TranslateResult {
  formalAiPrompt: FormalAiTranslationPrompt;
  intent: string;
  answer: string;
  evidenceLinks: string[];
}

export declare const SUPPORTED_FORMAL_AI_TRANSLATION_LANGUAGES: readonly [
  'en',
  'ru',
  'hi',
  'zh',
];

export declare function parseFormalAiTranslationPrompt(
  input: string
): FormalAiTranslationPrompt | null;

export declare function translateFormalAiPrompt(
  input: string,
  options?: TranslateOptions
): Promise<FormalAiTranslationPromptResult>;

export declare function translateFormalAiPromptWith(
  input: string,
  options?: TranslateOptions
): Promise<FormalAiTranslationPromptResult>;

export interface CheckStatementColor {
  hue: number;
  foreground: string;
  background: string;
  border: string;
}

export interface CheckStatement {
  id: string;
  text: string;
  start: number;
  end: number;
  analysisInput: string;
  correctness: number | null;
  wrongness: number | null;
  color: CheckStatementColor;
  result: {
    kind: EvaluationResult['kind'];
    value: EvaluationResult['value'];
    confidence: EvaluationResult['confidence'];
    calculation?: EvidenceCalculation;
    explanation: string;
  };
  analysis: StatementAnalysis;
}

export interface CheckSummary {
  total: number;
  correct: number;
  wrong: number;
  uncertain: number;
  averageCorrectness: number | null;
  averageWrongness: number | null;
}

export interface CheckResult {
  status: 'checked';
  text: string;
  summary: CheckSummary;
  statements: CheckStatement[];
  html: string;
  markdown: string;
  linksNotation: string;
}

export interface ClaimReviewVerdict {
  label: string;
  ratingValue: number | null;
  bestRating: number;
  worstRating: number;
  correctness: number | null;
  polarity: EvidenceItem['polarity'];
}

export interface ClaimReviewImportResult {
  status: 'imported';
  format: 'schema.org/ClaimReview';
  claim: {
    text: string;
    itemReviewed: unknown;
  };
  verdict: ClaimReviewVerdict;
  source: {
    url: string | null;
    author: {
      type: string | null;
      name: string | null;
      url: string | null;
    } | null;
    publishedAt: string | null;
    modifiedAt: string | null;
    claimSource: Record<string, unknown>;
  };
  provenance: {
    sourceType: 'claim-review';
    sourceUrl: string | null;
    retrievedAt: string;
    schemaContext: string;
    schemaType: 'ClaimReview';
    sourceExampleUrl: string | null;
  };
  evidence: EvidenceItem;
  evidenceItems: EvidenceItem[];
  jsonLd: Record<string, unknown>;
}

export interface ClaimReviewOptions {
  retrievedAt?: string | number | Date;
  now?: () => string | number | Date;
  sourceExampleUrl?: string;
  sourceUrl?: string;
  factCheckUrl?: string;
  url?: string;
  author?: Record<string, unknown>;
  authorName?: string;
  statementIndex?: number;
}

export type LiteratureDecisionPolarity = 'support' | 'refute' | 'uncertain';

export interface LiteratureAuthor {
  given: string | null;
  family: string | null;
  literal?: string | null;
}

export interface LiteratureExcerpt {
  id: string;
  section: string | null;
  page: string | null;
  text: string;
}

export interface LiteratureDecision {
  polarity: LiteratureDecisionPolarity;
  weight: number;
  label: string;
  rationale: string | null;
}

export interface LiteraturePaper {
  id: string;
  citationKey: string;
  type: string;
  title: string;
  authors: LiteratureAuthor[];
  journal: string | null;
  publisher: string | null;
  year: string;
  date: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  pmid: string | null;
  url: string | null;
  abstract?: string | null;
  decision: LiteratureDecision;
  excerpts: LiteratureExcerpt[];
}

export interface LiteratureReviewInput {
  claim: string | { text: string; domain?: string };
  query?: Record<string, unknown>;
  screenedAt?: string | number | Date;
  screeningMethod?: string;
  papers: Array<Partial<LiteraturePaper> & Record<string, unknown>>;
}

export interface LiteratureAgreementSummary {
  label:
    | 'supports'
    | 'refutes'
    | 'mixed-support'
    | 'mixed-refute'
    | 'uncertain';
  supportWeight: number;
  refuteWeight: number;
  rawBalance: number | null;
  uncertainty: number;
}

export interface LiteratureReviewResult {
  status: 'reviewed';
  kind: 'literature-review';
  claim: { text: string; domain: string | null };
  query: Record<string, unknown> | null;
  screenedAt: string;
  screeningMethod: string;
  papers: LiteraturePaper[];
  evidenceItems: EvidenceItem[];
  checked: CheckResult;
  summary: {
    totalPapers: number;
    screenedPapers: number;
    supportingPapers: number;
    refutingPapers: number;
    uncertainPapers: number;
    evidenceLinks: number;
    confidence: number | null;
    agreement: LiteratureAgreementSummary;
  };
  bibliography: {
    papers: Array<Omit<LiteraturePaper, 'abstract' | 'decision' | 'excerpts'>>;
  };
}

export interface LiteratureReviewOptions extends AnalysisOptions {
  screenedAt?: string | number | Date;
}

export type LiteratureBibliographyFormat = 'bibtex' | 'bib' | 'ris' | 'csv';

export interface EvidenceProvenanceExportOptions {
  baseId?: string;
  exportedAt?: string | number | Date;
  now?: () => string | number | Date;
  linksNotation?: string;
}

export interface EvidenceGraphExportOptions extends EvidenceProvenanceExportOptions {
  limit?: number;
}

export interface EvidenceJsonLdExport extends Record<string, unknown> {
  '@context': Record<string, unknown>;
  '@id': string;
  '@type': string[];
  format: 'meta-expression-evidence-json-ld';
  sourceSurface: 'analyze' | 'check';
  exportedAt: string;
  analyses: Record<string, unknown>[];
  evidenceRecords: Record<string, unknown>[];
  sources: Record<string, unknown>[];
  linksNotation: string;
}

export interface EvidenceProvJsonLdExport extends Record<string, unknown> {
  '@context': Record<string, string>;
  '@id': string;
  '@type': string[];
  format: 'meta-expression-prov-o-json-ld';
  sourceSurface: 'analyze' | 'check';
  exportedAt: string;
  linksNotation: string;
  '@graph': Record<string, unknown>[];
}

export interface EvidenceRdfTriplesExport extends Record<string, unknown> {
  format: 'meta-expression-rdf-triples';
  sourceSurface: 'analyze' | 'check';
  exportedAt: string;
  triples: Record<string, unknown>[];
  mappings: Record<string, string>[];
  guardrails: Record<string, unknown> | null;
}

export interface EvidencePropertyGraphExport extends Record<string, unknown> {
  format: 'meta-expression-property-graph';
  sourceSurface: 'analyze' | 'check';
  exportedAt: string;
  nodes: Record<string, unknown>[];
  relationships: Record<string, unknown>[];
  mappings: Record<string, string>[];
  guardrails: Record<string, unknown> | null;
}

export interface ScopedSparqlEvidenceExport extends Record<string, unknown> {
  format: 'meta-expression-scoped-sparql';
  sourceSurface: 'analyze' | 'check';
  exportedAt: string;
  query: string;
  scope: Record<string, unknown>;
  limits: Record<string, unknown>;
  guardrails: Record<string, unknown> | null;
}

export type UniquenessSuggestedAction =
  | 'cite-or-quote'
  | 'review-matches'
  | 'likely-original';

export interface UniquenessSearchStatement {
  id?: string;
  text: string;
  start: number;
  end: number;
  query: string;
}

export interface UniquenessSearchContext {
  fetch?: typeof fetch | null;
  limit: number;
  now: string;
  sources: UniquenessSource[];
}

export interface UniquenessSource {
  id: string;
  label: string;
  search(
    statement: UniquenessSearchStatement,
    ctx: UniquenessSearchContext
  ): Promise<UniquenessSourceMatch[]>;
}

export interface UniquenessSpan {
  start: number;
  end: number;
  text: string;
}

export interface UniquenessExclusion {
  id: string;
  ruleId: string;
  reason: string;
  span: UniquenessSpan;
}

export interface UniquenessSourceMatch {
  sourceId?: string;
  sourceLabel?: string;
  title?: string;
  url?: string | null;
  sourceUrl?: string | null;
  snippet?: string;
  sourceText?: string;
  sourceSpan?: UniquenessSpan | null;
  score?: number;
  matchStrength?: number;
  strength?: number;
  matchKind?: string;
  inputSpan?: UniquenessSpan;
}

export interface UniquenessMatch {
  sourceId: string;
  sourceLabel: string;
  title: string;
  url: string | null;
  sourceUrl: string | null;
  snippet: string;
  sourceText: string;
  sourceSpan: UniquenessSpan | null;
  score: number;
  matchStrength: number;
  matchKind: string;
  inputSpan: UniquenessSpan;
  excluded: boolean;
  exclusion: UniquenessExclusion | null;
}

export interface UniquenessStatement {
  id: string;
  text: string;
  start: number;
  end: number;
  query: string;
  existingLikelihood: number;
  uniqueness: number;
  suggestedAction: UniquenessSuggestedAction;
  matches: UniquenessMatch[];
  exclusions: UniquenessExclusion[];
  sourceErrors: Array<{
    sourceId: string;
    sourceLabel: string;
    error: string;
  }>;
  checkedAt: string;
  color: CheckStatementColor;
}

export interface UniquenessSummary {
  total: number;
  citeOrQuote: number;
  reviewMatches: number;
  likelyOriginal: number;
  averageExistingLikelihood: number | null;
  averageUniqueness: number | null;
}

export interface OriginalityReportMatch {
  id: string;
  statementId: string;
  statementText: string;
  sourceId: string;
  sourceLabel: string;
  sourceTitle: string;
  sourceUrl: string | null;
  matchKind: string;
  score: number;
  strength: number;
  matchStrength: number;
  inputSpan: UniquenessSpan;
  sourceSpan: UniquenessSpan | null;
  excluded: boolean;
  exclusion: UniquenessExclusion | null;
}

export interface OriginalityReportSource {
  sourceId: string;
  sourceLabel: string;
  sourceTitle: string;
  sourceUrl: string | null;
  matchCount: number;
  excludedMatchCount: number;
  strongestMatch: number;
  averageStrength: number;
}

export interface OriginalityReport {
  kind: 'document-originality-report';
  checkedAt: string;
  document: {
    textLength: number;
    statementCount: number;
  };
  overallExistingLikelihood: number;
  overallUniqueness: number;
  averageExistingLikelihood: number | null;
  averageUniqueness: number | null;
  scoredMatchCount: number;
  excludedMatchCount: number;
  matchedSources: OriginalityReportSource[];
  matches: OriginalityReportMatch[];
  exclusions: UniquenessExclusion[];
}

export interface UniquenessResult {
  status: 'checked';
  text: string;
  existingLikelihood: number | null;
  uniqueness: number | null;
  summary: UniquenessSummary;
  statements: UniquenessStatement[];
  originalityReport: OriginalityReport;
  html: string;
  markdown: string;
  linksNotation: string;
}

export interface UniquenessConfiguredExclusion {
  id?: string;
  ruleId?: string;
  reason?: string;
  start?: number;
  end?: number;
  text?: string;
  span?: Partial<UniquenessSpan>;
}

export interface UniquenessOptions {
  fetch?: typeof fetch | null;
  language?: string;
  limit?: number;
  sources?: UniquenessSource[];
  exclusions?: UniquenessConfiguredExclusion[];
  excludeQuotedText?: boolean;
  excludeReferences?: boolean;
  crossref?: {
    mailto?: string;
  };
  now?: (() => string | number | Date) | string | number | Date;
}

export declare function translateText(
  input: string,
  options?: TranslateOptions
): Promise<TranslateResult>;

export declare function translateTextWith(
  input: string,
  options?: TranslateOptions
): Promise<TranslateResult>;

export declare function naturalizeExpression(
  input: unknown,
  options?: NaturalizeOptions
): Promise<NaturalizeResult>;

export declare function naturalizeExpressionWith(
  input: unknown,
  options?: NaturalizeOptions
): Promise<NaturalizeResult>;

export declare function deformalizeExpression(
  input: unknown,
  options?: NaturalizeOptions
): Promise<NaturalizeResult>;

export declare function deformalizeExpressionWith(
  input: unknown,
  options?: NaturalizeOptions
): Promise<NaturalizeResult>;

export declare function checkText(
  input: string,
  options?: AnalysisOptions & { locale?: string }
): CheckResult;

export declare function checkTextWithLiveEvidence(
  input: string,
  options?: AnalysisOptions & { locale?: string }
): Promise<CheckResult>;

export declare function parseClaimReviewJsonLd(
  input: string | Record<string, unknown> | unknown[],
  options?: ClaimReviewOptions
): ClaimReviewImportResult;

export declare function importClaimReviewJsonLd(
  input: string | Record<string, unknown> | unknown[],
  options?: ClaimReviewOptions
): ClaimReviewImportResult;

export declare function exportClaimReviewJsonLd(
  input: CheckResult | CheckStatement | StatementAnalysis,
  options?: ClaimReviewOptions
): Record<string, unknown>;

export declare function reviewClaimAgainstLiterature(
  input: LiteratureReviewInput,
  options?: LiteratureReviewOptions
): LiteratureReviewResult;

export declare function createLiteratureEvidenceItems(
  input: LiteratureReviewInput,
  options?: LiteratureReviewOptions
): EvidenceItem[];

export declare function exportLiteratureBibliography(
  input: LiteratureReviewResult | LiteratureReviewInput | LiteraturePaper[],
  options?: { format?: LiteratureBibliographyFormat }
): string;

export declare function exportLiteratureBibTeX(
  input: LiteratureReviewResult | LiteratureReviewInput | LiteraturePaper[]
): string;

export declare function exportLiteratureRis(
  input: LiteratureReviewResult | LiteratureReviewInput | LiteraturePaper[]
): string;

export declare function exportLiteratureCsv(
  input: LiteratureReviewResult | LiteratureReviewInput | LiteraturePaper[]
): string;

export declare function exportEvidenceJsonLd(
  input: StatementAnalysis | CheckResult,
  options?: EvidenceProvenanceExportOptions
): EvidenceJsonLdExport;

export declare function exportEvidenceProvJsonLd(
  input: StatementAnalysis | CheckResult,
  options?: EvidenceProvenanceExportOptions
): EvidenceProvJsonLdExport;

export declare function exportScopedSparqlEvidence(
  input: StatementAnalysis | CheckResult,
  options?: EvidenceGraphExportOptions
): ScopedSparqlEvidenceExport;

export declare function exportEvidenceRdfTriples(
  input: StatementAnalysis | CheckResult,
  options?: EvidenceGraphExportOptions
): EvidenceRdfTriplesExport;

export declare function importEvidenceRdfTriples(
  input: EvidenceRdfTriplesExport | Record<string, unknown>
): Record<string, unknown>;

export declare function exportEvidencePropertyGraph(
  input: StatementAnalysis | CheckResult,
  options?: EvidenceGraphExportOptions
): EvidencePropertyGraphExport;

export declare function importEvidencePropertyGraph(
  input: EvidencePropertyGraphExport | Record<string, unknown>
): Record<string, unknown>;

export declare function searchTextUniqueness(
  input: string,
  options?: UniquenessOptions
): Promise<UniquenessResult>;

export declare function createDefaultUniquenessSources(
  options?: UniquenessOptions
): UniquenessSource[];

export declare function createWikipediaUniquenessSource(options?: {
  language?: string;
}): UniquenessSource;

export declare function createOpenAlexUniquenessSource(): UniquenessSource;

export declare function createCrossrefUniquenessSource(options?: {
  mailto?: string;
}): UniquenessSource;

export declare function createDuckDuckGoUniquenessSource(): UniquenessSource;

export declare function tokenizeForFormalize(text: string): string[];

export declare function generateFormalizeNgrams(
  tokens: string[],
  maxSize?: number
): FormalizeNgram[];

export declare function buildFormalizeMarkdownLink(
  phrase: FormalizePhrase,
  options?: { linkTargetMode?: FormalizeLinkTargetMode }
): string;

export declare function buildFormalizeHtmlLink(
  phrase: FormalizePhrase,
  options?: { linkTargetMode?: FormalizeLinkTargetMode }
): string;

export declare function resolveFormalizeLinkTarget(
  phrase: FormalizePhrase,
  options?: { linkTargetMode?: FormalizeLinkTargetMode }
): string | null;

export type TranslationQualityStatus =
  | 'matched'
  | 'skipped'
  | 'translation-fix'
  | 'fix-suggested'
  | 'failed'
  | 'no-statement';

export interface TranslationQualityArticle {
  enTitle?: string | null;
  qId?: string | null;
  sourceLanguage: string;
  targetLanguage: string;
  sourceExtract: string;
  targetExtract: string;
}

export interface TranslationQualitySkipEntry {
  source: string;
  reason?: string;
}

export interface TranslationQualityFixEntry {
  source: string;
  target: string;
  note?: string;
}

export interface TranslationQualityOptions {
  skipList?: Array<string | TranslationQualitySkipEntry>;
  translationFixes?: TranslationQualityFixEntry[];
  fetch?: typeof fetch;
  cache?: Map<string, unknown> | null;
  now?: () => number | Date | string;
  matchThreshold?: number;
  translationStrategy?: string;
}

export interface TranslationCoverage {
  ratio: number;
  found: string[];
  missing: string[];
}

export interface TranslationQualityResult {
  enTitle: string | null;
  qId: string | null;
  sourceLanguage: string;
  targetLanguage: string;
  sourceStatement: string;
  status: TranslationQualityStatus;
  translatedStatement?: string;
  reason?: string;
  coverage?: TranslationCoverage;
  roundTripText?: string;
  roundTripCoverage?: TranslationCoverage;
  suggestedTranslation?: string;
  note?: string | null;
}

export interface TranslationQualitySummary {
  total: number;
  matched: number;
  skipped: number;
  'translation-fix': number;
  'fix-suggested': number;
  failed: number;
  'no-statement': number;
  failures: TranslationQualityResult[];
}

export interface TranslationQualityReport {
  results: TranslationQualityResult[];
  summary: TranslationQualitySummary;
}

export declare function assessArticleTranslation(
  article: TranslationQualityArticle,
  options?: TranslationQualityOptions
): Promise<TranslationQualityResult>;

export declare function assessArticleSet(
  articles: Array<{
    enTitle?: string;
    qId?: string;
    languages?: string[];
    pages?: Record<string, { extract: string }>;
  }>,
  options?: TranslationQualityOptions
): Promise<TranslationQualityReport>;

export declare function selectLanguagePair(entry: {
  languages?: string[];
  pages?: Record<string, { extract: string }>;
}): {
  sourceLanguage: string | null;
  targetLanguage: string | null;
  sourceExtract: string;
  targetExtract: string;
};

export declare function summarizeAssessment(
  results: TranslationQualityResult[]
): TranslationQualitySummary;

export declare function extractFirstStatement(text: string): string;

export declare function tokenCoverage(
  candidate: string,
  target: string
): TranslationCoverage;

export declare function tokenizeForMatch(text: string): string[];

export declare function normalizeStatementKey(text: string): string;

export interface WasmCore {
  createStatementDraft(input: string): StatementDraft;
  selectInterpretation(
    input: string,
    interpretationIndex?: number
  ): Interpretation;
  formalizeStatement(
    input: string,
    interpretationIndex?: number
  ): Formalization;
  evaluateStatement(
    input: string,
    interpretationIndex?: number
  ): EvaluationResult;
  analyzeStatement(
    input: string,
    interpretationIndex?: number
  ): WasmStatementAnalysis;
  statementConfidence(input: string, interpretationIndex?: number): number;
  serializeLinksNotation(input: string, interpretationIndex?: number): string;
  translateKnownSemanticText(
    input: string,
    sourceLanguage: string,
    targetLanguage: string
  ): SemanticTranslation;
  naturalizeFormalExpression(input: string): string;
  deformalizeFormalExpression(input: string): string;
}

export interface LoadWasmCoreOptions {
  module?: unknown;
  moduleUrl?: string | URL;
  wasmUrl?: string | URL;
  wasmBytes?: BufferSource;
  initialize?: boolean;
}

export * from './durable-storage.js';

export declare function createWasmCore(wasmModule: unknown): WasmCore;

export declare function loadWasmCore(
  options?: LoadWasmCoreOptions
): Promise<WasmCore>;
