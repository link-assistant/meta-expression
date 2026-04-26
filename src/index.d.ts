export interface BeliefSystem {
  id: string;
  name: string;
  probabilityStrategy: string;
  sourceWeights: Record<string, number>;
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
}

export interface EvaluationResult {
  kind: 'computed' | 'evidence-estimate';
  value: boolean | number | string | null;
  actual?: number;
  expected?: number;
  confidence: number | null;
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
}

export interface AnalysisOptions {
  topK?: number;
  interpretationId?: string;
  interpretationIndex?: number;
  selectedBy?: string;
  beliefSystem?: BeliefSystem;
  evidence?: EvidenceItem[];
}

export declare const defaultBeliefSystem: BeliefSystem;

export declare const FORMALIZATION_LEVELS: {
  readonly RAW_TEXT: 1;
  readonly STRUCTURED_MEANING_LINKS: 2;
  readonly PARTIAL_FORMAL_EXPRESSION: 3;
  readonly FULLY_COMPUTABLE_EXPRESSION: 4;
};

export declare const add: (a: number, b: number) => number;

export declare const multiply: (a: number, b: number) => number;

export declare const delay: (ms: number) => Promise<void>;

export declare function createStatementDraft(
  input: string,
  options?: AnalysisOptions
): StatementDraft;

export declare function analyzeStatement(
  input: string,
  options?: AnalysisOptions
): StatementAnalysis;

export declare function generateInterpretations(
  input: string,
  options?: AnalysisOptions
): Interpretation[];

export declare function serializeLinksNotation(
  linksNetwork: LinksNetwork
): string;

export declare function computeEvidenceConfidence(
  evidenceItems: EvidenceItem[]
): {
  confidence: number | null;
  rawBalance: number | null;
  supportWeight: number;
  refuteWeight: number;
};
