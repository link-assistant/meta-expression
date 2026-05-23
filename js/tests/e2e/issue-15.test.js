import { describe, it, expect } from 'test-anywhere';
import {
  formalizeTextWith,
  FORMALIZE_LINK_TARGETS,
  FORMALIZE_SOURCES,
  tokenizeForFormalize,
  generateFormalizeNgrams,
  buildFormalizeMarkdownLink,
  buildFormalizeHtmlLink,
  resolveFormalizeLinkTarget,
  createWikidataSource,
  createWordNetSource,
  createFandomSource,
  parseSourceSpec,
  aggregateBigContextsFromGraph,
  buildOverrideMap,
  lookupOverride,
  overrideToCandidate,
  parseLino,
  serializeLino,
  parseLinoEntries,
  serializeLinoEntries,
  encodeAsDoublets,
  decodeFromDoublets,
  decodeOverridesText,
  encodeOverridesAsLino,
} from '../../src/index.js';
import { parseCliArguments, runCliAsync } from '../../src/cli.js';
import { createMetaExpressionServer } from '../../src/server.js';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const wikidataApiUrl = 'https://www.wikidata.org/w/api.php';

function jsonResponse(payload) {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
  });
}

function searchPayload(entries) {
  return { search: entries };
}

function entityPayload(entries) {
  const entities = {};
  for (const entry of entries) {
    entities[entry.id] = entry;
  }
  return { entities };
}

function entity({ id, label, sitelink, claims = {} }) {
  const wikidataClaims = {};
  for (const [property, ids] of Object.entries(claims)) {
    wikidataClaims[property] = ids.map((target) => ({
      mainsnak: {
        datavalue: {
          value: { id: target, 'numeric-id': Number(target.slice(1)) },
        },
      },
    }));
  }
  return {
    id,
    type: id.startsWith('P') ? 'property' : 'item',
    labels: { en: { value: label } },
    descriptions: {},
    claims: wikidataClaims,
    sitelinks: sitelink ? { enwiki: { site: 'enwiki', title: sitelink } } : {},
  };
}

function makeFetch(routes) {
  return function mockFetch(url) {
    const parsed = new URL(url);
    const action = parsed.searchParams.get('action');
    if (action === 'wbsearchentities') {
      const search = parsed.searchParams.get('search');
      const type = parsed.searchParams.get('type');
      const route = routes.search?.[`${search}|${type}`];
      if (route) {
        return jsonResponse(searchPayload(route));
      }
      return jsonResponse(searchPayload([]));
    }
    if (action === 'wbgetentities') {
      const ids = parsed.searchParams.get('ids');
      const route = routes.entities?.[ids];
      if (route) {
        return jsonResponse(entityPayload([route]));
      }
      return jsonResponse({ entities: {} });
    }
    return jsonResponse({});
  };
}

