import {
  applyTranslationQuestionAnswers,
  collectLinkedArticleTargets,
  FORMALIZE_LINK_TARGETS,
  listTranslationStrategies,
  parseSourceSpec,
  translateWikipediaArticleContext,
  translateTextWith,
} from '../js/src/index.js';
import { formatAppVersion, loadAppVersionInfo } from './app-version.js';
import { escapeHtml } from './format-helpers.js';
import { createPersistentWikimediaCache } from './persistent-cache.js';
import {
  collectCheckedSourceSpec,
  setupSourcePriorityList,
} from './source-priority-ui.js';
import { translateSamples } from './translate-samples.js';

const translateCacheStorageKey = 'meta-expression.translate-cache.v2';

// Resolved at setup time so the debug log can report the real deployed build
// instead of the placeholder "unknown" (issue #128). Kept module-level so the
// standalone formatDebugLog/describeAppVersion helpers can read it.
let appVersionInfo = null;

export function setupTranslatePage({
  cache = createPersistentWikimediaCache(translateCacheStorageKey),
  loadVersion = loadAppVersionInfo,
} = {}) {
  // Fire-and-forget: the version JSON is small and the debug log is only
  // generated on demand, so by the time a user copies it this has resolved.
  Promise.resolve(loadVersion())
    .then((info) => {
      appVersionInfo = info;
    })
    .catch(() => {
      appVersionInfo = null;
    });
  const input = document.querySelector('#translate-input');
  const inputModeGroup = document.querySelector('#translate-mode');
  const textModePanel = document.querySelector('#translate-text-mode-panel');
  const articleModePanel = document.querySelector(
    '#translate-article-mode-panel'
  );
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
  const articleExperimental = document.querySelector(
    '#translate-article-experimental'
  );
  const articleSource = document.querySelector('#translate-article-source');
  const linkedArticles = document.querySelector('#translate-linked-articles');
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
    inputModeGroup,
    textModePanel,
    articleModePanel,
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
    articleExperimental,
    articleSource,
    linkedArticles,
    markdownPre,
    linoPre,
    cstPre,
    stepsList,
    debugPre,
    cache,
    strategyState,
    requestId: 0,
    articleRequestId: 0,
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
  setupTranslateInputModes(ctx);
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
  setupArticleTranslationControls(ctx);

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
  if (selectedTranslateInputMode(ctx.inputModeGroup) === 'article') {
    runStandaloneArticleTranslation(ctx);
    return;
  }
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

function runStandaloneArticleTranslation(ctx) {
  const value = ctx.articleSource?.value.trim();
  if (!value) {
    ctx.status.textContent = 'Enter a Wikipedia article URL or title.';
    ctx.articleSource?.focus();
    return;
  }
  runArticleTranslation(ctx, { sourceUrl: value }, null, ctx.run);
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
  renderLinkedArticleTargets(ctx, result);
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

function setupArticleTranslationControls(ctx) {
  if (!ctx.articleSource) {
    return;
  }
  ctx.articleSource.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      runStandaloneArticleTranslation(ctx);
    }
  });
}

function renderLinkedArticleTargets(ctx, result) {
  if (!ctx.linkedArticles) {
    return;
  }
  ctx.linkedArticles.replaceChildren();
  const targets = collectLinkedArticleTargets(result, {
    sourceLanguage: selectedLanguageValue(ctx.sourceLanguage, 'en'),
  });
  if (!targets.length) {
    appendEmptyListItem(ctx.linkedArticles, 'No linked Wikipedia articles.');
    return;
  }
  for (const target of targets) {
    ctx.linkedArticles.append(renderLinkedArticleTarget(ctx, target));
  }
}

function renderLinkedArticleTarget(ctx, target) {
  const item = document.createElement('li');
  item.className = 'translate-linked-article';
  const heading = document.createElement('div');
  heading.className = 'translate-linked-article-heading';
  const link = document.createElement('a');
  link.href = target.sourceUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = target.label ?? target.title;
  const meta = document.createElement('span');
  meta.textContent = [target.entityId, target.title]
    .filter(Boolean)
    .join(' · ');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'translate-article-action';
  button.textContent = 'Translate linked context';
  button.addEventListener('click', () =>
    runArticleTranslation(ctx, target, item, button)
  );
  heading.append(link, meta, button);
  item.append(heading);
  return item;
}

