import { Parser as LinksNotationParser } from 'links-notation';
import {
  applyObjectTransformationRules,
  applySentenceTextTransformationRules,
  collectTransformationRules,
} from './transformation-rules.js';
import {
  escapeHtml,
  escapeMarkdown,
  renderNaturalizationLinksNotation,
} from './translation-renderers.js';

const linksNotationParser = new LinksNotationParser();
const roleOrder = ['subject', 'predicate', 'object'];
const beforeNaturalizationRuleNames = [
  'beforeNaturalizationRules',
  'preNaturalizationRules',
  'naturalizationRules',
  'beforeDeformalizationRules',
  'preDeformalizationRules',
  'deformalizationRules',
];
const afterNaturalizationRuleNames = [
  'afterNaturalizationRules',
  'postNaturalizationRules',
  'afterDeformalizationRules',
  'postDeformalizationRules',
];

export function naturalizeExpression(input, options = {}) {
  return naturalizeExpressionWith(input, options);
}

export async function naturalizeExpressionWith(input, options = {}) {
  const expression = normalizeNaturalizationInput(input);
  const config = createNaturalizationConfig(options, expression);
  recordStep(config, 'input', {
    inputFormat: expression.inputFormat,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
  });

  let sentences = buildNaturalizationSentences(expression.units, config);
  sentences = await applySentenceTextTransformationRules(
    sentences,
    config.beforeNaturalizationRules,
    transformationContext(config, 'before-naturalization')
  );

  let naturalization = buildNaturalization(expression, sentences, config);
  const afterTextRules = config.afterNaturalizationRules.filter(hasPattern);
  if (afterTextRules.length > 0) {
    const transformedSentences = await applySentenceTextTransformationRules(
      naturalization.sentences.map(naturalizationSentenceToSentence),
      afterTextRules,
      transformationContext(config, 'after-naturalization')
    );
    naturalization = buildNaturalization(
      expression,
      transformedSentences,
      config
    );
  }

  const afterObjectRules = config.afterNaturalizationRules.filter(
    (rule) => !hasPattern(rule)
  );
  naturalization = await applyObjectTransformationRules(
    naturalization,
    afterObjectRules,
    transformationContext(config, 'after-naturalization')
  );
  naturalization = refreshNaturalizationLinksNotation(naturalization);

  const cst = buildNaturalizationCst(expression, naturalization, config);
  const result = {
    text: expression.sourceText,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    naturalization,
    deformalization: naturalization,
    cst,
    units: cst.units,
    plainText: naturalization.targetText,
    markdown: naturalization.targetMarkdown,
    html: naturalization.targetHtml,
    linksNotation: naturalization.linksNotation,
    steps: [...config.steps],
  };
  return result;
}

export function deformalizeExpression(input, options = {}) {
  return deformalizeExpressionWith(input, options);
}

export function deformalizeExpressionWith(input, options = {}) {
  return naturalizeExpressionWith(input, options);
}

function createNaturalizationConfig(options, expression) {
  const sourceLanguage = normalizeLanguage(
    firstPresent(
      options.sourceLanguage,
      options.from,
      expression.sourceLanguage
    )
  );
  const targetLanguage = normalizeLanguage(
    firstPresent(
      options.targetLanguage,
      options.to,
      expression.targetLanguage,
      expression.sourceLanguage
    )
  );
  return {
    sourceLanguage,
    targetLanguage,
    trace: options.trace !== false,
    steps: [],
    beforeNaturalizationRules: collectTransformationRules(
      options,
      beforeNaturalizationRuleNames
    ),
    afterNaturalizationRules: collectTransformationRules(
      options,
      afterNaturalizationRuleNames
    ),
  };
}

function firstPresent(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ''
  );
}

function transformationContext(config, phase) {
  return { phase, steps: config.steps, trace: config.trace };
}

function normalizeLanguage(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return /^[a-z][a-z0-9-]{0,14}$/.test(normalized) ? normalized : 'en';
}

function normalizeNaturalizationInput(input) {
  if (isPlainObject(input)) {
    return expressionFromObjectInput(input);
  }
  return expressionFromLinksNotation(String(input ?? ''));
}

