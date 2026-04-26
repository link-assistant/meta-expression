const wikidataApiUrl = 'https://www.wikidata.org/w/api.php';
const wikidataPropertyBaseUrl = 'https://www.wikidata.org/wiki/Property:';
const wikipediaSummaryBaseUrl =
  'https://en.wikipedia.org/api/rest_v1/page/summary/';
const defaultEvidenceCacheTtlMs = 60 * 60 * 1000;
const maxOrbitParentDepth = 6;
const astronomyEntitySearchOptions = Object.freeze({
  preferredDescriptionTerms: Object.freeze([
    'astronomical',
    'celestial',
    'planet',
    'star',
    'natural satellite',
    'moon',
    'solar system',
  ]),
  disfavoredDescriptionTerms: Object.freeze([
    'family name',
    'given name',
    'surname',
    'company',
    'software',
    'ship',
    'video game',
    'mythology',
    'newspaper',
  ]),
});

export function createWikimediaEvidenceClient(options = {}) {
  const cache = options.cache ?? new Map();
  const clientOptions = { ...options, cache };

  return {
    cache,
    async resolveEvidence(input, overrideOptions = {}) {
      return await resolveLiveEvidence(input, {
        ...clientOptions,
        ...overrideOptions,
        cache,
      });
    },
  };
}

export async function resolveLiveEvidence(input, options = {}) {
  const text = normalizeInput(input);
  const query = createEvidenceQuery(text);
  if (!query) {
    return [];
  }

  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (typeof fetchImpl !== 'function') {
    throw new Error(
      'Live evidence resolution requires a fetch implementation.'
    );
  }

  const request = {
    fetchImpl,
    cache: options.cache ?? new Map(),
    cacheTtlMs: options.cacheTtlMs ?? defaultEvidenceCacheTtlMs,
    now: options.now ?? Date.now,
  };
  return await resolveEvidenceQuery(query, request);
}

