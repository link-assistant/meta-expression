import {
  FORMALIZE_LINK_TARGETS,
  formalizeTextWith,
  resolveLinkTarget,
} from './formalize.js';
import {
  lookupExactGlossaryTranslation,
  lookupGlossaryTranslation,
  normalizeTranslationStrategy,
  TRANSLATION_STRATEGIES,
} from './translation-strategies.js';
import { lookupWikimediaTranslation } from './wikimedia-translation.js';
import { resolveConceptForm } from './semantic-lexicon.js';
import { applyEnglishToRussianLexicalRules } from './russian-naturalization.js';
import { buildLexicalTarget, lexicalSemanticId } from './lexical-entities.js';
import { createTargetEntityBatchLoader } from './target-entity-loader.js';
import {
  applyObjectTransformationRules,
  applySentenceTextTransformationRules,
  applyTextTransformationRules,
  collectTranslationTransformationRules,
} from './transformation-rules.js';
import {
  buildSemanticSourceFragment,
  reconstructSourceText,
  segmentSemanticMetaLanguageSource,
} from './translation-source-fragment.js';
import {
  escapeAttribute,
  escapeHtml,
  escapeMarkdown,
  renderNaturalizationLinksNotation,
  renderPhraseHtml,
  renderPhraseMarkdown,
  renderSemanticMetaLanguageLinksNotation,
  renderSentenceOutput,
  renderTranslationLinksNotation,
} from './translation-renderers.js';
import { containsNonAscii } from './text-tokenization.js';

const wikidataEntityBaseUrl = 'https://www.wikidata.org/wiki/';
const wikidataPropertyBaseUrl = 'https://www.wikidata.org/wiki/Property:';
const defaultCacheTtlMs = 7 * 24 * 60 * 60 * 1000;

// Grammatical naturalization rules need a concrete target lexeme (a copula
// marker, a sense-disambiguated noun, …). Per the interlingua contract these
// surface forms must never be hardcoded in `js/src`; the code only names the
// language-neutral concept id and resolves the form from the lexicon data at
// runtime via `resolveConceptForm`.
const RUSSIAN_COPULA_CONCEPT_ID = 'lex:en:is->ru';
const RUSSIAN_EXAMPLES_CONCEPT_ID = 'lex:en:examples->ru';

function requireConceptForm(conceptId, language) {
  const form = resolveConceptForm(conceptId, language);
  if (!form) {
    throw new Error(
      `Interlingua lexicon is missing concept "${conceptId}" for language ` +
        `"${language}". Record source-backed or rule-derived data in ` +
        'the semantic lexicon source pipeline and rebuild with ' +
        'scripts/build-lexicon-seed.mjs.'
    );
  }
  return form;
}

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
    buildTranslatedSentences(semanticMetaLanguage, phrases, config),
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
  naturalization = refreshNaturalizationLinksNotation(naturalization);
  const plainText = naturalization.targetText;
  const markdown = naturalization.targetMarkdown;
  const html = naturalization.targetHtml;
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
    text: semanticMetaLanguage.text,
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
    linkTargetMode: options.linkTargetMode ?? FORMALIZE_LINK_TARGETS.WIKIPEDIA,
    translationStrategy: normalizeTranslationStrategy(
      options.translationStrategy ?? options.strategy
    ),
    ...collectTranslationTransformationRules(options),
    targetEntityLoader: createTargetEntityBatchLoader({
      onCacheHit: (config, cachedUrl) =>
        recordStep(config, 'api-cache-hit', { url: cachedUrl }),
    }),
  };
  config.recordStep = (type, details) => recordStep(config, type, details);
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
  const sourceReconstruction =
    formalization.cst.linguisticMetadata?.sourceReconstruction ?? null;
  const sourceText =
    reconstructSourceText(sourceReconstruction) ?? formalization.text;
  const semantic = {
    type: 'semantic-meta-language',
    version: 1,
    text: sourceText,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    representation: 'links-notation',
    sourceLinksNotation: formalization.linksNotation,
    sourceReconstruction,
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
  const immediateTranslation = await lookupImmediatePhraseTranslation(
    phrase,
    translationEntity,
    config
  );
  const base = buildPhraseTranslationBase(
    phrase,
    immediateTranslation
      ? immediateTranslation.sourceEntity
      : translationEntity,
    config
  );
  if (immediateTranslation) {
    const translated = translatedGlossaryPhrase(
      base,
      immediateTranslation.translation,
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
        config.targetLanguage,
        config
      ),
      status: 'translated',
    },
    variable: null,
  };
  recordPhraseStep(translated, config);
  return translated;
}

