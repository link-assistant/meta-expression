export function collectTransformationRules(options, names) {
  const rules = [];
  for (const name of names) {
    const value = options?.[name];
    if (Array.isArray(value)) {
      rules.push(...value);
    } else if (value) {
      rules.push(value);
    }
  }
  return rules;
}

export function collectFormalizationTransformationRules(options) {
  return {
    beforeFormalizationRules: collectTransformationRules(options, [
      'beforeFormalizationRules',
      'preFormalizationRules',
    ]),
    afterFormalizationRules: collectTransformationRules(options, [
      'afterFormalizationRules',
      'postFormalizationRules',
    ]),
  };
}

export function collectTranslationTransformationRules(options) {
  return {
    beforeTranslationRules: collectTransformationRules(options, [
      'beforeTranslationRules',
      'preTranslationRules',
    ]),
    afterTranslationRules: collectTransformationRules(options, [
      'afterTranslationRules',
      'postTranslationRules',
    ]),
    beforeNaturalizationRules: collectTransformationRules(options, [
      'beforeNaturalizationRules',
      'naturalizationRules',
      'deformalizationRules',
    ]),
    afterNaturalizationRules: collectTransformationRules(options, [
      'afterNaturalizationRules',
      'afterDeformalizationRules',
    ]),
  };
}

export function applyTextTransformationRules(value, rules, context = {}) {
  return applyTransformationRules(String(value ?? ''), rules, context);
}

export function applyObjectTransformationRules(value, rules, context = {}) {
  return applyTransformationRules(value, rules, context);
}

export async function applySentenceTextTransformationRules(
  sentences,
  rules,
  context = {}
) {
  let current = sentences.map(cloneSentence);
  for (const rule of rules ?? []) {
    const before = sentenceSummary(current);
    current = await Promise.all(
      current.map((sentence) => applySentenceRule(sentence, rule, context))
    );
    recordTransformationStep(context, rule, before, sentenceSummary(current));
  }
  return current;
}

async function applyTransformationRules(value, rules, context) {
  let current = value;
  for (const rule of rules ?? []) {
    const before = summarizeValue(current);
    const next = await applyRule(current, rule, context);
    current = next === undefined ? current : next;
    recordTransformationStep(context, rule, before, summarizeValue(current));
  }
  return current;
}

async function applySentenceRule(sentence, rule, context) {
  const custom = await applyCustomRule(sentence, rule, context);
  if (custom !== undefined) {
    return custom;
  }
  return applyTextRuleToSentence(sentence, rule);
}

async function applyRule(value, rule, context) {
  const custom = await applyCustomRule(value, rule, context);
  if (custom !== undefined) {
    return custom;
  }
  if (typeof value === 'string') {
    return applyStringRule(value, rule);
  }
  if (isPlainObject(value) && isPlainObject(rule?.assign)) {
    return { ...value, ...rule.assign };
  }
  return value;
}

function applyCustomRule(value, rule, context) {
  if (typeof rule === 'function') {
    return rule(value, context);
  }
  if (typeof rule?.apply === 'function') {
    return rule.apply(value, context);
  }
  return undefined;
}

function applyTextRuleToSentence(sentence, rule) {
  const next = cloneSentence(sentence);
  next.plainText = applyStringRule(next.plainText, rule);
  next.markdown = applyStringRule(next.markdown, rule);
  next.html = applyStringRule(next.html, rule);
  next.target = {
    ...next.target,
    text: applyStringRule(next.target.text, rule),
    markdown: applyStringRule(next.target.markdown, rule),
    html: applyStringRule(next.target.html, rule),
  };
  next.targetUnits = next.targetUnits.map((unit) => ({
    ...unit,
    targetText: applyStringRule(unit.targetText, rule),
    plainText: applyStringRule(unit.plainText, rule),
    markdown: applyStringRule(unit.markdown, rule),
    html: applyStringRule(unit.html, rule),
  }));
  if (sentenceSummary([sentence]) !== sentenceSummary([next])) {
    next.transformations = [
      ...next.transformations,
      transformationRuleId(rule),
    ];
  }
  return next;
}

function applyStringRule(value, rule) {
  if (!hasPattern(rule)) {
    return value;
  }
  const pattern =
    rule.pattern instanceof RegExp
      ? rule.pattern
      : new RegExp(String(rule.pattern), rule.flags ?? 'g');
  return String(value ?? '').replace(pattern, rule.replacement ?? '');
}

function hasPattern(rule) {
  return Object.prototype.hasOwnProperty.call(rule ?? {}, 'pattern');
}

function cloneSentence(sentence) {
  return {
    ...sentence,
    target: { ...sentence.target },
    transformations: [...sentence.transformations],
    targetUnits: sentence.targetUnits.map((unit) => ({ ...unit })),
  };
}

function recordTransformationStep(context, rule, before, after) {
  if (
    before === after ||
    context.trace === false ||
    !Array.isArray(context.steps)
  ) {
    return;
  }
  context.steps.push({
    id: `step-${context.steps.length + 1}`,
    type: 'custom-transformation-rule',
    phase: context.phase ?? 'custom',
    rule: transformationRuleId(rule),
    before,
    after,
  });
}

function transformationRuleId(rule) {
  return String(rule?.id ?? rule?.name ?? 'anonymous-transformation-rule');
}

function sentenceSummary(sentences) {
  return sentences.map((sentence) => sentence.plainText).join('\n');
}

function summarizeValue(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (isPlainObject(value)) {
    return JSON.stringify(value, Object.keys(value).sort()).slice(0, 500);
  }
  return String(value ?? '');
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
