import {
  analyzeStatement,
  createIssueReportUrl,
  createStatementDraft,
  createSeededRandom,
  createWikimediaEvidenceClient,
  defaultReasoningStrategyId,
  describeFormalizationLevel,
  findExampleOpposite,
  getPreparedExamples,
  getRandomExamples,
  listReasoningStrategies,
  serializeLinksNotation,
} from '../src/index.js';

const beliefStorageKey = 'meta-expression.user-beliefs.v1';
const wikimediaCacheStorageKey = 'meta-expression.wikimedia-cache.v1';
const defaultRandomExampleCount = 4;

const form = document.querySelector('#statement-form');
const input = document.querySelector('#statement-input');
const exampleList = document.querySelector('#example-list');
const shuffleExamples = document.querySelector('#shuffle-examples');
const toggleShowAll = document.querySelector('#toggle-show-all');
const beliefSlider = document.querySelector('#belief-slider');
const beliefValue = document.querySelector('#belief-value');
const resetBelief = document.querySelector('#reset-belief');
const interpretationList = document.querySelector('#interpretation-list');
const alternativeList = document.querySelector('#alternative-list');
const dependencyList = document.querySelector('#dependency-list');
const definitionList = document.querySelector('#definition-list');
const confirmationList = document.querySelector('#confirmation-list');
const refutationList = document.querySelector('#refutation-list');
const oppositeButton = document.querySelector('#opposite-button');
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
const strategySelect = document.querySelector('#strategy-select');
const strategySummary = document.querySelector('#strategy-summary');

let selectedIndex = 0;
let currentAnalysis = null;
let liveRequestId = 0;
let showAllExamples = false;
let randomSeed = Date.now();
let strategyId = defaultReasoningStrategyId;
const userBeliefs = loadUserBeliefs();
const wikimediaCache = createPersistentWikimediaCache();
const liveEvidenceWorker = createLiveEvidenceWorker();
const liveEvidenceClientFallback = liveEvidenceWorker
  ? null
  : createWikimediaEvidenceClient({ cache: wikimediaCache });

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

shuffleExamples.addEventListener('click', () => {
  randomSeed = Date.now();
  renderPreparedExamples();
});

toggleShowAll.addEventListener('click', () => {
  showAllExamples = !showAllExamples;
  toggleShowAll.setAttribute('aria-pressed', String(showAllExamples));
  toggleShowAll.textContent = showAllExamples ? 'Show 4 random' : 'Show all';
  renderPreparedExamples();
});

oppositeButton.addEventListener('click', () => {
  if (!oppositeButton.dataset.opposite) {
    return;
  }
  selectedIndex = 0;
  input.value = oppositeButton.dataset.opposite;
  syncBeliefControl(input.value);
  render(input.value, selectedIndex);
});

renderStrategySelector();
strategySelect.addEventListener('change', () => {
  strategyId = strategySelect.value;
  if (currentAnalysis) {
    render(input.value, selectedIndex);
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
    userBeliefs,
    reasoningStrategyId: strategyId,
  });

  renderInterpretations(draft);
  renderAlternatives(currentAnalysis.alternatives);
  renderDependencies(currentAnalysis.dependencies);
  renderDefinitions(currentAnalysis.definitions);
  renderConfirmations(currentAnalysis.confirmations);
  renderRefutations(currentAnalysis.refutations);
  renderOpposite(statement, currentAnalysis.opposite);
  renderResult(currentAnalysis);
  renderReasoningSteps(currentAnalysis);
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

function renderAlternatives(alternatives) {
  alternativeList.replaceChildren();
  if (!alternatives || alternatives.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'section-empty';
    empty.textContent = 'No more precise alternative is available yet.';
    alternativeList.append(empty);
    return;
  }
  for (const alternative of alternatives) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'alternative-button';
    button.innerHTML = `
      <strong>${escapeHtml(alternative.text)}</strong>
      <span>${escapeHtml(alternative.reason)}</span>
    `;
    button.addEventListener('click', () => {
      selectedIndex = 0;
      input.value = alternative.text;
      syncBeliefControl(input.value);
      render(input.value, selectedIndex);
    });
    alternativeList.append(button);
  }
}

function renderDependencies(dependencies) {
  dependencyList.replaceChildren();
  for (const dependency of dependencies ?? []) {
    const item = document.createElement('li');
    item.textContent = dependency;
    dependencyList.append(item);
  }
  if (!dependencyList.children.length) {
    const empty = document.createElement('li');
    empty.className = 'section-empty';
    empty.textContent = 'No dependencies were inferred.';
    dependencyList.append(empty);
  }
}

