import type {
  EvaluationResult,
  Formalization,
  Interpretation,
  SemanticTranslation,
  StatementDraft,
  WasmStatementAnalysis,
} from './index.js';

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

export declare function createWasmCore(wasmModule: unknown): WasmCore;

export declare function loadWasmCore(
  options?: LoadWasmCoreOptions
): Promise<WasmCore>;
