import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';
import {
  collectLinkedArticleTargets,
  createVirtualSourceOverrideSource,
  FORMALIZE_LINK_TARGETS,
  formalizeTextWith,
  translateWikipediaArticleContext,
  translateTextWith,
  VIRTUAL_SOURCE_KIND,
} from '../../src/index.js';

const issue131Input =
  'California (/ˌkælɪˈfɔːrniə/) is a state in the Western United States that lies on the Pacific Coast.';

function jsonResponse(payload = {}) {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
  });
}

function fixtureCandidate(id, label, matchText = label, extra = {}) {
  return {
    id,
    label,
    description: `${label} fixture`,
    kind: 'entity',
    source: 'issue-131-fixture',
    sourceUrl: `https://example.test/${encodeURIComponent(id)}`,
    matchText,
    ...extra,
  };
}

function createFixtureSource(fixtures, calls = []) {
  return {
    name: 'issue-131-fixture',
    async searchPhrase(text) {
      calls.push(text);
      const candidate = fixtures[text];
      return candidate ? [{ ...candidate, matchText: text }] : [];
    },
    getEntity() {
      return null;
    },
  };
}

function issueSentenceFixtures() {
  return {
    California: fixtureCandidate('Q99', 'California'),
    state: fixtureCandidate('Q35657', 'state'),
    in: fixtureCandidate('issue-131:in', 'in'),
    the: fixtureCandidate('issue-131:the', 'the'),
    'Western United States': fixtureCandidate(
      'Q12612',
      'Western United States',
      'Western United States',
      {
        source: 'wikidata',
        sourceUrl: 'https://www.wikidata.org/wiki/Q12612',
        wikipediaTitle: 'Western United States',
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Western_United_States',
      }
    ),
    that: fixtureCandidate('issue-131:that', 'that'),
    'lies on': fixtureCandidate('issue-131:lies-on', 'lies on'),
    'Pacific Coast': fixtureCandidate(
      'Q430265',
      'Pacific Coast',
      'Pacific Coast',
      {
        source: 'wikidata',
        sourceUrl: 'https://www.wikidata.org/wiki/Q430265',
        wikipediaTitle: 'Pacific coast',
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Pacific_coast',
      }
    ),
  };
}

describe('issue 131 - parenthesized pronunciation', () => {
  it('keeps parentheses out of formalized phrase links', async () => {
    const calls = [];
    const result = await formalizeTextWith(issue131Input, {
      fetch: () => jsonResponse(),
      sources: [createFixtureSource(issueSentenceFixtures(), calls)],
      language: 'en',
      linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
      maxNgramSize: 3,
      now: () => 0,
    });

    expect(result.tokens).not.toContain('(');
    expect(result.tokens).not.toContain(')');
    expect(result.phrases.map((phrase) => phrase.text)).toContain('California');
    expect(result.phrases.map((phrase) => phrase.text)).not.toContain(
      'California ('
    );
    expect(calls).not.toContain('(');
    expect(calls).not.toContain(')');
    expect(calls).not.toContain('California (');
    expect(result.markdown).toContain('[California](');
    expect(result.markdown).toContain('(/ˌkælɪˈfɔːrniə/)');
    expect(result.markdown).not.toContain('[California \\(');
    expect(result.markdown).not.toContain('[\\)]');
  });
});

describe('issue 131 - phrasal verbs and Russian grammar', () => {
  it('allows source-backed phrasal verbs ending in a preposition', async () => {
    const calls = [];
    const source = createFixtureSource(
      {
        California: fixtureCandidate('issue-131:california', 'California'),
        lies: fixtureCandidate('issue-131:lies', 'lies'),
        on: fixtureCandidate('issue-131:on', 'on'),
        'lies on': fixtureCandidate('issue-131:lies-on', 'lies on'),
        'Pacific Coast': fixtureCandidate(
          'issue-131:pacific-coast',
          'Pacific Coast'
        ),
      },
      calls
    );

    const result = await formalizeTextWith(
      'California lies on the Pacific Coast.',
      {
        fetch: () => jsonResponse(),
        sources: [source],
        language: 'en',
        linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
        maxNgramSize: 3,
        now: () => 0,
      }
    );

    const phraseTexts = result.phrases.map((phrase) => phrase.text);
    expect(calls).toContain('lies on');
    expect(phraseTexts).toContain('lies on');
    expect(phraseTexts).not.toContain('lies');
    expect(phraseTexts).not.toContain('on');
  });

  it('falls back to one lexical phrase when sources miss a known phrasal verb', async () => {
    const result = await formalizeTextWith(
      'California lies on the Pacific Coast.',
      {
        fetch: () => jsonResponse(),
        sources: [
          createFixtureSource({
            California: fixtureCandidate('issue-131:california', 'California'),
            lies: fixtureCandidate('issue-131:lies', 'lies'),
            on: fixtureCandidate('issue-131:on', 'on'),
            'Pacific Coast': fixtureCandidate(
              'issue-131:pacific-coast',
              'Pacific Coast'
            ),
          }),
        ],
        language: 'en',
        linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
        maxNgramSize: 3,
        now: () => 0,
      }
    );

    const phraseTexts = result.phrases.map((phrase) => phrase.text);
    const liesOn = result.phrases.find((phrase) => phrase.text === 'lies on');
    expect(phraseTexts).toContain('lies on');
    expect(phraseTexts).not.toContain('lies');
    expect(phraseTexts).not.toContain('on');
    expect(liesOn.entity.id).toBe('lex:en:lies_on');
  });

  it('uses source-backed virtual overrides for known missing source data', async () => {
    const source = createVirtualSourceOverrideSource({ language: 'en' });
    const result = await formalizeTextWith(
      'California lies on the Pacific Coast.',
      {
        fetch: () => jsonResponse(),
        sources: [source],
        language: 'en',
        linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
        maxNgramSize: 3,
        now: () => 0,
      }
    );

    const liesOn = result.phrases.find((phrase) => phrase.text === 'lies on');
    expect(result.sources).toContain(VIRTUAL_SOURCE_KIND);
    expect(liesOn.entity.id).toBe('lex:en:lie_on');
    expect(liesOn.entity.source).toBe(VIRTUAL_SOURCE_KIND);
    const gerund = await formalizeTextWith(
      'California, lying on the Pacific Coast.',
      {
        fetch: () => jsonResponse(),
        sources: [source],
        language: 'en',
        linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
        maxNgramSize: 3,
        now: () => 0,
      }
    );
    expect(
      gerund.phrases.find((phrase) => phrase.text === 'lying on').entity.id
    ).toBe('lex:en:lie_on');
    expect(
      source.linksView.entries.some((entry) => entry.id === 'lex:en:lie_on')
    ).toBe(true);
  });

  it('preserves pronunciation punctuation and naturalizes the Russian grammar', async () => {
    const result = await translateTextWith(issue131Input, {
      fetch: () => jsonResponse(),
      sources: [createFixtureSource(issueSentenceFixtures())],
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
      maxNgramSize: 3,
      now: () => 0,
    });

    const questionSources = result.questionDetails.map(
      (question) => question.sourceText
    );
    const state = result.formalization.phrases.find(
      (phrase) => phrase.text === 'state'
    );
    expect(result.plainText).toContain('Калифорния (/ˌkælɪˈfɔːrniə/)');
    expect(result.plainText).toContain('на западе США');
    expect(result.plainText).toContain('который расположен на');
    expect(result.plainText).toContain('расположен на');
    expect(result.plainText).toContain('Тихоокеанском побережье');
    expect(result.plainText).not.toContain('в Запад США');
    expect(result.plainText).not.toContain('что расположен');
    expect(result.plainText).not.toContain('Тихоокеанское побережье.');
    expect(result.plainText).not.toContain('︶');
    expect(state.entity.id).toBe('Q35657');
    expect(questionSources).not.toContain('lies');
    expect(questionSources).not.toContain('on');
    expect(questionSources).not.toContain('Pacific Coast');
  });
});

