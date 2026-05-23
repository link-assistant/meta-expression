import { FORMALIZE_LINK_TARGETS, formalizeTextWith } from './formalize.js';
import {
  lookupExactGlossaryTranslation,
  lookupGlossaryTranslation,
  normalizeTranslationStrategy,
  TRANSLATION_STRATEGIES,
} from './translation-strategies.js';
import { buildLexicalTarget, lexicalSemanticId } from './lexical-entities.js';
import { createTargetEntityBatchLoader } from './target-entity-loader.js';
import {
  applyObjectTransformationRules,
  applySentenceTextTransformationRules,
  applyTextTransformationRules,
  collectTranslationTransformationRules,
} from './transformation-rules.js';
import { buildSemanticSourceFragment } from './translation-source-fragment.js';

const wikidataEntityBaseUrl = 'https://www.wikidata.org/wiki/';
const wikidataPropertyBaseUrl = 'https://www.wikidata.org/wiki/Property:';
const defaultCacheTtlMs = 7 * 24 * 60 * 60 * 1000;
const russianUsStatePredicate = Object.freeze({
  text: 'штат',
  entityId: 'Q35657',
  url: 'https://ru.wikipedia.org/wiki/%D0%A8%D1%82%D0%B0%D1%82_%D0%A1%D0%A8%D0%90',
  description: 'state of the United States',
});
const russianEtoCopula = Object.freeze({
  text: 'это',
  entityId: 'wikt:ru:это#Determiner:0',
  url: 'https://en.wiktionary.org/wiki/%D1%8D%D1%82%D0%BE',
  description: 'Russian demonstrative/copula-like predicate marker',
});

export function translateText(input, options = {}) {
  return translateTextWith(input, {
    fetch: null,
    cache: null,
    now: () => 0,
    ...options,
  });
}

export async function translateTextWith(input, options = {}) {
  const config = createTranslateConfig(options);
  const sourceText = await applyTextTransformationRules(
    input,
    config.beforeTranslationRules,
    transformationContext(config, 'before-translation')
  );
  recordStep(config, 'input', {
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    text: sourceText,
  });
  const formalization = await formalizeTextWith(sourceText, {
    ...options,
    fetch: config.fetchImpl,
    cache: config.cache,
    language: config.sourceLanguage,
    linkTargetMode: config.linkTargetMode,
  });
  recordStep(config, 'formalization', {
    phraseCount: formalization.cst.phrases.length,
    markdown: formalization.markdown,
    linksNotation: formalization.linksNotation,
  });
  const semanticMetaLanguage = buildSemanticMetaLanguage(formalization, config);
  recordStep(config, 'semantic-meta-language', {
    linkCount: semanticMetaLanguage.links.length,
    linksNotation: semanticMetaLanguage.linksNotation,
  });
  const variables = [];
  const phrases = await Promise.all(
    formalization.cst.phrases.map((phrase) => translatePhrase(phrase, config))
  );
  for (const translated of phrases) {
    if (translated.variable) {
      translated.variable.name = `variable-${variables.length + 1}`;
      variables.push(translated.variable);
    }
  }
  const sentences = await applySentenceTextTransformationRules(
    buildTranslatedSentences(formalization, phrases, config),
    config.beforeNaturalizationRules,
    transformationContext(config, 'before-naturalization')
  );
  const resolvedVariableNames = new Set(
    sentences.flatMap((sentence) => sentence.resolvedVariableNames)
  );
  for (const variable of variables) {
    if (resolvedVariableNames.has(variable.name)) {
      variable.resolvedByRule = true;
    }
  }
  const unresolvedVariables = variables.filter(
    (variable) => !variable.resolvedByRule
  );
  const questions = unresolvedVariables.map((variable) =>
    buildVariableQuestionDetails(variable, config)
  );
  const questionDetails = questions;
  const questionTexts = questionDetails.map((question) => question.question);
  const plainText = renderSentenceOutput(sentences, 'plainText', phrases);
  const markdown = renderSentenceOutput(sentences, 'markdown', phrases);
  const html = renderSentenceOutput(sentences, 'html', phrases);
  let naturalization = buildNaturalization(
    semanticMetaLanguage,
    phrases,
    sentences,
    config
  );
  naturalization = await applyObjectTransformationRules(
    naturalization,
    config.afterNaturalizationRules,
    transformationContext(config, 'after-naturalization')
  );
  recordStep(config, 'text', {
    sentenceCount: sentences.length,
    text: plainText,
  });
  const cst = buildTranslationCst({
    formalization,
    semanticMetaLanguage,
    naturalization,
    phrases,
    variables,
    sentences,
    config,
  });
  let result = {
    text: formalization.text,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    formalization,
    semanticMetaLanguage,
    naturalization,
    deformalization: naturalization,
    cst,
    phrases,
    sentences,
    plainText,
    markdown,
    html,
    linksNotation: renderTranslationLinksNotation(cst, questionTexts),
    variables,
    questions: questionTexts,
    questionDetails,
    steps: [...config.steps],
  };
  result = await applyObjectTransformationRules(
    result,
    config.afterTranslationRules,
    transformationContext(config, 'after-translation')
  );
  return { ...result, steps: [...config.steps] };
}

function createTranslateConfig(options) {
  const sourceLanguage = normalizeLanguage(
    options.sourceLanguage ?? options.from ?? 'en'
  );
  const requestedTargetLanguage = options.targetLanguage ?? options.to;
  const rawFetch = options.fetch ?? globalThis.fetch?.bind(globalThis) ?? null;
  const config = {
    rawFetch,
    fetchImpl: null,
    cache: options.cache ?? new Map(),
    cacheTtlMs: options.cacheTtlMs ?? defaultCacheTtlMs,
    now: options.now ?? Date.now,
    trace: options.trace !== false,
    steps: [],
    sourceLanguage,
    targetLanguage: String(requestedTargetLanguage ?? '').trim()
      ? normalizeLanguage(requestedTargetLanguage)
      : defaultTargetLanguage(sourceLanguage),
    linkTargetMode: options.linkTargetMode ?? FORMALIZE_LINK_TARGETS.WIKIDATA,
    translationStrategy: normalizeTranslationStrategy(
      options.translationStrategy ?? options.strategy
    ),
    ...collectTranslationTransformationRules(options),
    targetEntityLoader: createTargetEntityBatchLoader({
      onCacheHit: (config, cachedUrl) =>
        recordStep(config, 'api-cache-hit', { url: cachedUrl }),
    }),
  };
  config.fetchImpl = rawFetch
    ? (url, init) => traceFetch(url, init, config)
    : null;
  return config;
}

