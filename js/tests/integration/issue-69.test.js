import { describe, expect, it } from 'test-anywhere';
import {
  RELATIVE_META_LOGIC_UPSTREAM,
  analyzeStatement,
  mapFormalizationToRelativeMetaLogicInput,
} from '../../src/index.js';

class FakeRmlEnv {}

function createFakeRmlEngine() {
  const calls = [];
  return {
    calls,
    engine: {
      Env: FakeRmlEnv,
      evalNode(ast) {
        calls.push(ast);
        return 2;
      },
    },
  };
}

describe('issue 69 - relative-meta-logic computability adapter', () => {
  it('maps supported formalization levels to relative-meta-logic inputs', () => {
    const arithmetic = analyzeStatement('1 + 1 = 2');
    const formalProgram = analyzeStatement(`
((p = true) has probability 1)
(? (p = true))
`);
    const partial = analyzeStatement('Earth orbits the Sun');

    const arithmeticMapping = mapFormalizationToRelativeMetaLogicInput(
      arithmetic.formalization
    );
    const formalProgramMapping = mapFormalizationToRelativeMetaLogicInput(
      formalProgram.formalization
    );
    const partialMapping = mapFormalizationToRelativeMetaLogicInput(
      partial.formalization
    );

    expect(arithmeticMapping.supported).toBe(true);
    expect(arithmeticMapping.inputKind).toBe('arithmetic');
    expect(arithmeticMapping.program).toBe('(? ((1 + 1) = 2))');
    expect(arithmeticMapping.ast).toEqual(['1', '+', '1']);
    expect(formalProgramMapping.supported).toBe(true);
    expect(formalProgramMapping.inputKind).toBe('formal-reasoning-program');
    expect(partialMapping.supported).toBe(false);
    expect(partialMapping.inputKind).toBe('partial-formalization');
  });

  it('uses a provided relative-meta-logic engine for arithmetic extraction', () => {
    const { calls, engine } = createFakeRmlEngine();
    const analysis = analyzeStatement('1 + 1 = 2', {
      relativeMetaLogic: engine,
    });

    expect(calls).toEqual([['1', '+', '1']]);
    expect(analysis.result.kind).toBe('computed');
    expect(analysis.result.value).toBe(true);
    expect(analysis.result.actual).toBe(2);
    expect(analysis.result.calculation.strategy).toBe(
      'relative-meta-logic-arithmetic-equality'
    );
    expect(analysis.result.supportingEvidence[0].sourceType).toBe(
      'relative-meta-logic'
    );
  });

  it('keeps local arithmetic as the fallback when RML is unavailable', () => {
    const analysis = analyzeStatement('1 + 1 = 2');

    expect(analysis.result.value).toBe(true);
    expect(analysis.result.actual).toBe(2);
    expect(analysis.result.calculation.strategy).toBe(
      'deterministic-arithmetic-equality'
    );
    expect(analysis.result.supportingEvidence[0].sourceType).toBe('computed');
  });

  it('pins the inspected upstream relative-meta-logic source', () => {
    expect(RELATIVE_META_LOGIC_UPSTREAM.name).toBe('relative-meta-logic');
    expect(RELATIVE_META_LOGIC_UPSTREAM.version).toBe('0.19.0');
    expect(RELATIVE_META_LOGIC_UPSTREAM.repository).toBe(
      'https://github.com/link-foundation/relative-meta-logic'
    );
    expect(RELATIVE_META_LOGIC_UPSTREAM.commit).toBe(
      '155276abb6093dcfa5c6c0fe58a7dd05ee3e2c44'
    );
    expect(RELATIVE_META_LOGIC_UPSTREAM.packagePath).toBe('js');
    expect(RELATIVE_META_LOGIC_UPSTREAM.npmPublished).toBe(false);
  });
});
