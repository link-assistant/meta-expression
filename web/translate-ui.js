import {
  FORMALIZE_LINK_TARGETS,
  listTranslationStrategies,
  translateTextWith,
} from '../js/src/index.js';
import { escapeHtml } from './format-helpers.js';
import { createPersistentWikimediaCache } from './persistent-cache.js';
import { translateSamples } from './translate-samples.js';

const translateCacheStorageKey = 'meta-expression.translate-cache.v1';

export function setupTranslatePage({
  cache = createPersistentWikimediaCache(translateCacheStorageKey),
} = {}) {
  const input = document.querySelector('#translate-input');
  const sampleSelect = document.querySelector('#translate-sample');
  const sourceLanguage = document.querySelector('#translate-source-language');
  const targetLanguage = document.querySelector('#translate-target-language');
  const strategyGroup = document.querySelector('#translate-strategy');
  const linkTargetGroup = document.querySelector('#translate-link-target');
  const run = document.querySelector('#translate-run');
  const copyMarkdown = document.querySelector('#translate-copy-markdown');
  const copyLino = document.querySelector('#translate-copy-lino');
  const status = document.querySelector('#translate-status');
  const formalizedOutput = document.querySelector('#translate-formalized');
  const output = document.querySelector('#translate-output');
  const questions = document.querySelector('#translate-questions');
  const markdownPre = document.querySelector('#translate-markdown');
  const linoPre = document.querySelector('#translate-lino');
  const cstPre = document.querySelector('#translate-cst');
  const stepsList = document.querySelector('#translate-steps');
  let currentResult = null;
  const strategyState = {
    selected: listTranslationStrategies()[0]?.id ?? 'contextual-glossary',
  };

  if (!input || !run || !output || !status) {
    return { getResult: () => currentResult };
  }

  let requestId = 0;

  setupTranslateSamples({
    sampleSelect,
    input,
    sourceLanguage,
    targetLanguage,
  });
  setupTranslationStrategies(strategyGroup, strategyState);

  run.addEventListener('click', () => {
    runTranslate();
  });
  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      runTranslate();
    }
  });
  copyMarkdown?.addEventListener('click', async () => {
    if (!currentResult) {
      status.textContent = 'Translate the text first.';
      return;
    }
    await writeClipboard(currentResult.markdown);
    status.textContent = 'Markdown copied to clipboard.';
  });
  copyLino?.addEventListener('click', async () => {
    if (!currentResult) {
      status.textContent = 'Translate the text first.';
      return;
    }
    await writeClipboard(currentResult.linksNotation);
    status.textContent = 'Links Notation copied to clipboard.';
  });

  async function runTranslate() {
    const text = input.value.trim();
    if (!text) {
      status.textContent = 'Enter some text first.';
      return;
    }
    const id = String((requestId += 1));
    status.dataset.requestId = id;
    status.textContent = 'Translating...';
    try {
      const result = await translateTextWith(text, {
        fetch: globalThis.fetch?.bind(globalThis),
        cache,
        sourceLanguage: sourceLanguage?.value ?? 'en',
        targetLanguage: targetLanguage?.value ?? 'ru',
        linkTargetMode: selectedTranslateLinkTargetMode(linkTargetGroup),
        translationStrategy: strategyState.selected,
      });
      if (status.dataset.requestId !== id) {
        return;
      }
      currentResult = result;
      renderTranslateResult(result);
    } catch (error) {
      if (status.dataset.requestId === id) {
        status.textContent = `Translate failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    }
  }

  function renderTranslateResult(result) {
    if (formalizedOutput) {
      renderLinkedHtml(
        formalizedOutput,
        result.formalization.html || escapeHtml(result.formalization.markdown)
      );
    }
    renderLinkedHtml(output, result.html || escapeHtml(result.plainText));
    renderQuestionList(questions, result.questionDetails ?? result.questions);
    renderStepList(stepsList, result.steps);
    if (markdownPre) {
      markdownPre.textContent = result.markdown;
    }
    if (linoPre) {
      linoPre.textContent = result.linksNotation;
    }
    if (cstPre) {
      cstPre.textContent = JSON.stringify(result.cst, null, 2);
    }
    const translated = result.phrases.filter(
      (phrase) => phrase.target.status === 'translated'
    ).length;
    const total = result.phrases.length;
    const unresolved = result.variables.filter(
      (variable) => !variable.resolvedByRule
    ).length;
    const sentenceCount = result.sentences?.length ?? 0;
    const resolvedByRule = result.variables.filter(
      (variable) => variable.resolvedByRule
    ).length;
    const ruleText = resolvedByRule ? `, ${resolvedByRule} rule-resolved` : '';
    const unresolvedText = unresolved ? `; ${unresolved} unresolved` : '';
    status.textContent = `Translated ${sentenceCount} sentence${
      sentenceCount === 1 ? '' : 's'
    } (${translated}/${total} linked phrases${ruleText}${unresolvedText}).`;
  }

  return { getResult: () => currentResult };
}

function selectedTranslateLinkTargetMode(linkTargetGroup) {
  const selected = linkTargetGroup?.querySelector(
    'input[name="translate-target"]:checked'
  )?.value;
  if (selected === FORMALIZE_LINK_TARGETS.LOCAL) {
    return FORMALIZE_LINK_TARGETS.LOCAL;
  }
  if (selected === FORMALIZE_LINK_TARGETS.WIKIPEDIA) {
    return FORMALIZE_LINK_TARGETS.WIKIPEDIA;
  }
  return FORMALIZE_LINK_TARGETS.WIKIDATA;
}

function setupTranslateSamples({
  sampleSelect,
  input,
  sourceLanguage,
  targetLanguage,
}) {
  if (!sampleSelect) {
    return;
  }
  for (const [index, sample] of translateSamples.entries()) {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = sample.label;
    sampleSelect.append(option);
  }
  sampleSelect.addEventListener('change', () => {
    const sample = translateSamples[Number(sampleSelect.value)];
    if (!sample) {
      return;
    }
    input.value = sample.text;
    if (sourceLanguage) {
      sourceLanguage.value = sample.sourceLanguage;
    }
    if (targetLanguage) {
      targetLanguage.value = sample.targetLanguage;
    }
  });
}

function setupTranslationStrategies(strategyGroup, state) {
  if (!strategyGroup) {
    return;
  }
  strategyGroup.replaceChildren();
  for (const strategy of listTranslationStrategies()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'translate-strategy-option';
    button.dataset.strategy = strategy.id;
    button.textContent = strategy.label;
    button.title = strategy.description;
    button.addEventListener('click', () => {
      state.selected = strategy.id;
      syncStrategyButtons(strategyGroup, state);
    });
    strategyGroup.append(button);
  }
  syncStrategyButtons(strategyGroup, state);
}

function syncStrategyButtons(strategyGroup, state) {
  for (const button of strategyGroup.querySelectorAll('button')) {
    const active = button.dataset.strategy === state.selected;
    button.setAttribute('aria-pressed', String(active));
  }
}

function renderQuestionList(container, list) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  if (!list.length) {
    appendEmptyListItem(container, 'No unresolved variables.');
    return;
  }
  for (const question of list) {
    const item = document.createElement('li');
    const text = document.createElement('span');
    text.textContent =
      typeof question === 'string' ? question : question.question;
    item.append(text);
    if (typeof question !== 'string' && question.options?.length) {
      item.append(renderQuestionOptions(question));
    }
    container.append(item);
  }
}

function renderQuestionOptions(question) {
  const group = document.createElement('div');
  group.className = 'translate-question-options';
  for (const option of question.options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'translate-question-option';
    button.textContent = option.label;
    button.title = option.description;
    button.setAttribute(
      'aria-pressed',
      String(option.id === question.selectedOptionId)
    );
    button.addEventListener('click', () => {
      question.selectedOptionId = option.id;
      for (const peer of group.querySelectorAll('button')) {
        peer.setAttribute('aria-pressed', String(peer === button));
      }
    });
    group.append(button);
  }
  return group;
}

function renderStepList(container, list) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  if (!list.length) {
    appendEmptyListItem(container, 'No recorded steps.');
    return;
  }
  for (const step of list) {
    const item = document.createElement('li');
    item.textContent = formatStep(step);
    container.append(item);
  }
}

function appendEmptyListItem(container, text) {
  const empty = document.createElement('li');
  empty.className = 'section-empty';
  empty.textContent = text;
  container.append(empty);
}

function renderLinkedHtml(container, html) {
  container.innerHTML = html;
  for (const link of container.querySelectorAll('a')) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
}

function formatStep(step) {
  if (step.type === 'api-request') {
    return `API request: ${step.method ?? 'GET'} ${step.url}`;
  }
  if (step.type === 'api-response') {
    return `API response: ${step.status ?? 'unknown'} ${step.url}`;
  }
  if (step.type === 'api-cache-hit') {
    return `API cache hit: ${step.url}`;
  }
  if (step.type === 'formalization') {
    return `Formalization: ${step.phraseCount ?? 0} phrases`;
  }
  if (step.type === 'translation-phrase') {
    return `Phrase: ${step.sourceText} -> ${step.targetText} (${step.status})`;
  }
  if (step.type === 'transformation-rule') {
    return `Rule: ${step.rule} (${step.sentenceId})`;
  }
  if (step.type === 'sentence') {
    return `Sentence: ${step.sourceText} -> ${step.targetText}`;
  }
  if (step.type === 'text') {
    return `Text: ${step.text}`;
  }
  return `${step.type}: ${step.id}`;
}

async function writeClipboard(text) {
  if (!globalThis.navigator?.clipboard) {
    return;
  }
  try {
    await globalThis.navigator.clipboard.writeText(text);
  } catch {
    // Clipboard APIs can be blocked by browser permissions.
  }
}
