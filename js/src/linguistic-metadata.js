import {
  buildSourceReconstruction,
  reconstructTextFromSourceReconstruction,
} from './linguistic-reconstruction.js';
import { tokenizeTextWithSpans } from './text-tokenization.js';

export { reconstructTextFromSourceReconstruction } from './linguistic-reconstruction.js';

const englishArticles = new Set(['a', 'an', 'the']);
const englishConjunctions = new Set(['and', 'or', 'but']);
const englishPrepositions = new Set([
  'about',
  'above',
  'after',
  'against',
  'around',
  'as',
  'at',
  'before',
  'behind',
  'below',
  'between',
  'by',
  'for',
  'from',
  'in',
  'into',
  'near',
  'of',
  'on',
  'onto',
  'over',
  'through',
  'to',
  'under',
  'with',
]);
const englishCopulas = new Set([
  'am',
  'is',
  'are',
  'was',
  'were',
  'be',
  'being',
  'been',
]);
const englishVerbLexemes = new Set([
  'add',
  'adds',
  'apply',
  'applies',
  'belong',
  'belongs',
  'check',
  'checks',
  'compare',
  'compares',
  'contain',
  'contains',
  'create',
  'created',
  'creates',
  'discover',
  'discovered',
  'discovers',
  'find',
  'finds',
  'formalize',
  'formalizes',
  'has',
  'have',
  'had',
  'invent',
  'invented',
  'invents',
  'orbit',
  'orbits',
  'own',
  'owned',
  'owns',
  'relate',
  'related',
  'relates',
  'run',
  'runs',
  'search',
  'searches',
  'support',
  'supports',
  'translate',
  'translated',
  'translates',
  'write',
  'writes',
  'wrote',
]);
const englishPronouns = new Map([
  ['i', { person: 1, number: 'singular' }],
  ['me', { person: 1, number: 'singular' }],
  ['we', { person: 1, number: 'plural' }],
  ['us', { person: 1, number: 'plural' }],
  ['you', { person: 2, number: 'unknown' }],
  ['he', { person: 3, number: 'singular', gender: 'masculine' }],
  ['him', { person: 3, number: 'singular', gender: 'masculine' }],
  ['she', { person: 3, number: 'singular', gender: 'feminine' }],
  ['her', { person: 3, number: 'singular', gender: 'feminine' }],
  ['it', { person: 3, number: 'singular', gender: 'neuter' }],
  ['they', { person: 3, number: 'plural' }],
  ['them', { person: 3, number: 'plural' }],
]);
const englishPastVerbLexemes = new Set([
  'was',
  'were',
  'had',
  'created',
  'discovered',
  'invented',
  'owned',
  'related',
  'translated',
  'wrote',
]);
const englishVerbLemmas = new Map([
  ['adds', 'add'],
  ['applies', 'apply'],
  ['belongs', 'belong'],
  ['checks', 'check'],
  ['compares', 'compare'],
  ['contains', 'contain'],
  ['created', 'create'],
  ['creates', 'create'],
  ['discovered', 'discover'],
  ['discovers', 'discover'],
  ['finds', 'find'],
  ['formalizes', 'formalize'],
  ['has', 'have'],
  ['had', 'have'],
  ['invented', 'invent'],
  ['invents', 'invent'],
  ['is', 'be'],
  ['am', 'be'],
  ['are', 'be'],
  ['was', 'be'],
  ['were', 'be'],
  ['being', 'be'],
  ['been', 'be'],
  ['orbits', 'orbit'],
  ['owned', 'own'],
  ['owns', 'own'],
  ['related', 'relate'],
  ['relates', 'relate'],
  ['runs', 'run'],
  ['searches', 'search'],
  ['supports', 'support'],
  ['translated', 'translate'],
  ['translates', 'translate'],
  ['writes', 'write'],
  ['wrote', 'write'],
]);

const linguisticParserId = 'meta-expression-linguistic-parser';
const linguisticParserVersion = 1;
const linguisticParserStrategy = 'deterministic-english-dependency-parser';

/**
 * Extract deterministic parser-backed linguistic metadata.
 *
 * The schema intentionally mirrors the Formal AI issue requirements: source
 * words/symbols, noun and verb phrases, subject/predicate/object fragments,
 * SVO relation records, dependency-like links, and an AST suitable for
 * downstream enrichment.
 *
 * @param {string} input
 * @param {{language?: string, tokenSpans?: Array<object>}} [options]
 * @returns {object}
 */