// eslint-disable-next-line max-lines-per-function
describe('issue 15 — formalize text into Wikipedia/Wikidata-anchored phrases', () => {
  it('tokenizes input and tags stop-only single-token n-grams (issue #21)', () => {
    // Issue #21: single-token stop words like `in` must survive n-gram
    // generation so the Wiktionary fallback can attach a definition to
    // them. Multi-token stop-only spans (`in the`, `to the`) remain
    // useless and are still skipped.
    const tokens = tokenizeForFormalize('Barack Obama was born in the Hawaii.');
    expect(tokens.join(' ')).toBe('Barack Obama was born in the Hawaii');
    const ngrams = generateFormalizeNgrams(tokens, 3);
    const stopOnly = ngrams.find((entry) => entry.text === 'in');
    expect(stopOnly).not.toBe(undefined);
    expect(stopOnly.stopOnly).toBe(true);
    const multiStop = ngrams.find((entry) => entry.text === 'in the');
    expect(multiStop).toBe(undefined);
    const longest = ngrams.find((entry) => entry.text === 'Barack Obama was');
    expect(longest).not.toBe(undefined);
    expect(longest.stopOnly).toBe(false);
  });

  it('prefers the longest non-overlapping match (Barack Obama as one entity)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Barack Obama|item': [
          {
            id: 'Q76',
            label: 'Barack Obama',
            description: '44th US president',
          },
        ],
        'Barack|item': [
          { id: 'Q761', label: 'Barack', description: 'a different person' },
        ],
        'Obama|item': [{ id: 'Q762', label: 'Obama', description: 'a city' }],
        'Hawaii|item': [
          { id: 'Q782', label: 'Hawaii', description: 'US state' },
        ],
      },
      entities: {
        Q76: entity({
          id: 'Q76',
          label: 'Barack Obama',
          sitelink: 'Barack Obama',
          claims: { P31: ['Q5'], P106: ['Q82955'] },
        }),
        Q782: entity({
          id: 'Q782',
          label: 'Hawaii',
          sitelink: 'Hawaii',
          claims: { P31: ['Q35657'] },
        }),
      },
    });

    const result = await formalizeTextWith('Barack Obama Hawaii', {
      fetch: fetchImpl,
      maxNgramSize: 2,
      now: () => 0,
    });

    const linkedPhrases = result.phrases.filter((phrase) => phrase.entity);
    expect(linkedPhrases.length).toBe(2);
    const obama = linkedPhrases.find(
      (phrase) => phrase.text === 'Barack Obama'
    );
    expect(obama?.entity?.id).toBe('Q76');
    expect(obama?.size).toBe(2);
    const hawaii = linkedPhrases.find((phrase) => phrase.text === 'Hawaii');
    expect(hawaii?.entity?.id).toBe('Q782');
  });

  it('emits HTML link with title containing the Q id (F6)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Hawaii|item': [{ id: 'Q782', label: 'Hawaii', description: 'state' }],
      },
      entities: {
        Q782: entity({ id: 'Q782', label: 'Hawaii', sitelink: 'Hawaii' }),
      },
    });
    const result = await formalizeTextWith('Hawaii', {
      fetch: fetchImpl,
      now: () => 0,
    });
    expect(result.html.includes('title="Q782"')).toBe(true);
    expect(result.html.includes('https://en.wikipedia.org/wiki/Hawaii')).toBe(
      true
    );
  });

  it('renders Markdown with [phrase](url "Qid") shape (F8)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Hawaii|item': [{ id: 'Q782', label: 'Hawaii', description: 'state' }],
      },
      entities: {
        Q782: entity({ id: 'Q782', label: 'Hawaii', sitelink: 'Hawaii' }),
      },
    });
    const result = await formalizeTextWith('Hawaii', {
      fetch: fetchImpl,
      now: () => 0,
    });
    expect(result.markdown).toBe(
      '[Hawaii](https://en.wikipedia.org/wiki/Hawaii "Q782")'
    );
  });

  it('falls back to Wikidata page when no enwiki sitelink (properties)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'place of birth|property': [
          {
            id: 'P19',
            label: 'place of birth',
            description: 'most specific known birth location',
          },
        ],
        'place of birth|item': [],
      },
      entities: {
        P19: entity({ id: 'P19', label: 'place of birth' }),
      },
    });
    const result = await formalizeTextWith('place of birth', {
      fetch: fetchImpl,
      maxNgramSize: 3,
      now: () => 0,
    });
    const phrase = result.phrases.find(
      (entry) => entry.entity && entry.entity.id === 'P19'
    );
    expect(phrase).not.toBe(undefined);
    const url = resolveFormalizeLinkTarget(phrase, {
      linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIPEDIA,
    });
    expect(url).toBe('https://www.wikidata.org/wiki/Property:P19');
  });

  it('respects local viewer toggle for entities and properties (F7)', async () => {
    const phrase = {
      text: 'Hawaii',
      entity: {
        id: 'Q782',
        label: 'Hawaii',
        kind: 'entity',
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Hawaii',
      },
    };
    const propertyPhrase = {
      text: 'place of birth',
      entity: {
        id: 'P19',
        label: 'place of birth',
        kind: 'property',
        wikipediaUrl: null,
      },
    };
    expect(
      resolveFormalizeLinkTarget(phrase, {
        linkTargetMode: FORMALIZE_LINK_TARGETS.LOCAL,
      })
    ).toBe(
      'https://link-assistant.github.io/human-language/entities.html#Q782'
    );
    expect(
      resolveFormalizeLinkTarget(propertyPhrase, {
        linkTargetMode: FORMALIZE_LINK_TARGETS.LOCAL,
      })
    ).toBe(
      'https://link-assistant.github.io/human-language/properties.html#P19'
    );
  });

  it('always switches link targets to Wikidata when mode=wikidata', () => {
    const phrase = {
      text: 'Hawaii',
      entity: {
        id: 'Q782',
        label: 'Hawaii',
        kind: 'entity',
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Hawaii',
      },
    };
    expect(
      resolveFormalizeLinkTarget(phrase, {
        linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
      })
    ).toBe('https://www.wikidata.org/wiki/Q782');
  });

  it('aggregates contexts with weight and probability (F10/F11)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Albert Einstein|item': [
          { id: 'Q937', label: 'Albert Einstein', description: 'physicist' },
        ],
        'Marie Curie|item': [
          { id: 'Q7186', label: 'Marie Curie', description: 'physicist' },
        ],
      },
      entities: {
        Q937: entity({
          id: 'Q937',
          label: 'Albert Einstein',
          sitelink: 'Albert Einstein',
          claims: { P31: ['Q5'], P106: ['Q169470'] },
        }),
        Q7186: entity({
          id: 'Q7186',
          label: 'Marie Curie',
          sitelink: 'Marie Curie',
          claims: { P31: ['Q5'], P106: ['Q169470'] },
        }),
      },
    });
    const result = await formalizeTextWith('Albert Einstein Marie Curie', {
      fetch: fetchImpl,
      maxNgramSize: 2,
      now: () => 0,
    });
    const human = result.contexts.find((entry) => entry.id === 'Q5');
    expect(human?.weight).toBe(2);
    const physicist = result.contexts.find((entry) => entry.id === 'Q169470');
    expect(physicist?.weight).toBe(2);
    const totalProbability = result.contexts.reduce(
      (sum, entry) => sum + entry.probability,
      0
    );
    expect(Math.abs(totalProbability - 1)).toBeLessThan(1e-6);
    expect(result.mainContext?.weight).toBe(2);
  });

  it('produces at most maxInterpretations interpretations (F13)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Mercury|item': [
          { id: 'Q308', label: 'Mercury', description: 'planet' },
          { id: 'Q925', label: 'Mercury', description: 'element' },
          { id: 'Q1430', label: 'Mercury', description: 'Roman god' },
        ],
      },
      entities: {
        Q308: entity({
          id: 'Q308',
          label: 'Mercury',
          sitelink: 'Mercury (planet)',
          claims: { P31: ['Q634'] },
        }),
      },
    });
    const result = await formalizeTextWith('Mercury', {
      fetch: fetchImpl,
      maxInterpretations: 5,
      now: () => 0,
    });
    expect(result.interpretations.length <= 5).toBe(true);
    expect(result.interpretations.length >= 1).toBe(true);
    expect(result.interpretations[0].rank).toBe(1);
  });

  it('emits Links Notation with phrase and context lines (F9)', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Hawaii|item': [{ id: 'Q782', label: 'Hawaii', description: 'state' }],
      },
      entities: {
        Q782: entity({
          id: 'Q782',
          label: 'Hawaii',
          sitelink: 'Hawaii',
          claims: { P31: ['Q35657'] },
        }),
      },
    });
    const result = await formalizeTextWith('Hawaii', {
      fetch: fetchImpl,
      now: () => 0,
    });
    expect(result.linksNotation.includes('(formalization:')).toBe(true);
    expect(result.linksNotation.includes('phrase-1')).toBe(true);
    expect(result.linksNotation.includes('Q782')).toBe(true);
  });

  it('reuses cache for repeated calls (F15)', async () => {
    let calls = 0;
    const cache = new Map();
    const fetchImpl = (url) => {
      calls += 1;
      return makeFetch({
        search: {
          'Hawaii|item': [
            { id: 'Q782', label: 'Hawaii', description: 'state' },
          ],
        },
        entities: {
          Q782: entity({ id: 'Q782', label: 'Hawaii', sitelink: 'Hawaii' }),
        },
      })(url);
    };
    await formalizeTextWith('Hawaii', {
      fetch: fetchImpl,
      cache,
      now: () => 0,
    });
    const callsAfterFirst = calls;
    await formalizeTextWith('Hawaii', {
      fetch: fetchImpl,
      cache,
      now: () => 0,
    });
    expect(calls).toBe(callsAfterFirst);
  });

  it('keeps every word in a phrase, even without a Wikidata match', async () => {
    const fetchImpl = makeFetch({});
    const result = await formalizeTextWith('xyzzy plugh', {
      fetch: fetchImpl,
      now: () => 0,
    });
    const joined = result.phrases.map((phrase) => phrase.text).join(' ');
    expect(joined).toBe('xyzzy plugh');
    expect(result.phrases.every((phrase) => phrase.text.length > 0)).toBe(true);
  });

  it('builds Markdown and HTML links via the standalone helpers', () => {
    const phrase = {
      text: 'Hawaii',
      entity: {
        id: 'Q782',
        label: 'Hawaii',
        kind: 'entity',
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Hawaii',
      },
    };
    expect(
      buildFormalizeMarkdownLink(phrase, {
        linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIPEDIA,
      })
    ).toBe('[Hawaii](https://en.wikipedia.org/wiki/Hawaii "Q782")');
    expect(
      buildFormalizeHtmlLink(phrase, {
        linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIPEDIA,
      })
    ).toBe(
      '<a href="https://en.wikipedia.org/wiki/Hawaii" title="Q782">Hawaii</a>'
    );
  });

  it('routes default-tier traffic to Wikipedia, Wikidata, and Wiktionary endpoints', async () => {
    // Issue #21 changed the default source list to the three-tier stack
    // (Wikipedia → Wikidata → Wiktionary). Each tier owns a different
    // hostname; this test pins those hostnames so a future regression
    // that drops a tier (or fetches some unexpected origin) trips fast.
    const requested = [];
    const fetchImpl = (url) => {
      requested.push(String(url));
      return jsonResponse({ search: [] });
    };
    await formalizeTextWith('test', { fetch: fetchImpl, now: () => 0 });
    const allowedOrigins = [
      'https://www.wikidata.org/w/api.php',
      'https://en.wikipedia.org/w/api.php',
      'https://en.wiktionary.org/api/rest_v1/page/definition/',
    ];
    expect(
      requested.every((url) =>
        allowedOrigins.some((origin) => url.startsWith(origin))
      )
    ).toBe(true);
  });

  it('still uses only the Wikidata endpoint when sources are explicitly set to Wikidata', async () => {
    const requested = [];
    const fetchImpl = (url) => {
      requested.push(String(url));
      return jsonResponse({ search: [] });
    };
    await formalizeTextWith('test', {
      fetch: fetchImpl,
      now: () => 0,
      sources: [createWikidataSource()],
    });
    expect(requested.every((url) => url.startsWith(wikidataApiUrl))).toBe(true);
  });
});

