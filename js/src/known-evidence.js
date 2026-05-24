export const knownEvidence = [
  {
    key: 'earth orbits the sun',
    polarity: 'support',
    weight: 1,
    sourceType: 'wikidata',
    situation: 'wikidata-structured-claim',
    sourceUrl: 'https://www.wikidata.org/wiki/Q2#P397',
    retrievedAt: '2026-04-26',
    claim:
      'Wikidata Q2 Earth has parent astronomical body P397 with value Q525 Sun.',
    identifiers: {
      subject: 'Q2',
      property: 'P397',
      object: 'Q525',
    },
  },
  {
    key: 'moon orbits the sun',
    polarity: 'support',
    weight: 1,
    sourceType: 'wikidata',
    situation: 'wikidata-structured-claim',
    sourceUrl: 'https://www.wikidata.org/wiki/Q405#P397',
    retrievedAt: '2026-04-26',
    claim:
      'Wikidata Q405 Moon has parent astronomical body P397 Q2 Earth, and Q2 Earth has parent astronomical body P397 Q525 Sun.',
    identifiers: {
      subject: 'Q405',
      property: 'P397',
      object: 'Q525',
      path: 'Q405>P397>Q2>P397>Q525',
    },
    context: {
      phraseMappings: [
        {
          text: 'Moon -> Q405',
          phrase: 'Moon',
          role: 'subject noun phrase',
          wikidataId: 'Q405',
          sourceUrl: 'https://www.wikidata.org/wiki/Q405',
        },
        {
          text: 'orbits -> P397',
          phrase: 'orbits',
          role: 'verb phrase',
          wikidataId: 'P397',
          sourceUrl: 'https://www.wikidata.org/wiki/Property:P397',
        },
        {
          text: 'Sun -> Q525',
          phrase: 'Sun',
          role: 'object noun phrase',
          wikidataId: 'Q525',
          sourceUrl: 'https://www.wikidata.org/wiki/Q525',
        },
      ],
      reasoningSteps: [
        {
          text: 'Q405 Moon -> P397 -> Q2 Earth',
          sourceUrl: 'https://www.wikidata.org/wiki/Q405#P397',
        },
        {
          text: 'Q2 Earth -> P397 -> Q525 Sun',
          sourceUrl: 'https://www.wikidata.org/wiki/Q2#P397',
        },
      ],
      orbitPath: [
        { id: 'Q405', label: 'Moon' },
        { id: 'Q2', label: 'Earth' },
        { id: 'Q525', label: 'Sun' },
      ],
    },
  },
  {
    key: 'elon musk is alive',
    polarity: 'support',
    weight: 1,
    sourceType: 'wikidata',
    situation: 'wikidata-structured-claim',
    sourceUrl: 'https://www.wikidata.org/wiki/Q317521#P570',
    retrievedAt: '2026-04-26',
    claim:
      'Wikidata Q317521 identifies Elon Musk as a human born in 1971 and does not expose a date of death (P570) statement in the captured entity data.',
    identifiers: {
      subject: 'Q317521',
      property: 'P570',
      object: 'missing',
    },
  },
];

export const knownRealWorldClaims = Object.freeze({
  'earth orbits the sun': Object.freeze({
    interpretationKind: 'wikidata-astronomy-claim',
    paraphrase: 'Earth has the Sun as its parent astronomical body.',
    examples: Object.freeze(['Earth -> parent astronomical body -> Sun']),
    expressionType: 'wikidata-claim',
    wikidata: Object.freeze({
      subject: 'Q2',
      property: 'P397',
      object: 'Q525',
    }),
  }),
  'moon orbits the sun': Object.freeze({
    interpretationKind: 'wikidata-astronomy-chain-claim',
    paraphrase:
      'The Moon reaches the Sun through the parent astronomical body chain Moon -> Earth -> Sun.',
    examples: Object.freeze([
      'Moon -> parent astronomical body -> Earth -> Sun',
    ]),
    expressionType: 'wikidata-claim',
    wikidata: Object.freeze({
      subject: 'Q405',
      property: 'P397',
      object: 'Q525',
      path: Object.freeze(['Q405', 'Q2', 'Q525']),
    }),
  }),
  'elon musk is alive': Object.freeze({
    interpretationKind: 'wikidata-person-liveness-claim',
    paraphrase:
      'Elon Musk is a person whose Wikidata item has no date of death statement in the captured data.',
    examples: Object.freeze(['Elon Musk -> date of death -> missing']),
    expressionType: 'wikidata-person-liveness-claim',
    wikidata: Object.freeze({
      subject: 'Q317521',
      property: 'P570',
      object: 'missing',
    }),
  }),
});
