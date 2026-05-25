/* tslint:disable */
/* eslint-disable */

export function analyzeStatementJson(input: string, interpretation_index: number): string;

export function createStatementDraftJson(input: string): string;

export function evaluateStatementJson(input: string, interpretation_index: number): string;

export function formalizeStatementJson(input: string, interpretation_index: number): string;

export function selectInterpretationJson(input: string, interpretation_index: number): string;

export function serializeLinksNotation(input: string, interpretation_index: number): string;

export function statementConfidence(input: string, interpretation_index: number): number;

export function translateKnownSemanticTextJson(input: string, source_language: string, target_language: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly meta_expression_default_translation_match_threshold: () => number;
    readonly meta_expression_issue35_hawaii_meaning_id: () => bigint;
    readonly meta_expression_issue35_phrase_count: () => number;
    readonly meta_expression_issue35_rule_count: () => number;
    readonly meta_expression_issue35_state_meaning_id: () => bigint;
    readonly meta_expression_issue35_us_state_meaning_id: () => bigint;
    readonly meta_expression_issue52_sentence_count: () => number;
    readonly meta_expression_issue52_source_phrase_count: () => number;
    readonly meta_expression_relation_source: (a: bigint, b: bigint) => bigint;
    readonly meta_expression_relation_target: (a: bigint, b: bigint) => bigint;
    readonly meta_expression_translation_quality_status_code: (a: number) => number;
    readonly meta_expression_weighted_support_ratio: (a: number, b: number, c: number) => number;
    readonly meta_expression_wikidata_default_entity_batch_limit: () => number;
    readonly meta_expression_wikimedia_cache_min_jitter_days: () => number;
    readonly meta_expression_wikimedia_cache_ttl_days_from_hash: (a: bigint) => number;
    readonly meta_expression_issue52_target_phrase_count: () => number;
    readonly meta_expression_wikimedia_cache_base_ttl_days: () => number;
    readonly meta_expression_wikimedia_cache_max_jitter_days: () => number;
    readonly analyzeStatementJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly createStatementDraftJson: (a: number, b: number) => [number, number, number, number];
    readonly evaluateStatementJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly formalizeStatementJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly selectInterpretationJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly serializeLinksNotation: (a: number, b: number, c: number) => [number, number, number, number];
    readonly statementConfidence: (a: number, b: number, c: number) => [number, number, number];
    readonly translateKnownSemanticTextJson: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
