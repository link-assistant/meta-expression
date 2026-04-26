import { describe, it, expect } from 'test-anywhere';
import {
  analyzeStatement,
  createSeededRandom,
  defaultReasoningStrategyId,
  describeDisambiguation,
  disambiguatePhrases,
  findExampleOpposite,
  getPreparedExamples,
  getRandomExamples,
  getReasoningStrategy,
  listReasoningStrategies,
  orderReasoningSteps,
} from '../src/index.js';

describe('issue 9 - prepared examples and opposites', () => {
  it('exposes opposites for every prepared example', () => {
    const examples = getPreparedExamples();
    expect(examples.length).toBeGreaterThan(20);
    for (const example of examples) {
      expect(typeof example.opposite).toBe('string');
      expect(example.opposite.length).toBeGreaterThan(0);
    }
  });

  it('keeps opposites symmetric for negation pairs', () => {
    const examples = getPreparedExamples();
    const byInput = new Map(
      examples.map((example) => [example.input.trim().toLowerCase(), example])
    );
    for (const example of examples) {
      const oppositeExample = byInput.get(
        example.opposite.trim().toLowerCase()
      );
      if (oppositeExample) {
        expect(oppositeExample.opposite.trim().toLowerCase()).toBe(
          example.input.trim().toLowerCase()
        );
      }
    }
  });

  it('returns 4 random examples by default with deterministic seed', () => {
    const random = createSeededRandom(42);
    const sample = getRandomExamples(4, { random });
    expect(sample.length).toBe(4);
    const sample2 = getRandomExamples(4, { random: createSeededRandom(42) });
    expect(sample2.map((example) => example.input)).toEqual(
      sample.map((example) => example.input)
    );
  });

  it('finds opposites for known examples', () => {
    expect(findExampleOpposite('Moon orbits the Sun')).toBe(
      'Moon does not orbit the Sun'
    );
    expect(findExampleOpposite('Elon Musk is alive')).toBe('Elon Musk is dead');
    expect(findExampleOpposite('1 + 1 = 2')).toBe('1 + 1 = 1');
  });
});

describe('issue 9 - disambiguation longest-match', () => {
  it('matches Elon Musk as a single Wikidata Q id', () => {
    const result = disambiguatePhrases('Elon Musk is alive');
    const elonMuskMatch = result.matches.find(
      (match) => match.phrase === 'elon musk'
    );
    expect(elonMuskMatch).toBeTruthy();
    expect(elonMuskMatch.wikidata.id).toBe('Q317521');
  });

  it('exposes sub-phrase candidates as additional interpretations', () => {
    const candidates = disambiguatePhrases('Elon Musk is alive').candidates;
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].kind).toBe('sub-phrase-disambiguation');
    expect(
      candidates[0].metadata.subEntities.map((entity) => entity.label).join(' ')
    ).toContain('Elon');
  });

  it('describes phrase mappings for downstream consumers', () => {
    const description = describeDisambiguation('Moon orbits the Sun');
    const phrases = description.map((entry) => entry.phrase);
    expect(phrases).toContain('moon');
    expect(phrases).toContain('orbits');
    expect(phrases).toContain('sun');
  });
});

describe('issue 9 - reasoning strategies', () => {
  it('defaults to disambiguation-first', () => {
    expect(defaultReasoningStrategyId).toBe('disambiguation-first');
  });

  it('lists multiple strategies for meta-strategy composition', () => {
    const strategies = listReasoningStrategies();
    const ids = strategies.map((strategy) => strategy.id);
    expect(ids).toContain('disambiguation-first');
    expect(ids).toContain('evidence-first');
    expect(ids).toContain('formalization-first');
    expect(strategies.length).toBeGreaterThanOrEqual(3);
  });

  it('orders steps according to the selected strategy', () => {
    const links = [
      { id: 'r1', role: 'result', references: [], value: {} },
      { id: 'e1', role: 'evidence', references: [], value: {} },
      { id: 'm1', role: 'meaning', references: [], value: {} },
      { id: 'f1', role: 'formalization', references: [], value: {} },
      { id: 's1', role: 'selection', references: [], value: {} },
    ];
    const disambiguation = orderReasoningSteps(links, 'disambiguation-first');
    expect(disambiguation.map((step) => step.id)).toEqual([
      'm1',
      's1',
      'f1',
      'e1',
      'r1',
    ]);
    const evidenceFirst = orderReasoningSteps(links, 'evidence-first');
    expect(evidenceFirst[0].id).toBe('e1');
    const formalizationFirst = orderReasoningSteps(
      links,
      'formalization-first'
    );
    expect(formalizationFirst[0].id).toBe('s1');
  });

  it('returns the default strategy when an unknown id is requested', () => {
    expect(getReasoningStrategy('does-not-exist').id).toBe(
      defaultReasoningStrategyId
    );
  });
});

describe('issue 9 - analyzeStatement enrichment', () => {
  it('returns alternatives, dependencies, definitions, and confirmations', () => {
    const analysis = analyzeStatement('Moon orbits the Sun');
    expect(analysis.alternatives.length).toBeGreaterThan(0);
    expect(analysis.alternatives[0].text).toContain('Moon orbits Earth');
    expect(analysis.dependencies.length).toBeGreaterThan(0);
    expect(analysis.definitions.length).toBeGreaterThan(0);
    expect(analysis.confirmations.length).toBeGreaterThan(0);
    expect(analysis.confirmations[0].quote).toBeTruthy();
  });

  it('exposes refutations when evidence refutes the claim', () => {
    const analysis = analyzeStatement('1 + 1 = 1');
    expect(analysis.refutations.length).toBe(1);
    expect(analysis.confirmations.length).toBe(0);
  });

  it('attaches the selected reasoning strategy and ordered steps', () => {
    const analysis = analyzeStatement('Moon orbits the Sun', {
      reasoningStrategyId: 'evidence-first',
    });
    expect(analysis.reasoningStrategy.id).toBe('evidence-first');
    const phases = analysis.reasoningSteps
      .map((step) => step.reasoningPhase)
      .filter((phase) => phase !== 'context');
    if (phases.length > 1) {
      expect(phases[0]).toBe('evidence');
    }
  });

  it('returns the opposite statement for known examples', () => {
    const analysis = analyzeStatement('Moon orbits the Sun');
    expect(analysis.opposite).toBe('Moon does not orbit the Sun');
  });
});
