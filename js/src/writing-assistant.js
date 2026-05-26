import { analyzeStatement, analyzeStatementWithLiveEvidence } from './index.js';
import { checkText, checkTextWithLiveEvidence } from './check.js';
import { formalizeTextWith } from './formalize.js';
import { createIssueReportUrl, serializeLinksNotation } from './reporting.js';
import { translateTextWith } from './translate.js';
import { searchTextUniqueness } from './uniqueness.js';

export const WRITING_ASSISTANT_OPERATIONS = Object.freeze({
  ANALYZE: 'analyze',
  CHECK: 'check',
  FORMALIZE: 'formalize',
  TRANSLATE: 'translate',
  UNIQUENESS: 'uniqueness',
});

export const WRITING_ASSISTANT_SURFACES = Object.freeze({
  BROWSER_EXTENSION: 'browser-extension',
  EDITOR_EXTENSION: 'editor-extension',
  DOCUMENT_ADDIN: 'document-addin',
  EMBEDDED: 'embedded-writing-assistant',
});

export const WRITING_ASSISTANT_GUARDRAILS = Object.freeze({
  naturalLanguageFirst: true,
  candidateSuggestionsExplicit: true,
  candidateSuggestionsRequireSelection: true,
  candidateSuggestionsAreTruthEvidence: false,
  evidenceChecksCarryEvidence: true,
  evidenceChecksAreStyleRewrites: false,
  styleRewritesProvidedByCore: false,
});

const operationAliases = new Map([
  ['analysis', WRITING_ASSISTANT_OPERATIONS.ANALYZE],
  ['fact-check', WRITING_ASSISTANT_OPERATIONS.CHECK],
  ['factcheck', WRITING_ASSISTANT_OPERATIONS.CHECK],
  ['originality', WRITING_ASSISTANT_OPERATIONS.UNIQUENESS],
  ['originality-check', WRITING_ASSISTANT_OPERATIONS.UNIQUENESS],
  ['uniquness', WRITING_ASSISTANT_OPERATIONS.UNIQUENESS],
]);

const defaultServices = Object.freeze({
  analyzeStatement,
  analyzeStatementWithLiveEvidence,
  checkText,
  checkTextWithLiveEvidence,
  formalizeTextWith,
  translateTextWith,
  searchTextUniqueness,
  createIssueReportUrl,
  serializeLinksNotation,
});

export function listWritingAssistantCapabilities() {
  return [
    {
      operation: WRITING_ASSISTANT_OPERATIONS.ANALYZE,
      api: 'analyzeStatement',
      exports: ['linksNotation', 'issueReportUrl'],
      suggestionKinds: ['candidate-interpretation'],
    },
    {
      operation: WRITING_ASSISTANT_OPERATIONS.CHECK,
      api: 'checkText',
      exports: ['linksNotation', 'issueReportUrl', 'issueReportUrls'],
      suggestionKinds: ['evidence-check'],
    },
    {
      operation: WRITING_ASSISTANT_OPERATIONS.FORMALIZE,
      api: 'formalizeTextWith',
      exports: ['linksNotation'],
      suggestionKinds: ['candidate-formalization-link'],
    },
    {
      operation: WRITING_ASSISTANT_OPERATIONS.TRANSLATE,
      api: 'translateTextWith',
      exports: ['linksNotation'],
      suggestionKinds: ['translation-question'],
    },
    {
      operation: WRITING_ASSISTANT_OPERATIONS.UNIQUENESS,
      api: 'searchTextUniqueness',
      exports: ['linksNotation'],
      suggestionKinds: ['originality-check'],
    },
  ];
}

export function createWritingAssistantSurface(options = {}) {
  const surface = normalizeSurface(options.surface);
  const baseOptions = {
    ...options,
    surface,
    services: mergeServices(options.services),
  };
  const run = (request) => runWritingAssistantOperation(request, baseOptions);

  return Object.freeze({
    kind: 'writing-assistant-surface',
    surface,
    guardrails: WRITING_ASSISTANT_GUARDRAILS,
    capabilities: listWritingAssistantCapabilities(),
    run,
    analyze: (text, request = {}) =>
      run({
        ...request,
        operation: WRITING_ASSISTANT_OPERATIONS.ANALYZE,
        text,
      }),
    check: (text, request = {}) =>
      run({ ...request, operation: WRITING_ASSISTANT_OPERATIONS.CHECK, text }),
    formalize: (text, request = {}) =>
      run({
        ...request,
        operation: WRITING_ASSISTANT_OPERATIONS.FORMALIZE,
        text,
      }),
    translate: (text, request = {}) =>
      run({
        ...request,
        operation: WRITING_ASSISTANT_OPERATIONS.TRANSLATE,
        text,
      }),
    uniqueness: (text, request = {}) =>
      run({
        ...request,
        operation: WRITING_ASSISTANT_OPERATIONS.UNIQUENESS,
        text,
      }),
  });
}

