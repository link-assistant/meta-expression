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
  const output = document.querySelector('#translate-output');
  const questions = document.querySelector('#translate-questions');
  const markdownPre = document.querySelector('#translate-markdown');
  const linoPre = document.querySelector('#translate-lino');
  const cstPre = document.querySelector('#translate-cst');

  if (!input || !run || !output || !status) {
    return;
  }

  let requestId = 0;
  let currentResult = null;

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
    output.innerHTML = result.html || escapeHtml(result.plainText);
    for (const link of output.querySelectorAll('a')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    renderQuestions(result.questions);
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
    const unresolved = result.variables.length;
    status.textContent = `Translated ${translated}/${total} phrase${
      total === 1 ? '' : 's'
    }${unresolved ? `; ${unresolved} unresolved` : ''}.`;
  }

  function renderQuestions(list) {
    if (!questions) {
      return;
    }
    questions.replaceChildren();
    if (!list.length) {
      const empty = document.createElement('li');
      empty.className = 'section-empty';
      empty.textContent = 'No unresolved variables.';
      questions.append(empty);
      return;
    }
    for (const question of list) {
      const item = document.createElement('li');
      item.textContent = question;
      questions.append(item);
    }
  }
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