export function extractLinguisticMetadata(input, options = {}) {
  const text = String(input ?? '');
  const language = normalizeLanguage(options.language);
  const parse = parseLinguisticDocument(text, {
    ...options,
    language,
  });
  const sourceReconstruction = buildSourceReconstruction(
    parse,
    createLinguisticProvenance
  );
  const fragments = [];
  const dependencies = [];
  const relations = [];
  const attachments = [];
  const agreements = [];
  const astSentences = [];
  const wordFragmentIdsByToken = new Map();

  const addFragment = (fragment) => {
    const entry = {
      id: `fragment-${fragments.length + 1}`,
      type: fragment.type,
      role: fragment.role ?? fragment.type,
      text: fragment.text,
      tokens: fragment.tokens ?? [],
      lemma: fragment.lemma ?? null,
      partOfSpeech: fragment.partOfSpeech ?? null,
      features: fragment.features ?? {},
      tokenStart: fragment.tokenStart ?? null,
      tokenEnd: fragment.tokenEnd ?? null,
      sourceStart: fragment.sourceStart ?? null,
      sourceEnd: fragment.sourceEnd ?? null,
      phraseIds: [],
      version: 1,
      provenance: createLinguisticProvenance(
        `fragment:${fragment.role ?? fragment.type}`
      ),
    };
    fragments.push(entry);
    return entry;
  };

  for (const token of parse.tokens) {
    const fragment = addFragment({
      type: 'word',
      role: 'word',
      text: token.text,
      tokens: [token.text],
      lemma: token.lemma,
      partOfSpeech: token.partOfSpeech,
      features: token.features,
      tokenStart: token.index,
      tokenEnd: token.index,
      sourceStart: token.sourceStart,
      sourceEnd: token.sourceEnd,
    });
    wordFragmentIdsByToken.set(token.index, fragment.id);
  }

  for (const symbol of parse.symbols) {
    addFragment({
      type: 'symbol',
      role: 'symbol',
      text: symbol.text,
      partOfSpeech: 'punctuation',
      features: { punctuation: symbol.text },
      sourceStart: symbol.sourceStart,
      sourceEnd: symbol.sourceEnd,
    });
  }

  for (const parsedSentence of parse.sentences) {
    const sentenceMetadata = extractSentenceMetadata({
      text,
      tokenSpans: parse.tokenSpans,
      parsedSentence,
      addFragment,
      dependencies,
      relations,
      attachments,
      agreements,
      wordFragmentIdsByToken,
    });
    astSentences.push(sentenceMetadata);
  }

  const ast = {
    type: 'document',
    version: 1,
    parser: parse.parser,
    provenance: createLinguisticProvenance('ast'),
    text,
    body: astSentences,
  };
  const coreferenceChains = inferCoreferenceChains(fragments);

  return {
    version: 1,
    language,
    parser: parse.parser,
    provenance: createLinguisticProvenance('metadata'),
    text,
    sourceReconstruction,
    fragments,
    dependencies,
    relations,
    attachments,
    agreements,
    coreferenceChains,
    ast,
    cst: buildLinguisticCst(parse, sourceReconstruction),
  };
}

export function reconstructTextFromLinguisticMetadata(metadata) {
  return (
    reconstructTextFromSourceReconstruction(
      metadata?.sourceReconstruction ?? metadata?.cst?.sourceReconstruction
    ) ?? String(metadata?.text ?? '')
  );
}

/**
 * Add CST phrase ids to linguistic fragments and fragment ids/roles to CST
 * phrases. The function mutates phrases so translation can reuse the metadata.
 *
 * @param {object} metadata
 * @param {object[]} phrases
 * @returns {object}
 */
export function annotateLinguisticMetadataPhraseRefs(metadata, phrases) {
  for (const phrase of phrases) {
    phrase.linguisticFragmentIds = [];
    phrase.linguisticRole = null;
  }

  for (const fragment of metadata.fragments ?? []) {
    fragment.phraseIds = [];
    if (!Number.isInteger(fragment.tokenStart)) {
      continue;
    }
    for (const phrase of phrases) {
      if (
        !rangesOverlap(
          phrase.start,
          phrase.end,
          fragment.tokenStart,
          fragment.tokenEnd
        )
      ) {
        continue;
      }
      fragment.phraseIds.push(phrase.id);
      phrase.linguisticFragmentIds.push(fragment.id);
      if (
        isSemanticRole(fragment.role) &&
        phraseInsideFragment(phrase, fragment)
      ) {
        phrase.linguisticRole = fragment.role;
      }
    }
  }
  return metadata;
}