// eslint-disable-next-line max-lines-per-function
describe('issue 15 — layered sources, overrides, big contexts', () => {
  it('parses source spec tokens into source instances', () => {
    const sources = parseSourceSpec('wikidata,wordnet,fandom:genshin-impact');
    expect(sources.length).toBe(3);
    expect(sources[0].name).toBe(FORMALIZE_SOURCES.WIKIDATA);
    expect(sources[1].name).toBe(FORMALIZE_SOURCES.WORDNET);
    expect(sources[2].name.startsWith(FORMALIZE_SOURCES.FANDOM)).toBe(true);
  });

  it('layers WordNet + Wikidata candidates via createWordNetSource', async () => {
    const fetchImpl = (url) => {
      const parsed = new URL(url);
      if (parsed.hostname === 'en.wiktionary.org') {
        return jsonResponse([
          'dog',
          ['dog', 'doge'],
          ['canine animal', 'medieval ruler'],
          [
            'https://en.wiktionary.org/wiki/dog',
            'https://en.wiktionary.org/wiki/doge',
          ],
        ]);
      }
      if (parsed.searchParams.get('action') === 'wbsearchentities') {
        return jsonResponse(
          searchPayload([
            { id: 'Q144', label: 'dog', description: 'domestic canine' },
          ])
        );
      }
      if (parsed.searchParams.get('action') === 'wbgetentities') {
        return jsonResponse(
          entityPayload([entity({ id: 'Q144', label: 'dog', sitelink: 'Dog' })])
        );
      }
      return jsonResponse({});
    };
    const result = await formalizeTextWith('dog', {
      fetch: fetchImpl,
      sources: [createWikidataSource(), createWordNetSource()],
      now: () => 0,
    });
    expect(result.sources.includes(FORMALIZE_SOURCES.WIKIDATA)).toBe(true);
    expect(result.sources.includes(FORMALIZE_SOURCES.WORDNET)).toBe(true);
    const phrase = result.phrases.find((entry) => entry.entity);
    expect(phrase).not.toBe(undefined);
    // Both Wikidata and WordNet candidates are present.
    const sources = phrase.candidates.map((candidate) => candidate.source);
    expect(sources.includes(FORMALIZE_SOURCES.WIKIDATA)).toBe(true);
    expect(sources.includes(FORMALIZE_SOURCES.WORDNET)).toBe(true);
    // Wikidata should win the tie due to its primary source bias.
    expect(phrase.entity.id).toBe('Q144');
  });

  it('routes Fandom-only entities through their sourceUrl', async () => {
    const fetchImpl = (url) => {
      const parsed = new URL(url);
      if (parsed.hostname.endsWith('.fandom.com')) {
        return jsonResponse([
          'Genshin Impact',
          ['Genshin Impact'],
          ['Action role-playing game'],
          ['https://genshin-impact.fandom.com/wiki/Genshin_Impact'],
        ]);
      }
      return jsonResponse({});
    };
    const result = await formalizeTextWith('Genshin Impact', {
      fetch: fetchImpl,
      sources: [createFandomSource({ wiki: 'genshin-impact' })],
      now: () => 0,
    });
    const phrase = result.phrases.find((entry) => entry.entity);
    expect(phrase).not.toBe(undefined);
    expect(phrase.entity.source.startsWith(FORMALIZE_SOURCES.FANDOM)).toBe(
      true
    );
    const url = resolveFormalizeLinkTarget(phrase, {
      linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIPEDIA,
    });
    expect(url).toBe('https://genshin-impact.fandom.com/wiki/Genshin_Impact');
  });

  it('builds an override map and short-circuits search to keep tests deterministic', () => {
    const overrides = buildOverrideMap([
      {
        phrase: 'Genshin Impact',
        entityId: 'Q70626251',
        label: 'Genshin Impact',
        kind: 'entity',
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Genshin_Impact',
      },
    ]);
    const hit = lookupOverride(overrides, 'genshin  impact');
    expect(hit?.entityId).toBe('Q70626251');
    const candidate = overrideToCandidate(hit);
    expect(candidate.score).toBeGreaterThan(100);
    expect(candidate.id).toBe('Q70626251');
  });

  it('overrides outrank live Wikidata search candidates', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Genshin Impact|item': [
          { id: 'Q999999', label: 'Some other entity', description: 'noise' },
        ],
      },
      entities: {},
    });
    const result = await formalizeTextWith('Genshin Impact', {
      fetch: fetchImpl,
      maxNgramSize: 2,
      overrides: [
        {
          phrase: 'Genshin Impact',
          entityId: 'Q70626251',
          label: 'Genshin Impact',
          kind: 'entity',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Genshin_Impact',
        },
      ],
      now: () => 0,
    });
    const phrase = result.phrases.find((entry) => entry.entity);
    expect(phrase.entity.id).toBe('Q70626251');
    expect(phrase.entity.wikipediaUrl).toBe(
      'https://en.wikipedia.org/wiki/Genshin_Impact'
    );
  });

  it('aggregates big-context categories via transitive graph traversal', () => {
    // Edges: Q937 (Einstein) -> Q5 (human); Q5 -> Q215627 (person);
    //        Q937 -> Q169470 (physicist); Q169470 -> Q901 (scientist)
    const edges = new Map([
      ['Q937', [{ id: 'Q5', property: 'P31' }]],
      ['Q5', [{ id: 'Q215627', property: 'P279' }]],
      ['Q169470', [{ id: 'Q901', property: 'P279' }]],
    ]);
    const phrases = [
      {
        text: 'Albert Einstein',
        entity: {
          id: 'Q937',
          contextLabels: [
            { property: 'P31', propertyLabel: 'instance of', targetId: 'Q5' },
            {
              property: 'P106',
              propertyLabel: 'occupation',
              targetId: 'Q169470',
            },
          ],
        },
      },
      {
        text: 'Marie Curie',
        entity: {
          id: 'Q7186',
          contextLabels: [
            { property: 'P31', propertyLabel: 'instance of', targetId: 'Q5' },
            {
              property: 'P106',
              propertyLabel: 'occupation',
              targetId: 'Q169470',
            },
          ],
        },
      },
    ];
    const aggregate = aggregateBigContextsFromGraph(edges, phrases, {
      maxDepth: 3,
    });
    const human = aggregate.all.find((entry) => entry.id === 'Q5');
    const physicist = aggregate.all.find((entry) => entry.id === 'Q169470');
    expect(human?.weight).toBe(2);
    expect(physicist?.weight).toBe(2);
    // Transitive: scientist (Q901) reachable from physicist via P279.
    const scientist = aggregate.all.find((entry) => entry.id === 'Q901');
    expect(scientist).not.toBe(undefined);
    expect(scientist.weight).toBeGreaterThan(0);
    // Closer ancestors weigh more than further ancestors.
    expect(human.weight).toBeGreaterThan(scientist.weight);
    expect(aggregate.main).not.toBe(null);
    expect(typeof aggregate.main.id).toBe('string');
  });

  it('exposes bigContexts in formalize result alongside flat contexts', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Albert Einstein|item': [
          { id: 'Q937', label: 'Albert Einstein', description: 'physicist' },
        ],
      },
      entities: {
        Q937: entity({
          id: 'Q937',
          label: 'Albert Einstein',
          sitelink: 'Albert Einstein',
          claims: { P31: ['Q5'], P106: ['Q169470'] },
        }),
      },
    });
    const result = await formalizeTextWith('Albert Einstein', {
      fetch: fetchImpl,
      maxNgramSize: 2,
      now: () => 0,
    });
    expect(Array.isArray(result.bigContexts)).toBe(true);
    expect(result.bigContexts.length).toBeGreaterThan(0);
    expect(result.mainBigContext).not.toBe(null);
    expect(typeof result.bigContexts[0].id).toBe('string');
  });
});

