import { parseLino, serializeLino } from './lino.js';

export const preferenceBeliefDefinitions = Object.freeze([
  Object.freeze({
    id: 'god-exists',
    statement: 'God exists',
    label: 'God or gods exist',
    group: 'worldview',
    defaultProbability: 0.5,
  }),
  Object.freeze({
    id: 'christianity-is-true',
    statement: 'Christianity is true',
    label: 'Christianity',
    group: 'religion',
    defaultProbability: 0.5,
    visibleWhen: Object.freeze({
      beliefId: 'god-exists',
      greaterThan: 0.5,
    }),
  }),
  Object.freeze({
    id: 'islam-is-true',
    statement: 'Islam is true',
    label: 'Islam',
    group: 'religion',
    defaultProbability: 0.5,
    visibleWhen: Object.freeze({
      beliefId: 'god-exists',
      greaterThan: 0.5,
    }),
  }),
  Object.freeze({
    id: 'hinduism-is-true',
    statement: 'Hinduism is true',
    label: 'Hinduism',
    group: 'religion',
    defaultProbability: 0.5,
    visibleWhen: Object.freeze({
      beliefId: 'god-exists',
      greaterThan: 0.5,
    }),
  }),
  Object.freeze({
    id: 'buddhism-is-true',
    statement: 'Buddhism is true',
    label: 'Buddhism',
    group: 'religion',
    defaultProbability: 0.5,
    visibleWhen: Object.freeze({
      beliefId: 'god-exists',
      greaterThan: 0.5,
    }),
  }),
  Object.freeze({
    id: 'judaism-is-true',
    statement: 'Judaism is true',
    label: 'Judaism',
    group: 'religion',
    defaultProbability: 0.5,
    visibleWhen: Object.freeze({
      beliefId: 'god-exists',
      greaterThan: 0.5,
    }),
  }),
]);

export const preferenceContextDefinitions = Object.freeze([
  Object.freeze({
    id: 'real-world',
    label: 'Real world',
    beliefs: Object.freeze([]),
  }),
  Object.freeze({
    id: 'world-of-warcraft',
    label: 'World of Warcraft',
    beliefs: Object.freeze([
      Object.freeze({ statement: 'Azeroth exists', probability: 0.95 }),
      Object.freeze({
        statement: 'The Horde and Alliance exist',
        probability: 0.95,
      }),
      Object.freeze({ statement: 'Orcs live on Azeroth', probability: 0.8 }),
    ]),
  }),
  Object.freeze({
    id: 'starcraft',
    label: 'StarCraft',
    beliefs: Object.freeze([
      Object.freeze({ statement: 'The Zerg exist', probability: 0.95 }),
      Object.freeze({
        statement: 'Terrans exist in the Koprulu sector',
        probability: 0.95,
      }),
      Object.freeze({ statement: 'Protoss use psionics', probability: 0.9 }),
    ]),
  }),
  Object.freeze({
    id: 'harry-potter',
    label: 'Harry Potter',
    beliefs: Object.freeze([
      Object.freeze({ statement: 'Hogwarts exists', probability: 0.95 }),
      Object.freeze({
        statement: 'Harry Potter is a wizard',
        probability: 0.95,
      }),
      Object.freeze({ statement: 'Magic exists', probability: 0.95 }),
    ]),
  }),
  Object.freeze({
    id: 'star-wars',
    label: 'Star Wars',
    beliefs: Object.freeze([
      Object.freeze({ statement: 'The Force exists', probability: 0.95 }),
      Object.freeze({
        statement: 'Darth Vader is Anakin Skywalker',
        probability: 0.97,
      }),
      Object.freeze({ statement: 'Jedi use lightsabers', probability: 0.95 }),
    ]),
  }),
]);

export const preferenceEvidenceSituationDefinitions = Object.freeze([
  Object.freeze({
    id: 'wikidata-structured-claim',
    label: 'Wikidata structured statement',
    group: 'knowledge-source',
    defaultProbability: 0.74,
  }),
  Object.freeze({
    id: 'wikipedia-literal-statement',
    label: 'Wikipedia literal statement',
    group: 'knowledge-source',
    defaultProbability: 0.68,
  }),
  Object.freeze({
    id: 'wikipedia-similar-statement',
    label: 'Wikipedia similar statement',
    group: 'knowledge-source',
    defaultProbability: 0.62,
  }),
  Object.freeze({
    id: 'wikipedia-cited-statement',
    label: 'Wikipedia cited statement',
    group: 'knowledge-source',
    defaultProbability: 0.87,
  }),
  Object.freeze({
    id: 'literature-screened-paper',
    label: 'Screened literature paper',
    group: 'knowledge-source',
    defaultProbability: 1,
  }),
  Object.freeze({
    id: 'external-proof-solver-artifact',
    label: 'External proof or solver artifact',
    group: 'knowledge-source',
    defaultProbability: 1,
  }),
]);

const defaultPreferenceProfile = Object.freeze({
  version: 1,
  activeContextId: 'real-world',
  beliefs: Object.freeze({}),
  evidenceScoring: Object.freeze({}),
});