function expressionFromObjectInput(input) {
  for (const resolveInput of objectInputResolvers) {
    const expression = resolveInput(input);
    if (expression) {
      return expression;
    }
  }
  return expressionFromLinksNotation(String(input ?? ''));
}

const objectInputResolvers = [
  (input) =>
    input.naturalization?.type === 'naturalization'
      ? expressionFromNaturalizationResult(input)
      : null,
  (input) =>
    input.type === 'naturalization'
      ? expressionFromNaturalization(input)
      : null,
  (input) =>
    input.type === 'semantic-meta-language'
      ? expressionFromSemanticMetaLanguage(input)
      : null,
  (input) =>
    input.semanticMetaLanguage?.links
      ? expressionFromSemanticMetaLanguage(input.semanticMetaLanguage)
      : null,
  (input) =>
    input.formalization?.expression
      ? normalizeNaturalizationInput(input.formalization.expression)
      : null,
  (input) =>
    Array.isArray(input.meaningLinks)
      ? expressionFromMeaningLinks(input, input.meaningLinks)
      : null,
  (input) =>
    Array.isArray(input.cst?.meaningLinks)
      ? expressionFromMeaningLinks(input, input.cst.meaningLinks)
      : null,
  (input) =>
    input.type === 'formalization'
      ? expressionFromFormalizationCst(input)
      : null,
  (input) =>
    Array.isArray(input.phrases) ? expressionFromFormalizationCst(input) : null,
  (input) => (input.ast?.body ? expressionFromAst(input, input.ast) : null),
  (input) =>
    input.cst?.ast?.body ? expressionFromAst(input, input.cst.ast) : null,
];

function expressionFromNaturalizationResult(result) {
  return expressionFromNaturalization(result.naturalization);
}

function expressionFromNaturalization(naturalization) {
  const units = naturalization.sentences.flatMap((sentence) =>
    sentence.targetUnits.map((unit) => ({
      role: null,
      sourceText: unit.sourceText ?? unit.targetText,
      targetText: unit.targetText,
      semanticLinkId: unit.semanticLinkId ?? null,
      targetEntityId: unit.targetEntityId ?? null,
      targetUrl: unit.targetUrl ?? null,
      tokenStart: null,
      tokenEnd: null,
      sourceStart: null,
      sourceEnd: null,
    }))
  );
  return {
    inputFormat: 'naturalization',
    sourceText: naturalization.targetText,
    sourceLanguage: naturalization.sourceLanguage,
    targetLanguage: naturalization.targetLanguage,
    sourceExpression: naturalization,
    sourceLinksNotation: naturalization.linksNotation ?? null,
    units: units.length ? units : unitsFromText(naturalization.targetText),
  };
}

function expressionFromSemanticMetaLanguage(semantic) {
  const sortedLinks = [...semantic.links].sort(compareBySourcePosition);
  return {
    inputFormat: 'semantic-meta-language',
    sourceText:
      semantic.text ?? sortedLinks.map((link) => link.sourceText).join(' '),
    sourceLanguage: semantic.sourceLanguage,
    targetLanguage: semantic.targetLanguage,
    sourceExpression: semantic,
    sourceLinksNotation:
      semantic.linksNotation ?? semantic.sourceLinksNotation ?? null,
    semanticMetaLanguage: semantic,
    units: sortedLinks.map((link, index) => ({
      role: link.sourceFragment?.role ?? null,
      sourceText: link.sourceText,
      targetText: link.targetHint ?? link.meaning?.label ?? link.sourceText,
      semanticLinkId: link.id ?? `semantic-link-${index + 1}`,
      targetEntityId: link.meaning?.id ?? null,
      targetUrl: link.meaning?.url ?? null,
      tokenStart: link.tokenStart ?? null,
      tokenEnd: link.tokenEnd ?? null,
      sourceStart: link.sourceStart ?? null,
      sourceEnd: link.sourceEnd ?? null,
    })),
  };
}

