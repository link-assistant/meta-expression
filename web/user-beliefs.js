// Persistence helpers for per-statement user belief probabilities.
//
// The analyse page lets a reader nudge how strongly they believe a statement;
// those probabilities are stored as a { statement -> probability } map in
// localStorage so the belief sliders survive reloads. These pure helpers are
// shared by app.js and keep the storage/normalization logic in one place.

export function loadUserBeliefs(storageKey) {
  try {
    return JSON.parse(globalThis.localStorage.getItem(storageKey)) ?? {};
  } catch {
    return {};
  }
}

export function saveUserBeliefs(storageKey, beliefs) {
  try {
    globalThis.localStorage.setItem(storageKey, JSON.stringify(beliefs));
  } catch {
    // Belief sliders still work for the current page even if storage is blocked.
  }
}

// Normalizes whitespace and case so "Earth  Orbits the Sun" matches a stored
// "earth orbits the sun" belief.
function normalizeBeliefKey(statement) {
  return statement.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function findStoredBelief(beliefs, statement) {
  const key = normalizeBeliefKey(statement);
  for (const [storedKey, value] of Object.entries(beliefs)) {
    if (normalizeBeliefKey(storedKey) === key) {
      return Number(value);
    }
  }
  return undefined;
}