function parseLinguisticDocument(text, options) {
  const language = normalizeLanguage(options.language);
  const parser = createParserDescriptor(language);
  const tokenSpans = normalizeTokenSpans(options.tokenSpans, text);
  const analyzedTokenSpans = tokenSpans.map((span) => ({
    ...span,
    analysis: analyzeToken(span.token, language),
  }));
  const symbols = extractSymbolSpans(text).map((symbol, index) => ({
    type: 'symbol-cst',
    id: `symbol-${index + 1}`,
    version: 1,
    text: symbol.text,
    sourceStart: symbol.start,
    sourceEnd: symbol.end,
    provenance: createLinguisticProvenance('cst-symbol'),
  }));
  const tokens = analyzedTokenSpans.map((span, index) => ({
    ...span.analysis,
    type: 'token-cst',
    id: `token-${index + 1}`,
    version: 1,
    text: span.token,
    index,
    sourceStart: span.start,
    sourceEnd: span.end,
    sentenceBoundaryAfter: span.sentenceBoundaryAfter,
    provenance: createLinguisticProvenance('cst-token'),
  }));
  const sentences = segmentSentences(analyzedTokenSpans, text).map(
    (sentence, index) =>
      parseLinguisticSentence({
        text,
        tokenSpans: analyzedTokenSpans,
        sentence,
        sentenceIndex: index,
      })
  );

  return {
    type: 'document-parse',
    version: 1,
    text,
    language,
    parser,
    tokenSpans: analyzedTokenSpans,
    tokens,
    symbols,
    sentences,
    provenance: createLinguisticProvenance('parse'),
  };
}

function parseLinguisticSentence({
  text,
  tokenSpans,
  sentence,
  sentenceIndex,
}) {
  const { startToken, endToken } = sentence;
  const sourceStart = tokenSpans[startToken]?.start ?? 0;
  const sourceEnd = sentenceEndOffset(text, tokenSpans[endToken]?.end ?? 0);
  const predicateToken = findPredicateIndex(tokenSpans, startToken, endToken);
  const base = {
    type: 'sentence-cst',
    id: `sentence-${sentenceIndex + 1}`,
    version: 1,
    text: text.slice(sourceStart, sourceEnd),
    tokenStart: startToken,
    tokenEnd: endToken,
    sourceStart,
    sourceEnd,
    predicateToken,
    provenance: createLinguisticProvenance('cst-sentence'),
  };

  if (predicateToken === null) {
    const nominalRange = trimNominalRange(tokenSpans, startToken, endToken, {
      stripArticles: false,
    });
    return {
      ...base,
      subjectRange: null,
      predicateRange: null,
      objectPhraseRange: null,
      objectRange: null,
      nounPhraseRanges: [nominalRange].filter(Boolean),
      verbPhraseRange: null,
      dependencies: [],
      relationType: null,
    };
  }

  const subjectRange =
    predicateToken > startToken
      ? trimNominalRange(tokenSpans, startToken, predicateToken - 1, {
          stripArticles: true,
        })
      : null;
  const predicateRange = { start: predicateToken, end: predicateToken };
  const objectPhraseRange =
    predicateToken < endToken
      ? trimNominalRange(tokenSpans, predicateToken + 1, endToken, {
          stripArticles: false,
        })
      : null;
  const objectRange = objectPhraseRange
    ? trimNominalRange(
        tokenSpans,
        objectPhraseRange.start,
        objectPhraseRange.end,
        {
          stripArticles: true,
        }
      )
    : null;
  const dependencies = [];
  if (subjectRange) {
    dependencies.push({
      relation: 'nsubj',
      head: 'predicate',
      dependent: 'subject',
    });
    dependencies.push({
      relation: 'root',
      head: 'predicate',
      dependent: 'predicate',
    });
    if (objectRange) {
      dependencies.push({
        relation: 'obj',
        head: 'predicate',
        dependent: 'object',
      });
    }
  }

  return {
    ...base,
    subjectRange,
    predicateRange,
    objectPhraseRange,
    objectRange,
    nounPhraseRanges: [subjectRange, objectPhraseRange].filter(Boolean),
    verbPhraseRange: predicateRange,
    dependencies,
    relationType: subjectRange
      ? objectRange
        ? 'subject-predicate-object'
        : 'subject-predicate'
      : null,
  };
}

function buildLinguisticCst(parse, sourceReconstruction) {
  return {
    type: 'document-cst',
    version: 1,
    text: parse.text,
    language: parse.language,
    parser: parse.parser,
    sourceReconstruction,
    tokens: parse.tokens,
    symbols: parse.symbols,
    sentences: parse.sentences,
    provenance: createLinguisticProvenance('cst'),
  };
}

function createParserDescriptor(language) {
  return {
    id: linguisticParserId,
    version: linguisticParserVersion,
    language,
    strategy: linguisticParserStrategy,
  };
}

function createLinguisticProvenance(layer) {
  return {
    sourceType: 'algorithm',
    method: linguisticParserId,
    parserId: linguisticParserId,
    parserVersion: linguisticParserVersion,
    layer,
  };
}