export async function runWritingAssistantOperation(request, options = {}) {
  const normalizedRequest = isObject(request) ? request : {};
  const operation = operationFromRequest(normalizedRequest);
  const text = textFromRequest(normalizedRequest);
  const context = contextFromRequest(normalizedRequest, options);
  const services = mergeServices(options.services);
  const operationOptions = collectOperationOptions(
    operation,
    normalizedRequest,
    options
  );
  const reportOptions = collectReportOptions(
    normalizedRequest,
    options,
    context
  );
  const result = await callOperation(
    operation,
    text,
    operationOptions,
    services
  );

  return {
    kind: 'writing-assistant-operation-result',
    operation,
    surface: normalizeSurface(normalizedRequest.surface ?? options.surface),
    status: result?.status ?? 'completed',
    text,
    context,
    guardrails: WRITING_ASSISTANT_GUARDRAILS,
    suggestions: collectSuggestions(operation, result),
    exports: collectExports(operation, result, services, reportOptions),
    result,
  };
}

export function createMockWritingAssistantExtensionHarness(options = {}) {
  const assistantSurface =
    isObject(options.surface) && typeof options.surface.run === 'function'
      ? options.surface
      : createWritingAssistantSurface(options);
  const defaultContext = normalizeContext(options.context);
  const createSelection = (text, context = {}) => ({
    text: String(text ?? ''),
    ...defaultContext,
    ...normalizeContext(context),
  });
  const runSelection = (operation, selection, request = {}) => {
    const selectedText =
      typeof selection === 'string'
        ? selection
        : String(selection?.text ?? request.text ?? '');
    const selectionContext =
      typeof selection === 'string' ? {} : normalizeContext(selection);
    const context = {
      ...defaultContext,
      ...selectionContext,
      ...normalizeContext(request.context),
    };
    return assistantSurface.run({
      ...request,
      operation,
      text: selectedText,
      context,
    });
  };

  return Object.freeze({
    kind: 'mock-writing-assistant-extension-harness',
    surface: assistantSurface.surface,
    guardrails: assistantSurface.guardrails,
    createSelection,
    runSelection,
    async verifySelectionExports(operation, selection, request = {}) {
      const result = await runSelection(operation, selection, request);
      return verifyWritingAssistantEmbeddedExports(result);
    },
  });
}

export function verifyWritingAssistantEmbeddedExports(result) {
  const issueReportUrls = Array.isArray(result?.exports?.issueReportUrls)
    ? result.exports.issueReportUrls
    : [];
  const hasIssueReportUrl =
    typeof result?.exports?.issueReportUrl === 'string' &&
    result.exports.issueReportUrl.includes('/issues/new?');
  const hasLinksNotation =
    typeof result?.exports?.linksNotation === 'string' &&
    result.exports.linksNotation.trim().length > 0;
  const errors = [];

  if (!hasLinksNotation) {
    errors.push('Missing Links Notation export.');
  }
  if (
    [
      WRITING_ASSISTANT_OPERATIONS.ANALYZE,
      WRITING_ASSISTANT_OPERATIONS.CHECK,
    ].includes(result?.operation) &&
    !hasIssueReportUrl &&
    issueReportUrls.length === 0
  ) {
    errors.push('Missing prefilled issue report URL.');
  }

  return {
    ok: errors.length === 0,
    linksNotation: hasLinksNotation,
    issueReportUrl: hasIssueReportUrl,
    issueReportUrls,
    errors,
  };
}

function callOperation(operation, text, options, services) {
  switch (operation) {
    case WRITING_ASSISTANT_OPERATIONS.ANALYZE:
      return options.live === true
        ? services.analyzeStatementWithLiveEvidence(text, options)
        : services.analyzeStatement(text, options);
    case WRITING_ASSISTANT_OPERATIONS.CHECK:
      return options.live === true
        ? services.checkTextWithLiveEvidence(text, options)
        : services.checkText(text, options);
    case WRITING_ASSISTANT_OPERATIONS.FORMALIZE:
      return services.formalizeTextWith(text, options);
    case WRITING_ASSISTANT_OPERATIONS.TRANSLATE:
      return services.translateTextWith(text, options);
    case WRITING_ASSISTANT_OPERATIONS.UNIQUENESS:
      return services.searchTextUniqueness(text, options);
    default:
      throw new Error(`Unsupported writing-assistant operation: ${operation}`);
  }
}