async function lookupImmediatePhraseTranslation(
  phrase,
  translationEntity,
  config
) {
  if (!translationEntity) {
    const translation = await lookupUnlinkedPhraseTranslation(phrase, config);
    return translation ? { translation, sourceEntity: null } : null;
  }
  const translation = lookupLocalConceptTranslation(translationEntity, config);
  return translation ? { translation, sourceEntity: translationEntity } : null;
}

async function lookupUnlinkedPhraseTranslation(phrase, config) {
  if (config.translationStrategy === TRANSLATION_STRATEGIES.SEMANTIC_LABEL) {
    return null;
  }
  return (
    (await lookupWikimediaTranslation(phrase, config)) ??
    lookupGlossaryTranslation(phrase.text, config)
  );
}

function lookupLocalConceptTranslation(entity, config) {
  const concept = entity?.id
    ? resolveConceptForm(entity.id, config.targetLanguage)
    : null;
  if (!concept?.text) {
    return null;
  }
  const targetEntity = {
    ...entity,
    id: concept.entityId ?? entity.id,
    sourceUrl: concept.url ?? sourceUrlForSemanticEntity(entity),
    wikipediaUrl: concept.url ?? null,
  };
  return {
    text: concept.text,
    target: {
      entityId: targetEntity.id,
      description: concept.description ?? entity.description ?? null,
      url: resolveLinkTarget(
        { entity: targetEntity },
        { linkTargetMode: config.linkTargetMode }
      ),
      source: 'semantic-lexicon',
      sourceUrl: concept.url ?? sourceUrlForSemanticEntity(entity),
    },
    strategy: 'semantic-lexicon',
  };
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
      source: target.source,
      sourceUrl: target.sourceUrl,
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
      source: translation.target.source ?? null,
      sourceUrl: translation.target.sourceUrl ?? null,
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
    source: 'lexical',
    sourceUrl: null,
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
      sourceLabel: base.source.label,
      sourceUrl: base.source.url,
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
    const bodyPreview = config.trace
      ? await responseBodyPreview(response)
      : null;
    recordStep(config, 'api-response', {
      method,
      url: requestUrl,
      status: response?.status ?? null,
      ok: response?.ok ?? null,
      bodyPreview,
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

async function responseBodyPreview(response) {
  if (typeof response?.clone !== 'function') {
    return null;
  }
  try {
    const body = await response.clone().text();
    return body.length > 500 ? `${body.slice(0, 500)}...` : body || null;
  } catch {
    return null;
  }
}

function targetLabelFor(entity, language) {
  // Prefer the interlingua's licensed short surface form for the concept when
  // one exists (e.g. Q35657 → ru "штат" rather than the full Wikidata label
  // "Штат США"). This keeps the rendered word natural while the link still
  // points at the canonical article via targetUrlFor. The lookup is concept-id
  // driven, so it stays free of hardcoded language pairs (issue #128).
  const concept = entity?.id ? resolveConceptForm(entity.id, language) : null;
  if (concept?.text) {
    return concept.text;
  }
  return entity?.labels?.[language]?.value ?? null;
}

function targetDescriptionFor(entity, language) {
  return entity?.descriptions?.[language]?.value ?? null;
}

function targetUrlFor(entity, sourceEntity, language, config) {
  const title = entity?.sitelinks?.[`${language}wiki`]?.title;
  const targetEntity = {
    ...sourceEntity,
    wikipediaUrl: title
      ? `https://${language}.wikipedia.org/wiki/${encodeURIComponent(
          title.replace(/ /g, '_')
        )}`
      : null,
  };
  return resolveLinkTarget(
    { entity: targetEntity },
    {
      linkTargetMode: config.linkTargetMode,
    }
  );
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
    options: buildVariableAnswerOptions(variable),
  };
}

function buildVariableAnswerOptions(variable) {
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
    const sourceLabel = variable.sourceLabel ?? variable.sourceText;
    options.push({
      id: 'source-label',
      label: 'Use linked source label',
      targetText: sourceLabel,
      entityId: variable.entityId,
      targetUrl: variable.sourceUrl ?? null,
      description: `Use the available source label for ${variable.entityId}.`,
      confidence: 0.35,
    });
  } else {
    const normalized = variable.sourceText.replace(/[_-]+/g, ' ').trim();
    options.push({
      id: 'normalized-expression',
      label: 'Use normalized expression',
      targetText: normalized || variable.sourceText,
      entityId: null,
      description: 'Use the source expression with word separators normalized.',
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

function refreshNaturalizationLinksNotation(naturalization) {
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
    text: semanticMetaLanguage.text,
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

function buildTranslatedSentences(semanticMetaLanguage, phrases, config) {
  const segments = segmentSemanticMetaLanguageSource(semanticMetaLanguage);
  return segments.map((segment, index) =>
    buildTranslatedSentence(segment, index, phrases, config)
  );
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
    punctuated.units
      .map((unit) => unit.plainText)
      .join(' ')
      .replace(/\/\s+/g, '/'),
    terminal
  );
  const markdown = appendTerminalPunctuation(
    punctuated.units
      .map((unit) => unit.markdown)
      .join(' ')
      .replace(/\/\s+/g, '/'),
    terminal
  );
  const html = appendTerminalPunctuation(
    punctuated.units
      .map((unit) => unit.html)
      .join(' ')
      .replace(/\/\s+/g, '/'),
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
    const pronunciationMatch = trailing.match(/^(\s*\(\/[^/()]*\/\))/u);
    const match =
      pronunciationMatch && containsNonAscii(pronunciationMatch[1])
        ? pronunciationMatch
        : trailing.match(/^(\s*[()[\]{},;:/]+)/);
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
      const phraseUnit = buildGlossaryPhraseUnit(
        sourceText,
        translation,
        config
      );
      // Collapsing several source units into one phrase unit must not drop
      // punctuation a prior rule attached to the final unit (e.g. the comma in
      // "Wikidata, then"). Carry that trailing punctuation onto the phrase.
      const trailing = trailingInteriorPunctuation(slice[slice.length - 1]);
      if (trailing) {
        appendUnitSuffix(phraseUnit, trailing);
      }
      units.splice(index, size, phraseUnit);
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

function trailingInteriorPunctuation(unit) {
  return String(unit?.plainText ?? '').match(/[,;:/]+$/)?.[0] ?? '';
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
        requireConceptForm(RUSSIAN_COPULA_CONCEPT_ID, config.targetLanguage),
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
        requireConceptForm(RUSSIAN_COPULA_CONCEPT_ID, config.targetLanguage),
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

  transformations.push(
    ...applyEnglishToRussianLexicalRules(
      nextUnits,
      segment,
      sentenceId,
      config,
      {
        normalizePhrase,
        appendUnitSuffix,
        replaceUnitTarget,
        recordStep,
      }
    )
  );

  return { units: nextUnits, transformations, resolvedVariableNames };
}

function normalizePhrase(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function appendUnitSuffix(unit, suffix) {
  if (!unit || unit.plainText.endsWith(suffix)) {
    return;
  }
  unit.plainText = `${unit.plainText}${suffix}`;
  unit.markdown = `${unit.markdown}${suffix}`;
  unit.html = `${unit.html}${suffix}`;
}

function replaceUnitTarget(unit, target, config) {
  const replacement = buildRuleToken(unit.sourceText, target, config);
  unit.plainText = replacement.plainText;
  unit.markdown = replacement.markdown;
  unit.html = replacement.html;
  unit.targetEntityId = replacement.targetEntityId;
  unit.targetUrl = replacement.targetUrl;
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
      buildRuleToken(
        nextUnits[copulaIndex].sourceText,
        { text: requireConceptForm(RUSSIAN_COPULA_CONCEPT_ID, 'en').text },
        config
      )
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
  const examplesSource = resolveConceptForm(RUSSIAN_EXAMPLES_CONCEPT_ID, 'ru');
  const examplesTarget = resolveConceptForm(RUSSIAN_EXAMPLES_CONCEPT_ID, 'en');
  if (!examplesSource || !examplesTarget) {
    return false;
  }
  for (let index = 0; index < units.length - 1; index += 1) {
    if (
      normalizePhrase(units[index].sourceText) !==
        normalizePhrase(examplesSource.text) ||
      normalizePhrase(units[index].plainText) !==
        normalizePhrase(examplesTarget.text)
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
  const copula = resolveConceptForm(RUSSIAN_COPULA_CONCEPT_ID, 'ru');
  if (!copula) {
    return false;
  }
  return String(value ?? '').toLowerCase() === copula.text.toLowerCase();
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
  return String(value).match(/[.!?]+$/)?.[0] ?? '';
}

function appendTerminalPunctuation(value, punctuation) {
  const text = String(value).trim();
  if (!punctuation || text.endsWith(punctuation)) {
    return text;
  }
  return `${text}${punctuation}`;
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
