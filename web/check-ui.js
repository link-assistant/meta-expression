import { checkText, checkTextWithLiveEvidence } from '../src/index.js';

export function setupCheckPage({
  cache,
  userBeliefs = {},
  getPreferenceProfile = () => ({}),
  getStrategyId = () => undefined,
} = {}) {
  const input = document.querySelector('#check-input');
  const live = document.querySelector('#check-live');
  const run = document.querySelector('#check-run');
  const copyMarkdown = document.querySelector('#check-copy-markdown');
  const copyLino = document.querySelector('#check-copy-lino');
  const status = document.querySelector('#check-status');
  const summary = document.querySelector('#check-summary');
  const output = document.querySelector('#check-output');
  const markdownPre = document.querySelector('#check-markdown');
  const linoPre = document.querySelector('#check-lino');

  if (!input || !run || !status || !output) {
    return { getResult: () => null };
  }

  let requestId = 0;
  let currentResult = null;

  run.addEventListener('click', () => {
    runCheck();
  });
  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      runCheck();
    }
  });
  copyMarkdown?.addEventListener('click', async () => {
    if (!currentResult) {
      status.textContent = 'Check the text first.';
      return;
    }
    await writeClipboard(currentResult.markdown);
    status.textContent = 'Markdown copied to clipboard.';
  });
  copyLino?.addEventListener('click', async () => {
    if (!currentResult) {
      status.textContent = 'Check the text first.';
      return;
    }
    await writeClipboard(currentResult.linksNotation);
    status.textContent = 'Links Notation copied to clipboard.';
  });

  async function runCheck() {
    const text = input.value.trim();
    if (!text) {
      status.textContent = 'Enter some text first.';
      return;
    }
    const id = String((requestId += 1));
    status.dataset.requestId = id;
    status.textContent = 'Checking...';
    try {
      const options = checkOptions();
      const result = live?.checked
        ? await checkTextWithLiveEvidence(text, options)
        : checkText(text, options);
      if (status.dataset.requestId !== id) {
        return;
      }
      currentResult = result;
      renderCheckResult(result);
    } catch (error) {
      if (status.dataset.requestId === id) {
        status.textContent = `Check failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    }
  }

  function checkOptions() {
    return {
      fetch: globalThis.fetch?.bind(globalThis),
      cache,
      userBeliefs,
      preferenceProfile: getPreferenceProfile(),
      reasoningStrategyId: getStrategyId(),
    };
  }

  function renderCheckResult(result) {
    output.innerHTML = result.html;
    if (summary) {
      renderSummary(summary, result.summary);
    }
    if (markdownPre) {
      markdownPre.textContent = result.markdown;
    }
    if (linoPre) {
      linoPre.textContent = result.linksNotation;
    }
    status.textContent = `Checked ${result.summary.total} statement${
      result.summary.total === 1 ? '' : 's'
    }: ${result.summary.correct} correct, ${result.summary.wrong} wrong, ${
      result.summary.uncertain
    } uncertain.`;
  }

  return { getResult: () => currentResult };
}

function renderSummary(container, summary) {
  container.replaceChildren();
  const entries = [
    ['Statements', summary.total],
    ['Correct', summary.correct],
    ['Wrong', summary.wrong],
    ['Uncertain', summary.uncertain],
    ['Average', formatPercent(summary.averageCorrectness)],
  ];
  for (const [label, value] of entries) {
    const item = document.createElement('div');
    const caption = document.createElement('span');
    const metric = document.createElement('strong');
    caption.className = 'eyebrow';
    caption.textContent = label;
    metric.textContent = String(value);
    item.append(caption, metric);
    container.append(item);
  }
}

function formatPercent(value) {
  return value === null ? 'unknown' : `${Math.round(value * 100)}%`;
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
