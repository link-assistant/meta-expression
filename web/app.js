import {
  analyzeStatement,
  createStatementDraft,
  createSeededRandom,
  createWikimediaEvidenceClient,
  decodeOverridesText,
  encodeOverridesAsLino,
  defaultReasoningStrategyId,
  describeFormalizationLevel,
  findExampleOpposite,
  formalizeTextWith,
  formatInterpretationPhrase,
  FORMALIZE_LINK_TARGETS,
  getPreparedExamples,
  getRandomExamples,
  interpretationKey,
  INTERPRETATION_DISPLAY_MODES,
  listReasoningStrategies,
  parseSourceSpec,
  resolveFormalizeLinkTarget,
  serializeLinksNotation,
} from '../js/src/index.js';
import {
  applyTranslations,
  listLocales,
  loadLocale,
  persistLocale,
  translate,
} from './i18n.js';
import {
  applyTheme,
  loadTheme,
  nextTheme,
  persistTheme,
  themeIcon,
  watchSystemTheme,
} from './theme.js';
import { formalizeRepoSamples } from './formalize-samples.js';
import {
  escapeHtml,
  formatCorrectness,
  formatResultValue,
  formatSignedConfidence,
  signOf,
  sourceLabelFor,
  sourceUrlFor,
  summary,
} from './format-helpers.js';
import { createPersistentWikimediaCache } from './persistent-cache.js';
import {
  getActivePreferenceProfile,
  setupPreferencesPage,
} from './preferences-ui.js';
import { setupPageIssueReporting } from './page-report.js';
import { setupComparePage } from './compare-ui.js';
import { setupCheckPage } from './check-ui.js';
import { setupUniquenessPage } from './uniqueness-ui.js';
import { setupTranslatePage } from './translate-ui.js';
import { setupNavigation } from './navigation.js';
import {
  collectCheckedSourceSpec,
  setupSourcePriorityList,
} from './source-priority-ui.js';

const beliefStorageKey = 'meta-expression.user-beliefs.v1';
const wikimediaCacheStorageKey = 'meta-expression.wikimedia-cache.v1';
const defaultRandomExampleCount = 4;
const topInterpretationCount = 10;

let currentLocale = loadLocale();
let currentThemePreference = loadTheme();
let activeInterpretationKey = null;
let interpretationDisplayMode = INTERPRETATION_DISPLAY_MODES.NAME;

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
const correctnessValue = document.querySelector('#correctness-value');
const confidenceValue = document.querySelector('#confidence-value');
const formalizationLevel = document.querySelector('#formalization-level');
const formalizationLevelName = document.querySelector(
  '#formalization-level-name'
);
const resultValue = document.querySelector('#result-value');
const navAnalyse = document.querySelector('#nav-analyse');
const navCompare = document.querySelector('#nav-compare');
const navCheck = document.querySelector('#nav-check');
const navUniqueness = document.querySelector('#nav-uniqueness');
const navFormalize = document.querySelector('#nav-formalize');
const navTranslate = document.querySelector('#nav-translate');
const navPreferences = document.querySelector('#nav-preferences');
const pageAnalyse = document.querySelector('#page-analyse');
const pageCompare = document.querySelector('#page-compare');
const pageCheck = document.querySelector('#page-check');
const pageUniqueness = document.querySelector('#page-uniqueness');
const pageFormalize = document.querySelector('#page-formalize');
const pageTranslate = document.querySelector('#page-translate');
const pagePreferences = document.querySelector('#page-preferences');
const supportCount = document.querySelector('#support-count');
const refuteCount = document.querySelector('#refute-count');
const unknownCount = document.querySelector('#unknown-count');
const liveEvidenceStatus = document.querySelector('#live-evidence-status');
const linkLanes = document.querySelector('#link-lanes');
const linoOutput = document.querySelector('#lino-output');
const copyLino = document.querySelector('#copy-lino');
const strategySelect = document.querySelector('#strategy-select');
const strategySummary = document.querySelector('#strategy-summary');
const localeSelect = document.querySelector('#locale-select');
const themeToggle = document.querySelector('#theme-toggle');
const themeToggleIcon = document.querySelector('#theme-toggle-icon');
const themeToggleLabel = document.querySelector('#theme-toggle-label');

