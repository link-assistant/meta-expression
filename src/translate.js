import { FORMALIZE_LINK_TARGETS, formalizeTextWith } from './formalize.js';

const wikidataApiUrl = 'https://www.wikidata.org/w/api.php';
const wikidataEntityBaseUrl = 'https://www.wikidata.org/wiki/';
const wikidataPropertyBaseUrl = 'https://www.wikidata.org/wiki/Property:';
const defaultCacheTtlMs = 60 * 60 * 1000;
const wikimediaApiUserAgent =
  'meta-expression/0.9.0 (https://github.com/link-assistant/meta-expression)';
const russianUsStatePredicate = Object.freeze({
  text: 'штат',
  entityId: 'Q35657',
  url: 'https://ru.wikipedia.org/wiki/%D0%A8%D1%82%D0%B0%D1%82_%D0%A1%D0%A8%D0%90',
  description: 'state of the United States',
});

/**
 * Deterministic convenience wrapper for `translateTextWith()`.
 *
 * @param {string} input
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export function translateText(input, options = {}) {
  return translateTextWith(input, {
    fetch: null,
    cache: null,
    now: () => 0,
    ...options,
  });
}

/**
 * Translate text by first formalizing source phrases, then replacing every
 * resolved Wikidata Q/P phrase with its target-language label.
 *
 * Unresolved source phrases, non-Wikidata sources, and entities that lack a
 * target-language label are preserved as variables with explicit questions.
 * This keeps the output traceable instead of pretending every token was
 * understood.
 *
 * @param {string} input
 * @param {object} [options]
 * @param {string} [options.sourceLanguage]
 * @param {string} [options.targetLanguage]
 * @param {Function|null} [options.fetch]
 * @param {Map<string,unknown>|null} [options.cache]
 * @param {number} [options.cacheTtlMs]
 * @param {Function} [options.now]
 * @returns {Promise<object>}
 */
export async function translateTextWith(input, options = {}) {
  const config = createTranslateConfig(options);
  recordStep(config, 'input', {
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    text: input,
  });
  const formalization = await formalizeTextWith(input, {
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
  const phrases = [];
  const variables = [];
  for (const phrase of formalization.cst.phrases) {
    const translated = await translatePhrase(phrase, config);
    if (translated.variable) {
      translated.variable.name = `variable-${variables.length + 1}`;
      variables.push(translated.variable);
    }
    phrases.push(translated);
  }
  const sentences = buildTranslatedSentences(formalization, phrases, config);
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
    buildVariableQuestion(variable, config)
  );
  const plainText = renderSentenceOutput(sentences, 'plainText', phrases);
  const markdown = renderSentenceOutput(sentences, 'markdown', phrases);
  const html = renderSentenceOutput(sentences, 'html', phrases);
  recordStep(config, 'text', {
    sentenceCount: sentences.length,
    text: plainText,
  });
  const cst = buildTranslationCst(
    formalization,
    phrases,
    variables,
    sentences,
    config
  );
  return {
    text: formalization.text,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    formalization,
    cst,
    phrases,
    sentences,
    plainText,
    markdown,
    html,
    linksNotation: renderTranslationLinksNotation(cst, questions),
    variables,
    questions,
    steps: [...config.steps],
  };
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
  };
  config.fetchImpl = rawFetch
    ? (url, init) => traceFetch(url, init, config)
    : null;
  return config;
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

async function translatePhrase(phrase, config) {
  const translationEntity = translatableEntityForPhrase(phrase, config);
  const base = buildPhraseTranslationBase(phrase, translationEntity, config);
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
    isEnglishArticle(value) ||
    isEnglishCopula(value) ||
    isEnglishPreposition(value)
  );
}

async function fetchTargetEntity(id, config) {
  if (!config.fetchImpl) {
    return null;
  }
  const site = `${config.targetLanguage}wiki`;
  const url = new URL(wikidataApiUrl);
  url.search = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    ids: id,
    languages: config.targetLanguage,
    origin: '*',
    props: 'labels|descriptions|sitelinks',
    sitefilter: site,
  }).toString();
  const payload = await fetchJson(url, config);
  const entity = payload?.entities?.[id];
  return entity && !entity.missing ? entity : null;
}