function transformationContext(config, phase) {
  return { phase, steps: config.steps, trace: config.trace };
}

function defaultTargetLanguage(sourceLanguage) {
  return sourceLanguage === 'en' ? 'ru' : 'en';
}

function normalizeLanguage(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return /^[a-z][a-z0-9-]{0,14}$/.test(normalized) ? normalized : 'en';
}

function buildSemanticMetaLanguage(formalization, config) {
  const links = formalization.cst.phrases.map((phrase, index) =>
    buildSemanticLink(phrase, index, config)
  );
  const semantic = {
    type: 'semantic-meta-language',
    version: 1,
    text: formalization.text,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    representation: 'links-notation',
    sourceLinksNotation: formalization.linksNotation,
    links,
  };
  return {
    ...semantic,
    linksNotation: renderSemanticMetaLanguageLinksNotation(semantic),
  };
}

function buildSemanticLink(phrase, index, config) {
  const entity = phrase.entity ?? null;
  const glossaryTranslation = lookupGlossaryTranslation(phrase.text, config);
  return {
    id: `semantic-link-${index + 1}`,
    sourceText: phrase.text,
    sourceStart: phrase.sourceStart ?? null,
    sourceEnd: phrase.sourceEnd ?? null,
    tokenStart: phrase.start,
    tokenEnd: phrase.end,
    sourceLanguage: config.sourceLanguage,
    sourceFragment: buildSemanticSourceFragment(phrase),
    meaning: buildSemanticMeaning(phrase, entity, glossaryTranslation, config),
    targetHint: glossaryTranslation?.text ?? null,
    status: semanticLinkStatus(entity, glossaryTranslation),
  };
}

function buildSemanticMeaning(phrase, entity, glossaryTranslation, config) {
  return {
    id: semanticMeaningId(phrase, entity, glossaryTranslation, config),
    label: entity?.label ?? phrase.text,
    description: entity?.description ?? null,
    url: entity ? sourceUrlForSemanticEntity(entity) : null,
    source: semanticMeaningSource(entity, glossaryTranslation),
  };
}

function semanticMeaningId(phrase, entity, glossaryTranslation, config) {
  if (entity?.id) {
    return entity.id;
  }
  return glossaryTranslation
    ? lexicalSemanticId(phrase.text, config.sourceLanguage)
    : null;
}

function semanticMeaningSource(entity, glossaryTranslation) {
  return entity?.source ?? (glossaryTranslation ? 'glossary' : null);
}

function semanticLinkStatus(entity, glossaryTranslation) {
  if (entity?.source === 'lexical') {
    return glossaryTranslation ? 'lexical-glossary' : 'lexical-fallback';
  }
  if (entity) {
    return 'linked-entity';
  }
  return glossaryTranslation ? 'lexical-glossary' : 'unresolved';
}

function sourceUrlForSemanticEntity(entity) {
  if (entity.wikipediaUrl) {
    return entity.wikipediaUrl;
  }
  if (entity.sourceUrl) {
    return entity.sourceUrl;
  }
  if (!entity.id) {
    return null;
  }
  if (entity.kind === 'property') {
    return `${wikidataPropertyBaseUrl}${entity.id}`;
  }
  return `${wikidataEntityBaseUrl}${entity.id}`;
}

async function translatePhrase(phrase, config) {
  const translationEntity = translatableEntityForPhrase(phrase, config);
  const glossaryTranslation = lookupGlossaryTranslation(phrase.text, config);
  const base = buildPhraseTranslationBase(
    phrase,
    glossaryTranslation ? null : translationEntity,
    config
  );
  if (glossaryTranslation) {
    const translated = translatedGlossaryPhrase(
      base,
      glossaryTranslation,
      config
    );
    recordPhraseStep(translated, config);
    return translated;
  }
  if (!phrase.entity) {
    const unresolved = unresolvedPhrase(base, 'unresolved-source-phrase');
    recordPhraseStep(unresolved, config);
    return unresolved;
  }
  if (!translationEntity) {
    const unresolved = unresolvedPhrase(base, 'non-wikidata-source');
    recordPhraseStep(unresolved, config);
    return unresolved;
  }
  const targetResult = await lookupTargetEntityForPhrase(
    phrase,
    translationEntity,
    base,
    config
  );
  if (targetResult.unresolved) {
    const unresolved = targetResult.unresolved;
    recordPhraseStep(unresolved, config);
    return unresolved;
  }
  const targetLabel = targetLabelFor(
    targetResult.entity,
    config.targetLanguage
  );
  if (!targetLabel) {
    const unresolved = unresolvedPhrase(
      base,
      'missing-target-label',
      translationEntity.id
    );
    recordPhraseStep(unresolved, config);
    return unresolved;
  }
  const translated = {
    ...base,
    entityId: translationEntity.id,
    target: {
      text: targetLabel,
      language: config.targetLanguage,
      entityId: translationEntity.id,
      description: targetDescriptionFor(
        targetResult.entity,
        config.targetLanguage
      ),
      url: targetUrlFor(
        targetResult.entity,
        translationEntity,
        config.targetLanguage
      ),
      status: 'translated',
    },
    variable: null,
  };
  recordPhraseStep(translated, config);
  return translated;
}

function translatedGlossaryPhrase(base, translation, config) {
  const entityId = base.source.entityId ?? null;
  const target = targetForGlossaryTranslation(translation, config);
  return {
    ...base,
    entityId,
    target: {
      text: translation.text,
      language: config.targetLanguage,
      entityId: target.entityId,
      description: target.description,
      url: target.url,
      status: 'translated',
      strategy: translation.strategy,
    },
    variable: null,
  };
}