let selectedIndex = 0;
let currentAnalysis = null;
let liveRequestId = 0;
let showAllExamples = false;
let randomSeed = Date.now();
let strategyId = defaultReasoningStrategyId;
const userBeliefs = loadUserBeliefs();
const wikimediaCache = createPersistentWikimediaCache(wikimediaCacheStorageKey);
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
  toggleShowAll.textContent = showAllExamples
    ? t('analyse.showLess')
    : t('analyse.showAll');
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
    preferenceProfile: getActivePreferenceProfile(),
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
  const correctness = analysis.result.correctness;
  const signedConfidence = analysis.result.signedConfidence;
  const level = describeFormalizationLevel(analysis.formalization.level);

  correctnessValue.textContent = formatCorrectness(correctness);
  confidenceValue.textContent = formatSignedConfidence(signedConfidence);
  confidenceValue.dataset.sign = signOf(signedConfidence);
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
    preferenceProfile: getActivePreferenceProfile(),
    evidence: data.evidence,
    reasoningStrategyId: strategyId,
  });
  renderConfirmations(currentAnalysis.confirmations);
  renderRefutations(currentAnalysis.refutations);
  renderResult(currentAnalysis);
  renderReasoningSteps(currentAnalysis);
  liveEvidenceStatus.textContent = 'Live Wikimedia evidence';
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

function t(key) {
  return translate(currentLocale, key);
}

function applyLocale(locale) {
  currentLocale = locale;
  applyTranslations(document, currentLocale);
  if (localeSelect && localeSelect.value !== currentLocale) {
    localeSelect.value = currentLocale;
  }
  if (toggleShowAll) {
    toggleShowAll.textContent = showAllExamples
      ? t('analyse.showLess')
      : t('analyse.showAll');
  }
  refreshThemeLabel();
  document.title = `${t('formalize.heading')} · meta-expression`;
}

function refreshThemeLabel() {
  if (!themeToggleIcon || !themeToggleLabel) {
    return;
  }
  themeToggleIcon.textContent = themeIcon(currentThemePreference);
  themeToggleLabel.textContent = t(`prefs.theme.${currentThemePreference}`);
  themeToggle?.setAttribute(
    'aria-label',
    t(`prefs.theme.${currentThemePreference}`)
  );
}

function setTheme(theme) {
  currentThemePreference = theme;
  applyTheme(currentThemePreference);
  persistTheme(currentThemePreference);
  refreshThemeLabel();
}

function setupLocale() {
  if (!localeSelect) {
    return;
  }
  localeSelect.replaceChildren();
  for (const { code, label } of listLocales()) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = label;
    if (code === currentLocale) {
      option.selected = true;
    }
    localeSelect.append(option);
  }
  localeSelect.addEventListener('change', () => {
    persistLocale(localeSelect.value);
    applyLocale(localeSelect.value);
    if (currentFormalizeResult) {
      renderFormalizeInterpretations(currentFormalizeResult);
    }
  });
}

function setupTheme() {
  applyTheme(currentThemePreference);
  refreshThemeLabel();
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      setTheme(nextTheme(currentThemePreference));
    });
  }
  watchSystemTheme(() => {
    if (currentThemePreference === 'auto') {
      applyTheme(currentThemePreference);
    }
  });
}

function setupFormalizeDisplayMode() {
  const radios = document.querySelectorAll(
    'input[name="formalize-display-mode"]'
  );
  for (const radio of radios) {
    if (radio.checked) {
      interpretationDisplayMode = radio.value;
    }
    radio.addEventListener('change', () => {
      if (!radio.checked) {
        return;
      }
      interpretationDisplayMode = radio.value;
      if (currentFormalizeResult) {
        renderFormalizeInterpretations(currentFormalizeResult);
      }
    });
  }
}

