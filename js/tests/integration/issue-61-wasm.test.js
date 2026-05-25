import { describe, it, expect } from 'test-anywhere';
import {
  analyzeStatement,
  createWikidataSource,
  serializeLinksNotation,
  translateTextWith,
} from '../../src/index.js';
import { loadWasmCore } from '../../src/wasm-core.js';

const parisCapitalEvidence = {
  key: 'paris is the capital of france',
  polarity: 'support',
  weight: 1,
  sourceType: 'wikidata',
  situation: 'wikidata-structured-claim',
  sourceUrl: 'https://www.wikidata.org/wiki/Q142#P36',
  retrievedAt: '2026-05-25',
  claim: 'Wikidata Q142 France has capital P36 with value Q90 Paris.',
  identifiers: {
    subject: 'Q142',
    property: 'P36',
    object: 'Q90',
  },
};

const analysisExamples = [
  ['1 + 1 = 2'],
  ['1 + 1 = 1'],
  ['1 + 1'],
  ['Earth orbits the Sun'],
  ['Moon orbits the Sun'],
  ['Elon Musk is alive'],
  ['this statement is false'],
  ['Paris is the capital of France', { evidence: [parisCapitalEvidence] }],
];

describe('issue 61 - wasm-bindgen core wrapper parity', () => {
  it('exposes draft, selection, formalization, evaluation, confidence, and Links Notation helpers', async () => {
    const wasm = await loadWasmCore();
    const draft = wasm.createStatementDraft('1 + 1 = 2');
    const selected = wasm.selectInterpretation('1 + 1 = 2', 0);
    const formalization = wasm.formalizeStatement('1 + 1 = 2', 0);
    const evaluation = wasm.evaluateStatement('1 + 1 = 2', 0);
    const confidence = wasm.statementConfidence('1 + 1 = 2', 0);
    const linksNotation = wasm.serializeLinksNotation('1 + 1 = 2', 0);

    expect(draft.status).toBe('selection-required');
    expect(draft.interpretations.length).toBe(3);
    expect(selected.kind).toBe('arithmetic-equality');
    expect(formalization.expression.type).toBe('arithmetic-equality');
    expect(evaluation.value).toBe(true);
    expect(confidence).toBe(1);
    expect(linksNotation).toContain('links-network');
    expect(linksNotation).toContain('supports');
  });

  it('matches JavaScript analysis results for every non-translation acceptance example', async () => {
    const wasm = await loadWasmCore();

    for (const [input, options] of analysisExamples) {
      const jsAnalysis = analyzeStatement(input, options);
      const wasmAnalysis = wasm.analyzeStatement(input, 0);

      expect(wasmAnalysis.status).toBe(jsAnalysis.status);
      expect(wasmAnalysis.selectedInterpretation.kind).toBe(
        jsAnalysis.selectedInterpretation.kind
      );
      expect(wasmAnalysis.formalization.level).toBe(
        jsAnalysis.formalization.level
      );
      expect(wasmAnalysis.formalization.expression.type).toBe(
        jsAnalysis.formalization.expression.type
      );
      expect(wasmAnalysis.result.kind).toBe(jsAnalysis.result.kind);
      expect(wasmAnalysis.result.value).toEqual(jsAnalysis.result.value);
      expect(wasmAnalysis.result.confidence).toBe(jsAnalysis.result.confidence);

      const jsLinks = serializeLinksNotation(jsAnalysis.linksNetwork);
      const wasmLinks = wasm.serializeLinksNotation(input, 0);
      expect(wasmLinks.includes('links-network')).toBe(
        jsLinks.includes('links-network')
      );
      expect(wasmLinks.includes('result')).toBe(jsLinks.includes('result'));
    }
  });

  it('matches JavaScript translation behavior for the Hawaii acceptance examples', async () => {
    const wasm = await loadWasmCore();
    const fetch = createHawaiiFetch();
    const sources = [createWikidataSource({ language: 'en' })];

    const jsHawaii = await translateTextWith('Hawaii', {
      fetch,
      sources,
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });
    const wasmHawaii = wasm.translateKnownSemanticText('Hawaii', 'en', 'ru');

    expect(wasmHawaii.targetText).toBe(jsHawaii.plainText);
    expect(wasmHawaii.sourcePhrases[0].meaningId).toBe('Q782');
    expect(wasmHawaii.targetPhrases[0].meaningId).toBe('Q782');

    const jsSentence = await translateTextWith('Hawaii is a state.', {
      fetch,
      sources,
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });
    const wasmSentence = wasm.translateKnownSemanticText(
      'Hawaii is a state.',
      'en',
      'ru'
    );

    expect(wasmSentence.targetText).toBe(jsSentence.plainText);
    expect(wasmSentence.transformationSteps).toEqual(
      jsSentence.sentences[0].transformations
    );
    expect(
      wasmSentence.sourcePhrases.map((phrase) => phrase.meaningId)
    ).toEqual(['Q782', 'Q7275']);
    expect(
      wasmSentence.targetPhrases.map((phrase) => phrase.meaningId)
    ).toEqual(['Q782', 'Q35657']);
  });
});

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
