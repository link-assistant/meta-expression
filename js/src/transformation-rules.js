import {
  Link,
  Parser as LinksNotationParser,
  formatLinks,
} from 'links-notation';

const linksNotationParser = new LinksNotationParser();
const defaultSimplifyMaxSteps = 1000;

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
      'preNaturalizationRules',
      'naturalizationRules',
      'beforeDeformalizationRules',
      'preDeformalizationRules',
      'deformalizationRules',
    ]),
    afterNaturalizationRules: collectTransformationRules(options, [
      'afterNaturalizationRules',
      'postNaturalizationRules',
      'afterDeformalizationRules',
      'postDeformalizationRules',
    ]),
  };
}

export function applyTextTransformationRules(value, rules, context = {}) {
  return applyTransformationRules(String(value ?? ''), rules, context);
}

export function applyObjectTransformationRules(value, rules, context = {}) {
  return applyTransformationRules(value, rules, context);
}

export function rewriteLinksNotation(value, equality, options = {}) {
  const term = parseLinksNotationTerm(value, 'rewrite goal');
  const equalityTerm = normalizeRewriteEquality(equality);
  const rewritten = rewriteLinksNotationTerm(term, equalityTerm, options);
  return rewritten.changed ? formatLinksNotationTerm(rewritten.node) : value;
}

export function simplifyLinksNotation(value, rules, options = {}) {
  const ruleTerms = normalizeRewriteRules(rules);
  const maxSteps = normalizeSimplifyMaxSteps(options);
  let term = parseLinksNotationTerm(value, 'simplify goal');
  let changed = false;
  let steps = 0;

  while (true) {
    let applied = false;
    for (const rule of ruleTerms) {
      const rewritten = rewriteLinksNotationTerm(term, rule, {
        direction: options.direction,
      });
      if (!rewritten.changed) {
        continue;
      }
      if (steps >= maxSteps) {
        throw new Error(
          `simplify termination guard reached after ${maxSteps} rewrite steps`
        );
      }
      term = rewritten.node;
      steps += 1;
      changed = true;
      applied = true;
      break;
    }
    if (!applied) {
      return changed ? formatLinksNotationTerm(term) : value;
    }
  }
}

