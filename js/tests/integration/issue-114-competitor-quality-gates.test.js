import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';
import {
  analyzeStatement,
  createDoubletStore,
  searchTextUniqueness,
} from '../../src/index.js';

const gatePath =
  'js/tests/integration/issue-114-competitor-quality-gates.test.js';
const fixturePath = 'js/tests/fixtures/competitor-quality-gates.json';
const conceptsPath = 'docs/COMPARISON-CONCEPTS.md';
const featuresPath = 'docs/COMPARISON-FEATURES.md';
const packagePath = 'package.json';
const workflowPath = '.github/workflows/js.yml';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));

const assertionHandlers = {
  'computed-true': (testCase) => {
    const analysis = analyzeStatement(testCase.input);
    expect(analysis.result.kind).toBe('computed');
    expect(analysis.result.value).toBe(true);
    expect(analysis.result.correctness).toBe(1);
    expect(analysis.result.signedConfidence).toBe(1);
  },
  'computed-false': (testCase) => {
    const analysis = analyzeStatement(testCase.input);
    expect(analysis.result.kind).toBe('computed');
    expect(analysis.result.value).toBe(false);
    expect(analysis.result.correctness).toBe(0);
    expect(analysis.result.signedConfidence).toBe(-1);
  },
  'computed-question': (testCase) => {
    const analysis = analyzeStatement(testCase.input);
    expect(analysis.result.kind).toBe('computed');
    expect(analysis.result.value).toBe(testCase.expectedValue);
    expect(analysis.result.correctness).toBe(1);
  },
  'supported-claim': (testCase) => {
    const analysis = analyzeStatement(testCase.input);
    expect(analysis.result.kind).toBe('evidence-estimate');
    expect(analysis.result.correctness).toBeGreaterThan(0.5);
    expect(analysis.result.correctness).toBeLessThan(1);
    expect(analysis.result.supportingEvidence.length).toBeGreaterThan(0);
  },
  'refuted-claim': (testCase) => {
    const analysis = analyzeStatement(testCase.input);
    expect(analysis.result.kind).toBe('evidence-estimate');
    expect(analysis.result.correctness).toBeGreaterThanOrEqual(0);
    expect(analysis.result.correctness).toBeLessThan(0.5);
    expect(analysis.result.refutingEvidence.length).toBeGreaterThan(0);
  },
  'neutral-paradox': (testCase) => {
    const analysis = analyzeStatement(testCase.input);
    expect(analysis.result.kind).toBe('evidence-estimate');
    expect(analysis.result.value).toBe('undetermined');
    expect(analysis.result.correctness).toBe(0.5);
    expect(analysis.result.signedConfidence).toBe(0);
  },
  'unknown-claim': (testCase) => {
    const analysis = analyzeStatement(testCase.input);
    expect(analysis.result.kind).toBe('evidence-estimate');
    expect(analysis.result.value).toBe('unknown');
    expect(analysis.result.correctness).toBeNull();
  },
  'uniqueness-source-match': async (testCase) => {
    const result = await searchTextUniqueness(testCase.input, {
      sources: [
        {
          id: 'issue-114-published-source',
          label: 'Issue 114 Published Source',
          async search({ query }) {
            return query === 'Hawaii is a state'
              ? [
                  {
                    sourceId: 'issue-114-published-source',
                    sourceLabel: 'Issue 114 Published Source',
                    title: 'Issue 114 sample publication',
                    url: 'https://example.test/issue-114/hawaii',
                    snippet: 'Hawaii is a state.',
                    score: 0.91,
                    matchKind: 'exact-issue-114-sample',
                  },
                ]
              : [];
          },
        },
      ],
      now: () => '2026-05-26T00:00:00.000Z',
    });
    const [statement] = result.statements;
    expect(result.status).toBe('checked');
    expect(statement.matches.length).toBeGreaterThan(0);
    expect(statement.existingLikelihood).toBeGreaterThan(0.75);
    expect(statement.suggestedAction).toBe('cite-or-quote');
  },
  'doublets-self-loop': () => {
    const store = createDoubletStore();
    const index = store.create(1, 1);
    expect(index).toBe(1);
    expect(store.each()).toEqual([{ index: 1, source: 1, target: 1 }]);
    expect(store.toLinksNotation()).toContain('(1: 1 1)');
  },
};

