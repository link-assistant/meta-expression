import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'test-anywhere';
import {
  FORMALIZE_LINK_TARGETS,
  SUPPORTED_FORMAL_AI_TRANSLATION_LANGUAGES,
  formalizeTextWith,
  translateTextWith,
} from '../../src/index.js';

const issue56Input =
  'Add Formal AI compatibility hooks for formalization, translation, and naturalization/deformalization aliases, deterministic linguistic CST/AST metadata, and Formal AI prompt translation helpers backed by the pinned upstream test corpus. Also enforce the 1500-line architecture limit for tracked Rust, JavaScript, and Markdown files, with case-study research artifacts excluded.';

const wiktionaryFixtures = Object.freeze({
  apple: Object.freeze({
    ru: 'яблоко',
    hi: 'सेब',
    zh: '苹果',
  }),
  compatibility: Object.freeze({
    ru: 'совместимость',
    hi: 'अनुकूलता',
    zh: '兼容性',
  }),
  metadata: Object.freeze({
    ru: 'метаданные',
    hi: 'मेटाडेटा',
    zh: '元数据',
  }),
  corpus: Object.freeze({
    ru: 'корпус',
    hi: 'संग्रह',
    zh: '语料库',
  }),
});

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

function createFixtureWiktionarySource() {
  return {
    name: 'wiktionary',
    async searchPhrase(text) {
      const pageTitle = normalizeFixtureTitle(text);
      if (!wiktionaryFixtures[pageTitle]) {
        return [];
      }
      return [
        {
          id: `wikt:en:${pageTitle}#Noun:0`,
          label: text,
          description: `Fixture Wiktionary entry for ${text}.`,
          kind: 'entity',
          source: 'wiktionary',
          sourceUrl: `https://en.wiktionary.org/wiki/${pageTitle}`,
          matchText: text,
          partOfSpeech: 'Noun',
        },
      ];
    },
    getEntity() {
      return null;
    },
  };
}

function createFixtureWikidataSource() {
  return {
    name: 'wikidata',
    async searchPhrase(text) {
      if (normalizeFixtureTitle(text) !== 'apple') {
        return [];
      }
      return [
        {
          id: 'Q89',
          label: text,
          description: 'Fixture Wikidata entity for apple.',
          kind: 'entity',
          source: 'wikidata',
          sourceUrl: 'https://www.wikidata.org/wiki/Q89',
          matchText: text,
        },
      ];
    },
    getEntity() {
      return null;
    },
  };
}

function createFixtureWikimediaFetch() {
  const calls = [];
  const fetch = async (url) => {
    const request = new URL(String(url));
    calls.push(request);
    if (request.hostname.endsWith('wiktionary.org')) {
      return wiktionaryResponse(request);
    }
    if (request.hostname === 'www.wikidata.org') {
      return wikidataResponse(request);
    }
    return jsonResponse({});
  };
  fetch.calls = calls;
  return fetch;
}

function wiktionaryResponse(request) {
  const action = request.searchParams.get('action');
  if (action === 'parse') {
    const pageTitle = normalizeFixtureTitle(request.searchParams.get('page'));
    const translations = wiktionaryFixtures[pageTitle];
    return jsonResponse({
      parse: {
        title: pageTitle,
        wikitext: {
          '*': translations ? wiktionaryWikitext(translations) : '',
        },
      },
    });
  }
  if (action === 'query') {
    const title = request.searchParams.get('titles') ?? '';
    return jsonResponse({
      query: {
        pages: {
          1: {
            pageid: 1,
            ns: 0,
            title,
          },
        },
      },
    });
  }
  return jsonResponse({});
}

function wikidataResponse(request) {
  if (request.searchParams.get('action') !== 'wbgetentities') {
    return jsonResponse({});
  }
  return jsonResponse({
    entities: {
      Q89: {
        id: 'Q89',
        labels: {
          ru: {
            language: 'ru',
            value: 'яблоко Wikidata',
          },
        },
        descriptions: {
          ru: {
            language: 'ru',
            value: 'fixture Wikidata target label',
          },
        },
        sitelinks: {
          ruwiki: {
            title: 'Яблоко',
            url: 'https://ru.wikipedia.org/wiki/Яблоко',
          },
        },
      },
    },
  });
}

function wiktionaryWikitext(translations) {
  return [
    '==English==',
    '===Noun===',
    '====Translations====',
    ...Object.entries(translations).map(
      ([language, term]) => `* ${language}: {{t+|${language}|${term}}}`
    ),
  ].join('\n');
}

function jsonResponse(payload) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  );
}

