import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';
import {
  analyzeStatement,
  createWikidataSource,
  FORMALIZATION_LEVELS,
  serializeLinksNotation,
  translateTextWith,
} from '../../src/index.js';

const requirementsPath = 'docs/REQUIREMENTS.md';
const packagePath = 'package.json';
const jsWorkflowPath = '.github/workflows/js.yml';

const acceptanceInputs = [
  '1 + 1 = 2',
  '1 + 1 = 1',
  '1 + 1',
  'Earth orbits the Sun',
  'Moon orbits the Sun',
  'Elon Musk is alive',
  'this statement is false',
  'Paris is the capital of France',
  'Hawaii',
  'Hawaii is a state.',
];

const acceptanceGateFiles = [
  'js/tests/integration/issue-74-acceptance-gate.test.js',
  'js/tests/integration/issue-26-comparable-fixtures.test.js',
  'js/tests/integration/issue-54-formal-ai-corpus.test.js',
  'js/tests/integration/issue-72-parity.test.js',
];

const analysisCases = [
  {
    input: '1 + 1 = 2',
    assert(analysis) {
      expectComputedAnalysis(analysis, {
        interpretation: 'arithmetic-equality',
        expressionType: 'arithmetic-equality',
        value: true,
        actual: 2,
        expected: 2,
        confidence: 1,
        correctness: 1,
        signedConfidence: 1,
      });
      expect(analysis.result.supportingEvidence[0].sourceType).toBe('computed');
    },
  },
  {
    input: '1 + 1 = 1',
    assert(analysis) {
      expectComputedAnalysis(analysis, {
        interpretation: 'arithmetic-equality',
        expressionType: 'arithmetic-equality',
        value: false,
        actual: 2,
        expected: 1,
        confidence: 0,
        correctness: 0,
        signedConfidence: -1,
      });
      expect(analysis.result.refutingEvidence[0].sourceType).toBe('computed');
    },
  },
  {
    input: '1 + 1',
    assert(analysis) {
      expectComputedAnalysis(analysis, {
        interpretation: 'arithmetic-question',
        expressionType: 'arithmetic-question',
        value: 2,
        actual: 2,
        confidence: 1,
        correctness: 1,
        signedConfidence: 1,
      });
    },
  },
  {
    input: 'Earth orbits the Sun',
    assert(analysis) {
      expectEvidenceBackedAnalysis(analysis, {
        interpretation: 'wikidata-astronomy-claim',
        expressionType: 'wikidata-claim',
        wikidata: { subject: 'Q2', property: 'P397', object: 'Q525' },
        meaningTargets: ['Q2', 'P397', 'Q525'],
        evidenceIdentifiers: {
          subject: 'Q2',
          property: 'P397',
          object: 'Q525',
        },
      });
    },
  },
  {
    input: 'Moon orbits the Sun',
    assert(analysis) {
      expectEvidenceBackedAnalysis(analysis, {
        interpretation: 'wikidata-astronomy-chain-claim',
        expressionType: 'wikidata-claim',
        wikidata: {
          subject: 'Q405',
          property: 'P397',
          object: 'Q525',
          path: ['Q405', 'Q2', 'Q525'],
        },
        meaningTargets: ['Q405', 'P397', 'Q525'],
        evidenceIdentifiers: {
          subject: 'Q405',
          property: 'P397',
          object: 'Q525',
          path: 'Q405>P397>Q2>P397>Q525',
        },
      });
      expect(
        analysis.result.supportingEvidence[0].context.orbitPath.map(
          (entry) => entry.id
        )
      ).toEqual(['Q405', 'Q2', 'Q525']);
    },
  },
  {
    input: 'Elon Musk is alive',
    assert(analysis) {
      expectEvidenceBackedAnalysis(analysis, {
        interpretation: 'wikidata-person-liveness-claim',
        expressionType: 'wikidata-person-liveness-claim',
        wikidata: { subject: 'Q317521', property: 'P570', object: 'missing' },
        meaningTargets: ['Q317521', 'P570'],
        evidenceIdentifiers: {
          subject: 'Q317521',
          property: 'P570',
          object: 'missing',
        },
      });
    },
  },
  {
    input: 'this statement is false',
    assert(analysis) {
      expect(analysis.selectedInterpretation.kind).toBe(
        'self-referential-truth-claim'
      );
      expect(analysis.formalization.level).toBe(
        FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION
      );
      expect(analysis.formalization.expression.type).toBe(
        'self-reference-paradox'
      );
      expect(analysis.result.kind).toBe('evidence-estimate');
      expect(analysis.result.value).toBe('undetermined');
      expect(analysis.result.confidence).toBe(0.5);
      expect(analysis.result.correctness).toBe(0.5);
      expect(analysis.result.signedConfidence).toBe(0);
      expect(analysis.result.supportingEvidence).toEqual([]);
      expect(analysis.result.refutingEvidence).toEqual([]);
    },
  },
  {
    input: 'Paris is the capital of France',
    assert(analysis) {
      expectEvidenceBackedAnalysis(analysis, {
        interpretation: 'general-human-language-claim',
        expressionType: 'partial-claim',
        meaningTargets: ['Q90', 'P36', 'Q142'],
        evidenceIdentifiers: {
          subject: 'Q142',
          property: 'P36',
          object: 'Q90',
        },
      });
    },
  },
];

