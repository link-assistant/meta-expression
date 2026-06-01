import {
  resolveConceptForm,
  resolveConceptGrammarForm,
  resolveSourcePhraseGrammarValue,
} from './semantic-lexicon.js';
import { TRANSLATION_STRATEGIES } from './translation-strategies.js';

const RUSSIAN_RELATIVE_THAT_CONCEPT_ID = 'lex:en:that_relative->ru';

export function applyEnglishToRussianLexicalRules(
  units,
  segment,
  sentenceId,
  config,
  helpers
) {
  if (config.translationStrategy === TRANSLATION_STRATEGIES.SEMANTIC_LABEL) {
    return [];
  }
  const transformations = [];
  if (
    applyRussianLocativeEntityRule(units, segment, sentenceId, config, helpers)
  ) {
    transformations.push('russian-locative-entity-case');
  }
  if (
    applyRussianRelativeThatRule(units, segment, sentenceId, config, helpers)
  ) {
    transformations.push('russian-relative-that-naturalization');
  }
  if (
    applyRussianPrepositionalObjectRule(
      units,
      segment,
      sentenceId,
      config,
      helpers
    )
  ) {
    transformations.push('russian-prepositional-object-case');
  }
  if (applyCommaBeforeThenRule(units, segment, sentenceId, config, helpers)) {
    transformations.push('english-comma-before-then-preserved');
  }
  return transformations;
}

function applyRussianLocativeEntityRule(
  units,
  segment,
  sentenceId,
  config,
  helpers
) {
  let changed = false;
  for (let index = 0; index < units.length - 1; index += 1) {
    const preposition = units[index];
    const place = units[index + 1];
    if (helpers.normalizePhrase(preposition.sourceText) !== 'in') {
      continue;
    }
    const locative = resolveConceptGrammarForm(
      place.targetEntityId,
      config.targetLanguage,
      'locative'
    );
    const locativePreposition = resolveConceptGrammarForm(
      place.targetEntityId,
      config.targetLanguage,
      'locativePreposition'
    );
    if (!locative || !locativePreposition) {
      continue;
    }
    helpers.replaceUnitTarget(preposition, locativePreposition, config);
    helpers.replaceUnitTarget(place, locative, config);
    changed = true;
  }
  if (changed) {
    helpers.recordStep(config, 'transformation-rule', {
      sentenceId,
      rule: 'russian-locative-entity-case',
      sourceText: segment.text,
      affectedVariables: [],
    });
  }
  return changed;
}

function applyRussianRelativeThatRule(
  units,
  segment,
  sentenceId,
  config,
  helpers
) {
  const relative = resolveConceptForm(
    RUSSIAN_RELATIVE_THAT_CONCEPT_ID,
    config.targetLanguage
  );
  if (!relative) {
    return false;
  }
  for (let index = 1; index < units.length - 1; index += 1) {
    if (helpers.normalizePhrase(units[index].sourceText) !== 'that') {
      continue;
    }
    const nextCase = resolveSourcePhraseGrammarValue(
      units[index + 1].sourceText,
      config.sourceLanguage,
      config.targetLanguage,
      'objectCase'
    );
    if (!nextCase) {
      continue;
    }
    helpers.appendUnitSuffix(units[index - 1], ',');
    helpers.replaceUnitTarget(units[index], relative, config);
    helpers.recordStep(config, 'transformation-rule', {
      sentenceId,
      rule: 'russian-relative-that-naturalization',
      sourceText: segment.text,
      affectedVariables: [],
    });
    return true;
  }
  return false;
}

function applyRussianPrepositionalObjectRule(
  units,
  segment,
  sentenceId,
  config,
  helpers
) {
  let changed = false;
  for (let index = 0; index < units.length - 1; index += 1) {
    const objectCase = resolveSourcePhraseGrammarValue(
      units[index].sourceText,
      config.sourceLanguage,
      config.targetLanguage,
      'objectCase'
    );
    if (!objectCase) {
      continue;
    }
    const objectForm = resolveConceptGrammarForm(
      units[index + 1].targetEntityId,
      config.targetLanguage,
      objectCase
    );
    if (!objectForm) {
      continue;
    }
    helpers.replaceUnitTarget(units[index + 1], objectForm, config);
    changed = true;
  }
  if (changed) {
    helpers.recordStep(config, 'transformation-rule', {
      sentenceId,
      rule: 'russian-prepositional-object-case',
      sourceText: segment.text,
      affectedVariables: [],
    });
  }
  return changed;
}

function applyCommaBeforeThenRule(units, segment, sentenceId, config, helpers) {
  if (!/,\s*then\b/i.test(segment.text)) {
    return false;
  }
  const thenIndex = units.findIndex(
    (unit) => helpers.normalizePhrase(unit.sourceText) === 'then'
  );
  if (thenIndex <= 0) {
    return false;
  }
  helpers.appendUnitSuffix(units[thenIndex - 1], ',');
  helpers.recordStep(config, 'transformation-rule', {
    sentenceId,
    rule: 'english-comma-before-then-preserved',
    sourceText: segment.text,
    affectedVariables: [],
  });
  return true;
}