function expressionFromMeaningLinks(expression, links) {
  const sortedLinks = [...links].sort(compareBySourcePosition);
  return {
    inputFormat: expression.type ?? expression.cst?.type ?? 'formal-expression',
    sourceText: expression.text ?? expression.cst?.text ?? '',
    sourceLanguage: expression.linguisticMetadata?.language ?? 'en',
    targetLanguage: expression.linguisticMetadata?.language ?? 'en',
    sourceExpression: expression,
    sourceLinksNotation: expression.linksNotation ?? null,
    units: sortedLinks.map(meaningLinkToUnit),
  };
}

function meaningLinkToUnit(link, index) {
  return {
    role: link.role ?? null,
    sourceText: link.text,
    targetText: meaningLinkTargetText(link),
    semanticLinkId: link.id ?? `meaning-link-${index + 1}`,
    targetEntityId: meaningLinkTargetEntityId(link),
    targetUrl: meaningLinkTargetUrl(link),
    tokenStart: link.tokenStart ?? null,
    tokenEnd: link.tokenEnd ?? null,
    sourceStart: link.sourceStart ?? null,
    sourceEnd: link.sourceEnd ?? null,
  };
}

function meaningLinkTargetText(link) {
  return link.target?.label ?? link.text;
}

function meaningLinkTargetEntityId(link) {
  return link.target?.id ?? link.selectedTargetId ?? null;
}

function meaningLinkTargetUrl(link) {
  return link.target?.sourceUrl ?? link.target?.url ?? null;
}

function expressionFromFormalizationCst(cst) {
  const phrases = Array.isArray(cst.phrases) ? cst.phrases : [];
  return {
    inputFormat: cst.type ?? 'formalization',
    sourceText: cst.text ?? phrases.map((phrase) => phrase.text).join(' '),
    sourceLanguage: cst.linguisticMetadata?.language ?? 'en',
    targetLanguage: cst.linguisticMetadata?.language ?? 'en',
    sourceExpression: cst,
    sourceLinksNotation: cst.linksNotation ?? null,
    units: phrases.map((phrase, index) => ({
      role: phrase.linguisticRole ?? null,
      sourceText: phrase.text,
      targetText: phrase.entity?.label ?? phrase.text,
      semanticLinkId: phrase.id ?? `phrase-${index + 1}`,
      targetEntityId: phrase.entity?.id ?? null,
      targetUrl: phrase.entity?.url ?? phrase.entity?.sourceUrl ?? null,
      tokenStart: phrase.start ?? null,
      tokenEnd: phrase.end ?? null,
      sourceStart: phrase.sourceStart ?? null,
      sourceEnd: phrase.sourceEnd ?? null,
    })),
  };
}

function expressionFromAst(expression, ast) {
  const sentences = Array.isArray(ast.body) ? ast.body : [];
  const units = sentences.flatMap((sentence) =>
    roleOrder
      .map((role) => sentence[role])
      .filter(Boolean)
      .map((part) => ({
        role: part.role ?? null,
        sourceText: part.text,
        targetText: part.text,
        semanticLinkId: part.fragmentId ?? null,
        targetEntityId: null,
        targetUrl: null,
        tokenStart: null,
        tokenEnd: null,
        sourceStart: part.sourceStart ?? null,
        sourceEnd: part.sourceEnd ?? null,
      }))
  );
  return {
    inputFormat: expression.type ?? ast.type ?? 'formal-expression',
    sourceText:
      expression.text ??
      ast.text ??
      units.map((unit) => unit.targetText).join(' '),
    sourceLanguage: expression.linguisticMetadata?.language ?? 'en',
    targetLanguage: expression.linguisticMetadata?.language ?? 'en',
    sourceExpression: expression,
    sourceLinksNotation: expression.linksNotation ?? null,
    units,
  };
}

function expressionFromLinksNotation(source) {
  const trimmed = source.trim();
  let units = [];
  try {
    const parsed = linksNotationParser.parse(trimmed);
    units = unitsFromLinks(parsed);
  } catch {
    units = unitsFromText(trimmed);
  }
  return {
    inputFormat: 'links-notation',
    sourceText: trimmed,
    sourceLanguage: 'links-notation',
    targetLanguage: 'en',
    sourceExpression: trimmed,
    sourceLinksNotation: trimmed,
    units: units.length ? units : unitsFromText(trimmed),
  };
}