setupLocale();
setupTheme();
setupFormalizeDisplayMode();
const translatePage = setupTranslatePage({ cache: wikimediaCache });
const checkPage = setupCheckPage({
  cache: wikimediaCache,
  userBeliefs,
  getPreferenceProfile: getActivePreferenceProfile,
  getStrategyId: () => strategyId,
});
const uniquenessPage = setupUniquenessPage();
const comparePage = setupComparePage({
  userBeliefs,
  getPreferenceProfile: getActivePreferenceProfile,
  getStrategyId: () => strategyId,
});
setupPreferencesPage({
  onChange() {
    if (currentAnalysis) {
      render(input.value, selectedIndex);
    }
    comparePage.runAllCompareRows();
  },
});
applyLocale(currentLocale);
renderPreparedExamples();
syncBeliefControl(input.value);
render(input.value);

const navButtons = {
  analyse: navAnalyse,
  compare: navCompare,
  check: navCheck,
  uniqueness: navUniqueness,
  formalize: navFormalize,
  translate: navTranslate,
  preferences: navPreferences,
};
const pageElements = {
  analyse: pageAnalyse,
  compare: pageCompare,
  check: pageCheck,
  uniqueness: pageUniqueness,
  formalize: pageFormalize,
  translate: pageTranslate,
  preferences: pagePreferences,
};
const pageAliases = { 'fact-check': 'check', uniquness: 'uniqueness' };
const { showPage, pageFromHash } = setupNavigation({
  navButtons,
  pageElements,
  pageAliases,
  onShow(pageId) {
    if (pageId === 'compare') {
      comparePage.seedCompareRows();
    }
  },
});
setupPageIssueReporting({
  getPageId: pageFromHash,
  getAnalysis: () => currentAnalysis,
  getFormalizeResult: () => currentFormalizeResult,
  getPreferenceProfile: getActivePreferenceProfile,
  getStrategyId: () => strategyId,
  getLocale: () => currentLocale,
  getTheme: () => currentThemePreference,
  getFormalizeSourcesSpec: collectFormalizeSourcesSpec,
  getFormalizeLinkTargetMode: selectedLinkTargetMode,
  getInterpretationDisplayMode: () => interpretationDisplayMode,
  getTranslateResult: translatePage.getResult,
  getCheckResult: checkPage.getResult,
  getUniquenessResult: uniquenessPage.getResult,
});
const formalizeInput = document.querySelector('#formalize-input');
const formalizeSampleSelect = document.querySelector('#formalize-sample');
const formalizeNgramSize = document.querySelector('#formalize-ngram-size');
const formalizeTargetRadios = document.querySelectorAll(
  'input[name="formalize-target"]'
);
const formalizeRun = document.querySelector('#formalize-run');
const formalizeCopyMarkdown = document.querySelector(
  '#formalize-copy-markdown'
);
const formalizeCopyLino = document.querySelector('#formalize-copy-lino');
const formalizeStatus = document.querySelector('#formalize-status');
const formalizeOutput = document.querySelector('#formalize-output');
const formalizeContexts = document.querySelector('#formalize-contexts');
const formalizeInterpretations = document.querySelector(
  '#formalize-interpretations'
);
const formalizeMarkdownPre = document.querySelector('#formalize-markdown');
const formalizeLinoPre = document.querySelector('#formalize-lino');
const formalizeBigContexts = document.querySelector('#formalize-big-contexts');
const formalizeSourceList = document.querySelector('#formalize-source-list');
const formalizeFandomCheckbox = document.querySelector(
  '#formalize-source-fandom'
);
const formalizeFandomSlug = document.querySelector('#formalize-fandom-slug');
const formalizeOverridesText = document.querySelector('#formalize-overrides');
const formalizeOverridesError = document.querySelector(
  '#formalize-overrides-error'
);
const formalizePinPhrase = document.querySelector('#formalize-pin-phrase');
const formalizePinId = document.querySelector('#formalize-pin-id');
const formalizePinLabel = document.querySelector('#formalize-pin-label');
const formalizePinAdd = document.querySelector('#formalize-pin-add');
const formalizePinError = document.querySelector('#formalize-pin-error');