describe('issue 74 - no-regression acceptance gate', () => {
  it('covers every concrete acceptance example listed in the requirements', () => {
    expect(concreteAcceptanceInputsFromRequirements()).toEqual(
      acceptanceInputs
    );
  });

  it('keeps the current behavior for non-translation acceptance examples', () => {
    for (const testCase of analysisCases) {
      const analysis = analyzeStatement(testCase.input);
      expect(analysis.status).toBe('completed');
      expectTraceableAnalysis(analysis);
      testCase.assert(analysis);
    }
  });

  it('keeps the current behavior for translation acceptance examples', async () => {
    const hawaii = await translateAcceptanceExample('Hawaii');

    expect(hawaii.plainText).toBe('Гавайи');
    expect(hawaii.questions).toEqual([]);
    expect(hawaii.formalization.cst.phrases[0].entity.id).toBe('Q782');
    expect(hawaii.markdown).toContain('[Гавайи](');
    expect(hawaii.linksNotation).toContain('(translation:');

    const sentence = await translateAcceptanceExample('Hawaii is a state.');

    expect(sentence.plainText).toBe('Гавайи это штат.');
    expect(sentence.questions).toEqual([]);
    expect(sentence.formalization.markdown).toContain('Q782');
    expect(sentence.formalization.markdown).toContain('Q7275');
    expect(
      sentence.sentences[0].phrases.map((phrase) => phrase.source.entityId)
    ).toEqual(['Q782', 'lex:en:is', 'lex:en:a', 'Q7275']);
    expect(
      sentence.sentences[0].targetUnits.map((unit) => unit.targetEntityId)
    ).toEqual(['Q782', 'wikt:ru:это#Determiner:0', 'Q35657']);
    expect(sentence.sentences[0].transformations).toEqual([
      'english-article-omission',
      'english-copula-to-russian-eto',
      'english-us-state-predicate-to-russian-shtat',
    ]);
    expect(sentence.steps.some((step) => step.type === 'api-request')).toBe(
      true
    );
    expect(sentence.steps.some((step) => step.type === 'formalization')).toBe(
      true
    );
    expect(sentence.linksNotation).toContain('sentence-1');
  });

  it('wires competitor and formal-ai corpora into the same local gate', () => {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    const command = packageJson.scripts['test:acceptance'];

    expect(typeof command).toBe('string');
    for (const file of acceptanceGateFiles) {
      expect(command).toContain(file);
    }
  });

  it('runs the same no-regression gate in CI', () => {
    const workflow = readFileSync(jsWorkflowPath, 'utf8');

    expect(workflow).toContain('Run no-regression acceptance gate (Bun)');
    for (const file of acceptanceGateFiles) {
      expect(workflow).toContain(file);
    }
  });
});

function expectComputedAnalysis(analysis, expected) {
  expect(analysis.selectedInterpretation.kind).toBe(expected.interpretation);
  expect(analysis.formalization.level).toBe(
    FORMALIZATION_LEVELS.FULLY_COMPUTABLE_EXPRESSION
  );
  expect(analysis.formalization.expression.type).toBe(expected.expressionType);
  expect(analysis.result.kind).toBe('computed');
  expect(analysis.result.value).toBe(expected.value);
  expect(analysis.result.actual).toBe(expected.actual);
  if ('expected' in expected) {
    expect(analysis.result.expected).toBe(expected.expected);
  }
  expect(analysis.result.confidence).toBe(expected.confidence);
  expect(analysis.result.correctness).toBe(expected.correctness);
  expect(analysis.result.signedConfidence).toBe(expected.signedConfidence);
}