function unitsFromLinks(links) {
  const claim = links.find((link) => link?.id === 'claim') ?? links[0];
  const claimUnits = unitsFromClaimLikeLink(claim);
  if (claimUnits.length > 0) {
    return claimUnits;
  }
  return unitsFromText(links.map(flattenLinksNotationText).join(' '));
}

function unitsFromClaimLikeLink(link) {
  if (!isLinksNotationLink(link)) {
    return [];
  }
  const units = [];
  for (let index = 0; index < link.values.length; index += 1) {
    const role = atomicLinkId(link.values[index]);
    if (!role || !roleOrder.includes(role)) {
      continue;
    }
    const value = link.values[index + 1];
    if (value === undefined) {
      continue;
    }
    units.push({
      role,
      sourceText: flattenLinksNotationText(value),
      targetText: flattenLinksNotationText(value),
      semanticLinkId: `semantic-link-${units.length + 1}`,
      targetEntityId: null,
      targetUrl: null,
      tokenStart: null,
      tokenEnd: null,
      sourceStart: null,
      sourceEnd: null,
    });
    index += 1;
  }
  return units;
}

function unitsFromText(text) {
  const value = normalizeWhitespace(text);
  return value
    ? [
        {
          role: null,
          sourceText: value,
          targetText: value,
          semanticLinkId: 'semantic-link-1',
          targetEntityId: null,
          targetUrl: null,
          tokenStart: null,
          tokenEnd: null,
          sourceStart: null,
          sourceEnd: null,
        },
      ]
    : [];
}

function buildNaturalizationSentences(units, config) {
  const normalizedUnits = units.length ? units : unitsFromText('');
  const targetUnits = normalizedUnits.map((unit, index) =>
    buildTargetUnit(unit, `target-unit-1-${index + 1}`)
  );
  const plainText = normalizeWhitespace(
    targetUnits.map((unit) => unit.targetText).join(' ')
  );
  return [
    {
      id: 'sentence-1',
      source: {
        text: normalizeWhitespace(
          normalizedUnits.map((unit) => unit.sourceText).join(' ')
        ),
        start: null,
        end: null,
        language: config.sourceLanguage,
      },
      target: {
        text: plainText,
        markdown: targetUnits.map((unit) => unit.markdown).join(' '),
        html: targetUnits.map((unit) => unit.html).join(' '),
        language: config.targetLanguage,
      },
      phrases: [],
      transformations: [],
      targetUnits,
      plainText,
      markdown: targetUnits.map((unit) => unit.markdown).join(' '),
      html: targetUnits.map((unit) => unit.html).join(' '),
    },
  ];
}

function buildTargetUnit(unit, id) {
  const targetText = normalizeWhitespace(unit.targetText);
  return {
    id,
    kind: 'formal-unit',
    phraseId: null,
    role: unit.role ?? null,
    semanticLinkId: unit.semanticLinkId ?? null,
    sourceText: unit.sourceText ?? targetText,
    targetText,
    plainText: targetText,
    markdown: renderUnitMarkdown(targetText, unit),
    html: renderUnitHtml(targetText, unit),
    targetEntityId: unit.targetEntityId ?? null,
    targetUrl: unit.targetUrl ?? null,
  };
}

function renderUnitMarkdown(targetText, unit) {
  if (!unit.targetEntityId || !unit.targetUrl) {
    return targetText;
  }
  return `[${escapeMarkdown(targetText)}](${unit.targetUrl} "${unit.targetEntityId}")`;
}

function renderUnitHtml(targetText, unit) {
  if (!unit.targetEntityId || !unit.targetUrl) {
    return escapeHtml(targetText);
  }
  return `<a href="${escapeHtml(unit.targetUrl)}" title="${escapeHtml(
    unit.targetEntityId
  )}">${escapeHtml(targetText)}</a>`;
}

