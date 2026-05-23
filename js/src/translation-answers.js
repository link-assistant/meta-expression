export function applyTranslationQuestionAnswers(result, answers = {}) {
  const next = cloneValue(result);
  next.steps ??= [];
  const answerMap = normalizeAnswers(answers);
  if (!answerMap.size) {
    return next;
  }

  const questionByVariable = new Map(
    (next.questionDetails ?? []).map((question) => [
      question.variableName,
      question,
    ])
  );
  const variableByName = new Map(
    (next.variables ?? []).map((variable) => [variable.name, variable])
  );
  const resolvedVariables = new Set();

  for (const phrase of next.phrases ?? []) {
    const variableName = phrase.variable?.name;
    if (!variableName || !answerMap.has(variableName)) {
      continue;
    }
    const answer = answerMap.get(variableName);
    const question = questionByVariable.get(variableName);
    const option = selectedQuestionOption(question, answer);
    const targetText = answerTargetText(answer, option, phrase);
    if (!targetText) {
      continue;
    }
    applyAnswerToPhrase(next, phrase, answer, option, targetText);
    phrase.variable.resolvedByAnswer = true;
    const variable = variableByName.get(variableName);
    if (variable) {
      variable.resolvedByAnswer = true;
    }
    resolvedVariables.add(variableName);
    next.steps.push(answerStep(next.steps.length + 1, variableName, answer));
  }

  if (!resolvedVariables.size) {
    return next;
  }

  next.questionDetails = (next.questionDetails ?? []).filter(
    (question) => !resolvedVariables.has(question.variableName)
  );
  next.questions = next.questionDetails.map((question) => question.question);
  rebuildTranslationText(next);
  syncTranslationCst(next);
  next.linksNotation = renderTranslationLinksNotation(next.cst, next.questions);
  return next;
}

function normalizeAnswers(answers) {
  const entries = answerEntries(answers);
  const map = new Map();
  for (const [key, value] of entries) {
    if (!key) {
      continue;
    }
    const answer =
      typeof value === 'string' ? { targetText: value } : { ...(value ?? {}) };
    answer.optionId = answer.optionId ?? answer.selectedOptionId ?? null;
    map.set(String(key), answer);
  }
  return map;
}

function answerEntries(answers) {
  if (answers instanceof Map) {
    return answers.entries();
  }
  if (Array.isArray(answers)) {
    return answers.map((answer) => [answer.variableName, answer]);
  }
  return Object.entries(answers ?? {});
}

function selectedQuestionOption(question, answer) {
  return question?.options?.find((option) => option.id === answer.optionId);
}

function answerTargetText(answer, option, phrase) {
  const explicit = normalizeAnswerText(answer.targetText);
  if (explicit) {
    return explicit;
  }
  const optionText = normalizeAnswerText(option?.targetText);
  if (optionText) {
    return optionText;
  }
  if (option?.id === 'preserve-source') {
    return phrase.source?.text ?? null;
  }
  return null;
}

function normalizeAnswerText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function applyAnswerToPhrase(result, phrase, answer, option, targetText) {
  phrase.target = {
    ...phrase.target,
    text: targetText,
    language: result.targetLanguage,
    entityId: answerEntityId(phrase, answer, option),
    description: answerDescription(phrase, answer, option),
    url: answerUrl(phrase, answer, option),
    status: answerStatus(option),
  };
}

function answerEntityId(phrase, answer, option) {
  return (
    answer.entityId ??
    option?.entityId ??
    phrase.target?.entityId ??
    phrase.entityId ??
    null
  );
}

function answerDescription(phrase, answer, option) {
  return (
    answer.description ??
    option?.description ??
    phrase.target?.description ??
    null
  );
}

function answerUrl(phrase, answer, option) {
  return answer.targetUrl ?? option?.targetUrl ?? phrase.target?.url ?? null;
}

function answerStatus(option) {
  if (option?.id === 'preserve-source') {
    return 'answered-preserve-source';
  }
  if (option?.id === 'manual-entry' || !option) {
    return 'answered-manual';
  }
  return 'answered-option';
}

function answerStep(index, variableName, answer) {
  return {
    id: `step-${index}`,
    type: 'question-answer',
    variableName,
    optionId: answer.optionId ?? null,
    targetText: answer.targetText ?? null,
  };
}

function rebuildTranslationText(result) {
  const phrases = new Map(
    (result.phrases ?? []).map((phrase) => [phrase.id, phrase])
  );
  for (const sentence of result.sentences ?? []) {
    for (const unit of sentence.targetUnits ?? []) {
      const phrase = phrases.get(unit.phraseId);
      if (phrase) {
        applyPhraseToTargetUnit(unit, phrase);
      }
    }
    renderSentence(sentence);
  }
  result.plainText = renderOutput(
    result.sentences,
    'plainText',
    result.phrases
  );
  result.markdown = renderOutput(result.sentences, 'markdown', result.phrases);
  result.html = renderOutput(result.sentences, 'html', result.phrases);
  if (result.naturalization) {
    result.naturalization.targetText = result.plainText;
    result.naturalization.targetMarkdown = result.markdown;
    result.naturalization.targetHtml = result.html;
    result.naturalization.sentences = (result.sentences ?? []).map(
      naturalizationSentence
    );
    result.naturalization.linksNotation = renderNaturalizationLinksNotation(
      result.naturalization
    );
  }
}