function collectSuggestions(operation, result) {
  switch (operation) {
    case WRITING_ASSISTANT_OPERATIONS.ANALYZE:
      return collectInterpretationSuggestions(result, operation);
    case WRITING_ASSISTANT_OPERATIONS.CHECK:
      return collectEvidenceCheckSuggestions(result, operation);
    case WRITING_ASSISTANT_OPERATIONS.FORMALIZE:
      return collectFormalizeSuggestions(result, operation);
    case WRITING_ASSISTANT_OPERATIONS.TRANSLATE:
      return collectTranslateSuggestions(result, operation);
    case WRITING_ASSISTANT_OPERATIONS.UNIQUENESS:
      return collectUniquenessSuggestions(result, operation);
    default:
      return [];
  }
}

function collectInterpretationSuggestions(analysis, operation) {
  return (analysis?.interpretations ?? []).map((interpretation, index) =>
    suggestion({
      id: interpretation.id ?? `candidate-interpretation-${index + 1}`,
      kind: 'candidate-interpretation',
      category: 'candidate',
      operation,
      text: interpretation.paraphrase ?? '',
      source: 'analyzeStatement.interpretations',
      requiresUserSelection: true,
      selected: interpretation.id === analysis?.selectedInterpretation?.id,
      candidate: {
        id: interpretation.id ?? null,
        kind: interpretation.kind ?? null,
        confidence: interpretation.confidence ?? null,
        formalizationLevel: interpretation.formalizationLevel ?? null,
      },
    })
  );
}

function collectEvidenceCheckSuggestions(result, operation) {
  return (result?.statements ?? []).map((statement, index) =>
    suggestion({
      id: `${statement.id ?? `statement-${index + 1}`}-evidence-check`,
      kind: 'evidence-check',
      category: 'evidence-check',
      operation,
      text: statement.text ?? '',
      source: 'checkText.statements',
      evidenceBacked: true,
      result: {
        value: statement.result?.value ?? null,
        confidence: statement.result?.confidence ?? null,
        correctness: statement.correctness ?? null,
        explanation: statement.result?.explanation ?? '',
      },
      evidence: (statement.result?.calculation?.evidence ?? []).slice(0, 3),
    })
  );
}

function collectFormalizeSuggestions(result, operation) {
  const suggestions = [];
  for (const [phraseIndex, phrase] of (result?.phrases ?? []).entries()) {
    for (const [candidateIndex, candidate] of (
      phrase.candidates ?? []
    ).entries()) {
      suggestions.push(
        suggestion({
          id: `formalize-${phraseIndex + 1}-candidate-${candidateIndex + 1}`,
          kind: 'candidate-formalization-link',
          category: 'candidate',
          operation,
          text: phrase.text ?? candidate.matchText ?? candidate.label ?? '',
          source: 'formalizeTextWith.phrases',
          requiresUserSelection: true,
          candidate: {
            id: candidate.id ?? null,
            label: candidate.label ?? null,
            description: candidate.description ?? null,
            sourceUrl: candidate.sourceUrl ?? null,
            score: candidate.score ?? null,
          },
        })
      );
    }
  }
  return suggestions;
}

function collectTranslateSuggestions(result, operation) {
  const questions = [
    ...(result?.questions ?? []),
    ...(result?.cst?.questions ?? []),
    ...(result?.sentences ?? []).flatMap(
      (sentence) => sentence.questions ?? []
    ),
  ];
  return questions.map((question, index) =>
    suggestion({
      id: `translation-question-${index + 1}`,
      kind: 'translation-question',
      category: 'candidate',
      operation,
      text: String(question.text ?? question.prompt ?? question),
      source: 'translateTextWith.questions',
      requiresUserSelection: true,
      candidate: question,
    })
  );
}

function collectUniquenessSuggestions(result, operation) {
  const suggestions = [];
  for (const [statementIndex, statement] of (
    result?.statements ?? []
  ).entries()) {
    for (const [matchIndex, match] of (statement.matches ?? []).entries()) {
      suggestions.push(
        suggestion({
          id:
            match.id ??
            `originality-${statementIndex + 1}-match-${matchIndex + 1}`,
          kind: 'originality-check',
          category: 'evidence-check',
          operation,
          text: statement.text ?? '',
          source: 'searchTextUniqueness.statements',
          evidenceBacked: true,
          result: {
            suggestedAction: statement.suggestedAction ?? null,
            score: match.score ?? match.matchStrength ?? null,
            matchKind: match.matchKind ?? null,
            sourceUrl: match.sourceUrl ?? null,
          },
        })
      );
    }
  }
  return suggestions;
}