function expectEvidenceBackedAnalysis(analysis, expected) {
  expect(analysis.selectedInterpretation.kind).toBe(expected.interpretation);
  expect(analysis.formalization.level).toBe(
    FORMALIZATION_LEVELS.PARTIAL_FORMAL_EXPRESSION
  );
  expect(analysis.formalization.expression.type).toBe(expected.expressionType);
  if (expected.wikidata) {
    expect(analysis.formalization.expression.wikidata).toEqual(
      expected.wikidata
    );
  }
  for (const targetId of expected.meaningTargets) {
    expect(
      analysis.formalization.expression.meaningLinks.some(
        (link) => link.target.id === targetId
      )
    ).toBe(true);
  }
  expect(analysis.result.kind).toBe('evidence-estimate');
  expect(analysis.result.confidence).toBeGreaterThan(0.5);
  expect(analysis.result.confidence).toBeLessThan(1);
  expect(analysis.result.supportingEvidence.length).toBeGreaterThan(0);
  expect(analysis.result.supportingEvidence[0].sourceType).toBe('wikidata');
  expect(analysis.result.supportingEvidence[0].identifiers).toEqual(
    expected.evidenceIdentifiers
  );
  expect(analysis.result.refutingEvidence.length).toBeGreaterThan(0);
}

function expectTraceableAnalysis(analysis) {
  const linksNotation = serializeLinksNotation(analysis.linksNetwork);

  expect(analysis.resultLink.role).toBe('result');
  expect(analysis.reasoningSteps.length).toBeGreaterThan(0);
  expect(linksNotation).toContain('links-network');
  expect(linksNotation).toContain('result');
}

function concreteAcceptanceInputsFromRequirements() {
  const markdown = readFileSync(requirementsPath, 'utf8');
  const marker = '## Concrete Acceptance Examples';
  const start = markdown.indexOf(marker);
  if (start === -1) {
    throw new Error(`${requirementsPath} is missing ${marker}`);
  }

  const rest = markdown.slice(start + marker.length);
  const nextHeading = rest.search(/\n## /);
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  const bullets = [];
  let currentBullet = null;

  for (const line of section.split('\n')) {
    if (line.startsWith('- ')) {
      if (currentBullet) {
        bullets.push(currentBullet);
      }
      currentBullet = line;
    } else if (currentBullet && line.startsWith('  ')) {
      currentBullet += ` ${line.trim()}`;
    }
  }
  if (currentBullet) {
    bullets.push(currentBullet);
  }

  return bullets.map((bullet) => {
    const match = bullet.match(/`([^`]+)`/);
    if (!match) {
      throw new Error(`Concrete acceptance bullet has no code span: ${bullet}`);
    }
    return match[1];
  });
}

async function translateAcceptanceExample(input) {
  return translateTextWith(input, {
    fetch: createHawaiiFetch(),
    sources: [createWikidataSource({ language: 'en' })],
    sourceLanguage: 'en',
    targetLanguage: 'ru',
    now: () => 0,
  });
}

function createHawaiiFetch() {
  const search = {
    'Hawaii|item|en': [
      { id: 'Q782', label: 'Hawaii', description: 'US state' },
    ],
    'state|item|en': [
      { id: 'Q7275', label: 'state', description: 'federated state' },
    ],
  };
  const entities = {
    'Q782|en': entity('Q782', 'Hawaii', 'en', 'Hawaii'),
    'Q782|ru': entity('Q782', 'Гавайи', 'ru', 'Гавайи'),
    'Q7275|en': entity('Q7275', 'state', 'en', 'Federated state'),
    'Q7275|ru': entity('Q7275', 'государство', 'ru', 'Государство'),
  };

  return async (url) => {
    const parsed = new URL(String(url));
    const action = parsed.searchParams.get('action');
    if (action === 'wbsearchentities') {
      const key = [
        parsed.searchParams.get('search'),
        parsed.searchParams.get('type'),
        parsed.searchParams.get('language') ?? 'en',
      ].join('|');
      return jsonResponse({ search: search[key] ?? [] });
    }
    if (action === 'wbgetentities') {
      const language = parsed.searchParams.get('languages') ?? 'en';
      const rows = String(parsed.searchParams.get('ids') ?? '')
        .split('|')
        .map((id) => entities[`${id}|${language}`])
        .filter(Boolean);
      return jsonResponse({
        entities: Object.fromEntries(rows.map((row) => [row.id, row])),
      });
    }
    return jsonResponse({});
  };
}

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
  };
}

function entity(id, label, language, sitelink) {
  const site = `${language}wiki`;
  return {
    id,
    type: id.startsWith('P') ? 'property' : 'item',
    labels: { [language]: { value: label } },
    descriptions: { [language]: { value: `${label} description` } },
    claims: {},
    aliases: {},
    sitelinks: { [site]: { site, title: sitelink } },
  };
}
