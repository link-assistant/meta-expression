import { describe, expect, it } from 'test-anywhere';
import {
  FORMALIZE_LINK_TARGETS,
  formalizeTextWith,
  translateTextWith,
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

function fixtureCandidate(id, label, matchText = label) {
  return {
    id,
    label,
    description: `${label} fixture`,
    kind: 'entity',
    source: 'issue-131-fixture',
    sourceUrl: `https://example.test/${encodeURIComponent(id)}`,
    matchText,
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
    California: fixtureCandidate('issue-131:california', 'California'),
    state: fixtureCandidate('issue-131:state', 'state'),
    in: fixtureCandidate('issue-131:in', 'in'),
    the: fixtureCandidate('issue-131:the', 'the'),
    'Western United States': fixtureCandidate(
      'issue-131:western-united-states',
      'Western United States'
    ),
    that: fixtureCandidate('issue-131:that', 'that'),
    'lies on': fixtureCandidate('issue-131:lies-on', 'lies on'),
    'Pacific Coast': fixtureCandidate(
      'issue-131:pacific-coast',
      'Pacific Coast'
    ),
  };
}

describe('issue 131 - parenthesized pronunciation and phrasal verbs', () => {
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

  it('preserves pronunciation punctuation and naturalizes missing phrase data', async () => {
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
    expect(result.plainText).toContain('California (/ˌkælɪˈfɔːrniə/)');
    expect(result.plainText).toContain('расположен на');
    expect(result.plainText).toContain('Тихоокеанское побережье');
    expect(result.plainText).not.toContain('︶');
    expect(questionSources).not.toContain('lies');
    expect(questionSources).not.toContain('on');
    expect(questionSources).not.toContain('Pacific Coast');
  });
});
