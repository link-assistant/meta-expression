const localEntityViewerBaseUrl =
  'https://link-assistant.github.io/human-language/entities.html';
const localLinkTargetMode = 'local-viewer';

export function lexicalSemanticId(text, language) {
  const normalized = normalizeLexicalText(text).replace(/\s+/g, '_') || 'token';
  return `lex:${language}:${normalized}`;
}

export function lexicalSemanticUrl(id, options = {}) {
  if (options.linkTargetMode === localLinkTargetMode) {
    return localLexicalSemanticUrl(id);
  }
  const parsed = parseLexicalSemanticId(id);
  if (!parsed) {
    return localLexicalSemanticUrl(id);
  }
  return wiktionaryLexicalUrl(options.text ?? parsed.text, parsed.language);
}

function localLexicalSemanticUrl(id) {
  return `${localEntityViewerBaseUrl}#${encodeURIComponent(id)}`;
}

export function buildLexicalTarget(text, language, options = {}) {
  const entityId = options.entityId ?? lexicalSemanticId(text, language);
  return {
    text,
    language,
    entityId,
    description: options.description ?? `Lexical ${language} expression`,
    url: options.url ?? lexicalSemanticUrl(entityId, { ...options, text }),
  };
}

export function wiktionaryLexicalUrl(text, language) {
  const normalized = String(text ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const wikiLanguage = normalizeWiktionaryLanguage(language);
  if (!normalized) {
    return `https://${wikiLanguage}.wiktionary.org/wiki/Main_Page`;
  }
  if (normalized.includes(' ')) {
    return `https://${wikiLanguage}.wiktionary.org/wiki/Special:Search?search=${encodeURIComponent(normalized)}`;
  }
  return `https://${wikiLanguage}.wiktionary.org/wiki/${encodeURIComponent(normalized)}`;
}

function normalizeLexicalText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeWiktionaryLanguage(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return /^[a-z][a-z0-9-]{0,14}$/.test(normalized) ? normalized : 'en';
}

function parseLexicalSemanticId(id) {
  const match = String(id ?? '').match(/^lex:([^:]+):(.+)$/);
  if (!match) {
    return null;
  }
  return {
    language: normalizeWiktionaryLanguage(match[1]),
    text: match[2].replace(/_/g, ' '),
  };
}