const defaultBigContextAutoSelectCount = 5;
let selectedBigContextIds = null;
let bigContextPhraseIndex = new Map();
let bigContextEntityIndex = new Map();

if (formalizeFandomCheckbox && formalizeFandomSlug) {
  formalizeFandomCheckbox.addEventListener('change', () => {
    formalizeFandomSlug.disabled = !formalizeFandomCheckbox.checked;
  });
}
setupSourcePriorityList(formalizeSourceList);

let formalizeRequestId = 0;
let currentFormalizeResult = null;
let activeContextLensId = null;
const formalizeWorker = createFormalizeWorker();

if (formalizeWorker) {
  formalizeWorker.addEventListener('message', (event) => {
    applyFormalizeResult(event.data);
  });
}

function createFormalizeWorker() {
  if (!('Worker' in globalThis)) {
    return null;
  }
  try {
    return new Worker('./formalize-worker.js', { type: 'module' });
  } catch {
    return null;
  }
}

function selectedLinkTargetMode() {
  for (const radio of formalizeTargetRadios) {
    if (radio.checked) {
      return radio.value;
    }
  }
  return FORMALIZE_LINK_TARGETS.WIKIPEDIA;
}

function runFormalize({ contextLensId = null } = {}) {
  const text = formalizeInput.value.trim();
  if (!text) {
    formalizeStatus.textContent = 'Enter some text first.';
    return;
  }
  const linkTargetMode = selectedLinkTargetMode();
  const maxNgramSize = Math.max(
    1,
    Math.min(5, Number(formalizeNgramSize.value) || 3)
  );
  activeContextLensId = contextLensId;
  selectedBigContextIds = null;
  formalizeStatus.textContent = 'Formalizing…';
  const id = String((formalizeRequestId += 1));
  formalizeStatus.dataset.requestId = id;

  const overrides = readFormalizeOverrides();
  if (overrides === null) {
    formalizeStatus.textContent =
      'Overrides JSON could not be parsed; fix it or clear the field.';
    return;
  }
  const options = {
    maxNgramSize,
    linkTargetMode,
    contextLens: contextLensId ? { id: contextLensId } : null,
    sourcesSpec: collectFormalizeSourcesSpec(),
    overrides,
  };

  if (formalizeWorker) {
    formalizeWorker.postMessage({ id, text, options });
    return;
  }

  formalizeTextWith(text, {
    ...options,
    sources: options.sourcesSpec
      ? parseSourceSpec(options.sourcesSpec)
      : undefined,
    cache: wikimediaCache,
    fetch: globalThis.fetch?.bind(globalThis),
  })
    .then((result) => applyFormalizeResult({ id, result }))
    .catch((error) =>
      applyFormalizeResult({
        id,
        error: error instanceof Error ? error.message : String(error),
      })
    );
}

function collectFormalizeSourcesSpec() {
  return collectCheckedSourceSpec(formalizeSourceList, {
    fandomSlugInput: formalizeFandomSlug,
  });
}

function readFormalizeOverrides() {
  if (!formalizeOverridesText) {
    return [];
  }
  const raw = formalizeOverridesText.value.trim();
  if (!raw) {
    if (formalizeOverridesError) {
      formalizeOverridesError.textContent = '';
    }
    return [];
  }
  try {
    const parsed = decodeOverridesText(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Overrides must decode to a list of entries.');
    }
    if (parsed.length === 0 && raw.length > 0) {
      throw new Error(
        'Overrides could not be parsed as Links Notation or JSON.'
      );
    }
    if (formalizeOverridesError) {
      formalizeOverridesError.textContent = '';
    }
    return parsed;
  } catch (error) {
    if (formalizeOverridesError) {
      formalizeOverridesError.textContent =
        error instanceof Error ? error.message : String(error);
    }
    return null;
  }
}