export async function applySentenceTextTransformationRules(
  sentences,
  rules,
  context = {}
) {
  let current = sentences.map(cloneSentence);
  for (const rule of normalizeTransformationRuleList(rules)) {
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
  for (const rule of normalizeTransformationRuleList(rules)) {
    const before = summarizeValue(current);
    const next = await applyRule(current, rule, context);
    current = next === undefined ? current : next;
    recordTransformationStep(context, rule, before, summarizeValue(current));
  }
  return current;
}

function normalizeTransformationRuleList(rules) {
  if (rules === undefined || rules === null) {
    return [];
  }
  return Array.isArray(rules) ? rules : [rules];
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
  if (hasLinksNotationRewrite(rule)) {
    return applyLinksNotationRewriteRule(value, rule);
  }
  if (hasLinksNotationSimplify(rule)) {
    return applyLinksNotationSimplifyRule(value, rule);
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

function applyLinksNotationRewriteRule(value, rule) {
  const rewriteSpec = rule.rewrite;
  const specOptions = isPlainObject(rewriteSpec) ? rewriteSpec : {};
  const equality =
    specOptions.equality ?? specOptions.rule ?? specOptions.eq ?? rewriteSpec;
  return applyLinksNotationTransform(value, rule, (linksNotation) =>
    rewriteLinksNotation(linksNotation, equality, {
      direction: rule.direction ?? specOptions.direction,
      occurrence:
        rule.occurrence ?? specOptions.occurrence ?? rule.at ?? specOptions.at,
    })
  );
}

function applyLinksNotationSimplifyRule(value, rule) {
  const simplifySpec = rule.simplify;
  const specOptions = isPlainObject(simplifySpec) ? simplifySpec : {};
  const rules =
    specOptions.rules ??
    specOptions.rewriteRules ??
    (simplifySpec === true ? (rule.rules ?? rule.rewriteRules) : simplifySpec);
  return applyLinksNotationTransform(value, rule, (linksNotation) =>
    simplifyLinksNotation(linksNotation, rules, {
      direction: rule.direction ?? specOptions.direction,
      maxSteps:
        rule.maxSteps ??
        rule.simplifyMaxSteps ??
        specOptions.maxSteps ??
        specOptions.simplifyMaxSteps,
    })
  );
}

function applyLinksNotationTransform(value, rule, transform) {
  const targetPath = normalizeTargetPath(rule.target ?? rule.path);
  if (targetPath.length > 0) {
    return transformValueAtPath(value, targetPath, transform);
  }
  if (typeof value === 'string') {
    return transform(value);
  }
  return value;
}

function transformValueAtPath(value, path, transform) {
  if (!isPlainObject(value)) {
    return value;
  }
  const current = valueAtPath(value, path);
  if (typeof current !== 'string') {
    return value;
  }
  const next = transform(current);
  if (next === current) {
    return value;
  }
  return setValueAtPath(value, path, next);
}

function valueAtPath(value, path) {
  let current = value;
  for (const segment of path) {
    if (!isPlainObject(current) || !Object.hasOwn(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function setValueAtPath(value, path, nextValue) {
  if (path.length === 0) {
    return nextValue;
  }
  const [head, ...tail] = path;
  return {
    ...value,
    [head]: tail.length
      ? setValueAtPath(value[head], tail, nextValue)
      : nextValue,
  };
}

function normalizeTargetPath(path) {
  if (Array.isArray(path)) {
    return path.map(String).filter(Boolean);
  }
  if (typeof path === 'string' && path.trim()) {
    return path
      .split('.')
      .map((segment) => segment.trim())
      .filter(Boolean);
  }
  return [];
}

function hasLinksNotationRewrite(rule) {
  return (
    isPlainObject(rule) && Object.prototype.hasOwnProperty.call(rule, 'rewrite')
  );
}

function hasLinksNotationSimplify(rule) {
  return (
    isPlainObject(rule) &&
    Object.prototype.hasOwnProperty.call(rule, 'simplify')
  );
}

function rewriteLinksNotationTerm(goal, equality, options = {}) {
  const { from, to } = rewriteSides(equality, options.direction);
  return rewriteNode(goal, from, to, options.occurrence);
}

function rewriteSides(equality, direction) {
  const sides = equalitySides(equality);
  if (!sides) {
    throw new Error('rewrite expects an equality link');
  }
  if (normalizeRewriteDirection(direction) === 'backward') {
    return { from: sides.right, to: sides.left };
  }
  return { from: sides.left, to: sides.right };
}

function rewriteNode(node, from, to, occurrence) {
  const selected = normalizeRewriteOccurrence(occurrence);
  let seen = 0;
  let count = 0;

  function walk(current) {
    if (isSameLinksNotationTerm(current, from)) {
      seen += 1;
      if (selected.kind === 'all' || seen === selected.index) {
        count += 1;
        return cloneLinksNotationTerm(to);
      }
    }
    if (!isLinksNotationLink(current)) {
      return current;
    }
    return new Link(
      current.id ?? null,
      current.values.map((item) => walk(item))
    );
  }

  return { node: walk(node), changed: count > 0, count, seen };
}

function normalizeRewriteRules(rules) {
  if (rules === undefined || rules === null) {
    return [];
  }
  if (typeof rules === 'string') {
    const parsed = linksNotationParser.parse(rules);
    return parsed.map(normalizeRewriteEquality);
  }
  if (Array.isArray(rules) && !isLinksNotationLink(rules)) {
    return rules.map(normalizeRewriteEquality);
  }
  return [normalizeRewriteEquality(rules)];
}

function normalizeRewriteEquality(equality) {
  if (isPlainObject(equality)) {
    const left = equality.from ?? equality.left;
    const right = equality.to ?? equality.right;
    if (left !== undefined && right !== undefined) {
      return new Link(null, [
        parseRewriteSide(left, 'rewrite left side'),
        new Link('='),
        parseRewriteSide(right, 'rewrite right side'),
      ]);
    }
  }
  const term = parseLinksNotationTerm(equality, 'rewrite equality');
  if (!equalitySides(term)) {
    throw new Error(
      `rewrite expects an equality link (got ${formatLinksNotationTerm(term)})`
    );
  }
  return term;
}

function parseRewriteSide(value, label) {
  const term = parseLinksNotationTerm(value, label);
  if (term.id === null && term.values.length === 1) {
    return term.values[0];
  }
  return term;
}

function equalitySides(term) {
  if (!isLinksNotationLink(term)) {
    return null;
  }
  if (term.id === '=' && term.values.length === 2) {
    return { left: term.values[0], right: term.values[1] };
  }
  if (
    term.id === null &&
    term.values.length === 3 &&
    isReferenceLink(term.values[1], '=')
  ) {
    return { left: term.values[0], right: term.values[2] };
  }
  return null;
}

function parseLinksNotationTerm(value, label) {
  if (isLinksNotationLink(value)) {
    return cloneLinksNotationTerm(value);
  }
  if (typeof value !== 'string') {
    throw new Error(`${label} must be Links Notation text or a link object`);
  }
  const parsed = linksNotationParser.parse(value);
  if (parsed.length === 0) {
    throw new Error(`${label} must not be empty`);
  }
  if (parsed.length === 1) {
    return cloneLinksNotationTerm(parsed[0]);
  }
  return new Link(null, parsed.map(cloneLinksNotationTerm));
}

function formatLinksNotationTerm(term) {
  return formatLinks([term]);
}

function normalizeRewriteDirection(direction = 'forward') {
  if (direction === undefined || direction === null) {
    return 'forward';
  }
  const raw = String(direction);
  if (raw === 'forward' || raw === 'left-to-right' || raw === '->') {
    return 'forward';
  }
  if (
    raw === 'backward' ||
    raw === 'right-to-left' ||
    raw === '<-' ||
    raw === 'reverse'
  ) {
    return 'backward';
  }
  throw new Error(`unknown rewrite direction "${raw}"`);
}

function normalizeRewriteOccurrence(occurrence = 'all') {
  if (occurrence === undefined || occurrence === null || occurrence === 'all') {
    return { kind: 'all' };
  }
  if (occurrence === 'first') {
    return { kind: 'index', index: 1 };
  }
  const index =
    typeof occurrence === 'number' ? occurrence : Number(String(occurrence));
  if (Number.isSafeInteger(index) && index >= 1) {
    return { kind: 'index', index };
  }
  throw new Error(
    `rewrite occurrence must be "all", "first", or a positive integer`
  );
}

function normalizeSimplifyMaxSteps(options = {}) {
  const raw =
    options.maxSteps ?? options.simplifyMaxSteps ?? defaultSimplifyMaxSteps;
  const maxSteps = typeof raw === 'number' ? raw : Number(String(raw));
  if (!Number.isSafeInteger(maxSteps) || maxSteps < 0) {
    throw new Error(
      `simplify maxSteps must be a non-negative integer (got ${String(raw)})`
    );
  }
  return maxSteps;
}

function isSameLinksNotationTerm(left, right) {
  if (!isLinksNotationLink(left) || !isLinksNotationLink(right)) {
    return left === right;
  }
  if (left.id !== right.id || left.values.length !== right.values.length) {
    return false;
  }
  return left.values.every((item, index) =>
    isSameLinksNotationTerm(item, right.values[index])
  );
}

function cloneLinksNotationTerm(term) {
  if (!isLinksNotationLink(term)) {
    return term;
  }
  return new Link(
    term.id ?? null,
    term.values.map((item) => cloneLinksNotationTerm(item))
  );
}

function isLinksNotationLink(value) {
  return (
    Boolean(value) && typeof value === 'object' && Array.isArray(value.values)
  );
}

function isReferenceLink(value, id) {
  return (
    isLinksNotationLink(value) && value.id === id && value.values.length === 0
  );
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
    return compactSummary(stableStringify(value));
  }
  return String(value ?? '');
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stableStringify(value, seen = new Set()) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (seen.has(value)) {
    return '"[Circular]"';
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const items = value.map((item) => stableStringify(item, seen));
    seen.delete(value);
    return `[${items.join(',')}]`;
  }
  const entries = Object.keys(value)
    .sort()
    .map(
      (key) => `${JSON.stringify(key)}:${stableStringify(value[key], seen)}`
    );
  seen.delete(value);
  return `{${entries.join(',')}}`;
}

function compactSummary(serialized) {
  const limit = 1000;
  if (serialized.length <= limit) {
    return serialized;
  }
  return `${serialized.slice(0, limit)}...(${serialized.length} chars, hash ${hashString(serialized)})`;
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