function targetForGlossaryTranslation(translation, config) {
  if (translation.target) {
    return {
      entityId: translation.target.entityId ?? null,
      description: translation.target.description ?? null,
      url: translation.target.url ?? null,
    };
  }
  const lexicalTarget = buildLexicalTarget(
    translation.text,
    config.targetLanguage,
    { linkTargetMode: config.linkTargetMode }
  );
  return {
    entityId: lexicalTarget.entityId,
    description: lexicalTarget.description,
    url: lexicalTarget.url,
  };
}

function buildPhraseTranslationBase(phrase, translationEntity, config) {
  const sourceEntity = translationEntity ?? phrase.entity ?? null;
  return {
    id: phrase.id,
    source: {
      text: phrase.text,
      start: phrase.start,
      end: phrase.end,
      sourceStart: phrase.sourceStart ?? null,
      sourceEnd: phrase.sourceEnd ?? null,
      language: config.sourceLanguage,
      entityId: sourceEntity?.id ?? null,
      label: sourceEntity?.label ?? null,
      description: sourceEntity?.description ?? null,
      url: sourceEntity ? sourceUrlForSemanticEntity(sourceEntity) : null,
      source: sourceEntity?.source ?? null,
    },
  };
}

async function lookupTargetEntityForPhrase(
  phrase,
  translationEntity,
  base,
  config
) {
  try {
    return {
      entity: await fetchTargetEntity(translationEntity.id, config),
      unresolved: null,
    };
  } catch (error) {
    recordStep(config, 'target-lookup-error', {
      phraseId: phrase.id,
      entityId: translationEntity.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      entity: null,
      unresolved: unresolvedPhrase(
        base,
        'target-lookup-failed',
        translationEntity.id
      ),
    };
  }
}

function unresolvedPhrase(base, reason, entityId = null) {
  return {
    ...base,
    entityId,
    target: {
      text: base.source.text,
      language: null,
      entityId,
      description: null,
      url: null,
      status: reason,
    },
    variable: {
      name: '',
      sourceText: base.source.text,
      entityId,
      reason,
    },
  };
}

function translatableEntityForPhrase(phrase, config) {
  if (isWikidataId(phrase.entity?.id)) {
    return phrase.entity;
  }
  if (isGrammarPhrase(phrase.text, config.sourceLanguage)) {
    return null;
  }
  return (
    (phrase.candidates ?? []).find((candidate) =>
      isWikidataId(candidate?.id)
    ) ?? null
  );
}

function isWikidataId(value) {
  return /^[QP]\d+$/.test(String(value ?? ''));
}

function isGrammarPhrase(value, language) {
  if (language !== 'en') {
    return false;
  }
  return (
    isEnglishIsAPhrase(value) ||
    isEnglishArticle(value) ||
    isEnglishCopula(value) ||
    isEnglishPreposition(value)
  );
}

function fetchTargetEntity(id, config) {
  if (!config.fetchImpl) {
    return null;
  }
  return config.targetEntityLoader(id, config);
}

async function traceFetch(url, init, config) {
  const requestUrl = String(url);
  const method = init?.method ?? 'GET';
  recordStep(config, 'api-request', { method, url: requestUrl });
  try {
    const response = await config.rawFetch(requestUrl, init);
    recordStep(config, 'api-response', {
      method,
      url: requestUrl,
      status: response?.status ?? null,
      ok: response?.ok ?? null,
    });
    return response;
  } catch (error) {
    recordStep(config, 'api-error', {
      method,
      url: requestUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function targetLabelFor(entity, language) {
  return entity?.labels?.[language]?.value ?? null;
}

function targetDescriptionFor(entity, language) {
  return entity?.descriptions?.[language]?.value ?? null;
}

function targetUrlFor(entity, sourceEntity, language) {
  const title = entity?.sitelinks?.[`${language}wiki`]?.title;
  if (title) {
    return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(
      title.replace(/ /g, '_')
    )}`;
  }
  if (sourceEntity.kind === 'property') {
    return `${wikidataPropertyBaseUrl}${sourceEntity.id}`;
  }
  return `${wikidataEntityBaseUrl}${sourceEntity.id}`;
}

function buildVariableQuestionDetails(variable, config) {
  const question = variable.entityId
    ? `What ${config.targetLanguage} label should represent ${variable.entityId} for "${variable.sourceText}"?`
    : `What entity or expression should "${variable.sourceText}" map to before translating it from ${config.sourceLanguage} to ${config.targetLanguage}?`;
  return {
    variableName: variable.name,
    sourceText: variable.sourceText,
    entityId: variable.entityId,
    reason: variable.reason,
    question,
    selectedOptionId: 'preserve-source',
    options: buildVariableAnswerOptions(variable, config),
  };
}

function buildVariableAnswerOptions(variable, config) {
  const options = [
    {
      id: 'preserve-source',
      label: `Keep "${variable.sourceText}"`,
      targetText: variable.sourceText,
      description: 'Preserve the source phrase in the translated sentence.',
      confidence: 0.45,
    },
  ];
  if (variable.entityId) {
    options.push({
      id: 'target-label',
      label: `Use ${config.targetLanguage} label`,
      targetText: null,
      entityId: variable.entityId,
      description: `Resolve the ${config.targetLanguage} label for ${variable.entityId}.`,
      confidence: 0.35,
    });
  } else {
    options.push({
      id: 'map-entity',
      label: 'Map to entity',
      targetText: null,
      entityId: null,
      description: 'Choose a linked entity or expression before translating.',
      confidence: 0.35,
    });
  }
  options.push({
    id: 'manual-entry',
    label: 'Manual answer',
    targetText: null,
    entityId: variable.entityId,
    description: 'Provide a custom target phrase.',
    confidence: 0.2,
  });
  return options;
}

function buildNaturalization(semanticMetaLanguage, phrases, sentences, config) {
  const naturalization = {
    type: 'naturalization',
    version: 1,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    semanticMetaLanguageId: semanticMetaLanguage.type,
    semanticLinkIds: semanticMetaLanguage.links.map((link) => link.id),
    targetText: renderSentenceOutput(sentences, 'plainText', phrases),
    targetMarkdown: renderSentenceOutput(sentences, 'markdown', phrases),
    targetHtml: renderSentenceOutput(sentences, 'html', phrases),
    sentences: sentences.map((sentence) => ({
      id: sentence.id,
      semanticLinkIds: sentence.phrases.map(
        (phrase) => `semantic-link-${Number(phrase.id.split('-').pop()) || 1}`
      ),
      targetText: sentence.plainText,
      targetMarkdown: sentence.markdown,
      targetHtml: sentence.html,
      targetUnits: sentence.targetUnits.map((unit) => ({ ...unit })),
      transformations: [...sentence.transformations],
    })),
  };
  return {
    ...naturalization,
    linksNotation: renderNaturalizationLinksNotation(naturalization),
  };
}

function buildTranslationCst({
  formalization,
  semanticMetaLanguage,
  naturalization,
  phrases,
  variables,
  sentences,
  config,
}) {
  return {
    type: 'translation',
    version: 1,
    text: formalization.text,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    formalization: formalization.cst,
    semanticMetaLanguage,
    naturalization,
    deformalization: naturalization,
    phrases,
    variables,
    sentences: sentences.map((sentence) => ({
      type: 'sentence',
      id: sentence.id,
      sourceText: sentence.source.text,
      sourceStart: sentence.source.start,
      sourceEnd: sentence.source.end,
      targetText: sentence.plainText,
      targetMarkdown: sentence.markdown,
      targetHtml: sentence.html,
      targetUnits: sentence.targetUnits.map((unit) => ({ ...unit })),
      transformations: [...sentence.transformations],
      phraseIds: sentence.phrases.map((phrase) => phrase.id),
    })),
    steps: [...config.steps],
  };
}

function buildTranslatedSentences(formalization, phrases, config) {
  const segments = segmentSourceText(formalization.text);
  return segments.map((segment, index) =>
    buildTranslatedSentence(segment, index, phrases, config)
  );
}

function segmentSourceText(text) {
  const source = String(text);
  const segments = [];
  const pattern = /\S[\s\S]*?(?:[.!?]+(?=\s|$)|$)/g;
  for (const match of source.matchAll(pattern)) {
    const raw = match[0];
    const leading = raw.search(/\S/);
    const start = (match.index ?? 0) + Math.max(leading, 0);
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }
    segments.push({
      text: trimmed,
      start,
      end: start + trimmed.length,
    });
  }
  return segments.length
    ? segments
    : [{ text: source, start: 0, end: source.length }];
}

function buildTranslatedSentence(segment, index, phrases, config) {
  const sentencePhrases = phrases.filter((phrase) =>
    phraseBelongsToSegment(phrase, segment)
  );
  const units = sentencePhrases.map(renderUnitFromPhrase);
  const rendered = applySentenceTransformations(
    units,
    segment,
    `sentence-${index + 1}`,
    config
  );
  const punctuated = applySourceInteriorPunctuation(
    rendered.units,
    segment,
    `sentence-${index + 1}`,
    config
  );
  const terminal = terminalPunctuation(segment.text);
  const plainText = appendTerminalPunctuation(
    punctuated.units.map((unit) => unit.plainText).join(' '),
    terminal
  );
  const markdown = appendTerminalPunctuation(
    punctuated.units.map((unit) => unit.markdown).join(' '),
    terminal
  );
  const html = appendTerminalPunctuation(
    punctuated.units.map((unit) => unit.html).join(' '),
    terminal
  );
  const targetUnits = punctuated.units.map((unit, unitIndex) =>
    buildTargetUnit(unit, `target-unit-${index + 1}-${unitIndex + 1}`)
  );
  const sentence = {
    id: `sentence-${index + 1}`,
    source: {
      text: segment.text,
      start: segment.start,
      end: segment.end,
      language: config.sourceLanguage,
    },
    target: {
      text: plainText,
      markdown,
      html,
      language: config.targetLanguage,
    },
    phrases: sentencePhrases,
    transformations: [
      ...rendered.transformations,
      ...punctuated.transformations,
    ],
    resolvedVariableNames: [...rendered.resolvedVariableNames],
    targetUnits,
    plainText,
    markdown,
    html,
  };
  recordStep(config, 'sentence', {
    sentenceId: sentence.id,
    sourceText: sentence.source.text,
    targetText: sentence.plainText,
    transformations: sentence.transformations,
  });
  return sentence;
}

function phraseBelongsToSegment(phrase, segment) {
  const start = phrase.source.sourceStart;
  if (!Number.isInteger(start)) {
    return true;
  }
  return start >= segment.start && start < segment.end;
}

function renderUnitFromPhrase(phrase) {
  return {
    kind: 'phrase',
    phraseId: phrase.id,
    sourceText: phrase.source.text,
    sourceStart: phrase.source.sourceStart,
    sourceEnd: phrase.source.sourceEnd,
    sourceLabel: phrase.source.label ?? null,
    sourceDescription: phrase.source.description ?? null,
    entityId: phrase.entityId ?? null,
    targetEntityId: phrase.target.entityId ?? phrase.entityId ?? null,
    targetUrl: phrase.target.url ?? null,
    phraseRef: phrase,
    variableName: phrase.variable?.name ?? null,
    plainText: phrase.target.text,
    markdown: renderPhraseMarkdown(phrase),
    html: renderPhraseHtml(phrase),
  };
}

function buildTargetUnit(unit, id) {
  return {
    id,
    kind: unit.kind,
    phraseId: unit.phraseId ?? null,
    semanticLinkId: semanticLinkIdFromPhraseId(unit.phraseId),
    sourceText: unit.sourceText ?? null,
    targetText: unit.plainText,
    plainText: unit.plainText,
    markdown: unit.markdown,
    html: unit.html,
    targetEntityId: unit.targetEntityId ?? unit.entityId ?? null,
    targetUrl: unit.targetUrl ?? null,
  };
}

function applySourceInteriorPunctuation(units, segment, sentenceId, config) {
  if (config.translationStrategy === TRANSLATION_STRATEGIES.SEMANTIC_LABEL) {
    return { units, transformations: [] };
  }
  const nextUnits = [...units];
  let changed = false;
  for (const unit of nextUnits) {
    const sourceEnd = unit.sourceEnd;
    if (!Number.isInteger(sourceEnd)) {
      continue;
    }
    const offset = sourceEnd - segment.start;
    if (offset < 0 || offset >= segment.text.length) {
      continue;
    }
    const trailing = segment.text.slice(offset);
    const match = trailing.match(/^\s*([,;:])/);
    if (!match) {
      continue;
    }
    appendUnitSuffix(unit, match[1]);
    changed = true;
  }
  if (!changed) {
    return { units: nextUnits, transformations: [] };
  }
  recordStep(config, 'transformation-rule', {
    sentenceId,
    rule: 'source-interior-punctuation-preserved',
    sourceText: segment.text,
    affectedVariables: [],
  });
  return {
    units: nextUnits,
    transformations: ['source-interior-punctuation-preserved'],
  };
}

function semanticLinkIdFromPhraseId(phraseId) {
  if (!phraseId) {
    return null;
  }
  const numeric = Number(String(phraseId).split('-').pop());
  return Number.isFinite(numeric) ? `semantic-link-${numeric}` : null;
}

function applySentenceTransformations(units, segment, sentenceId, config) {
  let rendered;
  if (config.sourceLanguage === 'en' && config.targetLanguage === 'ru') {
    rendered = applyEnglishToRussianRules(units, segment, sentenceId, config);
  } else if (config.sourceLanguage === 'ru' && config.targetLanguage === 'en') {
    rendered = applyRussianToEnglishRules(units, segment, sentenceId, config);
  } else {
    rendered = {
      units,
      transformations: [],
      resolvedVariableNames: new Set(),
    };
  }
  return applyCommonNaturalizationRules(rendered, segment, sentenceId, config);
}

function applyCommonNaturalizationRules(rendered, segment, sentenceId, config) {
  if (config.translationStrategy === TRANSLATION_STRATEGIES.SEMANTIC_LABEL) {
    return rendered;
  }
  const exactGlossary = applyExactGlossaryPhraseNaturalization(
    rendered.units,
    segment,
    sentenceId,
    config
  );
  return {
    units: rendered.units,
    transformations: [
      ...rendered.transformations,
      ...exactGlossary.transformations,
    ],
    resolvedVariableNames: new Set([
      ...rendered.resolvedVariableNames,
      ...exactGlossary.resolvedVariableNames,
    ]),
  };
}

function applyExactGlossaryPhraseNaturalization(
  units,
  segment,
  sentenceId,
  config
) {
  const transformations = [];
  const resolvedVariableNames = new Set();
  const maxPhraseSize = 4;
  for (let index = 0; index < units.length; index += 1) {
    const maxSize = Math.min(maxPhraseSize, units.length - index);
    for (let size = maxSize; size >= 2; size -= 1) {
      const slice = units.slice(index, index + size);
      const sourceText = slice
        .map((unit) => unit.sourceText)
        .filter(Boolean)
        .join(' ');
      if (!sourceText || sourceText.split(/\s+/).length !== size) {
        continue;
      }
      const translation = lookupExactGlossaryTranslation(sourceText, config);
      if (!translation) {
        continue;
      }
      const affectedVariables = slice
        .map((unit) => unit.variableName)
        .filter(Boolean);
      for (const name of affectedVariables) {
        resolvedVariableNames.add(name);
      }
      units.splice(
        index,
        size,
        buildGlossaryPhraseUnit(sourceText, translation, config)
      );
      transformations.push('exact-glossary-phrase-naturalization');
      recordStep(config, 'transformation-rule', {
        sentenceId,
        rule: 'exact-glossary-phrase-naturalization',
        sourceText: segment.text,
        affectedVariables,
      });
      break;
    }
  }
  return { transformations, resolvedVariableNames };
}

function buildGlossaryPhraseUnit(sourceText, translation, config) {
  const target = buildLexicalTarget(translation.text, config.targetLanguage, {
    linkTargetMode: config.linkTargetMode,
  });
  return {
    kind: 'glossary-phrase',
    sourceText,
    variableName: null,
    plainText: target.text,
    targetEntityId: target.entityId,
    targetUrl: target.url,
    markdown: `[${escapeMarkdown(target.text)}](${target.url} "${target.entityId}")`,
    html: `<a href="${escapeAttribute(target.url)}" title="${escapeAttribute(
      target.entityId
    )}">${escapeHtml(target.text)}</a>`,
  };
}

function applyEnglishToRussianRules(units, segment, sentenceId, config) {
  const resolvedVariableNames = new Set();
  const transformations = [];
  let nextUnits = [...units];
  const isAPhraseIndex = nextUnits.findIndex((unit) =>
    isEnglishIsAPhrase(unit.sourceText)
  );
  if (isAPhraseIndex > 0 && isAPhraseIndex < nextUnits.length - 1) {
    const [phrase] = nextUnits.splice(
      isAPhraseIndex,
      1,
      buildRuleToken(
        nextUnits[isAPhraseIndex].sourceText,
        russianEtoCopula,
        config
      )
    );
    if (phrase.variableName) {
      resolvedVariableNames.add(phrase.variableName);
    }
    transformations.push('english-is-a-to-russian-eto');
    recordStep(config, 'transformation-rule', {
      sentenceId,
      rule: 'english-is-a-to-russian-eto',
      sourceText: segment.text,
      affectedVariables: phrase.variableName ? [phrase.variableName] : [],
    });
  }

  const articleVariables = nextUnits
    .filter((unit) => isEnglishArticle(unit.sourceText) && unit.variableName)
    .map((unit) => unit.variableName);
  if (nextUnits.some((unit) => isEnglishArticle(unit.sourceText))) {
    nextUnits = nextUnits.filter((unit) => !isEnglishArticle(unit.sourceText));
    for (const name of articleVariables) {
      resolvedVariableNames.add(name);
    }
    transformations.push('english-article-omission');
    recordStep(config, 'transformation-rule', {
      sentenceId,
      rule: 'english-article-omission',
      sourceText: segment.text,
      affectedVariables: articleVariables,
    });
  }

  const copulaIndex = nextUnits.findIndex((unit) =>
    isEnglishCopula(unit.sourceText)
  );
  if (
    copulaIndex > 0 &&
    copulaIndex < nextUnits.length - 1 &&
    !isEnglishPreposition(nextUnits[copulaIndex + 1].sourceText)
  ) {
    const [copula] = nextUnits.splice(
      copulaIndex,
      1,
      buildRuleToken(
        nextUnits[copulaIndex].sourceText,
        russianEtoCopula,
        config
      )
    );
    if (copula.variableName) {
      resolvedVariableNames.add(copula.variableName);
    }
    transformations.push('english-copula-to-russian-eto');
    recordStep(config, 'transformation-rule', {
      sentenceId,
      rule: 'english-copula-to-russian-eto',
      sourceText: segment.text,
      affectedVariables: copula.variableName ? [copula.variableName] : [],
    });
  }

  if (
    applyRussianUsStatePredicateRule(nextUnits, segment, sentenceId, config)
  ) {
    transformations.push('english-us-state-predicate-to-russian-shtat');
  }
  transformations.push(
    ...applyEnglishToRussianLexicalRules(nextUnits, segment, sentenceId, config)
  );

  return { units: nextUnits, transformations, resolvedVariableNames };
}

function applyEnglishToRussianLexicalRules(units, segment, sentenceId, config) {
  if (config.translationStrategy === TRANSLATION_STRATEGIES.SEMANTIC_LABEL) {
    return [];
  }
  const transformations = [];
  if (applyEnglishWithWikidataRule(units, segment, sentenceId, config)) {
    transformations.push('english-with-wikidata-to-russian-instrumental');
  }
  if (applyEnglishTransformationRulesRule(units, segment, sentenceId, config)) {
    transformations.push('english-transformation-rules-to-russian-noun-phrase');
  }
  if (applyCommaBeforeThenRule(units, segment, sentenceId, config)) {
    transformations.push('english-comma-before-then-preserved');
  }
  return transformations;
}

function applyEnglishWithWikidataRule(units, segment, sentenceId, config) {
  for (let index = 0; index < units.length - 1; index += 1) {
    if (
      normalizePhrase(units[index].sourceText) !== 'with' ||
      normalizePhrase(units[index + 1].sourceText) !== 'wikidata'
    ) {
      continue;
    }
    setUnitTargetText(units[index], { text: 'с помощью' }, config);
    setUnitTargetText(units[index + 1], { text: 'Викиданных' }, config);
    recordStep(config, 'transformation-rule', {
      sentenceId,
      rule: 'english-with-wikidata-to-russian-instrumental',
      sourceText: segment.text,
      affectedVariables: [],
    });
    return true;
  }
  return false;
}

function applyEnglishTransformationRulesRule(
  units,
  segment,
  sentenceId,
  config
) {
  for (let index = 0; index < units.length - 1; index += 1) {
    if (
      normalizePhrase(units[index].sourceText) !== 'transformation' ||
      normalizePhrase(units[index + 1].sourceText) !== 'rules'
    ) {
      continue;
    }
    const modifier = units[index];
    const noun = units[index + 1];
    setUnitTargetText(noun, { text: 'правила' }, config);
    setUnitTargetText(modifier, { text: 'преобразования' }, config);
    units.splice(index, 2, noun, modifier);
    recordStep(config, 'transformation-rule', {
      sentenceId,
      rule: 'english-transformation-rules-to-russian-noun-phrase',
      sourceText: segment.text,
      affectedVariables: [],
    });
    return true;
  }
  return false;
}

function applyCommaBeforeThenRule(units, segment, sentenceId, config) {
  if (!/,\s*then\b/i.test(segment.text)) {
    return false;
  }
  const thenIndex = units.findIndex(
    (unit) => normalizePhrase(unit.sourceText) === 'then'
  );
  if (thenIndex <= 0) {
    return false;
  }
  appendUnitSuffix(units[thenIndex - 1], ',');
  recordStep(config, 'transformation-rule', {
    sentenceId,
    rule: 'english-comma-before-then-preserved',
    sourceText: segment.text,
    affectedVariables: [],
  });
  return true;
}

function applyRussianUsStatePredicateRule(units, segment, sentenceId, config) {
  for (let index = 1; index < units.length - 1; index += 1) {
    if (!isRussianCopula(units[index].plainText)) {
      continue;
    }
    const subject = units[index - 1];
    const predicate = units[index + 1];
    if (!isStatePredicate(predicate) || !isUsStateSubject(subject)) {
      continue;
    }
    setUnitTargetText(predicate, russianUsStatePredicate, config);
    recordStep(config, 'transformation-rule', {
      sentenceId,
      rule: 'english-us-state-predicate-to-russian-shtat',
      sourceText: segment.text,
      affectedVariables: predicate.variableName ? [predicate.variableName] : [],
    });
    return true;
  }
  return false;
}

function isStatePredicate(unit) {
  if (normalizePhrase(unit?.sourceText) !== 'state') {
    return false;
  }
  return !unit.entityId || ['Q7275', 'Q35657'].includes(unit.entityId);
}

function isUsStateSubject(unit) {
  const description = normalizePhrase(unit?.sourceDescription);
  return (
    description.includes('state of the united states') ||
    description.includes('state of the united states of america') ||
    description.includes('us state') ||
    description.includes('u s state')
  );
}

function normalizePhrase(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function setUnitTargetText(unit, target, config = null) {
  const resolvedTarget = resolveUnitTarget(unit, target, config);
  unit.plainText = target.text;
  unit.targetEntityId = resolvedTarget.entityId;
  unit.targetUrl = resolvedTarget.url;
  applyUnitTargetToPhrase(unit, {
    ...target,
    entityId: resolvedTarget.entityId,
    url: resolvedTarget.url,
    description: target.description ?? resolvedTarget.description,
  });
  if (unit.targetEntityId && unit.targetUrl) {
    unit.markdown = `[${escapeMarkdown(unit.plainText)}](${unit.targetUrl} "${unit.targetEntityId}")`;
    unit.html = `<a href="${escapeAttribute(unit.targetUrl)}" title="${escapeAttribute(
      unit.targetEntityId
    )}">${escapeHtml(unit.plainText)}</a>`;
    return;
  }
  unit.markdown = unit.plainText;
  unit.html = escapeHtml(unit.plainText);
}

function resolveUnitTarget(unit, target, config) {
  const lexicalTarget =
    target.entityId || !target.text || !config
      ? null
      : buildLexicalTarget(target.text, config.targetLanguage, {
          linkTargetMode: config.linkTargetMode,
        });
  return {
    entityId:
      target.entityId ??
      lexicalTarget?.entityId ??
      unit.targetEntityId ??
      unit.entityId,
    url: target.url ?? lexicalTarget?.url ?? unit.targetUrl,
    description: lexicalTarget?.description,
  };
}

function appendUnitSuffix(unit, suffix) {
  if (!unit || unit.plainText.endsWith(suffix)) {
    return;
  }
  unit.plainText = `${unit.plainText}${suffix}`;
  unit.markdown = `${unit.markdown}${suffix}`;
  unit.html = `${unit.html}${suffix}`;
}

function buildRuleToken(sourceText, target, config = null) {
  const lexicalTarget =
    !target.entityId && target.text && config
      ? buildLexicalTarget(target.text, config.targetLanguage, {
          linkTargetMode: config.linkTargetMode,
        })
      : null;
  const unit = {
    kind: 'rule-token',
    sourceText,
    variableName: null,
    plainText: target.text,
    targetEntityId: target.entityId ?? lexicalTarget?.entityId ?? null,
    targetUrl: target.url ?? lexicalTarget?.url ?? null,
    markdown: target.text,
    html: escapeHtml(target.text),
  };
  if (unit.targetEntityId && unit.targetUrl) {
    unit.markdown = `[${escapeMarkdown(unit.plainText)}](${unit.targetUrl} "${unit.targetEntityId}")`;
    unit.html = `<a href="${escapeAttribute(unit.targetUrl)}" title="${escapeAttribute(
      unit.targetEntityId
    )}">${escapeHtml(unit.plainText)}</a>`;
  }
  return unit;
}

function applyUnitTargetToPhrase(unit, target) {
  if (!unit.phraseRef) {
    return;
  }
  unit.phraseRef.target.text = target.text;
  unit.phraseRef.target.entityId = unit.targetEntityId;
  unit.phraseRef.target.url = unit.targetUrl;
  unit.phraseRef.target.description =
    target.description ?? unit.phraseRef.target.description;
}

function applyRussianToEnglishRules(units, segment, sentenceId, config) {
  const resolvedVariableNames = new Set();
  const transformations = [];
  const nextUnits = [...units];
  const copulaIndex = nextUnits.findIndex((unit) =>
    isRussianCopula(unit.sourceText)
  );
  if (
    copulaIndex > 0 &&
    copulaIndex < nextUnits.length - 1 &&
    !isEnglishPreposition(nextUnits[copulaIndex + 1].plainText)
  ) {
    const [copula] = nextUnits.splice(
      copulaIndex,
      1,
      buildRuleToken(nextUnits[copulaIndex].sourceText, { text: 'is' }, config)
    );
    if (copula.variableName) {
      resolvedVariableNames.add(copula.variableName);
    }
    transformations.push('russian-copula-to-english-be');
    recordStep(config, 'transformation-rule', {
      sentenceId,
      rule: 'russian-copula-to-english-be',
      sourceText: segment.text,
      affectedVariables: copula.variableName ? [copula.variableName] : [],
    });

    const predicate = nextUnits[copulaIndex + 1];
    if (shouldInsertEnglishPredicateArticle(predicate)) {
      const article = englishIndefiniteArticleFor(predicate.plainText);
      nextUnits.splice(
        copulaIndex + 1,
        0,
        buildRuleToken('', { text: article }, config)
      );
      transformations.push('english-indefinite-article-insertion');
      recordStep(config, 'transformation-rule', {
        sentenceId,
        rule: 'english-indefinite-article-insertion',
        sourceText: segment.text,
        affectedVariables: [],
      });
    }
  }
  if (
    config.translationStrategy !== TRANSLATION_STRATEGIES.SEMANTIC_LABEL &&
    applyRussianExamplesOfRule(nextUnits, segment, sentenceId, config)
  ) {
    transformations.push('russian-examples-genitive-to-english-of-phrase');
  }

  return { units: nextUnits, transformations, resolvedVariableNames };
}

function applyRussianExamplesOfRule(units, segment, sentenceId, config) {
  for (let index = 0; index < units.length - 1; index += 1) {
    if (
      normalizePhrase(units[index].sourceText) !== 'примеры' ||
      normalizePhrase(units[index].plainText) !== 'examples'
    ) {
      continue;
    }
    const nextText = normalizePhrase(units[index + 1].plainText);
    if (!nextText || isEnglishPreposition(nextText)) {
      continue;
    }
    units.splice(index + 1, 0, buildRuleToken('', { text: 'of' }, config));
    recordStep(config, 'transformation-rule', {
      sentenceId,
      rule: 'russian-examples-genitive-to-english-of-phrase',
      sourceText: segment.text,
      affectedVariables: [],
    });
    return true;
  }
  return false;
}

function isEnglishArticle(value) {
  return ['a', 'an', 'the'].includes(String(value).toLowerCase());
}

function isEnglishIsAPhrase(value) {
  return normalizePhrase(value) === 'is a';
}

function isEnglishCopula(value) {
  return ['am', 'is', 'are', 'was', 'were', 'be', 'being', 'been'].includes(
    String(value).toLowerCase()
  );
}

function isRussianCopula(value) {
  return ['это'].includes(String(value).toLowerCase());
}

function isEnglishPreposition(value) {
  return [
    'about',
    'at',
    'by',
    'for',
    'from',
    'in',
    'into',
    'of',
    'on',
    'onto',
    'to',
    'with',
  ].includes(String(value).toLowerCase());
}

function shouldInsertEnglishPredicateArticle(unit) {
  const text = String(unit?.plainText ?? '').trim();
  if (!/^[a-z]/.test(text)) {
    return false;
  }
  const first = text.split(/\s+/)[0];
  return !isEnglishArticle(first);
}

function englishIndefiniteArticleFor(value) {
  const first = String(value).trim().charAt(0).toLowerCase();
  return ['a', 'e', 'i', 'o', 'u'].includes(first) ? 'an' : 'a';
}

function terminalPunctuation(value) {
  const match = String(value).match(/[.!?]+$/);
  return match?.[0] ?? '';
}

function appendTerminalPunctuation(value, punctuation) {
  const text = String(value).trim();
  if (!punctuation || text.endsWith(punctuation)) {
    return text;
  }
  return `${text}${punctuation}`;
}

function renderSentenceOutput(sentences, key, fallbackPhrases) {
  if (!sentences.length) {
    return fallbackPhrases.map((phrase) => phrase.target.text).join(' ');
  }
  return sentences.map((sentence) => sentence[key]).join(' ');
}

function renderPhraseMarkdown(phrase) {
  const targetEntityId = phrase.target.entityId ?? phrase.entityId;
  if (!targetEntityId || !phrase.target.url) {
    return phrase.target.text;
  }
  return `[${escapeMarkdown(phrase.target.text)}](${phrase.target.url} "${targetEntityId}")`;
}

function renderPhraseHtml(phrase) {
  const targetEntityId = phrase.target.entityId ?? phrase.entityId;
  if (!targetEntityId || !phrase.target.url) {
    return escapeHtml(phrase.target.text);
  }
  return `<a href="${escapeAttribute(phrase.target.url)}" title="${escapeAttribute(
    targetEntityId
  )}">${escapeHtml(phrase.target.text)}</a>`;
}

function renderTranslationLinksNotation(cst, questions) {
  const head = `(translation: ${toLino(cst.text)} from ${cst.sourceLanguage} to ${cst.targetLanguage})`;
  const semantic = cst.semanticMetaLanguage?.linksNotation
    ? [cst.semanticMetaLanguage.linksNotation]
    : [];
  const naturalization = cst.naturalization?.linksNotation
    ? [cst.naturalization.linksNotation]
    : [];
  const sentences = cst.sentences.map(
    (sentence) =>
      `(${sentence.id}: source ${toLino(sentence.sourceText)} target ${toLino(sentence.targetText)} transformations ${toLino(sentence.transformations.join(', ') || 'none')})`
  );
  const phrases = cst.phrases.map((phrase, index) => {
    const id = phrase.entityId ? ` id ${phrase.entityId}` : '';
    const targetId =
      phrase.target.entityId && phrase.target.entityId !== phrase.entityId
        ? ` targetId ${phrase.target.entityId}`
        : '';
    const variable = phrase.variable?.name
      ? ` variable ${phrase.variable.name}`
      : '';
    const url = phrase.target.url
      ? ` markdownUrl ${toLino(phrase.target.url)}`
      : '';
    return `(phrase-${index + 1}: source ${toLino(phrase.source.text)} target ${toLino(phrase.target.text)} status ${phrase.target.status}${id}${targetId}${variable}${url})`;
  });
  const variables = cst.variables.map(
    (variable) =>
      `(${variable.name}: source ${toLino(variable.sourceText)} reason ${variable.reason})`
  );
  const questionLines = questions.map(
    (question, index) => `(question-${index + 1}: ${toLino(question)})`
  );
  const steps = cst.steps.map(
    (step) => `(${step.id}: type ${step.type} ${toLino(stepSummary(step))})`
  );
  return [
    head,
    ...semantic,
    ...naturalization,
    ...sentences,
    ...phrases,
    ...variables,
    ...questionLines,
    ...steps,
  ].join('\n');
}

function renderSemanticMetaLanguageLinksNotation(semantic) {
  const head = `(semantic-meta-language: ${toLino(semantic.text)} from ${semantic.sourceLanguage} to ${semantic.targetLanguage})`;
  const links = semantic.links.map((link) => {
    const meaning = link.meaning.id
      ? ` meaning ${toLino(link.meaning.id)}`
      : '';
    const label = link.meaning.label
      ? ` label ${toLino(link.meaning.label)}`
      : '';
    const target = link.targetHint
      ? ` targetHint ${toLino(link.targetHint)}`
      : '';
    const url = link.meaning.url ? ` url ${toLino(link.meaning.url)}` : '';
    const role = link.sourceFragment?.role
      ? ` sourceRole ${link.sourceFragment.role}`
      : '';
    return `(${link.id}: source ${toLino(link.sourceText)} status ${link.status}${role}${meaning}${label}${target}${url})`;
  });
  return [head, ...links].join('\n');
}

function renderNaturalizationLinksNotation(naturalization) {
  const head = `(naturalization: target ${toLino(naturalization.targetText)} language ${naturalization.targetLanguage})`;
  const sentences = naturalization.sentences.map(
    (sentence) =>
      `(${sentence.id}: semanticLinks ${toLino(sentence.semanticLinkIds.join(' '))} target ${toLino(sentence.targetText)} transformations ${toLino(sentence.transformations.join(', ') || 'none')})`
  );
  const targetUnits = naturalization.sentences.flatMap((sentence) =>
    sentence.targetUnits.map((unit) => {
      const semantic = unit.semanticLinkId
        ? ` semanticLink ${unit.semanticLinkId}`
        : '';
      const entity = unit.targetEntityId
        ? ` targetId ${unit.targetEntityId}`
        : '';
      const url = unit.targetUrl
        ? ` markdownUrl ${toLino(unit.targetUrl)}`
        : '';
      return `(${unit.id}: target ${toLino(unit.targetText)}${semantic}${entity}${url})`;
    })
  );
  return [head, ...sentences, ...targetUnits].join('\n');
}

function recordPhraseStep(phrase, config) {
  recordStep(config, 'translation-phrase', {
    phraseId: phrase.id,
    sourceText: phrase.source.text,
    entityId: phrase.entityId,
    status: phrase.target.status,
    targetText: phrase.target.text,
    strategy: phrase.target.strategy ?? config.translationStrategy,
  });
}

function recordStep(config, type, details) {
  if (!config.trace) {
    return;
  }
  config.steps.push({
    id: `step-${config.steps.length + 1}`,
    type,
    ...details,
  });
}

function stepSummary(step) {
  if (step.rule) {
    return step.rule;
  }
  if (step.url) {
    return step.url;
  }
  if (step.sentenceId) {
    return step.sentenceId;
  }
  if (step.phraseId) {
    return step.phraseId;
  }
  if (step.text) {
    return step.text;
  }
  return step.type;
}

function toLino(value) {
  return `(${String(value ?? '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()})`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function escapeMarkdown(value) {
  return String(value).replace(/([\\[\]()`*_])/g, '\\$1');
}