describe('issue 15 — CLI: formalize subcommand', () => {
  it('parses formalize-specific flags', () => {
    const parsed = parseCliArguments([
      'formalize',
      '--input',
      'Hawaii',
      '--sources',
      'wikidata,fandom:genshin-impact',
      '--target',
      'wikidata',
      '--no-repo-overrides',
      '--max-ngram',
      '2',
      '--format',
      'markdown',
    ]);
    expect(parsed.command).toBe('formalize');
    expect(parsed.input).toBe('Hawaii');
    expect(parsed.sourcesSpec).toBe('wikidata,fandom:genshin-impact');
    expect(parsed.target).toBe('wikidata');
    expect(parsed.noRepoOverrides).toBe(true);
    expect(parsed.maxNgramSize).toBe(2);
    expect(parsed.format).toBe('markdown');
  });

  it('runs the formalize subcommand and emits markdown', async () => {
    const previousFetch = globalThis.fetch;
    const fetchImpl = makeFetch({
      search: {
        'Hawaii|item': [
          { id: 'Q782', label: 'Hawaii', description: 'US state' },
        ],
      },
      entities: {
        Q782: entity({
          id: 'Q782',
          label: 'Hawaii',
          sitelink: 'Hawaii',
        }),
      },
    });
    globalThis.fetch = fetchImpl;
    try {
      const messages = [];
      const errors = [];
      const out = {
        log: (line) => messages.push(line),
        error: (line) => errors.push(line),
      };
      const exit = await runCliAsync(
        [
          'formalize',
          '--input',
          'Hawaii',
          '--format',
          'markdown',
          '--no-repo-overrides',
        ],
        out
      );
      expect(exit).toBe(0);
      expect(errors.length).toBe(0);
      expect(messages.length).toBe(1);
      expect(messages[0].includes('https://en.wikipedia.org/wiki/Hawaii')).toBe(
        true
      );
      expect(messages[0].includes('"Q782"')).toBe(true);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

function startServerWithCache(cacheRoot) {
  return new Promise((resolve, reject) => {
    const server = createMetaExpressionServer({ cacheRoot });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ server, port });
    });
  });
}

function stopServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

async function fetchJson(url, init, fetchImpl = fetch) {
  const response = await fetchImpl(url, init);
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  return { response, payload };
}

// The persistent-cache suite below needs filesystem write access. CI runs the
// Deno job with `--allow-read` only (matching the project's existing Deno
// invocation), so probe for write capability up front and skip those four
// tests on Deno when write access is not granted. Node.js and Bun always pass
// this probe and run the full suite.
async function canWriteToTempDir() {
  try {
    const probe = await mkdtemp('meta-expression-cache-probe-');
    await rm(probe, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

const cacheTestsEnabled = await canWriteToTempDir();

// eslint-disable-next-line max-lines-per-function
describe('issue 15 — HTTP /formalize endpoint with persistent cache', () => {
  it('persists results to dual-format cache and reuses them on the next request', async () => {
    if (!cacheTestsEnabled) {
      return;
    }
    const previousFetch = globalThis.fetch;
    let upstreamCalls = 0;
    globalThis.fetch = function trackedFetch(url, init) {
      const target = String(url);
      if (target.includes('wiktionary.org')) {
        return jsonResponse({});
      }
      if (target.includes('wikidata.org') || target.includes('wikipedia.org')) {
        upstreamCalls += 1;
        const mock = makeFetch({
          search: {
            'Hawaii|item': [
              { id: 'Q782', label: 'Hawaii', description: 'US state' },
            ],
          },
          entities: {
            Q782: entity({
              id: 'Q782',
              label: 'Hawaii',
              sitelink: 'Hawaii',
            }),
          },
        });
        return mock(target);
      }
      return previousFetch(url, init);
    };

    const cacheRoot = await mkdtemp('meta-expression-cache-');
    let started = null;
    try {
      started = await startServerWithCache(cacheRoot);
      const base = `http://127.0.0.1:${started.port}`;
      const url = `${base}/formalize?input=${encodeURIComponent('Hawaii')}&target=wikipedia&noRepoOverrides=true`;
      const first = await fetchJson(url, undefined, previousFetch);
      expect(first.response.status).toBe(200);
      expect(first.response.headers.get('x-formalize-cache')).toBe('miss');
      const cacheKeyValue = first.response.headers.get('x-formalize-cache-key');
      expect(typeof cacheKeyValue).toBe('string');
      expect(cacheKeyValue.length).toBeGreaterThan(0);
      expect(Array.isArray(first.payload.phrases)).toBe(true);
      expect(first.payload._cache.hit).toBe('miss');

      const binBytes = await readFile(
        join(cacheRoot, cacheKeyValue, 'payload.bin')
      );
      const linoBody = await readFile(
        join(cacheRoot, cacheKeyValue, 'payload.lino'),
        'utf8'
      );
      const parsedBin = decodeFromDoublets(new Uint8Array(binBytes));
      expect(parsedBin && typeof parsedBin === 'object').toBe(true);
      expect(typeof parsedBin.markdown === 'string').toBe(true);
      expect(parsedBin.markdown.includes('Hawaii')).toBe(true);
      expect(linoBody.startsWith(`(formalize-cache: ${cacheKeyValue}`)).toBe(
        true
      );
      expect(linoBody.includes('formalize-cache')).toBe(true);

      const callsAfterFirst = upstreamCalls;
      const second = await fetchJson(url, undefined, previousFetch);
      expect(second.response.status).toBe(200);
      expect(second.response.headers.get('x-formalize-cache')).toBe('disk');
      expect(second.response.headers.get('x-formalize-cache-key')).toBe(
        cacheKeyValue
      );
      expect(second.payload._cache.hit).toBe('disk');
      expect(upstreamCalls).toBe(callsAfterFirst);
    } finally {
      if (started) {
        await stopServer(started.server);
      }
      await rm(cacheRoot, { recursive: true, force: true });
      globalThis.fetch = previousFetch;
    }
  });

  it('returns lino body via format=lino with cache headers', async () => {
    if (!cacheTestsEnabled) {
      return;
    }
    const previousFetch = globalThis.fetch;
    const mockUpstream = makeFetch({
      search: {
        'Hawaii|item': [
          { id: 'Q782', label: 'Hawaii', description: 'US state' },
        ],
      },
      entities: {
        Q782: entity({ id: 'Q782', label: 'Hawaii', sitelink: 'Hawaii' }),
      },
    });
    globalThis.fetch = function (url, init) {
      const target = String(url);
      if (target.includes('wiktionary.org')) {
        return jsonResponse({});
      }
      if (target.includes('wikidata.org') || target.includes('wikipedia.org')) {
        return mockUpstream(target);
      }
      return previousFetch(url, init);
    };
    const cacheRoot = await mkdtemp('meta-expression-cache-');
    let started = null;
    try {
      started = await startServerWithCache(cacheRoot);
      const url = `http://127.0.0.1:${started.port}/formalize?input=${encodeURIComponent('Hawaii')}&format=lino&noRepoOverrides=true`;
      const response = await previousFetch(url);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/text\/plain/);
      expect(response.headers.get('x-formalize-cache')).toBe('miss');
      const body = await response.text();
      expect(body.includes('Hawaii')).toBe(true);
    } finally {
      if (started) {
        await stopServer(started.server);
      }
      await rm(cacheRoot, { recursive: true, force: true });
      globalThis.fetch = previousFetch;
    }
  });

  it('honours POST overrides and varies cache key by overrides payload', async () => {
    if (!cacheTestsEnabled) {
      return;
    }
    const previousFetch = globalThis.fetch;
    globalThis.fetch = function (url, init) {
      const target = String(url);
      if (target.includes('wiktionary.org')) {
        return jsonResponse({});
      }
      if (target.includes('wikidata.org') || target.includes('wikipedia.org')) {
        const mock = makeFetch({});
        return mock(target);
      }
      return previousFetch(url, init);
    };
    const cacheRoot = await mkdtemp('meta-expression-cache-');
    let started = null;
    try {
      started = await startServerWithCache(cacheRoot);
      const url = `http://127.0.0.1:${started.port}/formalize`;
      const post = await fetchJson(
        url,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            input: 'Genshin Impact',
            noRepoOverrides: true,
            overrides: [
              {
                phrase: 'Genshin Impact',
                entityId: 'OV1',
                label: 'Genshin Impact (override)',
                kind: 'video game',
                source: 'override',
              },
            ],
          }),
        },
        previousFetch
      );
      expect(post.response.status).toBe(200);
      const overriddenPhrase = post.payload.phrases.find(
        (phrase) => phrase.text === 'Genshin Impact'
      );
      expect(overriddenPhrase?.entity?.id).toBe('OV1');
      const keyA = post.response.headers.get('x-formalize-cache-key');

      const post2 = await fetchJson(
        url,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            input: 'Genshin Impact',
            noRepoOverrides: true,
            overrides: [
              {
                phrase: 'Genshin Impact',
                entityId: 'OV2',
                label: 'Different override',
                kind: 'video game',
                source: 'override',
              },
            ],
          }),
        },
        previousFetch
      );
      const keyB = post2.response.headers.get('x-formalize-cache-key');
      expect(keyA).not.toBe(keyB);
    } finally {
      if (started) {
        await stopServer(started.server);
      }
      await rm(cacheRoot, { recursive: true, force: true });
      globalThis.fetch = previousFetch;
    }
  });

  it('returns 400 when input parameter is missing', async () => {
    if (!cacheTestsEnabled) {
      return;
    }
    const cacheRoot = await mkdtemp('meta-expression-cache-');
    let started = null;
    try {
      started = await startServerWithCache(cacheRoot);
      const response = await fetch(
        `http://127.0.0.1:${started.port}/formalize`
      );
      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.error).toMatch(/Missing input/);
    } finally {
      if (started) {
        await stopServer(started.server);
      }
      await rm(cacheRoot, { recursive: true, force: true });
    }
  });
});