const beliefDefinitionsById = new Map(
  preferenceBeliefDefinitions.map((definition) => [definition.id, definition])
);
const contextDefinitionsById = new Map(
  preferenceContextDefinitions.map((definition) => [definition.id, definition])
);
const evidenceSituationDefinitionsById = new Map(
  preferenceEvidenceSituationDefinitions.map((definition) => [
    definition.id,
    definition,
  ])
);

export function createDefaultPreferenceProfile() {
  return normalizePreferenceProfile(defaultPreferenceProfile);
}

export function normalizePreferenceProfile(profile = {}) {
  const candidate = profile && typeof profile === 'object' ? profile : {};
  const activeContextId = contextDefinitionsById.has(candidate.activeContextId)
    ? candidate.activeContextId
    : defaultPreferenceProfile.activeContextId;

  return {
    version: 1,
    activeContextId,
    beliefs: normalizePreferenceValues(candidate.beliefs, setKnownBelief),
    evidenceScoring: normalizePreferenceValues(
      candidate.evidenceScoring,
      setKnownEvidenceSituation
    ),
  };
}

function normalizePreferenceValues(rawValues, assignValue) {
  const values = {};
  if (!rawValues || typeof rawValues !== 'object') {
    return values;
  }
  if (Array.isArray(rawValues)) {
    for (const entry of rawValues) {
      if (entry?.id) {
        assignValue(values, entry.id, entry.probability);
      }
    }
    return values;
  }
  for (const [id, probability] of Object.entries(rawValues)) {
    assignValue(values, id, probability);
  }
  return values;
}

function setKnownBelief(target, id, probability) {
  if (!beliefDefinitionsById.has(id)) {
    return;
  }
  const parsed = Number(probability);
  if (!Number.isFinite(parsed)) {
    return;
  }
  target[id] = clamp(parsed, 0, 1);
}

function setKnownEvidenceSituation(target, id, probability) {
  if (!evidenceSituationDefinitionsById.has(id)) {
    return;
  }
  const parsed = Number(probability);
  if (!Number.isFinite(parsed)) {
    return;
  }
  target[id] = clamp(parsed, 0, 1);
}

export function getPreferenceBeliefProbability(profile, beliefId) {
  const normalized = normalizePreferenceProfile(profile);
  const definition = beliefDefinitionsById.get(beliefId);
  if (!definition) {
    return 0.5;
  }
  return normalized.beliefs[beliefId] ?? definition.defaultProbability ?? 0.5;
}

export function getPreferenceEvidenceSituationProbability(
  profile,
  situationId
) {
  const normalized = normalizePreferenceProfile(profile);
  const definition = evidenceSituationDefinitionsById.get(situationId);
  if (!definition) {
    return 0.5;
  }
  return (
    normalized.evidenceScoring[situationId] ??
    definition.defaultProbability ??
    0.5
  );
}

export function setPreferenceBelief(profile, beliefId, probability) {
  const normalized = normalizePreferenceProfile(profile);
  const definition = beliefDefinitionsById.get(beliefId);
  if (!definition) {
    return normalized;
  }
  const next = {
    ...normalized,
    beliefs: { ...normalized.beliefs },
  };
  const value = clamp(Number(probability), 0, 1);
  if (!Number.isFinite(value) || value === definition.defaultProbability) {
    delete next.beliefs[beliefId];
  } else {
    next.beliefs[beliefId] = value;
  }
  return next;
}

export function setPreferenceEvidenceSituation(
  profile,
  situationId,
  probability
) {
  const normalized = normalizePreferenceProfile(profile);
  const definition = evidenceSituationDefinitionsById.get(situationId);
  if (!definition) {
    return normalized;
  }
  const next = {
    ...normalized,
    evidenceScoring: { ...normalized.evidenceScoring },
  };
  const value = clamp(Number(probability), 0, 1);
  if (!Number.isFinite(value) || value === definition.defaultProbability) {
    delete next.evidenceScoring[situationId];
  } else {
    next.evidenceScoring[situationId] = value;
  }
  return next;
}

export function setPreferenceContext(profile, contextId) {
  const normalized = normalizePreferenceProfile(profile);
  return {
    ...normalized,
    activeContextId: contextDefinitionsById.has(contextId)
      ? contextId
      : defaultPreferenceProfile.activeContextId,
  };
}

export function isPreferenceBeliefVisible(definitionOrId, profile) {
  const definition =
    typeof definitionOrId === 'string'
      ? beliefDefinitionsById.get(definitionOrId)
      : beliefDefinitionsById.get(definitionOrId?.id);
  if (!definition) {
    return false;
  }
  if (!definition.visibleWhen) {
    return true;
  }
  const current = getPreferenceBeliefProbability(
    profile,
    definition.visibleWhen.beliefId
  );
  return current > definition.visibleWhen.greaterThan;
}

