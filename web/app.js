import {
  analyzeStatement,
  createIssueReportUrl,
  createStatementDraft,
  describeFormalizationLevel,
  getPreparedExamples,
  serializeLinksNotation,
} from '../src/index.js';

const beliefStorageKey = 'meta-expression.user-beliefs.v1';

const form = document.querySelector('#statement-form');
const input = document.querySelector('#statement-input');
const exampleList = document.querySelector('#example-list');
const beliefSlider = document.querySelector('#belief-slider');
const beliefValue = document.querySelector('#belief-value');
const resetBelief = document.querySelector('#reset-belief');
const interpretationList = document.querySelector('#interpretation-list');
const confidenceValue = document.querySelector('#confidence-value');
const formalizationLevel = document.querySelector('#formalization-level');
const formalizationLevelName = document.querySelector(
  '#formalization-level-name'
);
const resultValue = document.querySelector('#result-value');
const supportCount = document.querySelector('#support-count');
const refuteCount = document.querySelector('#refute-count');
const unknownCount = document.querySelector('#unknown-count');
const liveEvidenceStatus = document.querySelector('#live-evidence-status');
const linkLanes = document.querySelector('#link-lanes');
const linoOutput = document.querySelector('#lino-output');
const copyLino = document.querySelector('#copy-lino');
const reportIssue = document.querySelector('#report-issue');

let selectedIndex = 0;
let currentAnalysis = null;
let liveRequestId = 0;
const userBeliefs = loadUserBeliefs();
const liveEvidenceWorker = createLiveEvidenceWorker();

if (liveEvidenceWorker) {
  liveEvidenceWorker.addEventListener('message', (event) => {
    applyLiveEvidenceResult(event.data);
  });
}

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

reportIssue.addEventListener('click', () => {
  updateReportIssueLink();
});

beliefSlider.addEventListener('input', () => {
  const probability = Number(beliefSlider.value) / 100;
  setUserBelief(input.value, probability);
  render(input.value, selectedIndex);
});

resetBelief.addEventListener('click', () => {
  setUserBelief(input.value, 0.5);
  syncBeliefControl(input.value);
  render(input.value, selectedIndex);
});

input.addEventListener('input', () => {
  syncBeliefControl(input.value);
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
    userBeliefs,
  });

  renderInterpretations(draft);
  renderResult(currentAnalysis);
  renderLinksNetwork(currentAnalysis.linksNetwork.links);
  updateReportIssueLink();
  syncSelectedExample(statement);
  requestLiveEvidence(statement);
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
  const level = describeFormalizationLevel(analysis.formalization.level);

  confidenceValue.textContent =
    confidence === null ? 'unknown' : `${Math.round(confidence * 100)}%`;
  formalizationLevel.textContent = String(analysis.formalization.level);
  formalizationLevelName.textContent = level.name;
  resultValue.textContent = formatResultValue(analysis.result);
  supportCount.textContent = String(analysis.result.supportingEvidence.length);
  refuteCount.textContent = String(analysis.result.refutingEvidence.length);
  unknownCount.textContent = String(analysis.formalization.unknowns.length);
}

function renderLinksNetwork(links) {
  linkLanes.replaceChildren();
  for (const link of links) {
    const item = document.createElement('article');
    item.className = `link-row ${link.role}`;
    const role = document.createElement('span');
    const id = document.createElement('strong');
    const value = document.createElement('span');
    const sourceUrl = sourceUrlFor(link.value);

    role.className = 'link-role';
    role.textContent = link.role;
    id.textContent = link.id;
    value.textContent = summary(link.value);

    if (sourceUrl) {
      value.append(' ');
      const source = document.createElement('a');
      source.className = 'link-source';
      source.href = sourceUrl;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      source.textContent = sourceLabelFor(link.value);
      value.append(source);
    }

    item.append(role, id, value);
    linkLanes.append(item);
  }
}

function createLiveEvidenceWorker() {
  if (!('Worker' in globalThis)) {
    return null;
  }

  try {
    return new Worker('./evidence-worker.js', { type: 'module' });
  } catch {
    return null;
  }
}