function applyPhraseToTargetUnit(unit, phrase) {
  unit.targetText = phrase.target.text;
  unit.plainText = phrase.target.text;
  unit.targetEntityId = phrase.target.entityId ?? phrase.entityId ?? null;
  unit.targetUrl = phrase.target.url ?? null;
  unit.markdown = renderPhraseMarkdown(phrase);
  unit.html = renderPhraseHtml(phrase);
}

function renderSentence(sentence) {
  const punctuation = terminalPunctuation(sentence.source?.text ?? '');
  sentence.plainText = appendTerminalPunctuation(
    (sentence.targetUnits ?? []).map((unit) => unit.plainText).join(' '),
    punctuation
  );
  sentence.markdown = appendTerminalPunctuation(
    (sentence.targetUnits ?? []).map((unit) => unit.markdown).join(' '),
    punctuation
  );
  sentence.html = appendTerminalPunctuation(
    (sentence.targetUnits ?? []).map((unit) => unit.html).join(' '),
    punctuation
  );
  sentence.target = {
    ...sentence.target,
    text: sentence.plainText,
    markdown: sentence.markdown,
    html: sentence.html,
  };
}

function renderOutput(sentences, key, phrases) {
  if (!sentences?.length) {
    return (phrases ?? []).map((phrase) => phrase.target.text).join(' ');
  }
  return sentences.map((sentence) => sentence[key]).join(' ');
}

function naturalizationSentence(sentence) {
  return {
    id: sentence.id,
    semanticLinkIds: (sentence.targetUnits ?? [])
      .map((unit) => unit.semanticLinkId)
      .filter(Boolean),
    targetText: sentence.plainText,
    targetMarkdown: sentence.markdown,
    targetHtml: sentence.html,
    targetUnits: cloneValue(sentence.targetUnits ?? []),
    transformations: [...(sentence.transformations ?? [])],
  };
}

function syncTranslationCst(result) {
  if (!result.cst) {
    return;
  }
  result.cst.phrases = cloneValue(result.phrases ?? []);
  result.cst.variables = cloneValue(result.variables ?? []);
  result.cst.sentences = (result.sentences ?? []).map(cstSentence);
  result.cst.naturalization = cloneValue(result.naturalization);
  result.cst.steps = cloneValue(result.steps ?? []);
}

function cstSentence(sentence) {
  return {
    type: 'sentence',
    id: sentence.id,
    sourceText: sentence.source?.text ?? '',
    sourceStart: sentence.source?.start ?? 0,
    sourceEnd: sentence.source?.end ?? 0,
    targetText: sentence.plainText,
    targetMarkdown: sentence.markdown,
    targetHtml: sentence.html,
    targetUnits: cloneValue(sentence.targetUnits ?? []),
    transformations: [...(sentence.transformations ?? [])],
    phraseIds: (sentence.phrases ?? []).map((phrase) => phrase.id),
  };
}

function renderPhraseMarkdown(phrase) {
  const targetEntityId = phrase.target.entityId ?? phrase.entityId;
  if (!targetEntityId || !phrase.target.url) {
    return phrase.target.text;
  }
  return `[${escapeMarkdown(phrase.target.text)}](${phrase.target.url} "${targetEntityId}")`;
}

function renderPhraseHtml(phrase) {
  const targetEntityId = phrase.target.entityId ?? phrase.entityId;
  if (!targetEntityId || !phrase.target.url) {
    return escapeHtml(phrase.target.text);
  }
  return `<a href="${escapeAttribute(phrase.target.url)}" title="${escapeAttribute(
    targetEntityId
  )}">${escapeHtml(phrase.target.text)}</a>`;
}

function renderTranslationLinksNotation(cst, questions) {
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

function renderNaturalizationLinksNotation(naturalization) {
  const head = `(naturalization: target ${toLino(naturalization.targetText)} language ${naturalization.targetLanguage})`;
  const sentences = naturalization.sentences.map(
    (sentence) =>
      `(${sentence.id}: semanticLinks ${toLino(sentence.semanticLinkIds.join(' '))} target ${toLino(sentence.targetText)} transformations ${toLino(sentence.transformations.join(', ') || 'none')})`
  );
  const targetUnits = naturalization.sentences.flatMap((sentence) =>
    sentence.targetUnits.map((unit) => {
      const semantic = unit.semanticLinkId
        ? ` semanticLink ${unit.semanticLinkId}`
        : '';
      const entity = unit.targetEntityId
        ? ` targetId ${unit.targetEntityId}`
        : '';
      const url = unit.targetUrl
        ? ` markdownUrl ${toLino(unit.targetUrl)}`
        : '';
      return `(${unit.id}: target ${toLino(unit.targetText)}${semantic}${entity}${url})`;
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
  if (step.variableName) {
    return step.variableName;
  }
  return step.type;
}

function terminalPunctuation(value) {
  const match = String(value).match(/[.!?]+$/);
  return match?.[0] ?? '';
}

function appendTerminalPunctuation(value, punctuation) {
  const text = String(value).trim();
  if (!punctuation || text.endsWith(punctuation)) {
    return text;
  }
  return `${text}${punctuation}`;
}

function toLino(value) {
  return `(${String(value ?? '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()})`;
}

function cloneValue(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function escapeMarkdown(value) {
  return String(value).replace(/([\\[\]()`*_])/g, '\\$1');
}
