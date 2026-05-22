import { FORMALIZE_LINK_TARGETS, translateTextWith } from '../src/index.js';
import { escapeHtml } from './format-helpers.js';
import { createPersistentWikimediaCache } from './persistent-cache.js';

const translateCacheStorageKey = 'meta-expression.translate-cache.v1';

export function setupTranslatePage({
  cache = createPersistentWikimediaCache(translateCacheStorageKey),
} = {}) {
  const input = document.querySelector('#translate-input');
  const sourceLanguage = document.querySelector('#translate-source-language');
  const targetLanguage = document.querySelector('#translate-target-language');
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

  if (!input || !run || !output || !status) {
    return { getResult: () => currentResult };
  }

  let requestId = 0;

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
        linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIPEDIA,
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
    renderQuestionList(questions, result.questions);
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
    item.textContent = question;
    container.append(item);
  }
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