function rebuildBigContextIndices(list) {
  bigContextPhraseIndex = new Map();
  bigContextEntityIndex = new Map();
  for (const context of list) {
    const sourceList = context.sourcePhrases ?? [];
    for (const source of sourceList) {
      if (source?.entityId) {
        const bucket = bigContextEntityIndex.get(source.entityId) ?? new Set();
        bucket.add(context.id);
        bigContextEntityIndex.set(source.entityId, bucket);
      }
      if (source?.text) {
        const bucket = bigContextPhraseIndex.get(source.text) ?? new Set();
        bucket.add(context.id);
        bigContextPhraseIndex.set(source.text, bucket);
      }
    }
  }
}

function autoSelectBigContextIds(list) {
  return new Set(
    list.slice(0, defaultBigContextAutoSelectCount).map((context) => context.id)
  );
}

function renderFormalizeBigContexts(result) {
  if (!formalizeBigContexts) {
    return;
  }
  formalizeBigContexts.replaceChildren();
  const list = result.bigContexts ?? [];
  rebuildBigContextIndices(list);
  if (selectedBigContextIds === null) {
    selectedBigContextIds = autoSelectBigContextIds(list);
  }
  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'section-empty';
    empty.textContent = 'No big-context categories detected.';
    formalizeBigContexts.append(empty);
    return;
  }
  for (const [index, context] of list.entries()) {
    formalizeBigContexts.append(
      buildBigContextItem(context, index, result.mainBigContext)
    );
  }
}

function buildBigContextItem(context, index, mainBigContext) {
  const item = document.createElement('label');
  item.className = 'formalize-big-context';
  item.dataset.bigContextId = context.id;
  if (mainBigContext && context.id === mainBigContext.id) {
    item.classList.add('main');
  }
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = selectedBigContextIds.has(context.id);
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      selectedBigContextIds.add(context.id);
    } else {
      selectedBigContextIds.delete(context.id);
    }
    applyBigContextSelectionDimming();
  });
  item.append(checkbox);
  const link = document.createElement('a');
  link.href = `https://www.wikidata.org/wiki/${context.id}`;
  link.title = `${context.id}${
    context.label ? ` — ${context.label}` : ''
  } (rank ${index + 1})`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = context.label ?? context.id;
  item.append(link);
  const probabilityPercent = Math.round((context.probability ?? 0) * 100);
  const meta = document.createElement('span');
  meta.className = 'formalize-big-context-meta';
  meta.textContent = ` weight ${context.weight} · ${probabilityPercent}%`;
  item.append(meta);
  attachBigContextHover(item, context);
  return item;
}

function attachBigContextHover(item, context) {
  const phraseTexts = new Set(
    (context.sourcePhrases ?? [])
      .map((source) => source?.text)
      .filter((text) => typeof text === 'string')
  );
  const entityIds = new Set(
    (context.sourcePhrases ?? [])
      .map((source) => source?.entityId)
      .filter((id) => typeof id === 'string')
  );
  item.addEventListener('mouseenter', () => {
    highlightPhrasesForBigContext(phraseTexts, entityIds);
  });
  item.addEventListener('mouseleave', clearPhraseHighlights);
}

function highlightPhrasesForBigContext(phraseTexts, entityIds) {
  if (!formalizeOutput) {
    return;
  }
  for (const node of formalizeOutput.querySelectorAll('[data-phrase-text]')) {
    const text = node.dataset.phraseText;
    const id = node.dataset.wikidataId;
    if ((text && phraseTexts.has(text)) || (id && entityIds.has(id))) {
      node.classList.add('formalize-output-hover');
    }
  }
}

function clearPhraseHighlights() {
  if (!formalizeOutput) {
    return;
  }
  for (const node of formalizeOutput.querySelectorAll(
    '.formalize-output-hover'
  )) {
    node.classList.remove('formalize-output-hover');
  }
}