function createEvidenceQuery(text) {
  const normalized = normalizeKey(text);
  const liveness = text.match(/^(.+?)\s+is\s+(alive|dead)\s*\.?$/i);
  if (liveness) {
    return {
      kind: 'person-liveness',
      normalized,
      originalText: text,
      subjectLabel: cleanEntityLabel(liveness[1]),
      desiredState: liveness[2].toLowerCase(),
      property: 'P570',
      negated: false,
    };
  }

  const capitalNegated = text.match(
    /^(.+?)\s+is\s+not\s+(?:the\s+)?capital\s+of\s+(.+?)\s*\.?$/i
  );
  if (capitalNegated) {
    return {
      kind: 'capital',
      normalized,
      originalText: text,
      subjectLabel: cleanEntityLabel(capitalNegated[1]),
      objectLabel: cleanEntityLabel(capitalNegated[2]),
      property: 'P36',
      negated: true,
    };
  }

  const capital = text.match(
    /^(.+?)\s+is\s+(?:the\s+)?capital\s+of\s+(.+?)\s*\.?$/i
  );
  if (capital) {
    return {
      kind: 'capital',
      normalized,
      originalText: text,
      subjectLabel: cleanEntityLabel(capital[1]),
      objectLabel: cleanEntityLabel(capital[2]),
      property: 'P36',
      negated: false,
    };
  }

  const orbitNegated = text.match(
    /^(.+?)\s+(?:does\s+not\s+orbit|do\s+not\s+orbit|doesn't\s+orbit)\s+(.+?)\s*\.?$/i
  );
  if (orbitNegated) {
    return {
      kind: 'orbit',
      normalized,
      originalText: text,
      subjectLabel: cleanEntityLabel(orbitNegated[1]),
      objectLabel: cleanEntityLabel(orbitNegated[2]),
      property: 'P397',
      negated: true,
    };
  }

  const orbit = text.match(/^(.+?)\s+orbits?\s+(.+?)\s*\.?$/i);
  if (orbit) {
    return {
      kind: 'orbit',
      normalized,
      originalText: text,
      subjectLabel: cleanEntityLabel(orbit[1]),
      objectLabel: cleanEntityLabel(orbit[2]),
      property: 'P397',
      negated: false,
    };
  }

  return null;
}

async function resolveEvidenceQuery(query, request) {
  if (query.kind === 'person-liveness') {
    return await resolvePersonLivenessEvidence(query, request);
  }
  if (query.kind === 'capital') {
    return await resolveCapitalEvidence(query, request);
  }
  if (query.kind === 'orbit') {
    return await resolveOrbitEvidence(query, request);
  }
  return [];
}

async function resolvePersonLivenessEvidence(query, request) {
  const subject = await searchWikidataEntity(query.subjectLabel, request);
  if (!subject) {
    return [];
  }

  const entity = await fetchWikidataEntity(subject.id, request);
  if (!entity) {
    return [];
  }

  const summary = await fetchWikipediaSummary(entity, request);
  const deathValues = getClaimValues(entity, query.property);
  const hasDeathDate = deathValues.length > 0;
  const wantsDead = query.desiredState === 'dead';
  const polarity = hasDeathDate === wantsDead ? 'support' : 'refute';
  const weight = hasDeathDate ? 1 : 0.8;
  const dateValue = deathValues[0]?.time ?? null;
  const label = getEntityLabel(entity, query.subjectLabel);

  return [
    createLiveEvidence(query, {
      polarity,
      weight,
      sourceUrl: wikidataEntityUrl(subject.id, query.property),
      claim: hasDeathDate
        ? `Wikidata ${subject.id} identifies ${label} with date of death ${dateValue}.`
        : `Wikidata ${subject.id} identifies ${label} and has no date of death (${query.property}) statement in the retrieved entity data.`,
      identifiers: {
        subject: subject.id,
        property: query.property,
        object: hasDeathDate ? 'date-of-death-present' : 'missing',
      },
      context: createEvidenceContext(entity, summary),
      retrievedAt: retrievalTimestamp(request),
    }),
  ];
}

async function resolveCapitalEvidence(query, request) {
  const [capital, country] = await Promise.all([
    searchWikidataEntity(query.subjectLabel, request),
    searchWikidataEntity(query.objectLabel, request),
  ]);
  if (!capital || !country) {
    return [];
  }

  const countryEntity = await fetchWikidataEntity(country.id, request);
  if (!countryEntity) {
    return [];
  }

  const summary = await fetchWikipediaSummary(countryEntity, request);
  const capitalIds = getClaimEntityIds(countryEntity, query.property);
  const claimSupportsBaseStatement = capitalIds.includes(capital.id);
  const supports = query.negated
    ? !claimSupportsBaseStatement
    : claimSupportsBaseStatement;
  const countryLabel = getEntityLabel(countryEntity, query.objectLabel);

  return [
    createLiveEvidence(query, {
      polarity: supports ? 'support' : 'refute',
      weight: 1,
      sourceUrl: wikidataEntityUrl(country.id, query.property),
      claim: claimSupportsBaseStatement
        ? `Wikidata ${country.id} lists ${capital.id} as the capital (${query.property}) of ${countryLabel}.`
        : `Wikidata ${country.id} does not list ${capital.id} as the capital (${query.property}) of ${countryLabel} in the retrieved entity data.`,
      identifiers: {
        subject: country.id,
        property: query.property,
        object: capital.id,
      },
      context: createEvidenceContext(countryEntity, summary),
      retrievedAt: retrievalTimestamp(request),
    }),
  ];
}

async function resolveOrbitEvidence(query, request) {
  const [subject, object] = await Promise.all([
    searchWikidataEntity(query.subjectLabel, request, {
      searchOptions: astronomyEntitySearchOptions,
    }),
    searchWikidataEntity(query.objectLabel, request, {
      searchOptions: astronomyEntitySearchOptions,
    }),
  ]);
  if (!subject || !object) {
    return [];
  }

  const [subjectEntity, objectEntity] = await Promise.all([
    fetchWikidataEntity(subject.id, request),
    fetchWikidataEntity(object.id, request),
  ]);
  if (!subjectEntity || !objectEntity) {
    return [];
  }

  const summary = await fetchWikipediaSummary(subjectEntity, request);
  const orbitPath = await findClaimPathToTarget(
    subjectEntity,
    object.id,
    query.property,
    request
  );
  const directParentIds = getClaimEntityIds(subjectEntity, query.property);
  const claimSupportsBaseStatement = orbitPath !== null;
  const supports = query.negated
    ? !claimSupportsBaseStatement
    : claimSupportsBaseStatement;
  const subjectLabel = getEntityLabel(subjectEntity, query.subjectLabel);
  const objectLabel = getEntityLabel(objectEntity, query.objectLabel);
  const phraseMappings = createPhraseMappings(query, {
    subject,
    object,
    propertyLabel: 'parent astronomical body',
  });
  const reasoningSteps = orbitPath
    ? createOrbitReasoningSteps(orbitPath, query.property)
    : createDirectClaimReasoningSteps(
        subjectEntity,
        directParentIds,
        query.property
      );

  return [
    createLiveEvidence(query, {
      polarity: supports ? 'support' : 'refute',
      weight: 1,
      sourceUrl: wikidataEntityUrl(subject.id, query.property),
      claim: claimSupportsBaseStatement
        ? createOrbitSupportClaim(
            orbitPath,
            query.property,
            subjectLabel,
            objectLabel
          )
        : `Wikidata ${subject.id} does not connect ${subjectLabel} to ${object.id} ${objectLabel} through parent astronomical body (${query.property}) statements in the retrieved entity data.`,
      identifiers: {
        subject: subject.id,
        property: query.property,
        object: object.id,
        path: orbitPath
          ? createClaimPathIdentifier(orbitPath, query.property)
          : '',
      },
      context: createEvidenceContext(subjectEntity, summary, {
        phraseMappings,
        reasoningSteps,
        orbitPath: orbitPath?.map((entity) => ({
          id: entity.id,
          label: getEntityLabel(entity, entity.id),
        })),
      }),
      retrievedAt: retrievalTimestamp(request),
    }),
  ];
}

async function findClaimPathToTarget(startEntity, targetId, property, request) {
  const visited = new Set([startEntity.id]);
  let frontier = [[startEntity]];

  for (let depth = 0; depth < maxOrbitParentDepth; depth += 1) {
    const nextFrontier = [];

    for (const path of frontier) {
      const current = path.at(-1);
      const parentIds = getClaimEntityIds(current, property);

      for (const parentId of parentIds) {
        const parentEntity = await fetchWikidataEntity(parentId, request);
        if (!parentEntity) {
          continue;
        }

        const nextPath = [...path, parentEntity];
        if (parentId === targetId) {
          return nextPath;
        }

        if (!visited.has(parentId)) {
          visited.add(parentId);
          nextFrontier.push(nextPath);
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.length === 0) {
      break;
    }
  }

  return null;
}

function createOrbitSupportClaim(path, property, subjectLabel, objectLabel) {
  if (path.length === 2) {
    return `Wikidata ${path[0].id} lists ${path[1].id} as the parent astronomical body (${property}) of ${subjectLabel}.`;
  }

  const chain = path
    .map((entity) => `${entity.id} ${getEntityLabel(entity, entity.id)}`)
    .join(' -> ');
  return `Wikidata parent astronomical body (${property}) statements connect ${subjectLabel} to ${objectLabel}: ${chain}.`;
}

function createPhraseMappings(query, values) {
  return [
    {
      text: `${query.subjectLabel} -> ${values.subject.id}`,
      phrase: query.subjectLabel,
      role: 'subject noun phrase',
      wikidataId: values.subject.id,
      sourceUrl: wikidataEntityUrl(values.subject.id),
    },
    {
      text: `orbits -> ${query.property}`,
      phrase: 'orbits',
      role: 'verb phrase',
      wikidataId: query.property,
      sourceUrl: wikidataPropertyUrl(query.property),
      label: values.propertyLabel,
    },
    {
      text: `${query.objectLabel} -> ${values.object.id}`,
      phrase: query.objectLabel,
      role: 'object noun phrase',
      wikidataId: values.object.id,
      sourceUrl: wikidataEntityUrl(values.object.id),
    },
  ];
}

function createOrbitReasoningSteps(path, property) {
  const steps = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const subject = path[index];
    const object = path[index + 1];
    steps.push({
      text: `${subject.id} ${getEntityLabel(
        subject,
        subject.id
      )} -> ${property} -> ${object.id} ${getEntityLabel(object, object.id)}`,
      sourceUrl: wikidataEntityUrl(subject.id, property),
    });
  }
  return steps;
}

function createDirectClaimReasoningSteps(entity, objectIds, property) {
  const label = getEntityLabel(entity, entity.id);
  if (objectIds.length === 0) {
    return [
      {
        text: `${entity.id} ${label} has no retrieved ${property} values`,
        sourceUrl: wikidataEntityUrl(entity.id, property),
      },
    ];
  }

  return objectIds.map((objectId) => ({
    text: `${entity.id} ${label} -> ${property} -> ${objectId}`,
    sourceUrl: wikidataEntityUrl(entity.id, property),
  }));
}

function createClaimPathIdentifier(path, property) {
  return path
    .flatMap((entity, index) =>
      index === path.length - 1 ? [entity.id] : [entity.id, property]
    )
    .join('>');
}

function createLiveEvidence(query, evidence) {
  return {
    id: `live-${safeReference(query.kind)}-${safeReference(query.normalized)}`,
    key: query.normalized,
    sourceType: 'wikidata',
    ...evidence,
  };
}

async function searchWikidataEntity(label, request, options = {}) {
  const url = new URL(wikidataApiUrl);
  url.search = new URLSearchParams({
    action: 'wbsearchentities',
    format: 'json',
    language: 'en',
    origin: '*',
    type: 'item',
    limit: String(options.limit ?? 20),
    search: label,
  }).toString();
  const payload = await fetchJson(url, request);
  const result = chooseBestSearchResult(
    label,
    payload.search ?? [],
    options.searchOptions
  );
  return result?.id ? { id: result.id, label: result.label ?? label } : null;
}

function chooseBestSearchResult(label, results, searchOptions = {}) {
  if (results.length === 0) {
    return null;
  }

  return results
    .map((result, index) => ({
      result,
      index,
      score: scoreSearchResult(label, result, searchOptions),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .at(0).result;
}

function scoreSearchResult(label, result, searchOptions) {
  const normalizedLabel = normalizeSearchLabel(label);
  const normalizedResultLabel = normalizeSearchLabel(result.label);
  const normalizedDescription = normalizeSearchLabel(result.description);
  let score = 0;

  if (normalizedResultLabel === normalizedLabel) {
    score += 20;
  } else if (normalizedResultLabel.includes(normalizedLabel)) {
    score += 4;
  }

  const normalizedMatch = normalizeSearchLabel(result.match?.text);
  if (normalizedMatch === normalizedLabel) {
    score += 5;
  }

  for (const term of searchOptions.preferredDescriptionTerms ?? []) {
    if (normalizedDescription.includes(normalizeSearchLabel(term))) {
      score += 10;
    }
  }

  for (const term of searchOptions.disfavoredDescriptionTerms ?? []) {
    if (normalizedDescription.includes(normalizeSearchLabel(term))) {
      score -= 15;
    }
  }

  return score;
}

function normalizeSearchLabel(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

async function fetchWikidataEntity(id, request) {
  const url = new URL(wikidataApiUrl);
  url.search = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    ids: id,
    languages: 'en',
    origin: '*',
    props: 'labels|descriptions|claims|sitelinks',
    sitefilter: 'enwiki',
  }).toString();
  const payload = await fetchJson(url, request);
  const entity = payload.entities?.[id];
  return entity && !entity.missing ? entity : null;
}

async function fetchWikipediaSummary(entity, request) {
  const title = entity.sitelinks?.enwiki?.title;
  if (!title) {
    return null;
  }

  const url = new URL(encodeURIComponent(title), wikipediaSummaryBaseUrl);
  try {
    return await fetchJson(url, request);
  } catch {
    return null;
  }
}

async function fetchJson(url, request) {
  const key = String(url);
  const now = Number(request.now());
  const cached = request.cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const response = await request.fetchImpl(key, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Wikimedia request failed with status ${response.status}.`);
  }

  const value = await response.json();
  request.cache.set(key, {
    expiresAt: now + request.cacheTtlMs,
    value,
  });
  return value;
}

function getClaimValues(entity, property) {
  return (entity.claims?.[property] ?? [])
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .filter(Boolean);
}

function getClaimEntityIds(entity, property) {
  return getClaimValues(entity, property)
    .map((value) => value.id ?? wikidataIdFromNumericValue(value))
    .filter(Boolean);
}

function wikidataIdFromNumericValue(value) {
  return value['numeric-id'] ? `Q${value['numeric-id']}` : null;
}

function createEvidenceContext(entity, summary, extra = {}) {
  return {
    wikidataEntityUrl: wikidataEntityUrl(entity.id),
    wikipediaSummaryUrl: summary?.content_urls?.desktop?.page ?? null,
    wikipediaTitle: summary?.title ?? entity.sitelinks?.enwiki?.title ?? null,
    wikipediaExtract: summary?.extract ?? null,
    ...extra,
  };
}

function wikidataEntityUrl(id, property) {
  return property
    ? `https://www.wikidata.org/wiki/${id}#${property}`
    : `https://www.wikidata.org/wiki/${id}`;
}

function wikidataPropertyUrl(id) {
  return `${wikidataPropertyBaseUrl}${id}`;
}

function getEntityLabel(entity, fallback) {
  return entity.labels?.en?.value ?? fallback;
}

function cleanEntityLabel(value) {
  return normalizeInput(value)
    .replace(/^the\s+/i, '')
    .replace(/\.$/, '');
}

function retrievalTimestamp(request) {
  return new Date(Number(request.now())).toISOString();
}

function normalizeInput(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Statement input must be a string.');
  }
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) {
    throw new Error('Statement input cannot be empty.');
  }
  return text;
}

function normalizeKey(input) {
  return normalizeInput(input)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function safeReference(value) {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'value'
  );
}
