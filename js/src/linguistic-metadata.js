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
  const fragments = [];
  const dependencies = [];
  const relations = [];
  const astSentences = [];

  const addFragment = (fragment) => {
    const entry = {
      id: `fragment-${fragments.length + 1}`,
      type: fragment.type,
      role: fragment.role ?? fragment.type,
      text: fragment.text,
      tokens: fragment.tokens ?? [],
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
    addFragment({
      type: 'word',
      role: 'word',
      text: token.text,
      tokens: [token.text],
      tokenStart: token.index,
      tokenEnd: token.index,
      sourceStart: token.sourceStart,
      sourceEnd: token.sourceEnd,
    });
  }

  for (const symbol of parse.symbols) {
    addFragment({
      type: 'symbol',
      role: 'symbol',
      text: symbol.text,
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

  return {
    version: 1,
    language,
    parser: parse.parser,
    provenance: createLinguisticProvenance('metadata'),
    text,
    fragments,
    dependencies,
    relations,
    ast,
    cst: buildLinguisticCst(parse),
  };
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
  const symbols = extractSymbolSpans(text).map((symbol, index) => ({
    type: 'symbol-cst',
    id: `symbol-${index + 1}`,
    version: 1,
    text: symbol.text,
    sourceStart: symbol.start,
    sourceEnd: symbol.end,
    provenance: createLinguisticProvenance('cst-symbol'),
  }));
  const tokens = tokenSpans.map((span, index) => ({
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
  const sentences = segmentSentences(tokenSpans, text).map((sentence, index) =>
    parseLinguisticSentence({
      text,
      tokenSpans,
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
    tokenSpans,
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

function buildLinguisticCst(parse) {
  return {
    type: 'document-cst',
    version: 1,
    text: parse.text,
    language: parse.language,
    parser: parse.parser,
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
}) {
  const dependencyIds = [];
  const { subject, predicate, object, relation } = extractSentenceComponents({
    text,
    tokenSpans,
    parsedSentence,
    addFragment,
    dependencies,
    relations,
    dependencyIds,
  });
  Object.assign(parsedSentence, {
    subjectFragmentId: subject?.id ?? null,
    predicateFragmentId: predicate?.id ?? null,
    objectFragmentId: object?.id ?? null,
    relationId: relation?.id ?? null,
    dependencyIds: [...dependencyIds],
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
  };
}

function extractSentenceComponents({
  text,
  tokenSpans,
  parsedSentence,
  addFragment,
  dependencies,
  relations,
  dependencyIds,
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
    dependencyIds,
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
  dependencyIds,
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
    dependencies,
    relations,
    dependencyIds,
    subject,
    predicate,
    object,
  });
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
  dependencies,
  relations,
  dependencyIds,
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
  return addRelation({
    relations,
    text,
    subject,
    predicate,
    object,
  });
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
  return addFragment({
    type,
    role,
    text: text.slice(first.start, last.end),
    tokens: tokenSpans
      .slice(range.start, range.end + 1)
      .map((span) => span.token),
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
  dependentFragmentId
) {
  const entry = {
    id: `dependency-${dependencies.length + 1}`,
    relation,
    headFragmentId,
    dependentFragmentId,
    source: linguisticParserId,
    version: 1,
    provenance: createLinguisticProvenance(`dependency:${relation}`),
  };
  dependencies.push(entry);
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
  return tokenizeWithSpans(text);
}

function tokenizeWithSpans(text) {
  const source = String(text);
  const tokenPattern = /[^\s.,!?;:"“”]+/g;
  const spans = [];
  let match;
  while ((match = tokenPattern.exec(source)) !== null) {
    spans.push({
      token: match[0],
      start: match.index,
      end: match.index + match[0].length,
      sentenceBoundaryAfter: false,
    });
  }
  for (let index = 0; index < spans.length - 1; index += 1) {
    const delimiter = source.slice(spans[index].end, spans[index + 1].start);
    spans[index].sentenceBoundaryAfter = /[.!?]/.test(delimiter);
  }
  if (spans.length > 0) {
    const tail = source.slice(spans[spans.length - 1].end);
    spans[spans.length - 1].sentenceBoundaryAfter = /[.!?]/.test(tail);
  }
  return spans;
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