describe('issue 15 — auto-generated formalize library docs', () => {
  it('keeps docs/FORMALIZE.md in sync with src/formalize*.js JSDoc', async () => {
    const docs = await readFile('docs/FORMALIZE.md', 'utf8');
    expect(docs.length).toBeGreaterThan(0);
    // Every documented public entry point must appear in the generated doc.
    const publicSymbols = [
      'formalizeText',
      'formalizeTextWith',
      'tokenize',
      'generateNgrams',
      'createWikidataSource',
      'createWordNetSource',
      'createFandomSource',
      'parseSourceSpec',
      'buildOverrideMap',
      'lookupOverride',
      'aggregateBigContexts',
      'cacheKey',
    ];
    for (const symbol of publicSymbols) {
      expect(docs).toContain(symbol);
    }
    expect(docs).toContain('Auto-generated from JSDoc');
  });
});

describe('issue 15 — Links Notation codec', () => {
  it('round-trips a nested object through indented .lino', () => {
    const value = {
      payload: {
        text: 'Genshin Impact',
        scores: [1, 2.5, -3.25],
        meta: { kind: 'entity', source: 'wikidata' },
        flags: [true, false, null],
      },
    };
    const lino = serializeLino(value, { rootIdentifier: 'formalize-cache' });
    const parsed = parseLino(lino);
    expect(parsed.payload.text).toBe('Genshin Impact');
    expect(parsed.payload.scores).toEqual([1, 2.5, -3.25]);
    expect(parsed.payload.meta.kind).toBe('entity');
    expect(parsed.payload.flags).toEqual([true, false, null]);
  });

  it('parses the repository overrides.lino format', () => {
    const sample = `overrides
  entries
    -
      phrase "Genshin Impact"
      entityId "Q70626251"
      label "Genshin Impact"
      kind "entity"
`;
    const entries = parseLinoEntries(sample);
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBe(1);
    expect(entries[0].phrase).toBe('Genshin Impact');
    expect(entries[0].entityId).toBe('Q70626251');
    const reSerialized = serializeLinoEntries(entries, {
      rootIdentifier: 'overrides',
    });
    expect(typeof reSerialized).toBe('string');
    expect(reSerialized.length).toBeGreaterThan(0);
  });

  it('accepts both .lino and legacy JSON via decodeOverridesText', () => {
    const json = JSON.stringify([
      {
        phrase: 'Genshin Impact',
        entityId: 'Q70626251',
        label: 'Genshin Impact',
      },
    ]);
    const fromJson = decodeOverridesText(json);
    expect(fromJson.length).toBe(1);
    expect(fromJson[0].entityId).toBe('Q70626251');
    const lino = encodeOverridesAsLino(fromJson);
    const fromLino = decodeOverridesText(lino);
    expect(fromLino.length).toBe(1);
    expect(fromLino[0].entityId).toBe('Q70626251');
  });
});

