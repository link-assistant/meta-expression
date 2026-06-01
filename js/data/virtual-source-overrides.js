export const virtualSourceOverrides = Object.freeze([
  {
    id: 'Q99',
    conceptId: 'Q99',
    entityId: 'Q99',
    kind: 'entity',
    source: 'wikidata',
    sourceStatus: 'wikidata-target-supplement',
    upstreamTarget: 'wikidata',
    sourceUrl: 'https://www.wikidata.org/wiki/Q99',
    description: 'state of the United States of America',
    labels: {
      en: ['California'],
      ru: ['Калифорния'],
    },
    primary: {
      ru: 'Калифорния',
    },
  },
  {
    id: 'Q35657',
    conceptId: 'Q35657',
    entityId: 'Q35657',
    kind: 'entity',
    source: 'wikidata',
    sourceStatus: 'wikidata-target-supplement',
    upstreamTarget: 'wikidata',
    sourceUrl: 'https://www.wikidata.org/wiki/Q35657',
    description: 'state of the United States',
    labels: {
      en: ['state', 'U.S. state', 'US state'],
      ru: ['штат'],
    },
    primary: {
      ru: 'штат',
    },
  },
  {
    id: 'lex:en:lie_on',
    conceptId: 'lex:en:lie_on->ru',
    entityId: 'lex:en:lie_on',
    kind: 'lexical-sense',
    source: 'dictionary',
    sourceStatus: 'external-source',
    upstreamTarget: 'wiktionary',
    sourceUrl:
      'https://www.oxfordlearnersdictionaries.com/definition/english/lie_1',
    description:
      'geographic sense of lie + adverb/preposition: to be located in a particular place',
    labels: {
      en: ['lie on', 'lies on', 'lying on'],
      ru: ['расположен на'],
    },
    primary: {
      ru: 'расположен на',
    },
    forms: {
      ru: {
        objectCase: 'prepositional',
      },
    },
  },
  {
    id: 'lex:en:that_relative',
    conceptId: 'lex:en:that_relative->ru',
    entityId: 'lex:en:that_relative',
    kind: 'lexical-sense',
    source: 'rule-derived',
    sourceStatus: 'grammar-rule',
    upstreamTarget: 'wiktionary',
    searchable: false,
    sourceUrl: 'https://en.wiktionary.org/wiki/that',
    description: 'relative-clause pronoun used before a Russian predicate',
    derivation: {
      strategy: 'relative-clause-naturalization',
      source: 'issue-131-california-sentence',
    },
    labels: {
      en: ['that'],
      ru: ['который'],
    },
    primary: {
      ru: 'который',
    },
  },
  {
    id: 'Q12612',
    conceptId: 'Q12612',
    entityId: 'Q12612',
    kind: 'entity',
    source: 'wikidata',
    sourceStatus: 'wikidata-target-supplement',
    upstreamTarget: 'wikidata',
    sourceUrl: 'https://www.wikidata.org/wiki/Q12612',
    description: 'region of the United States',
    labels: {
      en: ['Western United States', 'western United States'],
      ru: ['Запад США'],
    },
    primary: {
      ru: 'Запад США',
    },
    forms: {
      ru: {
        locative: {
          text: 'западе США',
        },
        locativePreposition: {
          text: 'на',
          linked: false,
        },
      },
    },
  },
  {
    id: 'Q430265',
    conceptId: 'Q430265',
    entityId: 'Q430265',
    kind: 'entity',
    source: 'wikidata',
    sourceStatus: 'wikidata-target-supplement',
    upstreamTarget: 'wikidata',
    sourceUrl: 'https://www.wikidata.org/wiki/Q430265',
    description: 'coastline bordering the Pacific Ocean',
    labels: {
      en: ['Pacific Coast', 'Pacific coast', 'pacific coast'],
      ru: ['Тихоокеанское побережье'],
    },
    primary: {
      ru: 'Тихоокеанское побережье',
    },
    forms: {
      ru: {
        prepositional: {
          text: 'Тихоокеанском побережье',
        },
      },
    },
  },
]);
