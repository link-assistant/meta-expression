/**
 * Recreate Markdown from a formalization CST.
 *
 * The CST stores phrase order, source text, source character ranges, selected
 * entity id, and the exact link URL used by the formalizer. That makes the
 * Links Notation / CST form sufficient for downstream tools such as
 * `/translate` to regenerate the same wikified Markdown, including sentence
 * punctuation, without re-running disambiguation.
 *
 * @param {object} cst
 * @returns {string}
 */
export function markdownFromFormalizationCst(cst) {
  if (!cst || !Array.isArray(cst.phrases)) {
    throw new TypeError('Formalization CST must contain a phrases array.');
  }
  if (canRenderCstWithSourceText(cst)) {
    return markdownFromCstSourceText(cst);
  }
  return cst.phrases.map((phrase) => markdownFromCstPhrase(phrase)).join(' ');
}

export function htmlFromFormalizationCst(cst) {
  if (canRenderCstWithSourceText(cst)) {
    return htmlFromCstSourceText(cst);
  }
  return cst.phrases.map((phrase) => htmlFromCstPhrase(phrase)).join(' ');
}

export function renderLinksNotation(cst) {
  const safeText = toLino(cst.text);
  const head = `(formalization: ${safeText})`;
  const phraseLines = cst.phrases.map((phrase) => {
    if (!phrase.entity) {
      return `(${phrase.id}: source ${toLino(phrase.text)} start ${phrase.start} end ${phrase.end} unresolved)`;
    }
    const label = phrase.entity.label ?? phrase.text;
    return `(${phrase.id}: source ${toLino(phrase.text)} start ${phrase.start} end ${phrase.end} id ${phrase.entity.id} label ${toLino(label)} kind ${phrase.entity.kind ?? 'entity'} markdownUrl ${toLino(phrase.entity.url)})`;
  });
  const contextLines = cst.contexts.map((context) => {
    const probability = (context.probability * 100).toFixed(1);
    return `(${context.id}: ${context.wikidataId} weight ${context.weight} probability ${probability})`;
  });
  const fragmentLines = (cst.linguisticMetadata?.fragments ?? [])
    .filter(
      (fragment) => fragment.role !== 'word' && fragment.role !== 'symbol'
    )
    .map(
      (fragment) =>
        `(${fragment.id}: ${fragment.type} role ${fragment.role} source ${toLino(fragment.text)} start ${fragment.tokenStart} end ${fragment.tokenEnd} phrases ${toLino((fragment.phraseIds ?? []).join(' ') || 'none')})`
    );
  const dependencyLines = (cst.linguisticMetadata?.dependencies ?? []).map(
    (dependency) =>
      `(${dependency.id}: ${dependency.relation} head ${dependency.headFragmentId} dependent ${dependency.dependentFragmentId})`
  );
  const relationLines = (cst.linguisticMetadata?.relations ?? []).map(
    (relation) =>
      `(${relation.id}: ${relation.type} subject ${relation.subjectFragmentId} predicate ${relation.predicateFragmentId} object ${relation.objectFragmentId ?? 'none'})`
  );
  const providerCandidateLines = renderProviderCandidateLines(
    cst.providerCandidates
  );
  return [
    head,
    ...phraseLines,
    ...fragmentLines,
    ...dependencyLines,
    ...relationLines,
    ...providerCandidateLines,
    ...contextLines,
  ].join('\n');
}

function renderProviderCandidateLines(providerCandidates) {
  if (!providerCandidates?.providers?.length) {
    return [];
  }
  return [
    ...providerCandidates.providers.map(
      (provider) =>
        `(${provider.id}: providerCandidate kind ${toLino(provider.kind)} status ${provider.status} partial ${provider.truthScoring?.included === false})`
    ),
    ...providerCandidates.triples.map(
      (triple) =>
        `(${triple.id}: providerTriple provider ${triple.providerId} status ${triple.status} subject ${toLino(triple.subject?.text ?? '')} predicate ${toLino(triple.predicate?.text ?? '')} object ${toLino(triple.object?.text ?? '')} evidenceIncluded ${triple.truthScoring?.included === true})`
    ),
    ...providerCandidates.roles.map(
      (role) =>
        `(${role.id}: providerRole provider ${role.providerId} status ${role.status} predicate ${toLino(role.predicate?.text ?? '')} arguments ${role.arguments.length} evidenceIncluded ${role.truthScoring?.included === true})`
    ),
    ...providerCandidates.entityLinks.map(
      (entityLink) =>
        `(${entityLink.id}: providerEntityLink provider ${entityLink.providerId} status ${entityLink.status} source ${toLino(entityLink.text ?? '')} target ${toLino(entityLink.target?.id ?? 'none')} evidenceIncluded ${entityLink.truthScoring?.included === true})`
    ),
    ...providerCandidates.graphs.map(
      (graph) =>
        `(${graph.id}: providerGraph provider ${graph.providerId} status ${graph.status} format ${toLino(graph.format)} evidenceIncluded ${graph.truthScoring?.included === true})`
    ),
  ];
}

function markdownFromCstPhrase(phrase) {
  if (!phrase.entity) {
    return phrase.text;
  }
  return `[${escapeMarkdown(phrase.text)}](${phrase.entity.url} "${phrase.entity.id}")`;
}

function canRenderCstWithSourceText(cst) {
  return (
    typeof cst.text === 'string' &&
    cst.phrases.every(
      (phrase) =>
        Number.isInteger(phrase.sourceStart) &&
        Number.isInteger(phrase.sourceEnd) &&
        phrase.sourceEnd >= phrase.sourceStart
    )
  );
}

function markdownFromCstSourceText(cst) {
  const phrases = [...cst.phrases].sort(
    (left, right) => left.sourceStart - right.sourceStart
  );
  let cursor = 0;
  let markdown = '';
  for (const phrase of phrases) {
    if (phrase.sourceStart < cursor) {
      continue;
    }
    markdown += cst.text.slice(cursor, phrase.sourceStart);
    markdown += markdownFromCstPhrase(phrase);
    cursor = phrase.sourceEnd;
  }
  markdown += cst.text.slice(cursor);
  return markdown;
}

function htmlFromCstPhrase(phrase) {
  if (!phrase.entity) {
    return escapeHtml(phrase.text);
  }
  return `<a href="${escapeAttribute(phrase.entity.url)}" title="${escapeAttribute(
    phrase.entity.id
  )}">${escapeHtml(phrase.text)}</a>`;
}

function htmlFromCstSourceText(cst) {
  const phrases = [...cst.phrases].sort(
    (left, right) => left.sourceStart - right.sourceStart
  );
  let cursor = 0;
  let html = '';
  for (const phrase of phrases) {
    if (phrase.sourceStart < cursor) {
      continue;
    }
    html += escapeHtml(cst.text.slice(cursor, phrase.sourceStart));
    html += htmlFromCstPhrase(phrase);
    cursor = phrase.sourceEnd;
  }
  html += escapeHtml(cst.text.slice(cursor));
  return html;
}

function toLino(value) {
  return `(${String(value).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()})`;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttribute(value) {
  return escapeHtml(value);
}

export function escapeMarkdown(value) {
  return String(value).replace(/([\\[\]()`*_])/g, '\\$1');
}
