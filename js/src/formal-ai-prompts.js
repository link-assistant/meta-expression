import { translateTextWith } from './translate.js';
import {
  lookupExactGlossaryTranslation,
  normalizeTranslationStrategy,
  TRANSLATION_STRATEGIES,
} from './translation-strategies.js';

const languageAliases = new Map([
  ['en', 'en'],
  ['english', 'en'],
  ['английский', 'en'],
  ['ангилйский', 'en'],
  ['английском', 'en'],
  ['ru', 'ru'],
  ['russian', 'ru'],
  ['русский', 'ru'],
  ['русском', 'ru'],
  ['hi', 'hi'],
  ['hindi', 'hi'],
  ['हिंदी', 'hi'],
  ['хинди', 'hi'],
  ['zh', 'zh'],
  ['chinese', 'zh'],
  ['中文', 'zh'],
  ['китайский', 'zh'],
  ['китайском', 'zh'],
]);

const quotePairs = Object.freeze([
  ['"', '"'],
  ["'", "'"],
  ['`', '`'],
  ['«', '»'],
  ['“', '”'],
  ['‘', '’'],
]);

export function parseFormalAiTranslationPrompt(input) {
  const text = normalizePromptText(input);
  if (!text) {
    return null;
  }
  return (
    parseEnglishTranslationPrompt(text) ??
    parseRussianTranslationPrompt(text) ??
    parseHindiTranslationPrompt(text) ??
    parseChineseTranslationPrompt(text)
  );
}

export function translateFormalAiPrompt(input, options = {}) {
  return translateFormalAiPromptWith(input, {
    fetch: null,
    cache: null,
    now: () => 0,
    ...options,
  });
}

export async function translateFormalAiPromptWith(input, options = {}) {
  const formalAiPrompt = parseFormalAiTranslationPrompt(input);
  if (!formalAiPrompt) {
    throw new TypeError(
      `Unsupported Formal AI translation prompt: ${String(input)}`
    );
  }
  const translation = await translateTextWith(formalAiPrompt.sourceText, {
    ...buildFormalAiTranslateOptions(formalAiPrompt, options),
    sourceLanguage: formalAiPrompt.sourceLanguage,
    targetLanguage: formalAiPrompt.targetLanguage,
  });
  const unresolved = translation.questions.length > 0;
  const answer = unresolved
    ? `could not translate "${formalAiPrompt.sourceText}" to ${formalAiPrompt.targetLanguage}`
    : translation.plainText;
  const intent = `translate_${formalAiPrompt.sourceLanguage}_to_${formalAiPrompt.targetLanguage}`;
  return {
    ...translation,
    formalAiPrompt,
    intent,
    answer,
    evidenceLinks: buildFormalAiEvidenceLinks({
      answer,
      formalAiPrompt,
      intent,
      translation,
      unresolved,
    }),
  };
}

function parseEnglishTranslationPrompt(text) {
  const fromMatch = text.match(
    /^translate\s+(.+?)\s+from\s+([^\s.!?]+)\s+to\s+([^\s.!?]+)\s*[.!?]?$/iu
  );
  if (fromMatch) {
    return buildPrompt({
      sourceText: fromMatch[1],
      sourceLanguage: normalizeLanguageName(fromMatch[2]),
      targetLanguage: normalizeLanguageName(fromMatch[3]),
      promptLanguage: 'en',
    });
  }
  const toMatch = text.match(
    /^translate\s+(.+?)\s+to\s+([^\s.!?]+)\s*[.!?]?$/iu
  );
  if (!toMatch) {
    return null;
  }
  const sourceText = cleanPromptSourceText(toMatch[1]);
  return buildPrompt({
    sourceText,
    sourceLanguage: inferLanguageFromText(sourceText),
    targetLanguage: normalizeLanguageName(toMatch[2]),
    promptLanguage: 'en',
  });
}

function parseRussianTranslationPrompt(text) {
  const match = text.match(
    /^перев(?:еди|ести)\s+(.+?)\s+на\s+([^\s.!?]+)\s*[.!?]?$/iu
  );
  if (!match) {
    return null;
  }
  const sourceText = cleanPromptSourceText(match[1]);
  return buildPrompt({
    sourceText,
    sourceLanguage: inferLanguageFromText(sourceText),
    targetLanguage: normalizeLanguageName(match[2]),
    promptLanguage: 'ru',
  });
}