function normalizeFixtureTitle(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function supportedNonEnglishTargets() {
  return SUPPORTED_FORMAL_AI_TRANSLATION_LANGUAGES.filter(
    (language) => language !== 'en'
  );
}

function countLanguageOptions(html, language) {
  return (html.match(new RegExp(`<option value="${language}"`, 'g')) ?? [])
    .length;
}

describe('issue 56 - Translate slash terms and diagnostics', () => {
  it('splits slash-separated fallback terms before knowledge-source lookup', async () => {
    const result = await formalizeTextWith(
      'naturalization/deformalization CST/AST',
      {
        fetch: () => emptyJsonResponse(),
        language: 'en',
        linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
        now: () => 0,
      }
    );

    expect(result.tokens).toEqual([
      'naturalization',
      'deformalization',
      'CST',
      'AST',
    ]);
    expect(result.phrases.some((phrase) => phrase.text.includes('/'))).toBe(
      false
    );
    expect(result.markdown).toContain('/');
    expect(result.markdown).not.toContain('naturalization%2Fdeformalization');
    expect(result.markdown).not.toContain('CST%2FAST');
  });

  it('keeps reported technical prose slash terms separated during translation', async () => {
    const result = await translateTextWith(issue56Input, {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
      now: () => 0,
    });

    expect(
      result.questionDetails.map((question) => question.sourceText)
    ).not.toContain('naturalization/deformalization');
    expect(
      result.questionDetails.map((question) => question.sourceText)
    ).not.toContain('CST/AST');
    expect(result.markdown).not.toContain('naturalization%2Fdeformalization');
    expect(result.markdown).not.toContain('CST%2FAST');
  });

  it('uses source-backed Wiktionary translations for every supported target language', async () => {
    const targets = supportedNonEnglishTargets();
    expect(Object.keys(wiktionaryFixtures.apple).sort()).toEqual(
      [...targets].sort()
    );

    for (const targetLanguage of targets) {
      const result = await translateTextWith('apple', {
        fetch: createFixtureWikimediaFetch(),
        sources: [createFixtureWiktionarySource()],
        sourceLanguage: 'en',
        targetLanguage,
        now: () => 0,
      });
      const [phrase] = result.phrases;
      expect(result.plainText).toBe(wiktionaryFixtures.apple[targetLanguage]);
      expect(result.questions).toEqual([]);
      expect(phrase.target.strategy).toBe('wiktionary-translation');
      expect(phrase.target.sourceUrl).toContain('en.wiktionary.org');
      expect(phrase.target.url).toContain(`${targetLanguage}.wiktionary.org`);
      expect(
        result.steps.some((step) => step.type === 'wiktionary-translation')
      ).toBe(true);
    }
  });

  it('keeps linked Wikidata entities ahead of lexical Wiktionary translations', async () => {
    const fetch = createFixtureWikimediaFetch();
    const result = await translateTextWith('apple', {
      fetch,
      sources: [createFixtureWikidataSource(), createFixtureWiktionarySource()],
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    expect(result.plainText).toBe('яблоко Wikidata');
    expect(result.phrases[0].target.entityId).toBe('Q89');
    expect(result.phrases[0].target.strategy).toBe(undefined);
    expect(
      fetch.calls.some((call) => call.hostname.endsWith('wiktionary.org'))
    ).toBe(false);
  });

  it('covers issue-56 lexical translations through source fixtures for all supported targets', async () => {
    const targets = supportedNonEnglishTargets();
    for (const [term, translations] of Object.entries(wiktionaryFixtures)) {
      expect(Object.keys(translations).sort()).toEqual([...targets].sort());
      if (term === 'apple') {
        continue;
      }
      const result = await translateTextWith(term, {
        fetch: createFixtureWikimediaFetch(),
        sources: [createFixtureWiktionarySource()],
        sourceLanguage: 'en',
        targetLanguage: 'ru',
        now: () => 0,
      });
      expect(result.plainText).toBe(translations.ru);
      expect(result.questions).toEqual([]);
      expect(result.phrases[0].target.strategy).toBe('wiktionary-translation');
    }
  });

  it('does not keep issue-56 vocabulary in the local fallback glossary', async () => {
    const strategies = await readFile(
      new URL('../../src/translation-strategies.js', import.meta.url),
      'utf8'
    );
    for (const term of ['compatibility', 'metadata', 'corpus']) {
      expect(strategies).not.toContain(`  ${term}:`);
    }
  });

  it('keeps every generated question with selected actionable options', async () => {
    const result = await translateTextWith('zzqxqv', {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });
    const [question] = result.questionDetails;

    expect(question.selectedOptionId).toBe('preserve-source');
    expect(
      question.options.some((option) => option.id === question.selectedOptionId)
    ).toBe(true);
    expect(
      question.options
        .filter((option) => option.id !== 'manual-entry')
        .every(
          (option) => typeof option.targetText === 'string' && option.targetText
        )
    ).toBe(true);
  });
});

describe('issue 56 - Translate UI diagnostics', () => {
  it('exposes source-priority controls and a copyable Translate debug log', async () => {
    const html = await readFile(
      new URL('../../../web/index.html', import.meta.url),
      'utf8'
    );
    const translateUi = await readFile(
      new URL('../../../web/translate-ui.js', import.meta.url),
      'utf8'
    );
    const appUi = await readFile(
      new URL('../../../web/app.js', import.meta.url),
      'utf8'
    );
    const pageReport = await readFile(
      new URL('../../../web/page-report.js', import.meta.url),
      'utf8'
    );

    expect(html).toContain('id="formalize-source-list"');
    expect(html).toContain('id="translate-source-list"');
    expect(html).toContain('id="translate-debug-log"');
    expect(html).toContain('draggable="true"');
    expect(html).toContain('data-i18n="translate.strategyHint"');
    expect(html).toContain('data-i18n="translate.sourcesHint"');
    for (const language of SUPPORTED_FORMAL_AI_TRANSLATION_LANGUAGES) {
      expect(countLanguageOptions(html, language)).toBeGreaterThanOrEqual(2);
    }
    expect(translateUi).toContain('Wiktionary:');
    expect(translateUi).toContain('formatDebugLog');
    expect(translateUi).toContain("placeholder = 'Type answer'");
    expect(translateUi).toContain('setupSourcePriorityList');
    expect(appUi).toContain('setupSourcePriorityList');
    expect(pageReport).toContain('Debug Log');
    expect(pageReport).toContain('sourceSpecFromPriorityList');
    expect(pageReport).toContain('#translate-debug-log');
  });
});