export function listVisiblePreferenceBeliefs(profile) {
  return preferenceBeliefDefinitions.filter((definition) =>
    isPreferenceBeliefVisible(definition, profile)
  );
}

export function serializePreferenceProfile(profile) {
  const normalized = normalizePreferenceProfile(profile);
  const entries = Object.entries(normalized.beliefs).map(
    ([id, probability]) => ({
      id,
      probability,
    })
  );
  const evidenceScoring = Object.entries(normalized.evidenceScoring).map(
    ([id, probability]) => ({
      id,
      probability,
    })
  );
  return serializeLino(
    {
      version: normalized.version,
      activeContextId: normalized.activeContextId,
      beliefs: entries,
      evidenceScoring,
    },
    { rootIdentifier: 'preferences' }
  );
}

export function parsePreferenceProfile(text) {
  const parsed = parseLino(text);
  if (!parsed || typeof parsed !== 'object') {
    return createDefaultPreferenceProfile();
  }
  return normalizePreferenceProfile(parsed);
}

export function createPreferenceEvidence(profile) {
  const normalized = normalizePreferenceProfile(profile);
  return [
    ...createExplicitPreferenceEvidence(normalized),
    ...createDerivedPreferenceEvidence(normalized),
    ...createContextPreferenceEvidence(normalized),
  ];
}

function createExplicitPreferenceEvidence(profile) {
  const evidence = [];
  for (const definition of preferenceBeliefDefinitions) {
    if (!isPreferenceBeliefVisible(definition, profile)) {
      continue;
    }
    const probability = getPreferenceBeliefProbability(profile, definition.id);
    if (probability === definition.defaultProbability) {
      continue;
    }
    evidence.push(
      ...createProbabilityEvidence({
        idPrefix: `preference-${definition.id}`,
        statement: definition.statement,
        probability,
        sourceType: 'preference',
        supportClaim: `Preference slider "${definition.label}" supports "${definition.statement}" at ${Math.round(
          probability * 100
        )}%.`,
        refuteClaim: `Preference slider "${definition.label}" leaves ${Math.round(
          (1 - probability) * 100
        )}% against "${definition.statement}".`,
        sourceUrl: null,
      })
    );
  }
  return evidence;
}

function createDerivedPreferenceEvidence(profile) {
  const godProbability = getPreferenceBeliefProbability(profile, 'god-exists');
  if (godProbability >= 0.5) {
    return [];
  }
  const religionDefinitions = preferenceBeliefDefinitions.filter(
    (definition) => definition.group === 'religion'
  );
  return religionDefinitions.flatMap((definition) =>
    createProbabilityEvidence({
      idPrefix: `derived-atheist-${definition.id}`,
      statement: definition.statement,
      probability: godProbability,
      sourceType: 'derived-preference',
      supportClaim: `The God belief leaves ${Math.round(
        godProbability * 100
      )}% residual possibility for "${definition.statement}".`,
      refuteClaim: `The God belief is set to ${Math.round(
        godProbability * 100
      )}%, so "${definition.statement}" is treated as ${Math.round(
        (1 - godProbability) * 100
      )}% not believed.`,
      sourceUrl: null,
    })
  );
}

function createContextPreferenceEvidence(profile) {
  const context =
    contextDefinitionsById.get(profile.activeContextId) ??
    contextDefinitionsById.get(defaultPreferenceProfile.activeContextId);
  return (context?.beliefs ?? []).flatMap((belief) =>
    createProbabilityEvidence({
      idPrefix: `context-${context.id}-${safeReference(belief.statement)}`,
      statement: belief.statement,
      probability: belief.probability,
      sourceType: 'context',
      sourceUrl: null,
      supportClaim: `${context.label} context supports "${belief.statement}" at ${Math.round(
        belief.probability * 100
      )}%.`,
      refuteClaim: `${context.label} context leaves ${Math.round(
        (1 - belief.probability) * 100
      )}% residual uncertainty against "${belief.statement}".`,
    })
  );
}

function createProbabilityEvidence({
  idPrefix,
  statement,
  probability,
  sourceType,
  sourceUrl,
  claim,
  supportClaim = claim,
  refuteClaim = claim,
}) {
  const clamped = clamp(Number(probability), 0, 1);
  if (!Number.isFinite(clamped) || clamped === 0.5) {
    return [];
  }
  const key = normalizeKey(statement);
  const base = {
    key,
    sourceType,
    sourceUrl,
    retrievedAt: 'local-storage',
    identifiers: {
      statement: key,
    },
  };
  const evidence = [];
  if (clamped > 0) {
    evidence.push({
      ...base,
      id: `${idPrefix}-support`,
      polarity: 'support',
      weight: clamped,
      claim: supportClaim,
    });
  }
  if (clamped < 1) {
    evidence.push({
      ...base,
      id: `${idPrefix}-refute`,
      polarity: 'refute',
      weight: 1 - clamped,
      claim: refuteClaim,
    });
  }
  return evidence;
}

function normalizeKey(input) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeReference(value) {
  return normalizeKey(value).replace(/\s+/g, '-');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