describe('issue 131 - linked article context translation', () => {
  it('collects linked Wikipedia article targets once per source URL', () => {
    const targets = collectLinkedArticleTargets({
      sourceLanguage: 'en',
      formalization: {
        cst: {
          phrases: [
            {
              id: 'phrase-1',
              text: 'California',
              entity: {
                id: 'Q99',
                label: 'California',
                wikipediaUrl: 'https://en.wikipedia.org/wiki/California',
              },
            },
            {
              id: 'phrase-2',
              text: 'California',
              entity: {
                id: 'Q99',
                label: 'California',
                wikipediaUrl: 'https://en.wikipedia.org/wiki/California',
              },
            },
            {
              id: 'phrase-3',
              text: 'Pacific Coast',
              entity: {
                id: 'Q430265',
                label: 'Pacific Coast',
                wikipediaUrl: 'https://en.wikipedia.org/wiki/Pacific_coast',
              },
            },
          ],
        },
      },
    });

    expect(targets.map((target) => target.sourceUrl)).toEqual([
      'https://en.wikipedia.org/wiki/California',
      'https://en.wikipedia.org/wiki/Pacific_coast',
    ]);
  });

  it('keeps recursive article translation behind the experimental flag', async () => {
    let fetchCount = 0;
    const result = await translateWikipediaArticleContext(
      'https://en.wikipedia.org/wiki/California',
      {
        fetch: () => {
          fetchCount += 1;
          return jsonResponse();
        },
      }
    );

    expect(result.status).toBe('disabled');
    expect(result.reason).toBe('experimental-article-translation-disabled');
    expect(fetchCount).toBe(0);
  });

  it('translates bounded linked article summaries experimentally and caches them', async () => {
    const calls = [];
    const cache = new Map();
    const fetchSummary = async (url) => {
      calls.push(url);
      return jsonResponse({
        title: 'California',
        revision: 131,
        extract: 'California lies on the Pacific Coast.',
        content_urls: {
          desktop: {
            page: 'https://en.wikipedia.org/wiki/California',
          },
        },
      });
    };
    const options = {
      experimental: true,
      fetch: fetchSummary,
      cache,
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
      translateOptions: {
        sources: [createVirtualSourceOverrideSource({ language: 'en' })],
      },
      now: () => 0,
    };

    const first = await translateWikipediaArticleContext(
      'https://en.wikipedia.org/wiki/California',
      options
    );
    const callsAfterFirstRun = calls.length;
    const second = await translateWikipediaArticleContext(
      'https://en.wikipedia.org/wiki/California',
      options
    );

    expect(first.status).toBe('translated');
    expect(first.cacheKey).toContain('131');
    expect(first.translation.plainText).toContain('расположен на');
    expect(second.cacheKey).toBe(first.cacheKey);
    expect(calls.length).toBe(callsAfterFirstRun);
  });

  it('wires article context controls into the Translate UI', () => {
    const html = readFileSync(
      new URL('../../../web/index.html', import.meta.url),
      'utf8'
    );
    const ui = readFileSync(
      new URL('../../../web/translate-ui.js', import.meta.url),
      'utf8'
    );

    expect(html).toContain('id="translate-article-experimental"');
    expect(html).toContain('id="translate-linked-articles"');
    expect(ui).toContain('collectLinkedArticleTargets');
    expect(ui).toContain('translateWikipediaArticleContext');
  });
});