function parseHindiTranslationPrompt(text) {
  const match = text.match(
    /^(.+?)\s+का\s+([^\s.!?।]+)\s+में\s+अनुवाद\s+करो\s*[.!?।]?$/u
  );
  if (!match) {
    return null;
  }
  const sourceText = cleanPromptSourceText(match[1]);
  return buildPrompt({
    sourceText,
    sourceLanguage: inferLanguageFromText(sourceText),
    targetLanguage: normalizeLanguageName(match[2]),
    promptLanguage: 'hi',
  });
}

function parseChineseTranslationPrompt(text) {
  const match = text.match(/^把\s+(.+?)\s+翻译成\s*([^\s.!?。]+)\s*[.!?。]?$/u);
  if (!match) {
    return null;
  }
  const sourceText = cleanPromptSourceText(match[1]);
  return buildPrompt({
    sourceText,
    sourceLanguage: inferLanguageFromText(sourceText),
    targetLanguage: normalizeLanguageName(match[2]),
    promptLanguage: 'zh',
  });
}

function buildPrompt({
  sourceText,
  sourceLanguage,
  targetLanguage,
  promptLanguage,
}) {
  const cleanedSourceText = cleanPromptSourceText(sourceText);
  if (!cleanedSourceText || !sourceLanguage || !targetLanguage) {
    return null;
  }
  return {
    type: 'translation',
    sourceText: cleanedSourceText,
    sourceLanguage,
    targetLanguage,
    promptLanguage,
  };
}

function normalizePromptText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function cleanPromptSourceText(value) {
  let text = normalizePromptText(value);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [open, close] of quotePairs) {
      if (text.startsWith(open) && text.endsWith(close)) {
        text = text.slice(open.length, text.length - close.length).trim();
        changed = true;
      }
    }
  }
  return text;
}

function normalizeLanguageName(value) {
  const key = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.!?।。]+$/u, '');
  return languageAliases.get(key) ?? null;
}

function inferLanguageFromText(value) {
  const text = String(value ?? '');
  if (/\p{Script=Cyrillic}/u.test(text)) {
    return 'ru';
  }
  if (/\p{Script=Devanagari}/u.test(text)) {
    return 'hi';
  }
  if (/\p{Script=Han}/u.test(text)) {
    return 'zh';
  }
  return 'en';
}

function buildFormalAiTranslateOptions(formalAiPrompt, options) {
  const phrase = normalizeGlossaryPhrase(formalAiPrompt.sourceText);
  const extraOverrides = exactGlossaryOverride(formalAiPrompt, phrase, options);
  const overrides = [
    ...extraOverrides,
    ...normalizeOverrides(options.overrides),
  ];
  return {
    ...options,
    overrides,
    maxNgramSize: Math.max(
      Number(options.maxNgramSize ?? 0),
      countWords(phrase),
      3
    ),
  };
}

function exactGlossaryOverride(formalAiPrompt, phrase, options) {
  if (!phrase) {
    return [];
  }
  const config = {
    sourceLanguage: formalAiPrompt.sourceLanguage,
    targetLanguage: formalAiPrompt.targetLanguage,
    translationStrategy: normalizeTranslationStrategy(
      options.translationStrategy ??
        options.strategy ??
        TRANSLATION_STRATEGIES.CONTEXTUAL_GLOSSARY
    ),
  };
  if (!lookupExactGlossaryTranslation(phrase, config)) {
    return [];
  }
  return [
    {
      phrase,
      entityId: `formal-ai:${formalAiPrompt.sourceLanguage}:${phrase.replace(/\s+/g, '_')}`,
      label: phrase,
      kind: 'entity',
      source: 'formal-ai-glossary',
      description: 'Formal AI prompt glossary phrase',
      sourceUrl: 'https://github.com/link-assistant/formal-ai',
    },
  ];
}

function normalizeOverrides(overrides) {
  if (!overrides) {
    return [];
  }
  return Array.isArray(overrides) ? overrides : [overrides];
}

function normalizeGlossaryPhrase(value) {
  return String(value ?? '')
    .trim()
    .replace(/[.!?।。]+$/u, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function countWords(value) {
  return String(value ?? '')
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildFormalAiEvidenceLinks({
  formalAiPrompt,
  intent,
  translation,
  unresolved,
}) {
  const links = [
    `intent:${intent}`,
    `language_from:${formalAiPrompt.sourceLanguage}`,
    `language_to:${formalAiPrompt.targetLanguage}`,
  ];
  if (unresolved) {
    links.push(`translation_gap:${formalAiPrompt.sourceText}`);
  }
  for (const link of translation.semanticMetaLanguage?.links ?? []) {
    if (link.meaning?.id) {
      links.push(`meaning:${link.meaning.id}`);
    }
    if (link.targetHint) {
      links.push(`target:${link.targetHint}`);
    }
  }
  return [...new Set(links)];
}