async function fetchJson(url, config) {
  const key = String(url);
  const now = Number(config.now());
  const cached = config.cache.get(key);
  if (cached && cached.expiresAt > now) {
    recordStep(config, 'api-cache-hit', { url: key });
    return cached.value;
  }
  const response = await config.fetchImpl(key, {
    headers: wikimediaRequestHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Wikimedia request failed with status ${response.status}.`);
  }
  const value = await response.json();
  config.cache.set(key, {
    expiresAt: now + config.cacheTtlMs,
    value,
  });
  return value;
}

function wikimediaRequestHeaders() {
  const headers = {
    accept: 'application/json',
    'Api-User-Agent': wikimediaApiUserAgent,
  };
  if (typeof process !== 'undefined' && process.versions?.node) {
    headers['User-Agent'] = wikimediaApiUserAgent;
  }
  return headers;
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

function buildVariableQuestion(variable, config) {
  if (variable.entityId) {
    return `What ${config.targetLanguage} label should represent ${variable.entityId} for "${variable.sourceText}"?`;
  }
  return `What entity or expression should "${variable.sourceText}" map to before translating it from ${config.sourceLanguage} to ${config.targetLanguage}?`;
}

function buildTranslationCst(
  formalization,
  phrases,
  variables,
  sentences,
  config
) {
  return {
    type: 'translation',
    version: 1,
    text: formalization.text,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    formalization: formalization.cst,
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
  const punctuation = terminalPunctuation(segment.text);
  const plainText = appendTerminalPunctuation(
    rendered.units.map((unit) => unit.plainText).join(' '),
    punctuation
  );
  const markdown = appendTerminalPunctuation(
    rendered.units.map((unit) => unit.markdown).join(' '),
    punctuation
  );
  const html = appendTerminalPunctuation(
    rendered.units.map((unit) => unit.html).join(' '),
    punctuation
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
    transformations: rendered.transformations,
    resolvedVariableNames: [...rendered.resolvedVariableNames],
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

function applySentenceTransformations(units, segment, sentenceId, config) {
  if (config.sourceLanguage === 'en' && config.targetLanguage === 'ru') {
    return applyEnglishToRussianRules(units, segment, sentenceId, config);
  }
  if (config.sourceLanguage === 'ru' && config.targetLanguage === 'en') {
    return applyRussianToEnglishRules(units, segment, sentenceId, config);
  }
  return {
    units,
    transformations: [],
    resolvedVariableNames: new Set(),
  };
}

function applyEnglishToRussianRules(units, segment, sentenceId, config) {
  const resolvedVariableNames = new Set();
  const transformations = [];
  let nextUnits = [...units];
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
    const [copula] = nextUnits.splice(copulaIndex, 1, {
      kind: 'rule-token',
      sourceText: nextUnits[copulaIndex].sourceText,
      variableName: null,
      plainText: 'это',
      markdown: 'это',
      html: 'это',
    });
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

  return { units: nextUnits, transformations, resolvedVariableNames };
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
    setUnitTargetText(predicate, russianUsStatePredicate);
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

function setUnitTargetText(unit, target) {
  unit.plainText = target.text;
  unit.targetEntityId = target.entityId ?? unit.targetEntityId ?? unit.entityId;
  unit.targetUrl = target.url ?? unit.targetUrl;
  applyUnitTargetToPhrase(unit, target);
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
    const [copula] = nextUnits.splice(copulaIndex, 1, {
      kind: 'rule-token',
      sourceText: nextUnits[copulaIndex].sourceText,
      variableName: null,
      plainText: 'is',
      markdown: 'is',
      html: 'is',
    });
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
      nextUnits.splice(copulaIndex + 1, 0, {
        kind: 'rule-token',
        sourceText: '',
        variableName: null,
        plainText: article,
        markdown: article,
        html: article,
      });
      transformations.push('english-indefinite-article-insertion');
      recordStep(config, 'transformation-rule', {
        sentenceId,
        rule: 'english-indefinite-article-insertion',
        sourceText: segment.text,
        affectedVariables: [],
      });
    }
  }

  return { units: nextUnits, transformations, resolvedVariableNames };
}

function isEnglishArticle(value) {
  return ['a', 'an', 'the'].includes(String(value).toLowerCase());
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
    ...sentences,
    ...phrases,
    ...variables,
    ...questionLines,
    ...steps,
  ].join('\n');
}

function recordPhraseStep(phrase, config) {
  recordStep(config, 'translation-phrase', {
    phraseId: phrase.id,
    sourceText: phrase.source.text,
    entityId: phrase.entityId,
    status: phrase.target.status,
    targetText: phrase.target.text,
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