function requestLiveEvidence(statement) {
  if (!liveEvidenceWorker) {
    liveEvidenceStatus.textContent = 'Fixture evidence';
    return;
  }

  const id = String((liveRequestId += 1));
  liveEvidenceStatus.dataset.requestId = id;
  liveEvidenceStatus.textContent = 'Checking Wikimedia';
  liveEvidenceWorker.postMessage({ id, statement });
}

function applyLiveEvidenceResult(data) {
  if (!data || data.id !== liveEvidenceStatus.dataset.requestId) {
    return;
  }

  if (data.error) {
    liveEvidenceStatus.textContent = 'Live evidence unavailable';
    return;
  }

  if (!Array.isArray(data.evidence) || data.evidence.length === 0) {
    liveEvidenceStatus.textContent = 'No live evidence';
    return;
  }

  currentAnalysis = analyzeStatement(input.value, {
    interpretationIndex: selectedIndex,
    selectedBy: 'web-worker',
    userBeliefs,
    evidence: data.evidence,
  });
  renderResult(currentAnalysis);
  renderLinksNetwork(currentAnalysis.linksNetwork.links);
  updateReportIssueLink();
  liveEvidenceStatus.textContent = 'Live Wikimedia evidence';
}

function updateReportIssueLink() {
  if (!currentAnalysis) {
    reportIssue.href =
      'https://github.com/link-assistant/meta-expression/issues/new';
    return;
  }

  reportIssue.href = createIssueReportUrl(currentAnalysis, {
    pageUrl: globalThis.location.href,
    userAgent: globalThis.navigator.userAgent,
  });
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

function sourceUrlFor(value) {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  return value.sourceUrl ?? value.context?.wikidataEntityUrl ?? null;
}

function sourceLabelFor(value) {
  if (value === null || typeof value !== 'object') {
    return 'source';
  }
  return value.wikidataId ?? value.sourceType ?? 'source';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatResultValue(result) {
  if (result.kind === 'evidence-estimate' && typeof result.value === 'number') {
    return `${Math.round(result.value * 100)}%`;
  }
  return String(result.value);
}

function renderPreparedExamples() {
  exampleList.replaceChildren();
  for (const example of getPreparedExamples()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'example-button';
    button.dataset.category = example.category;
    button.dataset.input = example.input;
    button.innerHTML = `
      <strong>${escapeHtml(example.label)}</strong>
      <span>${escapeHtml(example.input)}</span>
    `;
    button.addEventListener('click', () => {
      selectedIndex = 0;
      input.value = example.input;
      syncBeliefControl(input.value);
      render(input.value, selectedIndex);
    });
    exampleList.append(button);
  }
}

function syncSelectedExample(statement) {
  const normalized = statement.trim().toLowerCase().replace(/\s+/g, ' ');
  for (const button of exampleList.querySelectorAll('.example-button')) {
    button.classList.toggle(
      'active',
      button.dataset.input.trim().toLowerCase().replace(/\s+/g, ' ') ===
        normalized
    );
  }
}

function loadUserBeliefs() {
  try {
    return JSON.parse(globalThis.localStorage.getItem(beliefStorageKey)) ?? {};
  } catch {
    return {};
  }
}

function saveUserBeliefs() {
  try {
    globalThis.localStorage.setItem(
      beliefStorageKey,
      JSON.stringify(userBeliefs)
    );
  } catch {
    // Belief sliders still work for the current page even if storage is blocked.
  }
}

function setUserBelief(statement, probability) {
  const key = statement.trim();
  if (!key) {
    return;
  }
  if (probability === 0.5) {
    delete userBeliefs[key];
  } else {
    userBeliefs[key] = probability;
  }
  saveUserBeliefs();
  syncBeliefControl(statement);
}

function syncBeliefControl(statement) {
  const stored = findStoredBelief(statement);
  const percent = Math.round((stored ?? 0.5) * 100);
  beliefSlider.value = String(percent);
  beliefValue.textContent = `${percent}%`;
}

function findStoredBelief(statement) {
  const key = statement.trim().toLowerCase().replace(/\s+/g, ' ');
  for (const [storedKey, value] of Object.entries(userBeliefs)) {
    if (storedKey.trim().toLowerCase().replace(/\s+/g, ' ') === key) {
      return Number(value);
    }
  }
  return undefined;
}

renderPreparedExamples();
syncBeliefControl(input.value);
render(input.value);
