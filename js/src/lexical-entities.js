const localEntityViewerBaseUrl =
  'https://link-assistant.github.io/human-language/entities.html';

export function lexicalSemanticId(text, language) {
  const normalized = normalizeLexicalText(text).replace(/\s+/g, '_') || 'token';
  return `lex:${language}:${normalized}`;
}

export function lexicalSemanticUrl(id) {
  return `${localEntityViewerBaseUrl}#${encodeURIComponent(id)}`;
}

export function buildLexicalTarget(text, language) {
  const entityId = lexicalSemanticId(text, language);
  return {
    text,
    language,
    entityId,
    description: `Lexical ${language} expression`,
    url: lexicalSemanticUrl(entityId),
  };
}

function normalizeLexicalText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