function extractSentenceMetadata({
  text,
  tokenSpans,
  parsedSentence,
  addFragment,
  dependencies,
  relations,
  attachments,
  agreements,
  wordFragmentIdsByToken,
}) {
  const dependencyIds = [];
  const attachmentIds = [];
  const agreementIds = [];
  const { subject, predicate, object, relation } = extractSentenceComponents({
    text,
    tokenSpans,
    parsedSentence,
    addFragment,
    dependencies,
    relations,
    attachments,
    agreements,
    dependencyIds,
    attachmentIds,
    agreementIds,
    wordFragmentIdsByToken,
  });
  Object.assign(parsedSentence, {
    subjectFragmentId: subject?.id ?? null,
    predicateFragmentId: predicate?.id ?? null,
    objectFragmentId: object?.id ?? null,
    relationId: relation?.id ?? null,
    dependencyIds: [...dependencyIds],
    attachmentIds: [...attachmentIds],
    agreementIds: [...agreementIds],
  });

  return {
    type: 'sentence',
    id: parsedSentence.id,
    version: 1,
    provenance: createLinguisticProvenance('ast-sentence'),
    text: parsedSentence.text,
    tokenStart: parsedSentence.tokenStart,
    tokenEnd: parsedSentence.tokenEnd,
    sourceStart: parsedSentence.sourceStart,
    sourceEnd: parsedSentence.sourceEnd,
    subject: subject ? fragmentReference(subject) : null,
    predicate: predicate ? fragmentReference(predicate) : null,
    object: object ? fragmentReference(object) : null,
    relationId: relation?.id ?? null,
    dependencyIds,
    attachmentIds,
    agreementIds,
  };
}

function extractSentenceComponents({
  text,
  tokenSpans,
  parsedSentence,
  addFragment,
  dependencies,
  relations,
  attachments,
  agreements,
  dependencyIds,
  attachmentIds,
  agreementIds,
  wordFragmentIdsByToken,
}) {
  if (parsedSentence.predicateToken === null) {
    addNominalSentenceFragment({
      text,
      tokenSpans,
      range: parsedSentence.nounPhraseRanges[0] ?? null,
      addFragment,
    });
    return emptySentenceComponents();
  }
  return extractPredicateSentenceComponents({
    text,
    tokenSpans,
    parsedSentence,
    addFragment,
    dependencies,
    relations,
    attachments,
    agreements,
    dependencyIds,
    attachmentIds,
    agreementIds,
    wordFragmentIdsByToken,
  });
}

function emptySentenceComponents() {
  return {
    subject: null,
    predicate: null,
    object: null,
    relation: null,
  };
}

function addNominalSentenceFragment({ text, tokenSpans, range, addFragment }) {
  if (!range) {
    return;
  }
  addTokenRangeFragment(
    addFragment,
    text,
    tokenSpans,
    'noun-phrase',
    'noun-phrase',
    range
  );
}

function extractPredicateSentenceComponents({
  text,
  tokenSpans,
  parsedSentence,
  addFragment,
  dependencies,
  relations,
  attachments,
  agreements,
  dependencyIds,
  attachmentIds,
  agreementIds,
  wordFragmentIdsByToken,
}) {
  const subject = addSubjectFragment({
    text,
    tokenSpans,
    subjectRange: parsedSentence.subjectRange,
    addFragment,
  });
  const predicate = addPredicateFragment({
    text,
    tokenSpans,
    predicateRange: parsedSentence.predicateRange,
    addFragment,
  });
  const object = addObjectFragment({
    text,
    tokenSpans,
    rawObjectRange: parsedSentence.objectPhraseRange,
    objectRange: parsedSentence.objectRange,
    addFragment,
  });
  const relation = addPredicateDependenciesAndRelation({
    text,
    tokenSpans,
    parsedSentence,
    dependencies,
    relations,
    dependencyIds,
    wordFragmentIdsByToken,
    subject,
    predicate,
    object,
  });
  if (subject) {
    attachmentIds.push(
      addAttachment(attachments, 'noun-phrase-attachment', subject.id, {
        role: 'subject',
        tokenStart: subject.tokenStart,
        tokenEnd: subject.tokenEnd,
      })
    );
  }
  if (predicate) {
    attachmentIds.push(
      addAttachment(attachments, 'verb-phrase-attachment', predicate.id, {
        role: 'predicate',
        tokenStart: predicate.tokenStart,
        tokenEnd: predicate.tokenEnd,
      })
    );
  }
  if (object) {
    attachmentIds.push(
      addAttachment(attachments, 'noun-phrase-attachment', object.id, {
        role: 'object',
        tokenStart: object.tokenStart,
        tokenEnd: object.tokenEnd,
      })
    );
  }
  if (subject && predicate) {
    agreementIds.push(
      addAgreement(
        agreements,
        'subject-predicate-agreement',
        subject,
        predicate
      )
    );
  }
  return { subject, predicate, object, relation };
}