function buildNaturalization(expression, sentences, config) {
  const normalizedSentences = sentences.map((sentence) => ({
    id: sentence.id,
    semanticLinkIds: sentence.targetUnits
      .map((unit) => unit.semanticLinkId)
      .filter(Boolean),
    targetText: sentence.plainText,
    targetMarkdown: sentence.markdown,
    targetHtml: sentence.html,
    targetUnits: sentence.targetUnits.map((unit) => ({ ...unit })),
    transformations: [...sentence.transformations],
  }));
  const naturalization = {
    type: 'naturalization',
    version: 1,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    semanticMetaLanguageId:
      expression.semanticMetaLanguage?.type ?? expression.inputFormat,
    semanticLinkIds: normalizedSentences.flatMap(
      (sentence) => sentence.semanticLinkIds
    ),
    targetText: renderSentenceOutput(normalizedSentences, 'targetText'),
    targetMarkdown: renderSentenceOutput(normalizedSentences, 'targetMarkdown'),
    targetHtml: renderSentenceOutput(normalizedSentences, 'targetHtml'),
    sentences: normalizedSentences,
  };
  return refreshNaturalizationLinksNotation(naturalization);
}

function naturalizationSentenceToSentence(sentence) {
  return {
    id: sentence.id,
    source: {
      text: sentence.targetText,
      start: null,
      end: null,
      language: null,
    },
    target: {
      text: sentence.targetText,
      markdown: sentence.targetMarkdown,
      html: sentence.targetHtml,
      language: null,
    },
    phrases: [],
    transformations: [...sentence.transformations],
    targetUnits: sentence.targetUnits.map((unit) => ({ ...unit })),
    plainText: sentence.targetText,
    markdown: sentence.targetMarkdown,
    html: sentence.targetHtml,
  };
}

function refreshNaturalizationLinksNotation(naturalization) {
  return {
    ...naturalization,
    linksNotation: renderNaturalizationLinksNotation(naturalization),
  };
}

function buildNaturalizationCst(expression, naturalization, config) {
  const units = naturalization.sentences.flatMap((sentence) =>
    sentence.targetUnits.map((unit, index) => ({
      type: 'naturalization-unit',
      id: unit.id,
      role: unit.role ?? expression.units[index]?.role ?? null,
      sourceText: unit.sourceText,
      targetText: unit.targetText,
      semanticLinkId: unit.semanticLinkId ?? null,
      targetEntityId: unit.targetEntityId ?? null,
      targetUrl: unit.targetUrl ?? null,
    }))
  );
  return {
    type: 'naturalization',
    version: 1,
    inputFormat: expression.inputFormat,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    sourceExpression: expression.sourceExpression,
    sourceLinksNotation: expression.sourceLinksNotation,
    naturalization,
    deformalization: naturalization,
    units,
    steps: [...config.steps],
  };
}

function renderSentenceOutput(sentences, key) {
  return normalizeWhitespace(
    sentences.map((sentence) => sentence[key]).join(' ')
  );
}

function compareBySourcePosition(left, right) {
  const leftStart =
    left.tokenStart ?? left.sourceStart ?? Number.MAX_SAFE_INTEGER;
  const rightStart =
    right.tokenStart ?? right.sourceStart ?? Number.MAX_SAFE_INTEGER;
  return leftStart - rightStart;
}

function flattenLinksNotationText(value) {
  if (!isLinksNotationLink(value)) {
    return normalizeWhitespace(String(value ?? ''));
  }
  if (value.values.length === 0) {
    return normalizeWhitespace(value.id ?? '');
  }
  return normalizeWhitespace(
    value.values.map(flattenLinksNotationText).join(' ')
  );
}

function atomicLinkId(value) {
  return isLinksNotationLink(value) && value.values.length === 0
    ? value.id
    : null;
}

function isLinksNotationLink(value) {
  return (
    Boolean(value) && typeof value === 'object' && Array.isArray(value.values)
  );
}

function hasPattern(rule) {
  return Object.prototype.hasOwnProperty.call(rule ?? {}, 'pattern');
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function recordStep(config, type, details) {
  if (config.trace === false) {
    return;
  }
  config.steps.push({
    id: `step-${config.steps.length + 1}`,
    type,
    ...details,
  });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
