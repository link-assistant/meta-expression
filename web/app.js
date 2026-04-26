import {
  analyzeStatement,
  createStatementDraft,
  serializeLinksNotation,
} from '../src/index.js';

const form = document.querySelector('#statement-form');
const input = document.querySelector('#statement-input');
const interpretationList = document.querySelector('#interpretation-list');
const confidenceValue = document.querySelector('#confidence-value');
const formalizationLevel = document.querySelector('#formalization-level');
const resultValue = document.querySelector('#result-value');
const linkLanes = document.querySelector('#link-lanes');
const linoOutput = document.querySelector('#lino-output');
const copyLino = document.querySelector('#copy-lino');

let selectedIndex = 0;
let currentAnalysis = null;

form.addEventListener('submit', (event) => {
  event.preventDefault();
  render(input.value, selectedIndex);
});

copyLino.addEventListener('click', async () => {
  if (!currentAnalysis) {
    return;
  }
  const lino = serializeLinksNotation(currentAnalysis.linksNetwork);
  linoOutput.hidden = !linoOutput.hidden;
  linoOutput.textContent = lino;
  if (globalThis.navigator?.clipboard) {
    await globalThis.navigator.clipboard.writeText(lino);
  }
});

function render(statement, interpretationIndex = 0) {
  const draft = createStatementDraft(statement);
  selectedIndex = Math.min(
    interpretationIndex,
    draft.interpretations.length - 1
  );
  currentAnalysis = analyzeStatement(statement, {
    interpretationIndex: selectedIndex,
    selectedBy: 'web',
  });

  renderInterpretations(draft);
  renderResult(currentAnalysis);
  renderLinksNetwork(currentAnalysis.linksNetwork.links);
  linoOutput.hidden = true;
}

function renderInterpretations(draft) {
  interpretationList.replaceChildren();
  for (const [index, interpretation] of draft.interpretations.entries()) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className =
      index === selectedIndex ? 'interpretation active' : 'interpretation';
    option.innerHTML = `
      <strong>${escapeHtml(interpretation.paraphrase)}</strong>
      <span>${escapeHtml(interpretation.examples.join(' | '))}</span>
    `;
    option.addEventListener('click', () => {
      selectedIndex = index;
      render(input.value, selectedIndex);
    });
    interpretationList.append(option);
  }
}

function renderResult(analysis) {
  const confidence = analysis.result.confidence;
  confidenceValue.textContent =
    confidence === null ? 'unknown' : `${Math.round(confidence * 100)}%`;
  formalizationLevel.textContent = String(analysis.formalization.level);
  resultValue.textContent = String(analysis.result.value);
}

function renderLinksNetwork(links) {
  linkLanes.replaceChildren();
  for (const link of links) {
    const item = document.createElement('article');
    item.className = `link-row ${link.role}`;
    item.innerHTML = `
      <span class="link-role">${escapeHtml(link.role)}</span>
      <strong>${escapeHtml(link.id)}</strong>
      <span>${escapeHtml(summary(link.value))}</span>
    `;
    linkLanes.append(item);
  }
}

function summary(value) {
  if (value === null) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return (
    value.text ??
    value.paraphrase ??
    value.claim ??
    value.relation ??
    value.kind ??
    value.expression?.type ??
    ''
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

render(input.value);
