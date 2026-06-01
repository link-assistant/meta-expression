import { virtualSourceOverrides } from '../data/virtual-source-overrides.js';

export const VIRTUAL_SOURCE_KIND = 'virtual-source-overrides';

export function listVirtualSourceOverrides(extraEntries = []) {
  return [...virtualSourceOverrides, ...normalizeEntries(extraEntries)].map(
    cloneEntry
  );
}

export function createVirtualSourceOverrideSource({
  language = 'en',
  entries = virtualSourceOverrides,
} = {}) {
  const normalized = normalizeEntries(entries);
  const byId = new Map();
  for (const entry of normalized) {
    byId.set(entry.entityId ?? entry.id, entry);
    byId.set(entry.id, entry);
  }
  return {
    name: VIRTUAL_SOURCE_KIND,
    searchPhrase(text) {
      const key = normalizeLabel(text);
      if (!key) {
        return [];
      }
      return normalized
        .filter((entry) => entry.searchable !== false)
        .filter((entry) =>
          (entry.labels?.[language] ?? []).some(
            (label) => normalizeLabel(label) === key
          )
        )
        .map((entry) => virtualEntryToCandidate(entry, text));
    },
    getEntity(id) {
      const entry = byId.get(id);
      return entry ? virtualEntryToEntity(entry) : null;
    },
    resolveUrl(entity) {
      return entity?.sourceUrl ?? null;
    },
    linksView: buildVirtualLinksView(normalized),
  };
}

export function buildVirtualLinksView(entries = virtualSourceOverrides) {
  return {
    type: 'virtual-links-view',
    version: 1,
    source: VIRTUAL_SOURCE_KIND,
    entries: normalizeEntries(entries).map((entry) => ({
      id: entry.id,
      conceptId: entry.conceptId ?? entry.id,
      entityId: entry.entityId ?? entry.id,
      kind: entry.kind ?? 'entity',
      sourceStatus: entry.sourceStatus ?? 'local-override',
      upstreamTarget: entry.upstreamTarget ?? null,
      sourceUrl: entry.sourceUrl ?? null,
      labels: cloneObject(entry.labels ?? {}),
      primary: cloneObject(entry.primary ?? {}),
      forms: cloneObject(entry.forms ?? {}),
    })),
  };
}

export function renderVirtualLinksNotation(view) {
  const entries = view?.entries ?? [];
  return [
    `(virtual-links-view: source ${toLino(view?.source ?? VIRTUAL_SOURCE_KIND)} version ${view?.version ?? 1})`,
    ...entries.map(
      (entry) =>
        `(${toLino(entry.id)}: kind ${toLino(entry.kind)} concept ${toLino(entry.conceptId)} entity ${toLino(entry.entityId)} status ${toLino(entry.sourceStatus)} upstream ${toLino(entry.upstreamTarget ?? 'none')} url ${toLino(entry.sourceUrl ?? 'none')})`
    ),
  ].join('\n');
}

export function virtualEntryToConcept(entry) {
  return {
    id: entry.conceptId ?? entry.entityId ?? entry.id,
    url: entry.sourceUrl ?? entry.url ?? null,
    source: entry.source ?? VIRTUAL_SOURCE_KIND,
    entityId: entry.entityId ?? entry.id,
    description: entry.description ?? null,
    sourceStatus: entry.sourceStatus ?? 'local-override',
    upstreamTarget: entry.upstreamTarget ?? null,
    derivation: entry.derivation ?? null,
    labels: cloneObject(entry.labels ?? {}),
    primary: cloneObject(entry.primary ?? {}),
    forms: cloneObject(entry.forms ?? {}),
  };
}

function virtualEntryToCandidate(entry, matchText) {
  return {
    id: entry.entityId ?? entry.id,
    label: primaryLabel(entry, matchText),
    description: entry.description ?? '',
    kind: entry.kind === 'lexical-sense' ? 'entity' : (entry.kind ?? 'entity'),
    source: VIRTUAL_SOURCE_KIND,
    sourceUrl: entry.sourceUrl ?? null,
    matchText,
    aliases: Object.values(entry.labels ?? {}).flat(),
    sourceStatus: entry.sourceStatus ?? 'local-override',
    upstreamTarget: entry.upstreamTarget ?? null,
  };
}

function virtualEntryToEntity(entry) {
  return {
    id: entry.entityId ?? entry.id,
    label: primaryLabel(entry, entry.id),
    description: entry.description ?? '',
    kind: entry.kind === 'lexical-sense' ? 'entity' : (entry.kind ?? 'entity'),
    source: VIRTUAL_SOURCE_KIND,
    sourceUrl: entry.sourceUrl ?? null,
    score: 0,
    wikipediaUrl: null,
    wikipediaTitle: null,
    contextLabels: [],
    sourceStatus: entry.sourceStatus ?? 'local-override',
    upstreamTarget: entry.upstreamTarget ?? null,
  };
}

function primaryLabel(entry, fallback) {
  return (
    entry.labels?.en?.[0] ??
    Object.values(entry.labels ?? {})
      .flat()
      .find(Boolean) ??
    fallback
  );
}

function normalizeEntries(entries) {
  return (Array.isArray(entries) ? entries : []).filter(
    (entry) => entry?.id && (entry.labels || entry.entityId)
  );
}

function cloneEntry(entry) {
  return {
    ...entry,
    labels: cloneObject(entry.labels ?? {}),
    primary: cloneObject(entry.primary ?? {}),
    forms: cloneObject(entry.forms ?? {}),
  };
}

function cloneObject(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function normalizeLabel(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function toLino(value) {
  return `(${String(value ?? '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()})`;
}
