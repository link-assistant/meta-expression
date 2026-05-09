export interface BeliefSystem {
  id: string;
  name: string;
  probabilityStrategy: string;
  sourceWeights: Record<string, number>;
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
  sourceUrl: string | null;
  retrievedAt: string;
  claim: string;
  identifiers?: Record<string, string>;
  context?: Record<string, unknown>;
}

export interface EvaluationResult {
  kind: 'computed' | 'evidence-estimate';
  value: boolean | number | string | null;
  actual?: number;
  expected?: number;
  confidence: number | null;
  correctness: number | null;
  signedConfidence: number | null;
  rawBalance: number | null;
  supportWeight?: number;
  refuteWeight?: number;
  supportingEvidence: EvidenceItem[];
  refutingEvidence: EvidenceItem[];
  explanation: string;
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

export interface AnalysisOptions {
  topK?: number;
  interpretationId?: string;
  interpretationIndex?: number;
  selectedBy?: string;
  beliefSystem?: BeliefSystem;
  evidence?: EvidenceItem[];
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

export interface PreferenceProfile {
  version?: number;
  activeContextId?: string;
  beliefs?: Record<string, number> | Array<{ id: string; probability: number }>;
}

export interface NormalizedPreferenceProfile {
  version: number;
  activeContextId: string;
  beliefs: Record<string, number>;
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

export declare function createDefaultPreferenceProfile(): NormalizedPreferenceProfile;

export declare function normalizePreferenceProfile(
  profile?: PreferenceProfile
): NormalizedPreferenceProfile;

export declare function getPreferenceBeliefProbability(
  profile: PreferenceProfile,
  beliefId: string
): number;

export declare function setPreferenceBelief(
  profile: PreferenceProfile,
  beliefId: string,
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

export type FormalizeLinkTargetMode = 'wikipedia' | 'wikidata' | 'local-viewer';

export declare const FORMALIZE_LINK_TARGETS: {
  readonly WIKIPEDIA: 'wikipedia';
  readonly WIKIDATA: 'wikidata';
  readonly LOCAL: 'local-viewer';
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
  matchText?: string;
  score: number;
  ngramSize: number;
}

export interface FormalizePhraseEntity {
  id: string;
  label: string;
  description: string;
  kind: 'entity' | 'property';
  score: number;
  wikipediaUrl: string | null;
  wikipediaTitle: string | null;
  contextLabels: Array<{
    property: string;
    propertyLabel: string;
    targetId: string;
  }>;
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
  entity: FormalizationCstEntity | null;
  candidates: FormalizationCstCandidate[];
}

export interface FormalizationCst {
  type: 'formalization';
  version: number;
  text: string;
  tokens: string[];
  linkTargetMode: FormalizeLinkTargetMode;
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
  topKCandidates?: number;
  maxInterpretations?: number;
  linkTargetMode?: FormalizeLinkTargetMode;
  contextLens?: string | { id: string } | null;
  language?: string;
}

export interface FormalizeResult {
  text: string;
  tokens: string[];
  phrases: FormalizePhrase[];
  contexts: FormalizeContext[];
  mainContext: FormalizeContext | null;
  additionalContexts: FormalizeContext[];
  interpretations: FormalizeInterpretation[];
  markdown: string;
  html: string;
  linksNotation: string;
  cst: FormalizationCst;
  linksNetwork: LinksNetwork;
  linkTargetMode: FormalizeLinkTargetMode;
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

export interface TranslateOptions extends FormalizeOptions {
  sourceLanguage?: string;
  targetLanguage?: string;
  from?: string;
  to?: string;
}

export interface TranslationVariable {
  name: string;
  sourceText: string;
  entityId: string | null;
  reason: string;
  resolvedByRule?: boolean;
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
  };
  target: {
    text: string;
    language: string | null;
    description: string | null;
    url: string | null;
    status: string;
  };
  variable: TranslationVariable | null;
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
  plainText: string;
  markdown: string;
  html: string;
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
  phrases: TranslationPhrase[];
  variables: TranslationVariable[];
  sentences: TranslationCstSentence[];
  steps: TranslationStep[];
}

export interface TranslateResult {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  formalization: FormalizeResult;
  cst: TranslationCst;
  phrases: TranslationPhrase[];
  sentences: TranslationSentence[];
  plainText: string;
  markdown: string;
  html: string;
  linksNotation: string;
  variables: TranslationVariable[];
  questions: string[];
  steps: TranslationStep[];
}

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

export declare function translateText(
  input: string,
  options?: TranslateOptions
): Promise<TranslateResult>;

export declare function translateTextWith(
  input: string,
  options?: TranslateOptions
): Promise<TranslateResult>;

export declare function checkText(
  input: string,
  options?: AnalysisOptions & { locale?: string }
): CheckResult;

export declare function checkTextWithLiveEvidence(
  input: string,
  options?: AnalysisOptions & { locale?: string }
): Promise<CheckResult>;

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
