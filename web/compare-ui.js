import { analyzeStatement } from '../js/src/index.js';
import {
  escapeHtml,
  formatCorrectness,
  formatSignedConfidence,
  signOf,
} from './format-helpers.js';

const emptyMetricLabel = '\u2014';

export function setupComparePage({
  userBeliefs = {},
  getPreferenceProfile = () => ({}),
  getStrategyId = () => undefined,
  // Routes each claim's analysis through the selected engine (JS or Rust/WASM).
  // Defaults to the JavaScript engine so the page works in isolation.
  analyze = (statement, options) => analyzeStatement(statement, options),
} = {}) {
  const compareRows = document.querySelector('#compare-rows');
  const compareAdd = document.querySelector('#compare-add');
  const compareRun = document.querySelector('#compare-run');

  if (!compareRows || !compareAdd || !compareRun) {
    return { runAllCompareRows() {}, seedCompareRows() {} };
  }

  function seedCompareRows() {
    if (compareRows.children.length > 0) {
      return;
    }
    appendCompareRow('Population of Russia is 100m');
    appendCompareRow('Population of Russia is 200m');
  }

  function appendCompareRow(initialValue = '') {
    const row = document.createElement('div');
    row.className = 'compare-row';
    row.innerHTML = `
      <div class="compare-row-input">
        <label>Claim</label>
        <input type="text" class="compare-claim" value="${escapeHtml(initialValue)}" />
      </div>
      <div class="compare-metric" data-metric="correctness">
        <span class="eyebrow">Correctness</span>
        <strong class="compare-correctness">&mdash;</strong>
        <div class="compare-bar"><div class="compare-bar-fill correctness"></div></div>
      </div>
      <div class="compare-metric" data-metric="confidence">
        <span class="eyebrow">Confidence</span>
        <strong class="compare-confidence">&mdash;</strong>
        <div class="compare-bar signed"><div class="compare-bar-axis"></div><div class="compare-bar-fill signed-confidence"></div></div>
      </div>
      <button type="button" class="compare-remove" aria-label="Remove claim">&times;</button>
    `;
    row.querySelector('.compare-remove').addEventListener('click', () => {
      if (compareRows.children.length > 2) {
        row.remove();
      }
    });
    row.querySelector('.compare-claim').addEventListener('change', () => {
      runCompareRow(row);
    });
    compareRows.append(row);
    if (initialValue) {
      runCompareRow(row);
    }
  }

  function runCompareRow(row) {
    const claim = row.querySelector('.compare-claim').value.trim();
    const correctnessEl = row.querySelector('.compare-correctness');
    const confidenceEl = row.querySelector('.compare-confidence');
    const correctnessFill = row.querySelector('.compare-bar-fill.correctness');
    const signedFill = row.querySelector('.compare-bar-fill.signed-confidence');

    if (!claim) {
      renderEmptyMetric(
        correctnessEl,
        confidenceEl,
        correctnessFill,
        signedFill
      );
      return;
    }

    let analysis;
    try {
      analysis = analyze(claim, {
        selectedBy: 'compare',
        userBeliefs,
        preferenceProfile: getPreferenceProfile(),
        reasoningStrategyId: getStrategyId(),
      });
    } catch {
      correctnessEl.textContent = 'error';
      confidenceEl.textContent = 'error';
      correctnessFill.style.width = '0%';
      signedFill.style.width = '0%';
      signedFill.style.left = '50%';
      return;
    }

    renderCompareMetrics(analysis, {
      correctnessEl,
      confidenceEl,
      correctnessFill,
      signedFill,
    });
  }

  function runAllCompareRows() {
    for (const row of compareRows.querySelectorAll('.compare-row')) {
      runCompareRow(row);
    }
  }

  compareAdd.addEventListener('click', () => appendCompareRow(''));
  compareRun.addEventListener('click', runAllCompareRows);

  return { runAllCompareRows, seedCompareRows };
}

function renderEmptyMetric(
  correctnessEl,
  confidenceEl,
  correctnessFill,
  signedFill
) {
  correctnessEl.textContent = emptyMetricLabel;
  confidenceEl.textContent = emptyMetricLabel;
  correctnessFill.style.width = '0%';
  signedFill.style.width = '0%';
  signedFill.style.left = '50%';
}

function renderCompareMetrics(
  analysis,
  { correctnessEl, confidenceEl, correctnessFill, signedFill }
) {
  const correctness = analysis.result.correctness;
  const signed = analysis.result.signedConfidence;

  correctnessEl.textContent = formatCorrectness(correctness);
  confidenceEl.textContent = formatSignedConfidence(signed);
  confidenceEl.dataset.sign = signOf(signed);
  correctnessFill.style.width =
    correctness === null
      ? '0%'
      : `${Math.max(0, Math.min(100, correctness * 100))}%`;

  signedFill.classList.remove('positive', 'negative');
  if (signed === null || signed === undefined) {
    signedFill.style.width = '0%';
    signedFill.style.left = '50%';
  } else if (signed >= 0) {
    signedFill.style.left = '50%';
    signedFill.style.width = `${Math.min(50, signed * 50)}%`;
    signedFill.classList.add('positive');
  } else {
    const magnitude = Math.min(50, Math.abs(signed) * 50);
    signedFill.style.left = `${50 - magnitude}%`;
    signedFill.style.width = `${magnitude}%`;
    signedFill.classList.add('negative');
  }
}
