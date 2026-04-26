const knownPhraseDictionary = Object.freeze({
  'elon musk': Object.freeze({
    id: 'Q317521',
    label: 'Elon Musk',
    description: 'business magnate and investor',
    sourceUrl: 'https://www.wikidata.org/wiki/Q317521',
  }),
  'ada lovelace': Object.freeze({
    id: 'Q7259',
    label: 'Ada Lovelace',
    description: 'English mathematician',
    sourceUrl: 'https://www.wikidata.org/wiki/Q7259',
  }),
  moon: Object.freeze({
    id: 'Q405',
    label: 'Moon',
    description: "Earth's only natural satellite",
    sourceUrl: 'https://www.wikidata.org/wiki/Q405',
  }),
  earth: Object.freeze({
    id: 'Q2',
    label: 'Earth',
    description: 'third planet from the Sun',
    sourceUrl: 'https://www.wikidata.org/wiki/Q2',
  }),
  sun: Object.freeze({
    id: 'Q525',
    label: 'Sun',
    description: 'star at the centre of the Solar System',
    sourceUrl: 'https://www.wikidata.org/wiki/Q525',
  }),
  paris: Object.freeze({
    id: 'Q90',
    label: 'Paris',
    description: 'capital and largest city of France',
    sourceUrl: 'https://www.wikidata.org/wiki/Q90',
  }),
  france: Object.freeze({
    id: 'Q142',
    label: 'France',
    description: 'country in Western Europe',
    sourceUrl: 'https://www.wikidata.org/wiki/Q142',
  }),
  berlin: Object.freeze({
    id: 'Q64',
    label: 'Berlin',
    description: 'capital and largest city of Germany',
    sourceUrl: 'https://www.wikidata.org/wiki/Q64',
  }),
  elon: Object.freeze({
    id: 'Q19672076',
    label: 'Elon',
    description: 'masculine given name',
    sourceUrl: 'https://www.wikidata.org/wiki/Q19672076',
  }),
  musk: Object.freeze({
    id: 'Q102438',
    label: 'musk',
    description: 'class of aromatic substances',
    sourceUrl: 'https://www.wikidata.org/wiki/Q102438',
  }),
  ada: Object.freeze({
    id: 'Q210551',
    label: 'Ada',
    description: 'feminine given name',
    sourceUrl: 'https://www.wikidata.org/wiki/Q210551',
  }),
  lovelace: Object.freeze({
    id: 'Q1872820',
    label: 'Lovelace',
    description: 'family name',
    sourceUrl: 'https://www.wikidata.org/wiki/Q1872820',
  }),
});

const knownPredicateDictionary = Object.freeze({
  orbits: Object.freeze({
    id: 'P397',
    label: 'parent astronomical body',
    sourceUrl: 'https://www.wikidata.org/wiki/Property:P397',
  }),
  orbit: Object.freeze({
    id: 'P397',
    label: 'parent astronomical body',
    sourceUrl: 'https://www.wikidata.org/wiki/Property:P397',
  }),
  'is the capital of': Object.freeze({
    id: 'P36',
    label: 'capital',
    sourceUrl: 'https://www.wikidata.org/wiki/Property:P36',
  }),
  'capital of': Object.freeze({
    id: 'P36',
    label: 'capital',
    sourceUrl: 'https://www.wikidata.org/wiki/Property:P36',
  }),
  'is alive': Object.freeze({
    id: 'P570',
    label: 'date of death (absent for living people)',
    sourceUrl: 'https://www.wikidata.org/wiki/Property:P570',
  }),
  'is dead': Object.freeze({
    id: 'P570',
    label: 'date of death',
    sourceUrl: 'https://www.wikidata.org/wiki/Property:P570',
  }),
});

const stopPhrases = new Set(['the', 'a', 'an', 'of', 'to', 'is', 'are', 'and']);

