export function renderSentenceOutput(sentences, key, fallbackPhrases) {
  if (!sentences.length) {
    return fallbackPhrases.map((phrase) => phrase.target.text).join(' ');
  }
  return sentences.map((sentence) => sentence[key]).join(' ');
}

export function renderPhraseMarkdown(phrase) {
  const targetEntityId = phrase.target.entityId ?? phrase.entityId;
  if (!targetEntityId || !phrase.target.url) {
    return phrase.target.text;
  }
  return `[${escapeMarkdown(phrase.target.text)}](${phrase.target.url} "${targetEntityId}")`;
}

export function renderPhraseHtml(phrase) {
  const targetEntityId = phrase.target.entityId ?? phrase.entityId;
  if (!targetEntityId || !phrase.target.url) {
    return escapeHtml(phrase.target.text);
  }
  return `<a href="${escapeAttribute(phrase.target.url)}" title="${escapeAttribute(
    targetEntityId
  )}">${escapeHtml(phrase.target.text)}</a>`;
}

export function renderTranslationLinksNotation(cst, questions) {
  const head = `(translation: ${toLino(cst.text)} from ${cst.sourceLanguage} to ${cst.targetLanguage})`;
  const semantic = cst.semanticMetaLanguage?.linksNotation
    ? [cst.semanticMetaLanguage.linksNotation]
    : [];
  const naturalization = cst.naturalization?.linksNotation
    ? [cst.naturalization.linksNotation]
    : [];
  const sentences = cst.sentences.map(
    (sentence) =>
      `(${sentence.id}: source ${toLino(sentence.sourceText)} target ${toLino(sentence.targetText)} transformations ${toLino(sentence.transformations.join(', ') || 'none')})`
  );
  const phrases = cst.phrases.map((phrase, index) => {
    const id = phrase.entityId ? ` id ${phrase.entityId}` : '';
    const targetId =
      phrase.target.entityId && phrase.target.entityId !== phrase.entityId
        ? ` targetId ${phrase.target.entityId}`
        : '';
    const variable = phrase.variable?.name
      ? ` variable ${phrase.variable.name}`
      : '';
    const url = phrase.target.url
      ? ` markdownUrl ${toLino(phrase.target.url)}`
      : '';
    return `(phrase-${index + 1}: source ${toLino(phrase.source.text)} target ${toLino(phrase.target.text)} status ${phrase.target.status}${id}${targetId}${variable}${url})`;
  });
  const variables = cst.variables.map(
    (variable) =>
      `(${variable.name}: source ${toLino(variable.sourceText)} reason ${variable.reason})`
  );
  const questionLines = questions.map(
    (question, index) => `(question-${index + 1}: ${toLino(question)})`
  );
  const steps = cst.steps.map(
    (step) => `(${step.id}: type ${step.type} ${toLino(stepSummary(step))})`
  );
  return [
    head,
    ...semantic,
    ...naturalization,
    ...sentences,
    ...phrases,
    ...variables,
    ...questionLines,
    ...steps,
  ].join('\n');
}

export function renderSemanticMetaLanguageLinksNotation(semantic) {
  const head = `(semantic-meta-language: ${toLino(semantic.text)} from ${semantic.sourceLanguage} to ${semantic.targetLanguage})`;
  const links = semantic.links.map((link) => {
    const meaning = link.meaning.id && ` meaning ${toLino(link.meaning.id)}`;
    const label = link.meaning.label && ` label ${toLino(link.meaning.label)}`;
    const target = link.targetHint && ` targetHint ${toLino(link.targetHint)}`;
    const url = link.meaning.url ? ` url ${toLino(link.meaning.url)}` : '';
    const role =
      link.sourceFragment?.role && ` sourceRole ${link.sourceFragment.role}`;
    return `(${link.id}: source ${toLino(link.sourceText)} status ${link.status}${role || ''}${meaning || ''}${label || ''}${target || ''}${url})`;
  });
  return [head, ...links].join('\n');
}

export function renderNaturalizationLinksNotation(naturalization) {
  const head = `(naturalization: target ${toLino(naturalization.targetText)} language ${naturalization.targetLanguage})`;
  const sentences = naturalization.sentences.map(
    (sentence) =>
      `(${sentence.id}: semanticLinks ${toLino(sentence.semanticLinkIds.join(' '))} target ${toLino(sentence.targetText)} transformations ${toLino(sentence.transformations.join(', ') || 'none')})`
  );
  const targetUnits = naturalization.sentences.flatMap((sentence) =>
    sentence.targetUnits.map((unit) => {
      const semantic =
        unit.semanticLinkId && ` semanticLink ${unit.semanticLinkId}`;
      const entity = unit.targetEntityId && ` targetId ${unit.targetEntityId}`;
      const url = unit.targetUrl && ` markdownUrl ${toLino(unit.targetUrl)}`;
      return `(${unit.id}: target ${toLino(unit.targetText)}${semantic || ''}${entity || ''}${url || ''})`;
    })
  );
  return [head, ...sentences, ...targetUnits].join('\n');
}

function stepSummary(step) {
  if (step.rule) {
    return step.rule;
  }
  if (step.url) {
    return step.url;
  }
  if (step.sentenceId) {
    return step.sentenceId;
  }
  if (step.phraseId) {
    return step.phraseId;
  }
  if (step.text) {
    return step.text;
  }
  return step.type;
}

function toLino(value) {
  return `(${String(value ?? '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()})`;
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
