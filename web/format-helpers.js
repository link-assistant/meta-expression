export function formatCorrectness(correctness) {
  if (correctness === null || correctness === undefined) {
    return 'unknown';
  }
  return `${Math.round(correctness * 100)}%`;
}

export function formatSignedConfidence(signedConfidence) {
  if (signedConfidence === null || signedConfidence === undefined) {
    return 'unknown';
  }
  const percent = Math.round(signedConfidence * 100);
  if (percent > 0) {
    return `+${percent}%`;
  }
  return `${percent}%`;
}

export function signOf(value) {
  if (value === null || value === undefined) {
    return 'unknown';
  }
  if (value > 0) {
    return 'positive';
  }
  if (value < 0) {
    return 'negative';
  }
  return 'zero';
}

export function summary(value) {
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

export function sourceUrlFor(value) {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  return value.sourceUrl ?? value.context?.wikidataEntityUrl ?? null;
}

export function sourceLabelFor(value) {
  if (value === null || typeof value !== 'object') {
    return 'source';
  }
  return value.wikidataId ?? value.sourceType ?? 'source';
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatResultValue(result) {
  if (result.kind === 'evidence-estimate' && typeof result.value === 'number') {
    return `${Math.round(result.value * 100)}%`;
  }
  return String(result.value);
}