function highlightBigContextsForPhrase(phraseText, entityId) {
  if (!formalizeBigContexts) {
    return;
  }
  const ids = new Set();
  if (phraseText && bigContextPhraseIndex.has(phraseText)) {
    for (const id of bigContextPhraseIndex.get(phraseText)) {
      ids.add(id);
    }
  }
  if (entityId && bigContextEntityIndex.has(entityId)) {
    for (const id of bigContextEntityIndex.get(entityId)) {
      ids.add(id);
    }
  }
  for (const node of formalizeBigContexts.querySelectorAll(
    '[data-big-context-id]'
  )) {
    if (ids.has(node.dataset.bigContextId)) {
      node.classList.add('formalize-big-context-hover');
    }
  }
}

function clearBigContextHighlights() {
  if (!formalizeBigContexts) {
    return;
  }
  for (const node of formalizeBigContexts.querySelectorAll(
    '.formalize-big-context-hover'
  )) {
    node.classList.remove('formalize-big-context-hover');
  }
}

function applyBigContextSelectionDimming() {
  if (!formalizeOutput || !selectedBigContextIds) {
    return;
  }
  const total = bigContextEntityIndex.size + bigContextPhraseIndex.size;
  for (const node of formalizeOutput.querySelectorAll('[data-phrase-text]')) {
    const phraseText = node.dataset.phraseText;
    const entityId = node.dataset.wikidataId;
    const ids = new Set();
    if (phraseText && bigContextPhraseIndex.has(phraseText)) {
      for (const id of bigContextPhraseIndex.get(phraseText)) {
        ids.add(id);
      }
    }
    if (entityId && bigContextEntityIndex.has(entityId)) {
      for (const id of bigContextEntityIndex.get(entityId)) {
        ids.add(id);
      }
    }
    const hasSelected = [...ids].some((id) => selectedBigContextIds.has(id));
    const dim = ids.size > 0 && !hasSelected && total > 0;
    node.classList.toggle('formalize-output-dim', dim);
  }
}

function applyFormalizeResult(data) {
  if (!data || data.id !== formalizeStatus.dataset.requestId) {
    return;
  }
  if (data.error) {
    formalizeStatus.textContent = `Formalize failed: ${data.error}`;
    return;
  }
  const result = data.result;
  if (!result) {
    formalizeStatus.textContent = 'Formalize returned no result.';
    return;
  }
  currentFormalizeResult = result;
  activeInterpretationKey = null;
  renderFormalizeOutput(result);
  renderFormalizeContexts(result);
  renderFormalizeBigContexts(result);
  applyBigContextSelectionDimming();
  renderFormalizeInterpretations(result);
  formalizeMarkdownPre.textContent = result.markdown;
  formalizeLinoPre.textContent = result.linksNotation;
  const matched = result.phrases.filter((phrase) => phrase.entity).length;
  const total = result.phrases.length;
  formalizeStatus.textContent = `Linked ${matched}/${total} phrase${
    total === 1 ? '' : 's'
  } via Wikidata.`;
}

function renderFormalizeOutput(result) {
  formalizeOutput.replaceChildren();
  const wrapper = document.createElement('div');
  wrapper.className = 'formalize-output-text';
  for (const [index, phrase] of result.phrases.entries()) {
    if (index > 0) {
      wrapper.append(' ');
    }
    wrapper.append(buildFormalizeOutputNode(phrase, result.linkTargetMode));
  }
  formalizeOutput.append(wrapper);
}

function buildFormalizeOutputNode(phrase, linkTargetMode) {
  const node = phrase.entity
    ? document.createElement('a')
    : document.createElement('span');
  node.dataset.phraseText = phrase.text;
  if (phrase.entity) {
    node.href = resolveFormalizeLinkTarget(phrase, { linkTargetMode }) ?? '#';
    node.title = phrase.entity.id;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
    node.dataset.wikidataId = phrase.entity.id;
  } else {
    node.className = 'formalize-output-plain';
  }
  node.textContent = phrase.text;
  node.addEventListener('mouseenter', () => {
    highlightBigContextsForPhrase(phrase.text, phrase.entity?.id);
  });
  node.addEventListener('mouseleave', clearBigContextHighlights);
  return node;
}

