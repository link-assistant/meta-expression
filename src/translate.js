import { FORMALIZE_LINK_TARGETS, formalizeTextWith } from './formalize.js';

const wikidataApiUrl = 'https://www.wikidata.org/w/api.php';
const wikidataEntityBaseUrl = 'https://www.wikidata.org/wiki/';
const wikidataPropertyBaseUrl = 'https://www.wikidata.org/wiki/Property:';
const defaultCacheTtlMs = 60 * 60 * 1000;

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
  const formalization = await formalizeTextWith(input, {
    ...options,
    fetch: config.fetchImpl,
    cache: config.cache,
    language: config.sourceLanguage,
    linkTargetMode: config.linkTargetMode,
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
  const questions = variables.map((variable) =>
    buildVariableQuestion(variable, config)
  );
  const cst = buildTranslationCst(formalization, phrases, variables, config);
  return {
    text: formalization.text,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    formalization,
    cst,
    phrases,
    plainText: phrases.map((phrase) => phrase.target.text).join(' '),
    markdown: renderTranslationMarkdown(phrases),
    html: renderTranslationHtml(phrases),
    linksNotation: renderTranslationLinksNotation(cst, questions),
    variables,
    questions,
  };
}

function createTranslateConfig(options) {
  const sourceLanguage = normalizeLanguage(
    options.sourceLanguage ?? options.from ?? 'en'
  );
  const requestedTargetLanguage = options.targetLanguage ?? options.to;
  return {
    fetchImpl: options.fetch ?? globalThis.fetch?.bind(globalThis) ?? null,
    cache: options.cache ?? new Map(),
    cacheTtlMs: options.cacheTtlMs ?? defaultCacheTtlMs,
    now: options.now ?? Date.now,
    sourceLanguage,
    targetLanguage: String(requestedTargetLanguage ?? '').trim()
      ? normalizeLanguage(requestedTargetLanguage)
      : defaultTargetLanguage(sourceLanguage),
    linkTargetMode: options.linkTargetMode ?? FORMALIZE_LINK_TARGETS.WIKIPEDIA,
  };
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
  const base = {
    id: phrase.id,
    source: {
      text: phrase.text,
      start: phrase.start,
      end: phrase.end,
      language: config.sourceLanguage,
      entityId: phrase.entity?.id ?? null,
      label: phrase.entity?.label ?? null,
    },
  };
  if (!phrase.entity) {
    return unresolvedPhrase(base, 'unresolved-source-phrase');
  }
  if (!/^[QP]\d+$/.test(phrase.entity.id)) {
    return unresolvedPhrase(base, 'non-wikidata-source');
  }
  const target = await fetchTargetEntity(phrase.entity.id, config);
  const targetLabel = targetLabelFor(target, config.targetLanguage);
  if (!targetLabel) {
    return unresolvedPhrase(base, 'missing-target-label', phrase.entity.id);
  }
  return {
    ...base,
    entityId: phrase.entity.id,
    target: {
      text: targetLabel,
      language: config.targetLanguage,
      description: targetDescriptionFor(target, config.targetLanguage),
      url: targetUrlFor(target, phrase.entity, config.targetLanguage),
      status: 'translated',
    },
    variable: null,
  };
}

function unresolvedPhrase(base, reason, entityId = null) {
  return {
    ...base,
    entityId,
    target: {
      text: base.source.text,
      language: null,
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
    return cached.value;
  }
  const response = await config.fetchImpl(key, {
    headers: { accept: 'application/json' },
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

function buildTranslationCst(formalization, phrases, variables, config) {
  return {
    type: 'translation',
    version: 1,
    text: formalization.text,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
    formalization: formalization.cst,
    phrases,
    variables,
  };
}

function renderTranslationMarkdown(phrases) {
  return phrases
    .map((phrase) => {
      if (!phrase.entityId || !phrase.target.url) {
        return phrase.target.text;
      }
      return `[${escapeMarkdown(phrase.target.text)}](${phrase.target.url} "${phrase.entityId}")`;
    })
    .join(' ');
}

function renderTranslationHtml(phrases) {
  return phrases
    .map((phrase) => {
      if (!phrase.entityId || !phrase.target.url) {
        return escapeHtml(phrase.target.text);
      }
      return `<a href="${escapeAttribute(phrase.target.url)}" title="${escapeAttribute(
        phrase.entityId
      )}">${escapeHtml(phrase.target.text)}</a>`;
    })
    .join(' ');
}

function renderTranslationLinksNotation(cst, questions) {
  const head = `(translation: ${toLino(cst.text)} from ${cst.sourceLanguage} to ${cst.targetLanguage})`;
  const phrases = cst.phrases.map((phrase, index) => {
    const id = phrase.entityId ? ` id ${phrase.entityId}` : '';
    const variable = phrase.variable?.name
      ? ` variable ${phrase.variable.name}`
      : '';
    const url = phrase.target.url
      ? ` markdownUrl ${toLino(phrase.target.url)}`
      : '';
    return `(phrase-${index + 1}: source ${toLino(phrase.source.text)} target ${toLino(phrase.target.text)} status ${phrase.target.status}${id}${variable}${url})`;
  });
  const variables = cst.variables.map(
    (variable) =>
      `(${variable.name}: source ${toLino(variable.sourceText)} reason ${variable.reason})`
  );
  const questionLines = questions.map(
    (question, index) => `(question-${index + 1}: ${toLino(question)})`
  );
  return [head, ...phrases, ...variables, ...questionLines].join('\n');
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
