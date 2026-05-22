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
      'Prefer curated phrase translations, then fall back to Wikidata labels.',
  },
  {
    id: TRANSLATION_STRATEGIES.SEMANTIC_LABEL,
    label: 'Semantic labels',
    description: 'Use only linked entity labels and transformation rules.',
  },
  {
    id: TRANSLATION_STRATEGIES.LEXICAL_GLOSSARY,
    label: 'Lexical glossary',
    description:
      'Prefer direct word and phrase translations for readable output.',
  },
]);

const enRuGlossary = Object.freeze({
  formalize: 'формализуйте',
  source: 'исходный',
  text: 'текст',
  with: 'с',
  wikidata: 'Викиданные',
  then: 'затем',
  translate: 'переведите',
  each: 'каждое',
  sentence: 'предложение',
  through: 'через',
  labels: 'метки',
  and: 'и',
  transformation: 'преобразования',
  rules: 'правила',
  'transformation rules': 'правила преобразования',
  unresolved: 'неразрешенные',
  parts: 'части',
  remain: 'остаются',
  variables: 'переменными',
  questions: 'вопросами',
});

const glossaries = Object.freeze({
  'en:ru': enRuGlossary,
});

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
  if (!translationStrategyUsesGlossary(config.translationStrategy)) {
    return null;
  }
  const key = `${config.sourceLanguage}:${config.targetLanguage}`;
  const glossary = glossaries[key];
  if (!glossary) {
    return null;
  }
  const translation = glossary[normalizeGlossaryKey(sourceText)];
  if (translation) {
    return {
      text: applySourceCasing(sourceText, translation, config.targetLanguage),
      strategy: config.translationStrategy,
    };
  }
  const words = normalizeGlossaryKey(sourceText).split(' ').filter(Boolean);
  const wordTranslations = words.map((word) => glossary[word]);
  if (wordTranslations.length === 0 || wordTranslations.some((word) => !word)) {
    return null;
  }
  return {
    text: applySourceCasing(
      sourceText,
      wordTranslations.join(' '),
      config.targetLanguage
    ),
    strategy: config.translationStrategy,
  };
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
