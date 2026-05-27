import {
  applyTranslationQuestionAnswers,
  FORMALIZE_LINK_TARGETS,
  listTranslationStrategies,
  parseSourceSpec,
  translateTextWith,
} from '../js/src/index.js';
import { escapeHtml } from './format-helpers.js';
import { createPersistentWikimediaCache } from './persistent-cache.js';
import {
  collectCheckedSourceSpec,
  setupSourcePriorityList,
} from './source-priority-ui.js';
import { translateSamples } from './translate-samples.js';

const translateCacheStorageKey = 'meta-expression.translate-cache.v2';

export function setupTranslatePage({
  cache = createPersistentWikimediaCache(translateCacheStorageKey),
} = {}) {
  const input = document.querySelector('#translate-input');
  const sampleSelect = document.querySelector('#translate-sample');
  const sourceLanguage = document.querySelector('#translate-source-language');
  const targetLanguage = document.querySelector('#translate-target-language');
  const strategyGroup = document.querySelector('#translate-strategy');
  const linkTargetGroup = document.querySelector('#translate-link-target');
  const sourceList = document.querySelector('#translate-source-list');
  const run = document.querySelector('#translate-run');
  const copyMarkdown = document.querySelector('#translate-copy-markdown');
  const copyLino = document.querySelector('#translate-copy-lino');
  const copyDebugLog = document.querySelector('#translate-copy-debug-log');
  const status = document.querySelector('#translate-status');
  const formalizedOutput = document.querySelector('#translate-formalized');
  const output = document.querySelector('#translate-output');
  const questions = document.querySelector('#translate-questions');
  const wordContextsList = document.querySelector('#translate-word-contexts');
  const markdownPre = document.querySelector('#translate-markdown');
  const linoPre = document.querySelector('#translate-lino');
  const cstPre = document.querySelector('#translate-cst');
  const stepsList = document.querySelector('#translate-steps');
  const debugPre = document.querySelector('#translate-debug-log');
  const strategyState = {
    selected: listTranslationStrategies()[0]?.id ?? 'contextual-glossary',
  };

  if (!input || !run || !output || !status) {
    return { getResult: () => null };
  }

  const ctx = {
    input,
    sourceLanguage,
    targetLanguage,
    strategyGroup,
    linkTargetGroup,
    sourceList,
    run,
    status,
    formalizedOutput,
    output,
    questions,
    wordContextsList,
    markdownPre,
    linoPre,
    cstPre,
    stepsList,
    debugPre,
    cache,
    strategyState,
    requestId: 0,
    currentResult: null,
    // Pinned per-word senses persist across re-runs so answering a context
    // question modifies the formalization without the question disappearing.
    contextSelections: {},
    lastText: null,
  };

  setupTranslateSamples({
    sampleSelect,
    input,
    sourceLanguage,
    targetLanguage,
  });
  setupTranslationStrategies(strategyGroup, strategyState);
  setupSourcePriorityList(sourceList);

  run.addEventListener('click', () => runTranslate(ctx));
  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      runTranslate(ctx);
    }
  });
  setupTranslateCopyButtons({
    status,
    getResult: () => ctx.currentResult,
    buttons: [
      { button: copyMarkdown, label: 'Markdown', value: (r) => r.markdown },
      {
        button: copyLino,
        label: 'Links Notation',
        value: (r) => r.linksNotation,
      },
      {
        button: copyDebugLog,
        label: 'Debug log',
        value: (r) => formatDebugLog(r),
      },
    ],
  });

  return { getResult: () => ctx.currentResult };
}

function buildTranslateOptions(ctx) {
  const sourcesSpec = collectCheckedSourceSpec(ctx.sourceList);
  return {
    fetch: globalThis.fetch?.bind(globalThis),
    cache: ctx.cache,
    sourceLanguage: selectedLanguageValue(ctx.sourceLanguage, 'en'),
    targetLanguage: selectedLanguageValue(ctx.targetLanguage, 'ru'),
    linkTargetMode: selectedTranslateLinkTargetMode(ctx.linkTargetGroup),
    translationStrategy: ctx.strategyState.selected,
    sources: selectedTranslateSources(sourcesSpec, ctx.sourceLanguage),
    contextSelections: ctx.contextSelections,
  };
}

