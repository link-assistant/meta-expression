// Shared Wikidata entity → context helpers.
//
// Both the formalizer (formalize.js) and the copula type-resolution pass
// (copula-types.js) read the same fields off a hydrated Wikidata entity — its
// context-bearing claims (instance-of, subclass-of, …), its aliases, and the
// Wikipedia article base URL. Keeping them here lets both modules share one
// definition instead of duplicating it, and keeps formalize.js within the
// repository's per-file line budget.

export const wikipediaArticleBaseUrl = 'https://en.wikipedia.org/wiki/';

// Wikidata properties whose targets we surface as a candidate's "contexts" —
// the classes/relations that explain what world the entity lives in.
export const contextProperties = Object.freeze({
  P31: 'instance of',
  P279: 'subclass of',
  P361: 'part of',
  P137: 'operator',
  P136: 'genre',
  P425: 'field of work',
  P106: 'occupation',
});

export function extractContextLabels(entity) {
  const labels = [];
  for (const property of Object.keys(contextProperties)) {
    const claims = entity.claims?.[property];
    if (!Array.isArray(claims)) {
      continue;
    }
    for (const claim of claims) {
      const value = claim.mainsnak?.datavalue?.value;
      const id = value?.id ?? wikidataIdFromNumericValue(value);
      if (!id) {
        continue;
      }
      labels.push({
        property,
        propertyLabel: contextProperties[property],
        targetId: id,
      });
    }
  }
  return labels;
}

export function wikidataIdFromNumericValue(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value['numeric-id'] ? `Q${value['numeric-id']}` : null;
}

// Surface every alias the entity carries so the candidate matcher can
// snap "to formalize" → Q115492965 even when the canonical label is
// "formalizing" (issue #21).
export function extractAliases(entity) {
  const aliases = entity?.aliases?.en;
  if (!Array.isArray(aliases)) {
    return [];
  }
  return aliases
    .map((alias) => alias?.value)
    .filter((value) => typeof value === 'string' && value.length > 0);
}