function addSubjectFragment({ text, tokenSpans, subjectRange, addFragment }) {
  if (!subjectRange) {
    return null;
  }
  addTokenRangeFragment(
    addFragment,
    text,
    tokenSpans,
    'noun-phrase',
    'noun-phrase',
    subjectRange
  );
  return addTokenRangeFragment(
    addFragment,
    text,
    tokenSpans,
    'subject',
    'subject',
    subjectRange
  );
}

function addPredicateFragment({
  text,
  tokenSpans,
  predicateRange,
  addFragment,
}) {
  if (!predicateRange) {
    return null;
  }
  addTokenRangeFragment(
    addFragment,
    text,
    tokenSpans,
    'verb-phrase',
    'verb-phrase',
    predicateRange
  );
  return addTokenRangeFragment(
    addFragment,
    text,
    tokenSpans,
    'predicate',
    'predicate',
    predicateRange
  );
}

function addObjectFragment({
  text,
  tokenSpans,
  rawObjectRange,
  objectRange,
  addFragment,
}) {
  if (!rawObjectRange) {
    return null;
  }
  addTokenRangeFragment(
    addFragment,
    text,
    tokenSpans,
    'noun-phrase',
    'noun-phrase',
    rawObjectRange
  );
  if (!objectRange) {
    return null;
  }
  return addTokenRangeFragment(
    addFragment,
    text,
    tokenSpans,
    'object',
    'object',
    objectRange
  );
}

function addPredicateDependenciesAndRelation({
  text,
  tokenSpans,
  parsedSentence,
  dependencies,
  relations,
  dependencyIds,
  wordFragmentIdsByToken,
  subject,
  predicate,
  object,
}) {
  if (!subject || !predicate) {
    return null;
  }
  dependencyIds.push(
    addDependency(dependencies, 'nsubj', predicate.id, subject.id)
  );
  dependencyIds.push(
    addDependency(dependencies, 'root', predicate.id, predicate.id)
  );
  if (object) {
    dependencyIds.push(
      addDependency(dependencies, 'obj', predicate.id, object.id)
    );
  }
  dependencyIds.push(
    ...addTokenDependencyCoverage({
      tokenSpans,
      parsedSentence,
      dependencies,
      wordFragmentIdsByToken,
    })
  );
  return addRelation({
    relations,
    text,
    subject,
    predicate,
    object,
  });
}

function addTokenDependencyCoverage({
  tokenSpans,
  parsedSentence,
  dependencies,
  wordFragmentIdsByToken,
}) {
  const dependencyIds = [];
  const predicateWordId = wordFragmentIdsByToken.get(
    parsedSentence.predicateToken
  );
  if (!predicateWordId) {
    return dependencyIds;
  }
  dependencyIds.push(
    addDependency(dependencies, 'root', predicateWordId, predicateWordId, {
      granularity: 'token',
    })
  );
  dependencyIds.push(
    ...addNominalTokenDependencies({
      tokenSpans,
      dependencies,
      wordFragmentIdsByToken,
      predicateWordId,
      phraseRange: parsedSentence.subjectRange,
      headRelation: 'nsubj',
    })
  );
  dependencyIds.push(
    ...addNominalTokenDependencies({
      tokenSpans,
      dependencies,
      wordFragmentIdsByToken,
      predicateWordId,
      phraseRange: parsedSentence.objectPhraseRange,
      semanticHeadRange: parsedSentence.objectRange,
      headRelation: 'obj',
    })
  );
  return dependencyIds;
}

function addNominalTokenDependencies({
  tokenSpans,
  dependencies,
  wordFragmentIdsByToken,
  predicateWordId,
  phraseRange,
  semanticHeadRange = phraseRange,
  headRelation,
}) {
  if (!phraseRange || !semanticHeadRange) {
    return [];
  }
  const dependencyIds = [];
  const headIndex = headTokenIndexForRange(tokenSpans, semanticHeadRange);
  const headWordId = wordFragmentIdsByToken.get(headIndex);
  if (!headWordId) {
    return dependencyIds;
  }
  dependencyIds.push(
    addDependency(dependencies, headRelation, predicateWordId, headWordId, {
      granularity: 'token',
    })
  );
  for (let index = phraseRange.start; index <= phraseRange.end; index += 1) {
    if (index === headIndex) {
      continue;
    }
    const dependentWordId = wordFragmentIdsByToken.get(index);
    if (!dependentWordId) {
      continue;
    }
    dependencyIds.push(
      addDependency(
        dependencies,
        tokenDependentRelation(tokenSpans[index]?.token),
        headWordId,
        dependentWordId,
        { granularity: 'token' }
      )
    );
  }
  return dependencyIds;
}

