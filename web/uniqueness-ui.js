import { searchTextUniqueness } from '../src/index.js';

export function setupUniquenessPage() {
  const input = document.querySelector('#uniqueness-input');
  const run = document.querySelector('#uniqueness-run');
  const copyMarkdown = document.querySelector('#uniqueness-copy-markdown');
  const copyLino = document.querySelector('#uniqueness-copy-lino');
  const status = document.querySelector('#uniqueness-status');
  const summary = document.querySelector('#uniqueness-summary');
  const output = document.querySelector('#uniqueness-output');
  const matches = document.querySelector('#uniqueness-matches');
  const markdownPre = document.querySelector('#uniqueness-markdown');
  const linoPre = document.querySelector('#uniqueness-lino');

  if (!input || !run || !status || !output) {
    return { getResult: () => null };
  }

  let requestId = 0;
  let currentResult = null;

  run.addEventListener('click', () => {
    runUniqueness();
  });
  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      runUniqueness();
    }
  });
  copyMarkdown?.addEventListener('click', async () => {
    await copyPayload(currentResult?.markdown, status, 'Markdown copied.');
  });
  copyLino?.addEventListener('click', async () => {
    await copyPayload(
      currentResult?.linksNotation,
      status,
      'Links Notation copied.'
    );
  });

  async function runUniqueness() {
    const text = input.value.trim();
    if (!text) {
      status.textContent = 'Enter some text first.';
      return;
    }
    const id = String((requestId += 1));
    status.dataset.requestId = id;
    status.textContent = 'Searching public sources...';
    try {
      const result = await searchTextUniqueness(text, {
        fetch: globalThis.fetch?.bind(globalThis),
      });
      if (status.dataset.requestId !== id) {
        return;
      }
      currentResult = result;
      renderResult(result);
    } catch (error) {
      if (status.dataset.requestId === id) {
        status.textContent = `Uniqueness search failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    }
  }

  function renderResult(result) {
    output.innerHTML = result.html;
    renderSummary(summary, result.summary);
    renderMatches(matches, result.statements);
    if (markdownPre) {
      markdownPre.textContent = result.markdown;
    }
    if (linoPre) {
      linoPre.textContent = result.linksNotation;
    }
    status.textContent = `Checked ${result.summary.total} statement${
      result.summary.total === 1 ? '' : 's'
    }: ${result.summary.citeOrQuote} cite or quote, ${
      result.summary.reviewMatches
    } review, ${result.summary.likelyOriginal} likely original.`;
  }

  return { getResult: () => currentResult };
}

function renderSummary(container, summary) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  const entries = [
    ['Statements', summary.total],
    ['Cite', summary.citeOrQuote],
    ['Review', summary.reviewMatches],
    ['Original', summary.likelyOriginal],
    ['Existing', formatPercent(summary.averageExistingLikelihood)],
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

function renderMatches(container, statements) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  for (const statement of statements) {
    const item = document.createElement('article');
    item.className = 'uniqueness-match-group';
    const heading = document.createElement('h3');
    heading.textContent = `${formatPercent(
      statement.existingLikelihood
    )} existing - ${statement.text}`;
    item.append(heading);
    if (!statement.matches.length) {
      const empty = document.createElement('p');
      empty.className = 'section-empty';
      empty.textContent = 'No public-source matches found.';
      item.append(empty);
    }
    for (const match of statement.matches.slice(0, 5)) {
      item.append(renderMatch(match));
    }
    container.append(item);
  }
}

function renderMatch(match) {
  const row = document.createElement('p');
  row.className = 'uniqueness-match';
  const source = document.createElement('span');
  source.textContent = `${match.sourceLabel} ${formatPercent(match.score)}`;
  const link = document.createElement('a');
  link.href = match.url ?? '#';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = match.title || match.matchKind;
  row.append(source, link);
  return row;
}

async function copyPayload(text, status, successText) {
  if (!text) {
    status.textContent = 'Run a uniqueness search first.';
    return;
  }
  if (globalThis.navigator?.clipboard) {
    try {
      await globalThis.navigator.clipboard.writeText(text);
      status.textContent = successText;
    } catch {
      status.textContent = 'Clipboard access is blocked.';
    }
  }
}

function formatPercent(value) {
  return value === null ? 'unknown' : `${Math.round(value * 100)}%`;
}
