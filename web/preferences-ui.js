import {
  createDefaultPreferenceProfile,
  getPreferenceBeliefProbability,
  isPreferenceBeliefVisible,
  normalizePreferenceProfile,
  parsePreferenceProfile,
  preferenceBeliefDefinitions,
  preferenceContextDefinitions,
  serializePreferenceProfile,
  setPreferenceBelief,
  setPreferenceContext,
} from '../src/index.js';

const preferenceStorageKey = 'meta-expression.preferences.v1';

let activePreferenceProfile = loadPreferenceProfile();
let onProfileChange = () => {};

export function getActivePreferenceProfile() {
  return activePreferenceProfile;
}

export function setupPreferencesPage(options = {}) {
  onProfileChange =
    typeof options.onChange === 'function' ? options.onChange : () => {};
  renderPreferenceControls();
  setupPreferenceActions();
}

function loadPreferenceProfile() {
  try {
    const raw = globalThis.localStorage?.getItem(preferenceStorageKey);
    if (raw) {
      return normalizePreferenceProfile(JSON.parse(raw));
    }
  } catch {
    // Keep the default profile when storage is blocked or corrupted.
  }
  return createDefaultPreferenceProfile();
}

function savePreferenceProfile() {
  try {
    globalThis.localStorage?.setItem(
      preferenceStorageKey,
      JSON.stringify(activePreferenceProfile)
    );
  } catch {
    // The in-memory profile still affects the current page.
  }
}

function renderPreferenceControls() {
  const worldview = document.querySelector('#preferences-worldview');
  const religions = document.querySelector('#preferences-religions');
  const religionPanel = document.querySelector('#preferences-religion-panel');
  const contexts = document.querySelector('#preferences-contexts');
  if (!worldview || !religions || !contexts) {
    return;
  }

  worldview.replaceChildren();
  religions.replaceChildren();
  for (const definition of preferenceBeliefDefinitions) {
    if (!isPreferenceBeliefVisible(definition, activePreferenceProfile)) {
      continue;
    }
    const target = definition.group === 'religion' ? religions : worldview;
    target.append(buildBeliefSlider(definition));
  }
  if (religionPanel) {
    religionPanel.hidden = religions.children.length === 0;
  }

  contexts.replaceChildren();
  for (const context of preferenceContextDefinitions) {
    contexts.append(buildContextOption(context));
  }
  syncPreferenceExport();
}

function buildBeliefSlider(definition) {
  const probability = getPreferenceBeliefProbability(
    activePreferenceProfile,
    definition.id
  );
  const row = document.createElement('label');
  row.className = 'preferences-slider';

  const heading = document.createElement('span');
  heading.className = 'preferences-slider-heading';
  heading.textContent = definition.label;

  const output = document.createElement('output');
  output.textContent = `${Math.round(probability * 100)}%`;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.value = String(Math.round(probability * 100));
  input.addEventListener('input', () => {
    const nextProbability = Number(input.value) / 100;
    activePreferenceProfile = setPreferenceBelief(
      activePreferenceProfile,
      definition.id,
      nextProbability
    );
    output.textContent = `${input.value}%`;
    savePreferenceProfile();
    syncPreferenceExport();
    onProfileChange(activePreferenceProfile);
    if (definition.id === 'god-exists') {
      renderPreferenceControls();
    }
  });

  row.append(heading, output, input);
  return row;
}

function buildContextOption(context) {
  const row = document.createElement('label');
  row.className = 'preferences-context-option';

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'preferences-context';
  input.value = context.id;
  input.checked = activePreferenceProfile.activeContextId === context.id;
  input.addEventListener('change', () => {
    if (!input.checked) {
      return;
    }
    activePreferenceProfile = setPreferenceContext(
      activePreferenceProfile,
      context.id
    );
    savePreferenceProfile();
    syncPreferenceExport();
    onProfileChange(activePreferenceProfile);
  });

  const label = document.createElement('span');
  label.textContent = context.label;

  row.append(input, label);
  return row;
}

function setupPreferenceActions() {
  document
    .querySelector('#preferences-export')
    ?.addEventListener('click', () => {
      syncPreferenceExport();
      copyPreferenceExport();
      setPreferenceStatus('Exported.');
    });
  document
    .querySelector('#preferences-import')
    ?.addEventListener('click', importPreferenceProfile);
  document
    .querySelector('#preferences-reset')
    ?.addEventListener('click', () => {
      activePreferenceProfile = createDefaultPreferenceProfile();
      savePreferenceProfile();
      renderPreferenceControls();
      onProfileChange(activePreferenceProfile);
      setPreferenceStatus('Reset.');
    });
}

function syncPreferenceExport() {
  const textarea = document.querySelector('#preferences-lino');
  if (textarea) {
    textarea.value = serializePreferenceProfile(activePreferenceProfile);
  }
}

function importPreferenceProfile() {
  const textarea = document.querySelector('#preferences-lino');
  if (!textarea) {
    return;
  }
  try {
    activePreferenceProfile = parsePreferenceProfile(textarea.value);
    savePreferenceProfile();
    renderPreferenceControls();
    onProfileChange(activePreferenceProfile);
    setPreferenceStatus('Imported.');
  } catch (error) {
    setPreferenceStatus(
      error instanceof Error ? error.message : 'Import failed.'
    );
  }
}

async function copyPreferenceExport() {
  const textarea = document.querySelector('#preferences-lino');
  if (!textarea || !globalThis.navigator?.clipboard) {
    return;
  }
  try {
    await globalThis.navigator.clipboard.writeText(textarea.value);
  } catch {
    // Clipboard can be blocked; the textarea remains the source of truth.
  }
}

function setPreferenceStatus(message) {
  const status = document.querySelector('#preferences-status');
  if (status) {
    status.textContent = message;
  }
}