function runTranslate(ctx) {
  const text = ctx.input.value.trim();
  if (!text) {
    ctx.status.textContent = 'Enter some text first.';
    return;
  }
  // A fresh run from the Translate button clears any pinned senses.
  ctx.contextSelections = {};
  ctx.lastText = text;
  executeTranslate(ctx, text);
}

// Re-pin a word's sense and re-run translation. The selection is kept so the
// context question stays visible with the new choice highlighted — issue #126.
function applyContextSelection(ctx, phraseStart, entityId) {
  if (phraseStart === null || phraseStart === undefined || !ctx.lastText) {
    return;
  }
  if (ctx.contextSelections[phraseStart] === entityId) {
    return;
  }
  ctx.contextSelections = { ...ctx.contextSelections, [phraseStart]: entityId };
  executeTranslate(ctx, ctx.lastText);
}

async function executeTranslate(ctx, text) {
  const { status, run } = ctx;
  const id = String((ctx.requestId += 1));
  status.dataset.requestId = id;
  status.textContent = 'Translating...';
  run.dataset.defaultLabel ??= run.textContent;
  run.disabled = true;
  run.textContent = 'Translating...';
  try {
    const result = await translateTextWith(text, buildTranslateOptions(ctx));
    if (status.dataset.requestId !== id) {
      return;
    }
    ctx.currentResult = result;
    renderTranslateResult(ctx, result);
  } catch (error) {
    if (status.dataset.requestId === id) {
      status.textContent = `Translate failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  } finally {
    if (status.dataset.requestId === id) {
      run.disabled = false;
      run.textContent = run.dataset.defaultLabel || 'Translate';
    }
  }
}

function renderTranslateResult(ctx, result) {
  if (ctx.formalizedOutput) {
    renderLinkedHtml(
      ctx.formalizedOutput,
      result.formalization.html || escapeHtml(result.formalization.markdown)
    );
  }
  renderLinkedHtml(ctx.output, result.html || escapeHtml(result.plainText));
  renderQuestionList(
    ctx.questions,
    result.questionDetails ?? result.questions,
    (question, answer) => {
      ctx.currentResult = applyTranslationQuestionAnswers(
        ctx.currentResult ?? result,
        { [question.variableName]: answer }
      );
      renderTranslateResult(ctx, ctx.currentResult);
    }
  );
  renderWordContextList(ctx.wordContextsList, {
    wordContexts: result.formalization?.wordContexts ?? [],
    contextQuestions: result.formalization?.contextQuestions ?? [],
    mainContext: result.formalization?.mainContext ?? null,
    selections: ctx.contextSelections,
    onSelect: (start, entityId) => applyContextSelection(ctx, start, entityId),
  });
  renderStepList(ctx.stepsList, result.steps);
  if (ctx.markdownPre) {
    ctx.markdownPre.textContent = result.markdown;
  }
  if (ctx.linoPre) {
    ctx.linoPre.textContent = result.linksNotation;
  }
  if (ctx.cstPre) {
    ctx.cstPre.textContent = JSON.stringify(result.cst, null, 2);
  }
  if (ctx.debugPre) {
    ctx.debugPre.textContent = formatDebugLog(result);
  }
  ctx.status.textContent = translateStatusText(result);
}

function setupTranslateCopyButtons({ status, getResult, buttons }) {
  for (const { button, label, value } of buttons) {
    button?.addEventListener('click', async () => {
      const result = getResult();
      if (!result) {
        status.textContent = 'Translate the text first.';
        return;
      }
      await writeClipboard(value(result));
      status.textContent = `${label} copied to clipboard.`;
    });
  }
}

function selectedLanguageValue(select, fallback) {
  return select?.value ?? fallback;
}

function selectedTranslateSources(sourcesSpec, sourceLanguage) {
  if (!sourcesSpec) {
    return undefined;
  }
  return parseSourceSpec(sourcesSpec, {
    language: selectedLanguageValue(sourceLanguage, 'en'),
  });
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

function translateStatusText(result) {
  const translated = result.phrases.filter((phrase) =>
    [
      'translated',
      'answered-manual',
      'answered-option',
      'answered-preserve-source',
    ].includes(phrase.target.status)
  ).length;
  const total = result.phrases.length;
  const unresolved = result.variables.filter(
    (variable) => !variable.resolvedByRule && !variable.resolvedByAnswer
  ).length;
  const sentenceCount = result.sentences?.length ?? 0;
  const resolvedByRule = result.variables.filter(
    (variable) => variable.resolvedByRule
  ).length;
  const resolvedByAnswer = result.variables.filter(
    (variable) => variable.resolvedByAnswer
  ).length;
  const ruleText = resolvedByRule ? `, ${resolvedByRule} rule-resolved` : '';
  const answerText = resolvedByAnswer ? `, ${resolvedByAnswer} answered` : '';
  const unresolvedText = unresolved ? `; ${unresolved} unresolved` : '';
  return `Translated ${sentenceCount} sentence${
    sentenceCount === 1 ? '' : 's'
  } (${translated}/${total} linked phrases${ruleText}${answerText}${unresolvedText}).`;
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

function renderQuestionList(container, list, onAnswer) {
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
      item.append(renderQuestionOptions(question, onAnswer));
    }
    container.append(item);
  }
}

function renderQuestionOptions(question, onAnswer) {
  const group = document.createElement('div');
  group.className = 'translate-question-options';
  const manualInput = document.createElement('input');
  manualInput.type = 'text';
  manualInput.className = 'translate-question-manual';
  manualInput.placeholder = 'Type answer';
  for (const option of question.options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'translate-question-option';
    button.textContent = option.label;
    button.title = option.description;
    button.disabled =
      !option.targetText &&
      option.id !== 'manual-entry' &&
      option.id !== 'preserve-source';
    button.setAttribute(
      'aria-pressed',
      String(option.id === question.selectedOptionId)
    );
    button.addEventListener('click', () => {
      const targetText =
        option.id === 'manual-entry'
          ? manualInput.value.trim()
          : option.targetText;
      if (option.id === 'manual-entry' && !targetText) {
        manualInput.focus();
        return;
      }
      question.selectedOptionId = option.id;
      for (const peer of group.querySelectorAll('button')) {
        peer.setAttribute('aria-pressed', String(peer === button));
      }
      onAnswer?.(question, {
        optionId: option.id,
        targetText,
        entityId: option.entityId ?? question.entityId ?? null,
        targetUrl: option.targetUrl ?? null,
      });
    });
    group.append(button);
    if (option.id === 'manual-entry') {
      group.append(manualInput);
    }
  }
  return group;
}

// Issue #126: show how each word was disambiguated — every candidate sense,
// its detected contexts (instance-of / subclass-of / …), the score, and
// which sense the formalizer picked — plus the single most-likely context.
// Words with more than one plausible sense become a persistent context
// question: clicking a sense re-pins it and re-runs translation.
function renderWordContextList(container, options = {}) {
  if (!container) {
    return;
  }
  const {
    wordContexts = [],
    contextQuestions = [],
    mainContext = null,
    selections = {},
    onSelect,
  } = options;
  container.replaceChildren();
  if (!wordContexts.length) {
    appendEmptyListItem(container, 'No word contexts detected.');
    return;
  }
  if (mainContext) {
    const summary = document.createElement('li');
    summary.className = 'translate-word-context-main';
    summary.textContent = `Most likely context: ${formatContextRef(
      mainContext
    )}`;
    container.append(summary);
  }
  const questionByStart = new Map(
    contextQuestions.map((question) => [question.phraseStart, question])
  );
  for (const word of wordContexts) {
    container.append(
      renderWordContextItem(word, questionByStart.get(word.start), {
        selections,
        onSelect,
      })
    );
  }
}

function renderWordContextItem(word, question, { selections, onSelect }) {
  const item = document.createElement('li');
  const heading = document.createElement('strong');
  heading.textContent = word.text;
  item.append(heading);
  if (question && onSelect) {
    item.append(
      renderContextQuestion(word, question, { selections, onSelect })
    );
    return item;
  }
  const candidateList = document.createElement('ul');
  candidateList.className = 'translate-word-context-candidates';
  for (const candidate of word.candidates) {
    const candidateItem = document.createElement('li');
    candidateItem.textContent = formatWordContextCandidate(candidate);
    if (candidate.selected) {
      candidateItem.classList.add('translate-word-context-selected');
    }
    candidateList.append(candidateItem);
  }
  item.append(candidateList);
  return item;
}

function renderContextQuestion(word, question, { selections, onSelect }) {
  const pinned = selections[word.start] ?? question.selectedEntityId;
  const group = document.createElement('div');
  group.className = 'translate-context-options';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', question.question);
  for (const option of question.options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'translate-context-option';
    button.textContent = formatContextOptionLabel(option);
    button.title = option.description ?? option.entityId;
    button.setAttribute('aria-pressed', String(option.entityId === pinned));
    button.addEventListener('click', () =>
      onSelect(word.start, option.entityId)
    );
    group.append(button);
  }
  return group;
}

function formatContextOptionLabel(option) {
  const id = option.entityId ? ` [${option.entityId}]` : '';
  const publication = option.isPublication ? ' [publication]' : '';
  return `${option.label ?? option.entityId}${id}${publication}`;
}

function formatWordContextCandidate(candidate) {
  const mark = candidate.selected ? '✓ ' : '• ';
  const id = candidate.id ? ` [${candidate.id}]` : '';
  const score =
    typeof candidate.score === 'number' ? ` (score ${candidate.score})` : '';
  const publication = candidate.isPublication ? ' [publication]' : '';
  const contexts = candidate.contexts?.length
    ? ` — ${candidate.contexts
        .map((ctx) => `${ctx.propertyLabel}: ${ctx.targetId}`)
        .join(', ')}`
    : '';
  return `${mark}${candidate.label ?? '(no label)'}${id}${score}${publication}${contexts}`;
}

function formatContextRef(context) {
  if (!context) {
    return '(none)';
  }
  const label = context.label ?? context.id ?? '(unknown)';
  const probability =
    typeof context.probability === 'number'
      ? ` (${Math.round(context.probability * 100)}%)`
      : '';
  const id = context.id && context.id !== label ? ` [${context.id}]` : '';
  return `${label}${id}${probability}`;
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
  if (step.type === 'wiktionary-translation') {
    return `Wiktionary: ${step.sourceText} -> ${step.targetText}`;
  }
  if (step.type === 'wiktionary-translation-miss') {
    return `Wiktionary miss: ${step.sourceText}`;
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

function formatDebugLog(result) {
  const questions = result.questionDetails ?? [];
  const steps = result.steps ?? [];
  const formalization = result.formalization ?? {};
  const wordContexts = formalization.wordContexts ?? [];
  const sourceText =
    formalization.text ?? result.text ?? result.plainText ?? '';
  return [
    'Translate debug log',
    'UI: web/#/translate',
    `App version: ${describeAppVersion()}`,
    `Source language: ${result.sourceLanguage}`,
    `Target language: ${result.targetLanguage}`,
    `Status: ${translateStatusText(result)}`,
    '',
    'Source text',
    sourceText,
    '',
    'Formalized input',
    formalization.markdown ?? '',
    '',
    'Translated result',
    result.markdown ?? result.plainText ?? '',
    '',
    'Context detection',
    `Most likely context: ${formatContextRef(formalization.mainContext)}`,
    wordContexts.length
      ? wordContexts.map(formatWordContextDebug).join('\n\n')
      : 'No word contexts detected.',
    '',
    'Questions',
    questions.length
      ? questions.map(formatQuestionDebug).join('\n\n')
      : 'No unresolved variables.',
    '',
    'Translation steps',
    steps.length
      ? steps.map(formatStepDebug).join('\n\n')
      : 'No recorded steps.',
    '',
    'Translation CST JSON',
    JSON.stringify(result.cst, null, 2),
  ].join('\n');
}

function describeAppVersion() {
  const meta = globalThis.document?.querySelector?.('meta[name="app-version"]');
  return meta?.content || globalThis.__APP_VERSION__ || 'unknown';
}

function formatWordContextDebug(word) {
  const candidates = word.candidates ?? [];
  return [
    `Word: ${word.text}`,
    ...candidates.map(
      (candidate) => `  ${formatWordContextCandidate(candidate)}`
    ),
  ].join('\n');
}

function formatQuestionDebug(question) {
  const options = question.options ?? [];
  return [
    question.question,
    ...options.map((option) => {
      const mark = option.id === question.selectedOptionId ? '[x]' : '[ ]';
      const target = option.targetText ? ` -> ${option.targetText}` : '';
      return `${mark} ${option.label}${target}`;
    }),
  ].join('\n');
}

function formatStepDebug(step, index) {
  return `${index + 1}. ${formatStep(step)}\n${JSON.stringify(step, null, 2)}`;
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
