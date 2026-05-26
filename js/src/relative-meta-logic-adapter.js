export const RELATIVE_META_LOGIC_UPSTREAM = Object.freeze({
  name: 'relative-meta-logic',
  version: '0.19.0',
  repository: 'https://github.com/link-foundation/relative-meta-logic',
  commit: '155276abb6093dcfa5c6c0fe58a7dd05ee3e2c44',
  packagePath: 'js',
  npmPublished: false,
  packageSpec:
    'git+https://github.com/link-foundation/relative-meta-logic.git#155276abb6093dcfa5c6c0fe58a7dd05ee3e2c44',
});

const rmlSourceUrl = RELATIVE_META_LOGIC_UPSTREAM.repository;

export function mapFormalizationToRelativeMetaLogicInput(formalization) {
  const expression = formalization?.expression;
  if (!formalization?.computable || !expression) {
    return partialMapping(formalization);
  }

  if (expression.type === 'formal-reasoning-program') {
    return {
      supported: true,
      inputKind: 'formal-reasoning-program',
      formalizationLevel: formalization.level,
      program: expression.program,
      query: expression.query,
      dependencies: expression.dependencies ?? [],
      facts: expression.facts ?? [],
      engine: RELATIVE_META_LOGIC_UPSTREAM,
    };
  }

  if (
    expression.type === 'arithmetic-equality' ||
    expression.type === 'arithmetic-question'
  ) {
    return {
      supported: true,
      inputKind: 'arithmetic',
      formalizationLevel: formalization.level,
      program: arithmeticProgram(expression),
      ast: arithmeticAst(expression),
      valueKind:
        expression.type === 'arithmetic-equality' ? 'truth-value' : 'number',
      engine: RELATIVE_META_LOGIC_UPSTREAM,
    };
  }

  return partialMapping(formalization);
}

export function evaluateArithmeticWithRelativeMetaLogic(
  expression,
  options = {}
) {
  const engine = normalizeProvidedEngine(options);
  if (!engine?.evalNode) {
    return null;
  }

  try {
    const env = createRmlEnvironment(engine, options);
    const ast = arithmeticAst(expression);
    const actual = engine.evalNode(ast, env);
    if (!Number.isFinite(actual)) {
      return null;
    }
    return {
      actual,
      ast,
      program: arithmeticProgram(expression),
      engine: {
        name: RELATIVE_META_LOGIC_UPSTREAM.name,
        mode: engine.mode,
        sourceUrl: rmlSourceUrl,
        version: RELATIVE_META_LOGIC_UPSTREAM.version,
        commit: RELATIVE_META_LOGIC_UPSTREAM.commit,
      },
      trace: [
        {
          method: 'evalNode',
          text: `relative-meta-logic evalNode() resolved ${formatArithmeticExpression(
            expression
          )} as ${String(actual)}.`,
          sourceType: 'relative-meta-logic',
          sourceUrl: rmlSourceUrl,
        },
      ],
    };
  } catch (error) {
    return {
      actual: null,
      error: error instanceof Error ? error.message : String(error),
      engine: {
        name: RELATIVE_META_LOGIC_UPSTREAM.name,
        mode: engine.mode,
        sourceUrl: rmlSourceUrl,
        version: RELATIVE_META_LOGIC_UPSTREAM.version,
        commit: RELATIVE_META_LOGIC_UPSTREAM.commit,
      },
      trace: [],
    };
  }
}

function partialMapping(formalization) {
  return {
    supported: false,
    inputKind: 'partial-formalization',
    formalizationLevel: formalization?.level ?? null,
    unknowns: formalization?.unknowns ?? ['formalization'],
    refinementSuggestions: formalization?.refinementSuggestions ?? [],
    engine: RELATIVE_META_LOGIC_UPSTREAM,
  };
}

function normalizeProvidedEngine(options) {
  const provided = options.relativeMetaLogic ?? options.rmlEngine;
  if (!provided) {
    return null;
  }
  const engine = provided.default ?? provided;
  return {
    ...engine,
    mode: engine.mode ?? 'provided',
  };
}

function createRmlEnvironment(engine, options) {
  if (options.relativeMetaLogicOptions?.env) {
    return options.relativeMetaLogicOptions.env;
  }
  if (typeof engine.createEnv === 'function') {
    return engine.createEnv(options.relativeMetaLogicOptions ?? {});
  }
  if (typeof engine.Env === 'function') {
    return new engine.Env(options.relativeMetaLogicOptions ?? {});
  }
  return options.relativeMetaLogicOptions ?? {};
}

function arithmeticAst(expression) {
  return [
    formatNumber(expression.leftOperand),
    expression.operator,
    formatNumber(expression.rightOperand),
  ];
}

function arithmeticProgram(expression) {
  if (expression.type === 'arithmetic-equality') {
    return `(? ((${formatArithmeticExpression(expression)}) = ${formatNumber(
      expression.expected
    )}))`;
  }
  return `(? (${formatArithmeticExpression(expression)}))`;
}

function formatArithmeticExpression(expression) {
  return `${formatNumber(expression.leftOperand)} ${expression.operator} ${formatNumber(
    expression.rightOperand
  )}`;
}

function formatNumber(value) {
  return String(value);
}
