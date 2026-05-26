const wikidataEntityBaseUrl = 'https://www.wikidata.org/wiki/';
const wikidataPropertyBaseUrl = 'https://www.wikidata.org/wiki/Property:';

export function buildLinksNetwork(
  text,
  phrases,
  contexts,
  linguisticMetadata = null,
  providerCandidates = null
) {
  const inputId = 'formalize-input-1';
  const links = [
    {
      id: inputId,
      role: 'input',
      references: [],
      value: { text },
      provenance: { sourceType: 'algorithm', method: 'formalize' },
    },
  ];
  phrases.forEach((phrase, index) => {
    links.push(buildPhraseLink(phrase, index, inputId));
  });
  contexts.all.forEach((context, index) => {
    links.push(buildContextLink(context, index, inputId));
  });
  const fragmentLinkIds = new Map();
  (linguisticMetadata?.fragments ?? []).forEach((fragment, index) => {
    const link = buildLinguisticFragmentLink(fragment, index, inputId);
    fragmentLinkIds.set(fragment.id, link.id);
    links.push(link);
  });
  (linguisticMetadata?.dependencies ?? []).forEach((dependency, index) => {
    links.push(
      buildLinguisticDependencyLink(dependency, index, inputId, fragmentLinkIds)
    );
  });
  (linguisticMetadata?.relations ?? []).forEach((relation, index) => {
    links.push(
      buildLinguisticRelationLink(relation, index, inputId, fragmentLinkIds)
    );
  });
  appendProviderCandidateLinks(links, providerCandidates, inputId);
  return {
    id: 'formalize-links-network',
    kind: 'links-network',
    version: 1,
    beliefSystem: {
      id: 'formalize-default',
      name: 'Formalize prototype',
      probabilityStrategy: 'frequency-weighted-context',
      sourceWeights: {
        wikidata: 1,
        wordnet: 0.7,
        fandom: 0.6,
        lexical: 0.5,
        algorithm: 0.5,
        'formalization-provider': 0.4,
        'nlp-provider': 0.4,
      },
    },
    links,
  };
}

function buildPhraseLink(phrase, index, inputId) {
  const entity = phrase.entity ?? null;
  return {
    id: `formalize-phrase-${index + 1}`,
    role: 'phrase',
    references: [inputId],
    value: phraseLinkValue(phrase, entity),
    provenance: phraseLinkProvenance(entity),
  };
}

function phraseLinkValue(phrase, entity) {
  return {
    text: phrase.text,
    position: phrase.start,
    size: phrase.size,
    wikidataId: entity?.id ?? null,
    wikidataLabel: entity?.label ?? null,
    wikidataKind: entity?.kind ?? null,
    wikipediaUrl: entity?.wikipediaUrl ?? null,
    source: entity?.source ?? null,
  };
}

function phraseLinkProvenance(entity) {
  if (!entity) {
    return { sourceType: 'algorithm', sourceUrl: null };
  }
  return {
    sourceType: entity.source ?? 'algorithm',
    sourceUrl: entity.sourceUrl ?? wikidataPageUrl(entity),
  };
}

function buildContextLink(context, index, inputId) {
  return {
    id: `formalize-context-${index + 1}`,
    role: 'context',
    references: [inputId],
    value: {
      wikidataId: context.id,
      property: context.property,
      propertyLabel: context.propertyLabel,
      weight: context.weight,
      probability: context.probability,
    },
    provenance: {
      sourceType: 'wikidata',
      sourceUrl: `${wikidataEntityBaseUrl}${context.id}`,
    },
  };
}

function buildLinguisticFragmentLink(fragment, index, inputId) {
  return {
    id: `formalize-linguistic-fragment-${index + 1}`,
    role: 'linguistic-fragment',
    references: [
      inputId,
      ...(fragment.phraseIds ?? []).map(phraseLinkIdFromCstId),
    ].filter(Boolean),
    value: {
      fragmentId: fragment.id,
      type: fragment.type,
      role: fragment.role,
      text: fragment.text,
      tokenStart: fragment.tokenStart,
      tokenEnd: fragment.tokenEnd,
      sourceStart: fragment.sourceStart,
      sourceEnd: fragment.sourceEnd,
      phraseIds: fragment.phraseIds ?? [],
      version: fragment.version ?? 1,
      provenance: fragment.provenance ?? null,
    },
    provenance: {
      sourceType: fragment.provenance?.sourceType ?? 'algorithm',
      method: fragment.provenance?.method ?? 'linguistic-metadata',
    },
  };
}