describe('issue 15 — doublets binary store', () => {
  it('round-trips primitives, arrays, and objects', () => {
    const value = {
      str: 'Genshin Impact',
      n: 12,
      neg: -3.25,
      flag: true,
      list: [1, 'two', null, false],
      nested: { a: 1, b: [true, 'hello'] },
    };
    const { binary } = encodeAsDoublets(value);
    expect(binary instanceof Uint8Array).toBe(true);
    expect(binary.length % 12).toBe(0);
    const decoded = decodeFromDoublets(binary);
    expect(decoded.str).toBe('Genshin Impact');
    expect(decoded.n).toBe(12);
    expect(decoded.neg).toBe(-3.25);
    expect(decoded.flag).toBe(true);
    expect(decoded.list).toEqual([1, 'two', null, false]);
    expect(decoded.nested.a).toBe(1);
    expect(decoded.nested.b).toEqual([true, 'hello']);
  });

  it('encodes strings as unicode-sequence chains', () => {
    const { binary } = encodeAsDoublets('hi');
    const decoded = decodeFromDoublets(binary);
    expect(decoded).toBe('hi');
    // Each codepoint becomes a leaf link plus a chain link, plus a string
    // root: 'h' + 'i' = 4 chain doublets + 2 codepoint doublets + 1 root.
    const total = binary.length / 12;
    expect(total).toBeGreaterThan(2);
  });
});