function addTokenRangeFragment(
  addFragment,
  text,
  tokenSpans,
  type,
  role,
  range
) {
  const first = tokenSpans[range.start];
  const last = tokenSpans[range.end];
  const head = tokenSpans[headTokenIndexForRange(tokenSpans, range)];
  const analysis = head?.analysis ?? analyzeToken(head?.token, 'en');
  return addFragment({
    type,
    role,
    text: text.slice(first.start, last.end),
    tokens: tokenSpans
      .slice(range.start, range.end + 1)
      .map((span) => span.token),
    lemma: analysis.lemma,
    partOfSpeech: phrasePartOfSpeech(type, analysis.partOfSpeech),
    features: {
      ...analysis.features,
      headToken: head?.token ?? null,
      headTokenIndex: headTokenIndexForRange(tokenSpans, range),
    },
    tokenStart: range.start,
    tokenEnd: range.end,
    sourceStart: first.start,
    sourceEnd: last.end,
  });
}

function addDependency(
  dependencies,
  relation,
  headFragmentId,
  dependentFragmentId,
  details = {}
) {
  const entry = {
    id: `dependency-${dependencies.length + 1}`,
    relation,
    headFragmentId,
    dependentFragmentId,
    source: linguisticParserId,
    version: 1,
    ...details,
    provenance: createLinguisticProvenance(`dependency:${relation}`),
  };
  dependencies.push(entry);
  return entry.id;
}

function addAttachment(attachments, type, fragmentId, details) {
  const entry = {
    id: `attachment-${attachments.length + 1}`,
    type,
    fragmentId,
    version: 1,
    ...details,
    provenance: createLinguisticProvenance(`attachment:${type}`),
  };
  attachments.push(entry);
  return entry.id;
}

function addAgreement(agreements, type, left, right) {
  const entry = {
    id: `agreement-${agreements.length + 1}`,
    type,
    leftFragmentId: left.id,
    rightFragmentId: right.id,
    features: {
      number: agreementValue(left.features?.number, right.features?.number),
      person: agreementValue(left.features?.person, right.features?.person),
      tense: right.features?.tense ?? null,
      aspect: right.features?.aspect ?? null,
      mood: right.features?.mood ?? null,
    },
    version: 1,
    provenance: createLinguisticProvenance(`agreement:${type}`),
  };
  agreements.push(entry);
  return entry.id;
}

function addRelation({ relations, text, subject, predicate, object }) {
  const sourceStart = Math.min(
    subject.sourceStart,
    predicate.sourceStart,
    object?.sourceStart ?? predicate.sourceStart
  );
  const sourceEnd = Math.max(
    subject.sourceEnd,
    predicate.sourceEnd,
    object?.sourceEnd ?? predicate.sourceEnd
  );
  const entry = {
    id: `relation-${relations.length + 1}`,
    type: object ? 'subject-predicate-object' : 'subject-predicate',
    subjectFragmentId: subject.id,
    predicateFragmentId: predicate.id,
    objectFragmentId: object?.id ?? null,
    text: text.slice(sourceStart, sourceEnd),
    sourceStart,
    sourceEnd,
    version: 1,
    provenance: createLinguisticProvenance(
      object
        ? 'relation:subject-predicate-object'
        : 'relation:subject-predicate'
    ),
  };
  relations.push(entry);
  return entry;
}

function fragmentReference(fragment) {
  return {
    fragmentId: fragment.id,
    text: fragment.text,
    role: fragment.role,
    sourceStart: fragment.sourceStart,
    sourceEnd: fragment.sourceEnd,
    version: fragment.version,
    provenance: fragment.provenance,
  };
}

function normalizeTokenSpans(tokenSpans, text) {
  if (Array.isArray(tokenSpans) && tokenSpans.length > 0) {
    return tokenSpans.map((span) => ({
      token: String(span.token ?? ''),
      start: Number.isInteger(span.start) ? span.start : null,
      end: Number.isInteger(span.end) ? span.end : null,
      sentenceBoundaryAfter: Boolean(span.sentenceBoundaryAfter),
    }));
  }
  return tokenizeTextWithSpans(text);
}