function suggestion(fields) {
  return {
    id: fields.id,
    kind: fields.kind,
    category: fields.category,
    operation: fields.operation,
    text: fields.text ?? '',
    explicit: true,
    evidenceBacked: false,
    styleRewrite: false,
    requiresUserSelection: false,
    source: fields.source,
    ...fields,
  };
}

function collectExports(operation, result, services, reportOptions) {
  const embeddedExports = {
    linksNotation: linksNotationFor(result, services),
  };

  if (operation === WRITING_ASSISTANT_OPERATIONS.ANALYZE) {
    embeddedExports.issueReportUrl = services.createIssueReportUrl(
      result,
      reportOptions
    );
  }

  if (operation === WRITING_ASSISTANT_OPERATIONS.CHECK) {
    const issueReportUrls = (result?.statements ?? [])
      .filter((statement) => statement.analysis)
      .map((statement) => ({
        statementId: statement.id,
        url: services.createIssueReportUrl(statement.analysis, reportOptions),
      }));
    embeddedExports.issueReportUrls = issueReportUrls;
    if (issueReportUrls[0]) {
      embeddedExports.issueReportUrl = issueReportUrls[0].url;
    }
  }

  return embeddedExports;
}

function linksNotationFor(result, services) {
  if (typeof result?.linksNotation === 'string') {
    return result.linksNotation;
  }
  if (result?.linksNetwork) {
    return services.serializeLinksNotation(result.linksNetwork);
  }
  return '';
}

function collectOperationOptions(operation, request, options) {
  return stripUndefined({
    fetch: options.fetch,
    cache: options.cache,
    now: options.now,
    ...objectOrEmpty(options.options),
    ...objectOrEmpty(options.operationOptions?.[operation]),
    live: options.live,
    ...requestScalarOptions(request),
    ...objectOrEmpty(request.options),
  });
}

function collectReportOptions(request, options, context) {
  const report = isObject(request?.report) ? request.report : {};
  return stripUndefined({
    repoUrl: report.repoUrl ?? options.repoUrl,
    labels: report.labels ?? options.labels,
    pageUrl: report.pageUrl ?? context.pageUrl ?? context.documentUrl,
    userAgent: report.userAgent ?? context.userAgent ?? options.userAgent,
    timestamp: report.timestamp ?? timestampFromNow(options.now),
  });
}

function timestampFromNow(now) {
  if (typeof now !== 'function') {
    return undefined;
  }
  const value = now();
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return typeof value === 'string' ? value : undefined;
}

function mergeServices(services = {}) {
  return {
    ...defaultServices,
    ...objectOrEmpty(services),
  };
}

function operationFromRequest(request) {
  return normalizeOperation(
    request.operation ?? request.action ?? WRITING_ASSISTANT_OPERATIONS.ANALYZE
  );
}

function textFromRequest(request) {
  return String(request.text ?? request.input ?? '');
}

function contextFromRequest(request, options) {
  return normalizeContext({
    ...objectOrEmpty(options.context),
    ...objectOrEmpty(request.context),
  });
}

function requestScalarOptions(request) {
  return Object.fromEntries(
    ['from', 'to', 'sourceLanguage', 'targetLanguage', 'limit', 'live']
      .filter((key) => request[key] !== undefined)
      .map((key) => [key, request[key]])
  );
}

function normalizeOperation(operation) {
  const normalized = String(operation ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  const aliased = operationAliases.get(normalized) ?? normalized;
  if (Object.values(WRITING_ASSISTANT_OPERATIONS).includes(aliased)) {
    return aliased;
  }
  throw new Error(`Unsupported writing-assistant operation: ${operation}`);
}

function normalizeSurface(surface) {
  if (!surface || typeof surface === 'object') {
    return WRITING_ASSISTANT_SURFACES.EMBEDDED;
  }
  const normalized = String(surface).trim().toLowerCase().replace(/_/g, '-');
  return Object.values(WRITING_ASSISTANT_SURFACES).includes(normalized)
    ? normalized
    : WRITING_ASSISTANT_SURFACES.EMBEDDED;
}

function normalizeContext(context) {
  if (!isObject(context)) {
    return {};
  }
  const rest = { ...context };
  delete rest.text;
  delete rest.input;
  return stripUndefined(rest);
}

function stripUndefined(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined)
  );
}

function objectOrEmpty(value) {
  return isObject(value) ? value : {};
}

function isObject(value) {
  return typeof value === 'object' && value !== null;
}