function buildLinguisticDependencyLink(
  dependency,
  index,
  inputId,
  fragmentLinkIds
) {
  return {
    id: `formalize-linguistic-dependency-${index + 1}`,
    role: 'linguistic-dependency',
    references: [
      inputId,
      fragmentLinkIds.get(dependency.headFragmentId),
      fragmentLinkIds.get(dependency.dependentFragmentId),
    ].filter(Boolean),
    value: { ...dependency },
    provenance: {
      sourceType: 'algorithm',
      method: dependency.source ?? 'linguistic-metadata',
    },
  };
}

function buildLinguisticRelationLink(
  relation,
  index,
  inputId,
  fragmentLinkIds
) {
  return {
    id: `formalize-linguistic-relation-${index + 1}`,
    role: 'linguistic-relation',
    references: [
      inputId,
      fragmentLinkIds.get(relation.subjectFragmentId),
      fragmentLinkIds.get(relation.predicateFragmentId),
      relation.objectFragmentId
        ? fragmentLinkIds.get(relation.objectFragmentId)
        : null,
    ].filter(Boolean),
    value: { ...relation },
    provenance: {
      sourceType: relation.provenance?.sourceType ?? 'algorithm',
      method: relation.provenance?.method ?? 'linguistic-metadata',
    },
  };
}

function appendProviderCandidateLinks(links, providerCandidates, inputId) {
  if (!providerCandidates?.providers?.length) {
    return;
  }
  const providerLinkIds = new Map();
  providerCandidates.providers.forEach((provider, index) => {
    const link = buildProviderCandidateBundleLink(provider, index, inputId);
    providerLinkIds.set(provider.id, link.id);
    links.push(link);
  });
  appendProviderRecords(
    links,
    providerCandidates.triples,
    'provider-candidate-triple',
    'triple',
    inputId,
    providerLinkIds
  );
  appendProviderRecords(
    links,
    providerCandidates.roles,
    'provider-candidate-role',
    'semantic-role-frame',
    inputId,
    providerLinkIds
  );
  appendProviderRecords(
    links,
    providerCandidates.entityLinks,
    'provider-candidate-entity-link',
    'entity-link',
    inputId,
    providerLinkIds
  );
  appendProviderRecords(
    links,
    providerCandidates.graphs,
    'provider-candidate-graph',
    'semantic-graph',
    inputId,
    providerLinkIds
  );
}

function buildProviderCandidateBundleLink(provider, index, inputId) {
  return {
    id: `formalize-provider-candidate-bundle-${index + 1}`,
    role: 'provider-candidate-bundle',
    references: [inputId],
    value: {
      providerId: provider.id,
      name: provider.name,
      kind: provider.kind,
      status: provider.status,
      confidence: provider.confidence,
      candidateCounts: provider.candidateCounts,
      truthScoring: provider.truthScoring,
    },
    provenance: providerLinkProvenance(provider),
  };
}

function appendProviderRecords(
  links,
  records,
  role,
  kind,
  inputId,
  providerLinkIds
) {
  (records ?? []).forEach((record, index) => {
    links.push({
      id: `formalize-${role}-${index + 1}`,
      role,
      references: [
        inputId,
        providerLinkIds.get(record.providerId) ?? null,
      ].filter(Boolean),
      value: {
        kind,
        ...record,
      },
      provenance: providerLinkProvenance(record),
    });
  });
}

function providerLinkProvenance(record) {
  const provenance = record.provenance ?? {};
  return {
    sourceType: provenance.sourceType ?? 'formalization-provider',
    method: provenance.method ?? record.kind ?? 'provider',
    sourceUrl: provenance.sourceUrl ?? record.sourceUrl ?? null,
    retrievedAt: provenance.retrievedAt ?? record.retrievedAt ?? null,
    providerId: provenance.providerId ?? record.providerId ?? record.id ?? null,
    providerVersion: provenance.providerVersion ?? record.version ?? null,
  };
}

function phraseLinkIdFromCstId(phraseId) {
  const match = /^phrase-(\d+)$/.exec(String(phraseId ?? ''));
  return match ? `formalize-phrase-${match[1]}` : null;
}

function wikidataPageUrl(entity) {
  if (entity.kind === 'property') {
    return `${wikidataPropertyBaseUrl}${entity.id}`;
  }
  return `${wikidataEntityBaseUrl}${entity.id}`;
}