function renderDefinitions(definitions) {
  definitionList.replaceChildren();
  for (const definition of definitions ?? []) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = definition.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${definition.label} (${definition.wikidataId})`;
    item.append(`${definition.phrase}: `, link, ` — ${definition.role}`);
    definitionList.append(item);
  }
  if (!definitionList.children.length) {
    const empty = document.createElement('li');
    empty.className = 'section-empty';
    empty.textContent = 'No phrases mapped to Wikidata yet.';
    definitionList.append(empty);
  }
}

function renderConfirmations(confirmations) {
  confirmationList.replaceChildren();
  for (const confirmation of confirmations ?? []) {
    const item = document.createElement('li');
    item.className = 'confirmation';
    const quote = document.createElement('blockquote');
    quote.textContent = confirmation.quote;
    item.append(quote);
    if (confirmation.sourceUrl) {
      const link = document.createElement('a');
      link.href = confirmation.sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `Source: ${confirmation.sourceType}`;
      item.append(link);
    } else {
      const note = document.createElement('span');
      note.className = 'source-note';
      note.textContent = `Source: ${confirmation.sourceType}`;
      item.append(note);
    }
    confirmationList.append(item);
  }
  if (!confirmationList.children.length) {
    const empty = document.createElement('li');
    empty.className = 'section-empty';
    empty.textContent = 'No confirmations were found yet.';
    confirmationList.append(empty);
  }
}

function renderRefutations(refutations) {
  refutationList.replaceChildren();
  for (const refutation of refutations ?? []) {
    const item = document.createElement('li');
    item.className = 'refutation';
    const quote = document.createElement('blockquote');
    quote.textContent = refutation.quote;
    item.append(quote);
    if (refutation.sourceUrl) {
      const link = document.createElement('a');
      link.href = refutation.sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `Source: ${refutation.sourceType}`;
      item.append(link);
    } else {
      const note = document.createElement('span');
      note.className = 'source-note';
      note.textContent = `Source: ${refutation.sourceType}`;
      item.append(note);
    }
    refutationList.append(item);
  }
  if (!refutationList.children.length) {
    const empty = document.createElement('li');
    empty.className = 'section-empty';
    empty.textContent = 'No refutations were found yet.';
    refutationList.append(empty);
  }
}

function renderOpposite(statement, opposite) {
  const fallback = opposite ?? findExampleOpposite(statement);
  if (!fallback) {
    oppositeButton.hidden = true;
    oppositeButton.dataset.opposite = '';
    return;
  }
  oppositeButton.hidden = false;
  oppositeButton.dataset.opposite = fallback;
  oppositeButton.textContent = fallback;
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

function renderReasoningSteps(analysis) {
  const steps = analysis.reasoningSteps ?? analysis.linksNetwork.links;
  const strategy = analysis.reasoningStrategy;
  if (strategy) {
    strategySummary.textContent = `${strategy.name}: ${strategy.summary}`;
    strategySelect.value = strategy.id;
  }
  linkLanes.replaceChildren();
  for (const step of steps) {
    const item = document.createElement('article');
    item.className = `link-row ${step.role}`;
    const order = document.createElement('span');
    const role = document.createElement('span');
    const id = document.createElement('strong');
    const value = document.createElement('span');
    const sourceUrl = sourceUrlFor(step.value);

    order.className = 'link-order';
    order.textContent = step.executionOrder ? String(step.executionOrder) : '·';
    role.className = 'link-role';
    role.textContent = `${step.role} (${step.reasoningPhase ?? 'context'})`;
    id.textContent = step.id;
    value.textContent = summary(step.value);

    if (sourceUrl) {
      value.append(' ');
      const source = document.createElement('a');
      source.className = 'link-source';
      source.href = sourceUrl;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      source.textContent = sourceLabelFor(step.value);
      value.append(source);
    }

    item.append(order, role, id, value);
    linkLanes.append(item);
  }
}

function renderStrategySelector() {
  strategySelect.replaceChildren();
  for (const strategy of listReasoningStrategies()) {
    const option = document.createElement('option');
    option.value = strategy.id;
    option.textContent = strategy.name;
    if (strategy.id === strategyId) {
      option.selected = true;
    }
    strategySelect.append(option);
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
  if (liveEvidenceWorker) {
    const id = String((liveRequestId += 1));
    liveEvidenceStatus.dataset.requestId = id;
    liveEvidenceStatus.textContent = 'Checking Wikimedia';
    liveEvidenceWorker.postMessage({ id, statement });
    return;
  }
  if (liveEvidenceClientFallback) {
    const id = String((liveRequestId += 1));
    liveEvidenceStatus.dataset.requestId = id;
    liveEvidenceStatus.textContent = 'Checking Wikimedia';
    liveEvidenceClientFallback
      .resolveEvidence(statement)
      .then((evidence) => applyLiveEvidenceResult({ id, evidence }))
      .catch((error) =>
        applyLiveEvidenceResult({
          id,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    return;
  }
  liveEvidenceStatus.textContent = 'Fixture evidence';
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
    reasoningStrategyId: strategyId,
  });
  renderConfirmations(currentAnalysis.confirmations);
  renderRefutations(currentAnalysis.refutations);
  renderResult(currentAnalysis);
  renderReasoningSteps(currentAnalysis);
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
  const allExamples = getPreparedExamples();
  const examples = showAllExamples
    ? allExamples
    : getRandomExamples(defaultRandomExampleCount, {
        random: createSeededRandom(randomSeed),
        pool: allExamples,
      });
  for (const example of examples) {
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
  syncSelectedExample(input.value);
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

function createPersistentWikimediaCache() {
  const map = new Map();
  hydrateWikimediaCache(map);
  const originalSet = map.set.bind(map);
  map.set = (key, value) => {
    const result = originalSet(key, value);
    persistWikimediaCache(map);
    return result;
  };
  const originalDelete = map.delete.bind(map);
  map.delete = (key) => {
    const result = originalDelete(key);
    persistWikimediaCache(map);
    return result;
  };
  const originalClear = map.clear.bind(map);
  map.clear = () => {
    originalClear();
    persistWikimediaCache(map);
  };
  return map;
}

function hydrateWikimediaCache(map) {
  try {
    const raw = globalThis.localStorage.getItem(wikimediaCacheStorageKey);
    if (!raw) {
      return;
    }
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) {
      return;
    }
    for (const [key, value] of entries) {
      map.set(key, value);
    }
  } catch {
    // Cache is best-effort and survives storage problems silently.
  }
}

function persistWikimediaCache(map) {
  try {
    const entries = [...map.entries()].slice(-200);
    globalThis.localStorage.setItem(
      wikimediaCacheStorageKey,
      JSON.stringify(entries)
    );
  } catch {
    // Storage may be unavailable; the in-memory cache still works for this page.
  }
}

renderPreparedExamples();
syncBeliefControl(input.value);
render(input.value);
