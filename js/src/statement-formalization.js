import { disambiguatePhrases } from './disambiguation.js';
import { extractLinguisticMetadata } from './linguistic-metadata.js';
import { lexicalSemanticId, lexicalSemanticUrl } from './lexical-entities.js';

const semanticRoles = new Set(['subject', 'predicate', 'object']);
const structuralRoles = new Set(['noun-phrase', 'verb-phrase']);
const stopWords = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'is',
  'are',
  'was',
  'were',
  'of',
  'to',
  'in',
  'on',
  'with',
]);

/**
 * Build a deterministic structured-meaning baseline for arbitrary text.
 *
 * This is intentionally conservative: Wikidata dictionary hits are marked as
 * linked, while lexical fallbacks remain explicit variables with questions.
 *
 * @param {string} text
 * @param {{language?: string}} [options]
 * @returns {object}
 */
export function buildStatementMeaningMetadata(text, options = {}) {
  const language = options.language ?? 'en';
  const linguisticMetadata = extractLinguisticMetadata(text, { language });
  const disambiguation = disambiguatePhrases(text);
  const meaningLinks = buildMeaningLinks({
    text,
    language,
    linguisticMetadata,
    matches: disambiguation.matches,
  });
  const { variables, questions } = buildOpenQuestions(meaningLinks);
  const tokens = linguisticMetadata.fragments
    .filter((fragment) => fragment.type === 'word')
    .map((fragment) => fragment.text);

  return {
    cst: {
      type: 'statement-formalization',
      version: 1,
      text,
      tokens,
      ast: linguisticMetadata.ast,
      linguisticMetadata,
      meaningLinks,
      variables,
      questions,
    },
    ast: linguisticMetadata.ast,
    linguisticMetadata,
    meaningLinks,
    variables,
    questions,
  };
}

function buildMeaningLinks({ text, language, linguisticMetadata, matches }) {
  const links = [];
  const claimed = new Set();
  for (const fragment of selectMeaningFragments(linguisticMetadata)) {
    const match = findMatchForFragment(fragment, matches);
    links.push(
      createMeaningLink({
        index: links.length,
        text: fragment.text,
        role: fragment.role,
        fragmentId: fragment.id,
        tokenStart: fragment.tokenStart,
        tokenEnd: fragment.tokenEnd,
        sourceStart: fragment.sourceStart,
        sourceEnd: fragment.sourceEnd,
        target: match
          ? targetFromMatch(match)
          : lexicalTarget(fragment.text, fragment.role, language),
      })
    );
    claimed.add(tokenRangeKey(fragment.tokenStart, fragment.tokenEnd));
  }

  for (const match of matches) {
    const tokenEnd = match.position + match.tokens.length - 1;
    const rangeKey = tokenRangeKey(match.position, tokenEnd);
    if (claimed.has(rangeKey)) {
      continue;
    }
    const span = sourceSpanForTokenRange(linguisticMetadata, text, {
      start: match.position,
      end: tokenEnd,
    });
    links.push(
      createMeaningLink({
        index: links.length,
        text: span.text,
        role: match.kind === 'predicate' ? 'predicate' : 'entity',
        fragmentId: null,
        tokenStart: match.position,
        tokenEnd,
        sourceStart: span.start,
        sourceEnd: span.end,
        target: targetFromMatch(match),
      })
    );
    claimed.add(rangeKey);
  }

  return links;
}

function selectMeaningFragments(metadata) {
  const fragments = metadata.fragments ?? [];
  const selected = fragments.filter((fragment) =>
    semanticRoles.has(fragment.role)
  );
  if (selected.length > 0) {
    return selected;
  }
  const structural = fragments.filter((fragment) =>
    structuralRoles.has(fragment.role)
  );
  if (structural.length > 0) {
    return structural;
  }
  return fragments.filter(
    (fragment) =>
      fragment.type === 'word' && !stopWords.has(fragment.text.toLowerCase())
  );
}