export function disambiguatePhrases(text, options = {}) {
  const dictionary = {
    entities: { ...knownPhraseDictionary, ...(options.entities ?? {}) },
    predicates: { ...knownPredicateDictionary, ...(options.predicates ?? {}) },
  };
  const normalizedText = normalizeText(text);
  const tokens = normalizedText.split(' ').filter(Boolean);
  const maxNgramSize = Math.min(tokens.length, options.maxNgramSize ?? 5);
  const matches = collectLongestMatches(tokens, maxNgramSize, dictionary);
  return {
    text,
    tokens,
    matches,
    candidates: buildInterpretationCandidates(matches, dictionary),
  };
}

function collectLongestMatches(tokens, maxNgramSize, dictionary) {
  const matches = [];
  let cursor = 0;
  while (cursor < tokens.length) {
    const match = findLongestMatchAt(tokens, cursor, maxNgramSize, dictionary);
    if (match) {
      matches.push(match);
      cursor += match.tokens.length;
    } else {
      cursor += 1;
    }
  }
  return matches;
}

function findLongestMatchAt(tokens, cursor, maxNgramSize, dictionary) {
  for (let size = maxNgramSize; size >= 1; size -= 1) {
    if (cursor + size > tokens.length) {
      continue;
    }
    const phraseTokens = tokens.slice(cursor, cursor + size);
    const phrase = phraseTokens.join(' ');
    if (size === 1 && stopPhrases.has(phrase)) {
      continue;
    }
    const entity = dictionary.entities[phrase];
    if (entity) {
      return {
        kind: 'entity',
        phrase,
        tokens: phraseTokens,
        position: cursor,
        wikidata: entity,
      };
    }
    const predicate = dictionary.predicates[phrase];
    if (predicate) {
      return {
        kind: 'predicate',
        phrase,
        tokens: phraseTokens,
        position: cursor,
        wikidata: predicate,
      };
    }
  }
  return null;
}

function buildInterpretationCandidates(matches, dictionary) {
  const longestMatch = matches.find(
    (match) => match.kind === 'entity' && match.tokens.length > 1
  );
  if (!longestMatch) {
    return [];
  }

  const subPhraseInterpretation = buildSubPhraseInterpretation(
    longestMatch,
    dictionary
  );
  if (!subPhraseInterpretation) {
    return [];
  }
  return [subPhraseInterpretation];
}

function buildSubPhraseInterpretation(longestMatch, dictionary) {
  const subEntities = longestMatch.tokens
    .map((token) => dictionary.entities[token])
    .filter(Boolean);
  if (subEntities.length < 2) {
    return null;
  }
  return {
    kind: 'sub-phrase-disambiguation',
    paraphrase: `Treat "${longestMatch.phrase}" as the separate Wikidata entities ${subEntities
      .map((entity) => `${entity.id} ${entity.label}`)
      .join(' + ')}.`,
    examples: [
      `${longestMatch.phrase} -> ${subEntities
        .map((entity) => entity.id)
        .join(' + ')}`,
    ],
    confidence: 0.4,
    source: 'longest-match-disambiguation',
    formalizationLevel: 2,
    metadata: {
      longestMatch: {
        phrase: longestMatch.phrase,
        wikidataId: longestMatch.wikidata.id,
        sourceUrl: longestMatch.wikidata.sourceUrl,
      },
      subEntities: subEntities.map((entity) => ({
        id: entity.id,
        label: entity.label,
        sourceUrl: entity.sourceUrl,
      })),
    },
  };
}

export function describeDisambiguation(text) {
  const result = disambiguatePhrases(text);
  return result.matches.map((match) => ({
    phrase: match.phrase,
    role:
      match.kind === 'predicate'
        ? `verb phrase (${match.tokens.length}-gram)`
        : `noun phrase (${match.tokens.length}-gram)`,
    wikidataId: match.wikidata.id,
    label: match.wikidata.label,
    sourceUrl: match.wikidata.sourceUrl,
    text: `${match.phrase} -> ${match.wikidata.id}`,
  }));
}

function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
