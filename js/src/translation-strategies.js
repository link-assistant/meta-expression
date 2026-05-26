import { buildDirectionalGlossary } from './semantic-lexicon.js';

export const TRANSLATION_STRATEGIES = Object.freeze({
  CONTEXTUAL_GLOSSARY: 'contextual-glossary',
  SEMANTIC_LABEL: 'semantic-label',
  LEXICAL_GLOSSARY: 'lexical-glossary',
});

const defaultTranslationStrategy = TRANSLATION_STRATEGIES.CONTEXTUAL_GLOSSARY;

const strategyDefinitions = Object.freeze([
  {
    id: TRANSLATION_STRATEGIES.CONTEXTUAL_GLOSSARY,
    label: 'Contextual glossary',
    description:
      'Use source-backed Wikidata/Wiktionary translations, then rule-derived phrases.',
  },
  {
    id: TRANSLATION_STRATEGIES.SEMANTIC_LABEL,
    label: 'Semantic labels',
    description: 'Use linked entity labels and transformation rules only.',
  },
  {
    id: TRANSLATION_STRATEGIES.LEXICAL_GLOSSARY,
    label: 'Lexical glossary',
    description:
      'Prefer source-backed and rule-derived lexical translations for readable text.',
  },
]);

export function listTranslationStrategies() {
  return strategyDefinitions.map((strategy) => ({ ...strategy }));
}

export function normalizeTranslationStrategy(value) {
  const normalized = String(value ?? '').trim();
  if (strategyDefinitions.some((strategy) => strategy.id === normalized)) {
    return normalized;
  }
  return defaultTranslationStrategy;
}

export function translationStrategyUsesGlossary(strategy) {
  return strategy !== TRANSLATION_STRATEGIES.SEMANTIC_LABEL;
}

export function lookupGlossaryTranslation(sourceText, config) {
  return lookupGlossaryTranslationWithMode(sourceText, config, {
    exactOnly: false,
  });
}

export function lookupExactGlossaryTranslation(sourceText, config) {
  return lookupGlossaryTranslationWithMode(sourceText, config, {
    exactOnly: true,
  });
}

function lookupGlossaryTranslationWithMode(sourceText, config, options) {
  if (!translationStrategyUsesGlossary(config.translationStrategy)) {
    return null;
  }
  if (config.sourceLanguage === config.targetLanguage) {
    return {
      text: String(sourceText ?? ''),
      target: null,
      strategy: 'identity',
    };
  }
  const glossary = buildDirectionalGlossary(
    config.sourceLanguage,
    config.targetLanguage
  );
  const translation = normalizeGlossaryEntry(
    glossary[normalizeGlossaryKey(sourceText)]
  );
  if (translation) {
    return {
      text: applySourceCasing(
        sourceText,
        translation.text,
        config.targetLanguage
      ),
      target: translation.target ?? null,
      strategy: config.translationStrategy,
    };
  }
  if (options.exactOnly) {
    return null;
  }
  const words = normalizeGlossaryKey(sourceText).split(' ').filter(Boolean);
  const wordTranslations = words.map((word) =>
    normalizeGlossaryEntry(glossary[word])
  );
  if (wordTranslations.length === 0 || wordTranslations.some((word) => !word)) {
    return null;
  }
  return {
    text: applySourceCasing(
      sourceText,
      wordTranslations.map((entry) => entry.text).join(' '),
      config.targetLanguage
    ),
    strategy: config.translationStrategy,
  };
}

function normalizeGlossaryEntry(entry) {
  if (typeof entry === 'string') {
    return { text: entry };
  }
  if (entry && typeof entry === 'object' && typeof entry.text === 'string') {
    return {
      text: entry.text,
      target: entry.target ?? null,
    };
  }
  return null;
}

function normalizeGlossaryKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function applySourceCasing(sourceText, targetText, targetLanguage) {
  const source = String(sourceText ?? '');
  const target = String(targetText ?? '');
  if (!source || !target || source[0] !== source[0].toUpperCase()) {
    return target;
  }
  const first = [...target][0];
  if (!first || first !== first.toLowerCase()) {
    return target;
  }
  return `${first.toLocaleUpperCase(targetLanguage)}${target.slice(
    first.length
  )}`;
}