function extractSymbolSpans(text) {
  const symbols = [];
  for (const match of text.matchAll(/[^\s\p{Letter}\p{Number}'’_-]/gu)) {
    symbols.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return symbols;
}

function segmentSentences(tokenSpans, text) {
  if (tokenSpans.length === 0) {
    return [];
  }
  const sentences = [];
  let startToken = 0;
  for (let index = 0; index < tokenSpans.length; index += 1) {
    const lastToken = index === tokenSpans.length - 1;
    if (tokenSpans[index].sentenceBoundaryAfter || lastToken) {
      sentences.push({
        startToken,
        endToken: index,
        sourceStart: tokenSpans[startToken]?.start ?? 0,
        sourceEnd: sentenceEndOffset(text, tokenSpans[index]?.end ?? 0),
      });
      startToken = index + 1;
    }
  }
  return sentences;
}

function sentenceEndOffset(text, tokenEnd) {
  const suffix = text.slice(tokenEnd);
  const match = suffix.match(/^\s*[.!?]+/);
  return tokenEnd + (match ? match[0].length : 0);
}

function findPredicateIndex(tokenSpans, start, end) {
  for (let index = start + 1; index <= end; index += 1) {
    if (isVerbCandidate(tokenSpans[index]?.token)) {
      return index;
    }
  }
  for (let index = start; index <= end; index += 1) {
    if (isVerbCandidate(tokenSpans[index]?.token)) {
      return index;
    }
  }
  return null;
}

function trimNominalRange(tokenSpans, start, end, options) {
  let left = start;
  let right = end;
  while (left <= right && shouldTrimLeft(tokenSpans[left]?.token, options)) {
    left += 1;
  }
  while (right >= left && shouldTrimRight(tokenSpans[right]?.token)) {
    right -= 1;
  }
  return left <= right ? { start: left, end: right } : null;
}

function analyzeToken(token, language) {
  const text = String(token ?? '');
  const lowered = normalizeToken(text);
  if (!text) {
    return emptyTokenAnalysis();
  }
  if (/^\d+(?:[.,]\d+)?$/.test(text)) {
    return numeralTokenAnalysis(lowered, language);
  }
  if (language !== 'en') {
    return lexicalTokenAnalysis(lowered, language);
  }
  return analyzeEnglishToken(text, lowered, language);
}

function analyzeEnglishToken(text, lowered, language) {
  if (englishPronouns.has(lowered)) {
    return pronounTokenAnalysis(lowered, language);
  }
  if (englishArticles.has(lowered)) {
    return determinerTokenAnalysis(lowered, language);
  }
  if (englishPrepositions.has(lowered)) {
    return adpositionTokenAnalysis(lowered, language);
  }
  if (englishConjunctions.has(lowered)) {
    return conjunctionTokenAnalysis(lowered, language);
  }
  if (isVerbCandidate(text)) {
    return verbTokenAnalysis(lowered, language);
  }
  return nounTokenAnalysis(text, lowered, language);
}

function numeralTokenAnalysis(lemma, language) {
  return {
    lemma,
    partOfSpeech: 'numeral',
    features: { language, numberType: 'cardinal' },
  };
}

function lexicalTokenAnalysis(lemma, language) {
  return {
    lemma,
    partOfSpeech: 'lexical-token',
    features: { language },
  };
}

function pronounTokenAnalysis(lemma, language) {
  return {
    lemma,
    partOfSpeech: 'pronoun',
    features: {
      language,
      ...englishPronouns.get(lemma),
      pronominal: true,
    },
  };
}

function determinerTokenAnalysis(lemma, language) {
  return {
    lemma,
    partOfSpeech: 'determiner',
    features: {
      language,
      definiteness: lemma === 'the' ? 'definite' : 'indefinite',
    },
  };
}

function adpositionTokenAnalysis(lemma, language) {
  return {
    lemma,
    partOfSpeech: 'adposition',
    features: { language, adpositionType: 'preposition' },
  };
}

function conjunctionTokenAnalysis(lemma, language) {
  return {
    lemma,
    partOfSpeech: 'conjunction',
    features: { language, conjunctionType: 'coordinating' },
  };
}

function verbTokenAnalysis(lemma, language) {
  return {
    lemma: englishVerbLemmas.get(lemma) ?? lemma.replace(/s$/, ''),
    partOfSpeech: 'verb',
    features: {
      language,
      tense: englishPastVerbLexemes.has(lemma) ? 'past' : 'present',
      aspect: lemma.endsWith('ing') ? 'progressive' : 'simple',
      mood: 'indicative',
      person: lemma.endsWith('s') || lemma === 'is' ? 3 : null,
      number:
        lemma.endsWith('s') || lemma === 'is' || lemma === 'was'
          ? 'singular'
          : null,
    },
  };
}

function nounTokenAnalysis(text, lemma, language) {
  return {
    lemma,
    partOfSpeech: /^[A-Z]/.test(text) ? 'proper-noun' : 'noun',
    features: {
      language,
      number: lemma.endsWith('s') && lemma.length > 3 ? 'plural' : 'singular',
    },
  };
}

function emptyTokenAnalysis() {
  return { lemma: null, partOfSpeech: null, features: {} };
}

function phrasePartOfSpeech(type, headPartOfSpeech) {
  if (type === 'noun-phrase' || type === 'subject' || type === 'object') {
    return 'noun-phrase';
  }
  if (type === 'verb-phrase' || type === 'predicate') {
    return 'verb-phrase';
  }
  return headPartOfSpeech;
}

function headTokenIndexForRange(tokenSpans, range) {
  for (let index = range.end; index >= range.start; index -= 1) {
    if (!shouldTrimRight(tokenSpans[index]?.token)) {
      return index;
    }
  }
  return range.end;
}

function tokenDependentRelation(token) {
  const lowered = normalizeToken(token);
  if (englishArticles.has(lowered)) {
    return 'det';
  }
  if (englishPrepositions.has(lowered)) {
    return 'case';
  }
  if (englishConjunctions.has(lowered)) {
    return 'cc';
  }
  return 'compound';
}

function agreementValue(left, right) {
  if (left && right && left === right) {
    return left;
  }
  return left ?? right ?? null;
}

function inferCoreferenceChains(fragments) {
  const mentions = fragments
    .filter(
      (fragment) => fragment.role === 'subject' || fragment.role === 'object'
    )
    .sort((left, right) => left.sourceStart - right.sourceStart);
  const chains = [];
  const antecedents = [];
  for (const mention of mentions) {
    if (!mention.features?.pronominal) {
      antecedents.push(mention);
      continue;
    }
    const antecedent = [...antecedents]
      .reverse()
      .find((entry) => coreferenceCompatible(entry, mention));
    if (!antecedent) {
      continue;
    }
    chains.push({
      id: `coreference-chain-${chains.length + 1}`,
      type: 'coreference-chain',
      version: 1,
      antecedentFragmentId: antecedent.id,
      mentionFragmentIds: [antecedent.id, mention.id],
      mentions: [antecedent, mention].map(coreferenceMention),
      provenance: createLinguisticProvenance('coreference'),
    });
  }
  return chains;
}

function coreferenceCompatible(antecedent, mention) {
  const mentionNumber = mention.features?.number;
  const antecedentNumber = antecedent.features?.number;
  return (
    !mentionNumber ||
    !antecedentNumber ||
    mentionNumber === 'unknown' ||
    antecedentNumber === mentionNumber
  );
}

function coreferenceMention(fragment) {
  return {
    fragmentId: fragment.id,
    text: fragment.text,
    role: fragment.role,
    sourceStart: fragment.sourceStart,
    sourceEnd: fragment.sourceEnd,
    features: fragment.features,
  };
}

function shouldTrimLeft(token, options) {
  const lowered = normalizeToken(token);
  return (
    englishPrepositions.has(lowered) ||
    englishConjunctions.has(lowered) ||
    (options.stripArticles && englishArticles.has(lowered))
  );
}

function shouldTrimRight(token) {
  const lowered = normalizeToken(token);
  return (
    englishPrepositions.has(lowered) ||
    englishConjunctions.has(lowered) ||
    englishArticles.has(lowered)
  );
}

function isVerbCandidate(token) {
  const lowered = normalizeToken(token);
  if (!lowered || isGrammarGlue(lowered)) {
    return englishCopulas.has(lowered);
  }
  if (englishCopulas.has(lowered) || englishVerbLexemes.has(lowered)) {
    return true;
  }
  return (
    lowered.length > 3 &&
    (lowered.endsWith('ed') ||
      lowered.endsWith('ing') ||
      lowered.endsWith('ize') ||
      lowered.endsWith('ise') ||
      lowered.endsWith('es'))
  );
}

function isGrammarGlue(token) {
  return (
    englishArticles.has(token) ||
    englishPrepositions.has(token) ||
    englishConjunctions.has(token)
  );
}

function normalizeToken(token) {
  return String(token ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}'_-]+/gu, '');
}

function normalizeLanguage(language) {
  const normalized = String(language ?? 'en')
    .trim()
    .toLowerCase();
  return /^[a-z][a-z0-9-]{0,14}$/.test(normalized) ? normalized : 'en';
}

function rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  return (
    Number.isInteger(leftStart) &&
    Number.isInteger(leftEnd) &&
    Number.isInteger(rightStart) &&
    Number.isInteger(rightEnd) &&
    leftStart <= rightEnd &&
    rightStart <= leftEnd
  );
}

function phraseInsideFragment(phrase, fragment) {
  return phrase.start >= fragment.tokenStart && phrase.end <= fragment.tokenEnd;
}

function isSemanticRole(role) {
  return role === 'subject' || role === 'predicate' || role === 'object';
}