function renderFormalizeContexts(result) {
  formalizeContexts.replaceChildren();
  const list = result.contexts ?? [];
  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'section-empty';
    empty.textContent = 'No shared contexts inferred.';
    formalizeContexts.append(empty);
    return;
  }
  for (const context of list) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'formalize-context';
    if (context.id === activeContextLensId) {
      button.classList.add('active');
    }
    if (
      activeContextLensId === null &&
      result.mainContext &&
      context.id === result.mainContext.id
    ) {
      button.classList.add('main');
    }
    const label = context.propertyLabel
      ? `${context.propertyLabel} → ${context.id}`
      : context.id;
    const probabilityPercent = Math.round((context.probability ?? 0) * 100);
    button.innerHTML = `
      <strong>${escapeHtml(label)}</strong>
      <span>weight ${context.weight} · ${probabilityPercent}%</span>
    `;
    button.addEventListener('click', () => {
      const nextLens = activeContextLensId === context.id ? null : context.id;
      runFormalize({ contextLensId: nextLens });
    });
    formalizeContexts.append(button);
  }
}

function renderFormalizeInterpretations(result) {
  formalizeInterpretations.replaceChildren();
  const all = result.interpretations ?? [];
  if (all.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'section-empty';
    empty.textContent = t('formalize.empty');
    formalizeInterpretations.append(empty);
    return;
  }

  if (!activeInterpretationKey && all[0]) {
    activeInterpretationKey = interpretationKey(all[0]);
  }

  const top = all.slice(0, topInterpretationCount);
  const activeIndex = all.findIndex(
    (entry) => interpretationKey(entry) === activeInterpretationKey
  );
  const items =
    activeIndex >= 0 && activeIndex >= top.length
      ? [...top.slice(0, top.length - 1), all[activeIndex]]
      : top;

  for (const interpretation of items) {
    const item = document.createElement('li');
    item.className = 'formalize-interpretation';
    const key = interpretationKey(interpretation);
    const isActive = key === activeInterpretationKey;
    if (isActive) {
      item.classList.add('active');
    }
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.dataset.interpretationKey = key;
    const score = (interpretation.score ?? 0).toFixed(1);
    const phrases = interpretation.phrases
      .map((phrase) =>
        formatInterpretationPhrase(phrase, interpretationDisplayMode)
      )
      .join(' ');
    const badge = isActive
      ? `<span class="formalize-interpretation-active-badge">${escapeHtml(t('formalize.activeBadge'))}</span>`
      : '';
    item.innerHTML = `
      <strong>#${interpretation.rank}</strong>
      <span>${escapeHtml(phrases)}</span>
      <small>${escapeHtml(t('formalize.score'))} ${score}${badge ? ' · ' : ''}${badge}</small>
    `;
    item.addEventListener('click', () => {
      activeInterpretationKey = key;
      renderFormalizeInterpretations(result);
      applyActiveInterpretationToOutput(result);
    });
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        item.click();
      }
    });
    formalizeInterpretations.append(item);
  }
}

function applyActiveInterpretationToOutput(result) {
  const all = result.interpretations ?? [];
  const active = all.find(
    (entry) => interpretationKey(entry) === activeInterpretationKey
  );
  if (!active) {
    return;
  }
  const phrasesByText = new Map();
  for (const phrase of active.phrases) {
    if (phrase?.text) {
      phrasesByText.set(phrase.text, phrase);
    }
  }
  for (const phrase of result.phrases) {
    const override = phrasesByText.get(phrase.text);
    if (!override || !override.entityId) {
      continue;
    }
    phrase.entity = phrase.entity
      ? {
          ...phrase.entity,
          id: override.entityId,
          label: override.entityLabel ?? phrase.entity.label,
          description: override.entityDescription ?? phrase.entity.description,
        }
      : {
          id: override.entityId,
          label: override.entityLabel ?? phrase.text,
          description: override.entityDescription ?? '',
          kind: override.kind ?? 'entity',
          score: 0,
          wikipediaUrl: null,
          wikipediaTitle: null,
          contextLabels: [],
        };
  }
  renderFormalizeOutput(result);
}