function createMeaningLink({
  index,
  text,
  role,
  fragmentId,
  tokenStart,
  tokenEnd,
  sourceStart,
  sourceEnd,
  target,
}) {
  return {
    id: `meaning-link-${index + 1}`,
    text,
    role,
    fragmentId,
    tokenStart,
    tokenEnd,
    sourceStart,
    sourceEnd,
    status: target.source === 'wikidata' ? 'linked' : 'needs-disambiguation',
    target,
    candidates: [target],
    selectedTargetId: target.id,
  };
}

function findMatchForFragment(fragment, matches) {
  if (!Number.isInteger(fragment.tokenStart)) {
    return null;
  }
  return (
    matches.find((match) => {
      const tokenEnd = match.position + match.tokens.length - 1;
      return (
        fragment.tokenStart === match.position && fragment.tokenEnd === tokenEnd
      );
    }) ??
    matches.find(
      (match) =>
        normalizePhrase(match.phrase) === normalizePhrase(fragment.text)
    ) ??
    null
  );
}

function targetFromMatch(match) {
  return {
    id: match.wikidata.id,
    label: match.wikidata.label,
    description: match.wikidata.description ?? null,
    kind: match.kind === 'predicate' ? 'property' : 'entity',
    source: 'wikidata',
    sourceUrl: match.wikidata.sourceUrl,
  };
}

function lexicalTarget(text, role, language) {
  const id = lexicalSemanticId(text, language);
  return {
    id,
    label: text,
    description: `Lexical ${language} ${expectedKindForRole(role)}`,
    kind: expectedKindForRole(role) === 'property' ? 'property' : 'entity',
    source: 'lexical',
    sourceUrl: lexicalSemanticUrl(id, { text, language }),
  };
}

function buildOpenQuestions(meaningLinks) {
  const variables = [];
  const questions = [];
  const names = new Map();

  for (const link of meaningLinks) {
    if (link.status === 'linked') {
      continue;
    }
    const base = variableBaseForRole(link.role);
    const count = (names.get(base) ?? 0) + 1;
    names.set(base, count);
    const name = count === 1 ? `?${base}` : `?${base}-${count}`;
    const expectedKind = expectedKindForRole(link.role);
    const question = {
      id: `question-${questions.length + 1}`,
      variableName: name,
      text: `Which ${expectedKind} does "${link.text}" mean?`,
      expectedKind,
      meaningLinkId: link.id,
      fragmentId: link.fragmentId,
    };
    questions.push(question);
    variables.push({
      id: `variable-${variables.length + 1}`,
      name,
      role: link.role,
      text: link.text,
      expectedKind,
      meaningLinkId: link.id,
      fragmentId: link.fragmentId,
      sourceStart: link.sourceStart,
      sourceEnd: link.sourceEnd,
      candidateTargetIds: link.candidates.map((candidate) => candidate.id),
      questionId: question.id,
    });
  }

  return { variables, questions };
}

function sourceSpanForTokenRange(metadata, text, range) {
  const words = metadata.fragments.filter(
    (fragment) => fragment.type === 'word'
  );
  const first = words.find((fragment) => fragment.tokenStart === range.start);
  const last = words.find((fragment) => fragment.tokenEnd === range.end);
  const start = first?.sourceStart ?? 0;
  const end = last?.sourceEnd ?? start;
  return {
    start,
    end,
    text: text.slice(start, end),
  };
}

function expectedKindForRole(role) {
  if (role === 'predicate' || role === 'verb-phrase') {
    return 'property';
  }
  return 'entity';
}

function variableBaseForRole(role) {
  if (role === 'subject' || role === 'predicate' || role === 'object') {
    return role;
  }
  return expectedKindForRole(role);
}

function tokenRangeKey(start, end) {
  return `${start}:${end}`;
}

function normalizePhrase(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