async function runArticleTranslation(ctx, article, item = null, button = null) {
  const container = ensureArticleResultContainer(ctx, item);
  if (!ctx.articleExperimental?.checked) {
    renderArticleMessage(
      container,
      'Enable Experimental to translate linked article context.'
    );
    return;
  }
  const id = String((ctx.articleRequestId += 1));
  container.dataset.requestId = id;
  renderArticleMessage(container, 'Translating linked context...');
  button?.setAttribute('disabled', '');
  try {
    const result = await translateWikipediaArticleContext(article, {
      ...buildArticleTranslationOptions(ctx),
      experimental: true,
    });
    if (container.dataset.requestId !== id) {
      return;
    }
    renderArticleTranslationResult(container, result);
  } catch (error) {
    if (container.dataset.requestId === id) {
      renderArticleMessage(
        container,
        `Article translation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  } finally {
    button?.removeAttribute('disabled');
  }
}

function buildArticleTranslationOptions(ctx) {
  const options = buildTranslateOptions(ctx);
  return {
    fetch: options.fetch,
    cache: options.cache,
    sourceLanguage: options.sourceLanguage,
    targetLanguage: options.targetLanguage,
    linkTargetMode: options.linkTargetMode,
    translationStrategy: options.translationStrategy,
    translateOptions: {
      sources: options.sources,
      contextSelections: options.contextSelections,
    },
  };
}

function ensureArticleResultContainer(ctx, item) {
  if (item) {
    const existing = item.querySelector('.translate-article-result');
    if (existing) {
      return existing;
    }
    const created = document.createElement('div');
    created.className = 'translate-article-result';
    item.append(created);
    return created;
  }
  let standalone = document.querySelector('#translate-article-standalone');
  if (!standalone) {
    standalone = document.createElement('li');
    standalone.id = 'translate-article-standalone';
    standalone.className = 'translate-linked-article';
    if (ctx.linkedArticles?.querySelector('.section-empty')) {
      ctx.linkedArticles.replaceChildren();
    }
    ctx.linkedArticles?.append(standalone);
  }
  return standalone;
}

function renderArticleMessage(container, text) {
  container.replaceChildren();
  container.textContent = text;
}

function renderArticleTranslationResult(container, result) {
  if (result.status !== 'translated') {
    renderArticleMessage(container, `Article context ${result.status}.`);
    return;
  }
  container.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = `${result.title ?? result.article.title} (${result.section})`;
  const output = document.createElement('div');
  output.className = 'translate-output translate-article-output';
  renderLinkedHtml(
    output,
    result.translation.html || escapeHtml(result.translation.plainText)
  );
  container.append(title, output);
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
  const useLocalViewer = linkTargetGroup?.querySelector(
    '#translate-local-viewer-links'
  )?.checked;
  return useLocalViewer
    ? FORMALIZE_LINK_TARGETS.LOCAL
    : FORMALIZE_LINK_TARGETS.WIKIPEDIA;
}

function setupTranslateInputModes(ctx) {
  if (!ctx.inputModeGroup) {
    return;
  }
  const sync = () => {
    const articleMode =
      selectedTranslateInputMode(ctx.inputModeGroup) === 'article';
    if (ctx.textModePanel) {
      ctx.textModePanel.hidden = articleMode;
    }
    if (ctx.articleModePanel) {
      ctx.articleModePanel.hidden = !articleMode;
    }
  };
  ctx.inputModeGroup.addEventListener('change', sync);
  sync();
}

function selectedTranslateInputMode(inputModeGroup) {
  return (
    inputModeGroup?.querySelector('input[name="translate-mode"]:checked')
      ?.value ?? 'text'
  );
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
  const broadContexts = candidate.broadContexts?.length
    ? `; broader: ${candidate.broadContexts
        .slice(0, 4)
        .map(formatContextRef)
        .join(', ')}`
    : '';
  return `${mark}${candidate.label ?? '(no label)'}${id}${score}${publication}${contexts}${broadContexts}`;
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

function debugSection(title, list, formatter, emptyText) {
  const body = list.length ? list.map(formatter).join('\n\n') : emptyText;
  return [title, body, ''];
}

function formatDebugLog(result) {
  const formalization = result.formalization ?? {};
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
    ...debugSection(
      'Word contexts',
      formalization.wordContexts ?? [],
      formatWordContextDebug,
      'No word contexts detected.'
    ),
    ...debugSection(
      'Context selection questions',
      formalization.contextQuestions ?? [],
      formatContextQuestionDebug,
      'No ambiguous words detected.'
    ),
    ...debugSection(
      'Questions',
      result.questionDetails ?? [],
      formatQuestionDebug,
      'No unresolved variables.'
    ),
    ...debugSection(
      'Translation steps',
      result.steps ?? [],
      formatStepDebug,
      'No recorded steps.'
    ),
    'Translation CST JSON',
    JSON.stringify(result.cst, null, 2),
  ].join('\n');
}

function describeAppVersion() {
  if (appVersionInfo) {
    return formatAppVersion(appVersionInfo);
  }
  // Fallbacks for environments where the version JSON has not loaded yet.
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

function formatContextQuestionDebug(question) {
  const options = question.options ?? [];
  return [
    `${question.question} (selected: ${question.selectedEntityId ?? 'none'})`,
    ...options.map((option) => {
      const mark = option.selected ? '[x]' : '[ ]';
      const score =
        typeof option.score === 'number' ? ` (score ${option.score})` : '';
      const publication = option.isPublication ? ' [publication]' : '';
      return `${mark} ${formatContextOptionLabel(option)}${score}${publication}`;
    }),
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