formalizeRun.addEventListener('click', () => runFormalize());

if (formalizeSampleSelect) {
  for (const sample of formalizeRepoSamples) {
    const option = document.createElement('option');
    option.value = sample.text;
    option.textContent = sample.label;
    formalizeSampleSelect.append(option);
  }
  formalizeSampleSelect.addEventListener('change', () => {
    const value = formalizeSampleSelect.value;
    if (!value) {
      return;
    }
    formalizeInput.value = value;
    formalizeSampleSelect.value = '';
    runFormalize();
  });
}

if (formalizePinAdd) {
  formalizePinAdd.addEventListener('click', addManualPinFromForm);
}

function addManualPinFromForm() {
  if (!formalizePinPhrase || !formalizePinId) {
    return;
  }
  const phrase = formalizePinPhrase.value.trim();
  const id = formalizePinId.value.trim();
  const label = formalizePinLabel?.value.trim() ?? '';
  if (formalizePinError) {
    formalizePinError.textContent = '';
  }
  if (!phrase) {
    setPinError('Phrase is required.');
    return;
  }
  if (!/^[QP]\d+$/.test(id)) {
    setPinError('Id must look like Q123 or P31.');
    return;
  }
  const kind = id.startsWith('P') ? 'property' : 'entity';
  const existing = readExistingOverridesForMerge();
  if (existing === null) {
    setPinError('Existing overrides cannot be parsed; fix them first.');
    return;
  }
  const filtered = existing.filter(
    (entry) =>
      !(entry?.phrase === phrase && (!entry?.kind || entry.kind === kind))
  );
  filtered.push({
    phrase,
    entityId: id,
    label: label || phrase,
    kind,
  });
  if (formalizeOverridesText) {
    formalizeOverridesText.value = encodeOverridesAsLino(filtered);
  }
  formalizePinPhrase.value = '';
  formalizePinId.value = '';
  if (formalizePinLabel) {
    formalizePinLabel.value = '';
  }
  runFormalize({ contextLensId: activeContextLensId });
}

function readExistingOverridesForMerge() {
  if (!formalizeOverridesText) {
    return [];
  }
  const raw = formalizeOverridesText.value.trim();
  if (!raw) {
    return [];
  }
  try {
    const parsed = decodeOverridesText(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return null;
  }
}

function setPinError(message) {
  if (formalizePinError) {
    formalizePinError.textContent = message;
  }
}

for (const radio of formalizeTargetRadios) {
  radio.addEventListener('change', () => {
    if (currentFormalizeResult) {
      runFormalize({ contextLensId: activeContextLensId });
    }
  });
}

formalizeCopyMarkdown.addEventListener('click', async () => {
  if (!currentFormalizeResult) {
    formalizeStatus.textContent = 'Formalize the text first.';
    return;
  }
  await copyToClipboard(currentFormalizeResult.markdown);
  formalizeStatus.textContent = 'Markdown copied to clipboard.';
});

formalizeCopyLino.addEventListener('click', async () => {
  if (!currentFormalizeResult) {
    formalizeStatus.textContent = 'Formalize the text first.';
    return;
  }
  await copyToClipboard(currentFormalizeResult.linksNotation);
  formalizeStatus.textContent = 'Links Notation copied to clipboard.';
});

async function copyToClipboard(text) {
  try {
    await globalThis.navigator?.clipboard?.writeText(text);
  } catch {
    // Clipboard may be blocked; the textarea still shows the value.
  }
}
showPage(pageFromHash());