function allCases() {
  return fixture.datasets.flatMap((dataset) =>
    dataset.cases.map((testCase) => ({ ...testCase, datasetId: dataset.id }))
  );
}

function countCases(status) {
  return allCases().filter((testCase) => testCase.status === status).length;
}

function enabledCases() {
  return allCases().filter((testCase) => testCase.status === 'enabled');
}

function roundRate(numerator, denominator) {
  return denominator === 0
    ? null
    : Number((numerator / denominator).toFixed(4));
}

function assertDatasetCounts(dataset) {
  const enabled = dataset.cases.filter(
    (testCase) => testCase.status === 'enabled'
  ).length;
  const deferred = dataset.cases.filter(
    (testCase) => testCase.status === 'deferred'
  ).length;

  expect(dataset.totalCaseCount).toBe(dataset.cases.length);
  expect(dataset.enabledCaseCount).toBe(enabled);
  expect(dataset.passingCaseCount).toBe(enabled);
  expect(dataset.deferredCaseCount).toBe(deferred);
  expect(dataset.enabledPassRate).toBe(roundRate(enabled, enabled));
  expect(dataset.executableCoverage).toBe(
    roundRate(enabled, dataset.cases.length)
  );
}

describe('issue 114 - competitor dataset quality gates', () => {
  it('tracks measured pass rates for every harvested competitor dataset', () => {
    expect(fixture.source).toEqual({
      issue: 114,
      measuredAt: '2026-05-26',
      command: 'npm run test:competitor-gates',
      ciGate:
        'npm run test:acceptance and the JS workflow no-regression acceptance gate',
      catalogue: 'docs/case-studies/issue-26/TEST-CASES.md',
    });

    for (const dataset of fixture.datasets) {
      assertDatasetCounts(dataset);
    }

    expect(fixture.summary).toEqual({
      datasetCount: fixture.datasets.length,
      totalCaseCount: allCases().length,
      enabledCaseCount: countCases('enabled'),
      passingCaseCount: countCases('enabled'),
      deferredCaseCount: countCases('deferred'),
      enabledPassRate: 1,
      executableCoverage: roundRate(countCases('enabled'), allCases().length),
    });
  });

  it('executes every enabled competitor dataset case as a recurring gate', async () => {
    for (const testCase of enabledCases()) {
      const handler = assertionHandlers[testCase.assertion];
      expect(typeof handler).toBe('function');
      try {
        await handler(testCase);
      } catch (error) {
        error.message = `${testCase.datasetId}/${testCase.id}: ${error.message}`;
        throw error;
      }
    }
  });

  it('keeps the competitor gate wired into local acceptance and CI', () => {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    const workflow = readFileSync(workflowPath, 'utf8');

    expect(packageJson.scripts['test:competitor-gates']).toContain(gatePath);
    expect(packageJson.scripts['test:acceptance']).toContain(gatePath);
    expect(workflow).toContain('Run no-regression acceptance gate (Bun)');
    expect(workflow).toContain(gatePath);
  });

  it('publishes the measured scores in both comparison documents', () => {
    const concepts = readFileSync(conceptsPath, 'utf8');
    const features = readFileSync(featuresPath, 'utf8');

    for (const doc of [concepts, features]) {
      const normalizedDoc = doc.replace(/\s+/g, ' ');
      expect(doc).toContain('Measured competitor quality gates');
      expect(doc).toContain('2026-05-26');
      expect(normalizedDoc).toContain('26/26 enabled cases passing');
      expect(normalizedDoc).toContain('26/36 total harvested cases executable');
      expect(normalizedDoc).toContain('72.2% executable coverage');
      expect(doc).toContain(gatePath);
      expect(doc).toContain(fixturePath);
    }

    for (const dataset of fixture.datasets) {
      expect(features).toContain(dataset.label);
    }
  });
});
