import type { LinksNetwork, StatementAnalysis } from './index.js';

export interface PortableCaseData {
  schema: 'meta-expression.portable-case';
  version: number;
  caseId: string;
  exportedAt: string;
  migratedFrom: string;
  storage: Record<string, unknown>;
  linksNetwork: LinksNetwork;
}

export interface PortableCaseDoublets {
  format: 'meta-expression.portable-case';
  version: number;
  binary: Uint8Array;
  rootIndex: number;
  linksNotation: string;
  portable: PortableCaseData;
}

export type PortableCaseInput =
  | LinksNetwork
  | StatementAnalysis
  | PortableCaseData;

export interface PortableCaseOptions {
  caseId?: string;
  exportedAt?: string;
  migratedFrom?: string;
}

export declare function exportPortableCaseData(
  input: PortableCaseInput,
  options?: PortableCaseOptions
): PortableCaseData;

export declare function importPortableCaseData(
  input: PortableCaseInput,
  options?: PortableCaseOptions
): PortableCaseData;

export declare function savePortableCaseToDoublets(
  input: PortableCaseInput,
  options?: PortableCaseOptions
): PortableCaseDoublets;

export declare function loadPortableCaseFromDoublets(
  input: Uint8Array | { binary: Uint8Array; rootIndex?: number }
): PortableCaseData;
