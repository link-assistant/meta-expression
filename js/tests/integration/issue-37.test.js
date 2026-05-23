import { describe, expect, it } from 'test-anywhere';
import {
  createWikidataSource,
  createWiktionarySource,
  formalizeTextWith,
  translateTextWith,
} from '../../src/index.js';
import { createPageIssueReportUrl } from '../../../web/page-report.js';
import { assertCompleteTranslationCoverage } from '../helpers/translation-coverage.js';

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

function entity({ id, label, language = 'en', sitelink = null }) {
  const site = `${language}wiki`;
  return {
    id,
    type: id.startsWith('P') ? 'property' : 'item',
    labels: { [language]: { value: label } },
    descriptions: {
      [language]: { value: `${label} description` },
    },
    claims: {},
    aliases: {},
    sitelinks: sitelink ? { [site]: { site, title: sitelink } } : {},
  };
}

function makeIssue37Fetch() {
  return async function mockFetch(url) {
    const parsed = new URL(url);
    if (parsed.hostname === 'en.wiktionary.org') {
      const page = decodeURIComponent(parsed.pathname.split('/').pop() ?? '');
      if (page === 'is-a') {
        return jsonResponse({
          en: [
            {
              partOfSpeech: 'Noun',
              definitions: [
                {
                  definition:
                    'The relationship between two entities in which one entity inherits from the other.',
                },
              ],
            },
          ],
        });
      }
      if (page === 'is' || page === 'a') {
        return jsonResponse({
          en: [
            {
              partOfSpeech: 'Symbol',
              definitions: [{ definition: `${page} standalone definition.` }],
            },
          ],
        });
      }
      return jsonResponse({});
    }

    const action = parsed.searchParams.get('action');
    if (action === 'wbsearchentities') {
      const search = parsed.searchParams.get('search');
      const type = parsed.searchParams.get('type');
      const language = parsed.searchParams.get('language') ?? 'en';
      const routes = {
        'Hawaii|item|en': [
          { id: 'Q782', label: 'Hawaii', description: 'US state' },
        ],
        'state|item|en': [
          { id: 'Q7275', label: 'state', description: 'federated state' },
        ],
      };
      return jsonResponse(
        searchPayload(routes[`${search}|${type}|${language}`] ?? [])
      );
    }
    if (action === 'wbgetentities') {
      const ids = parsed.searchParams.get('ids');
      const languages = parsed.searchParams.get('languages') ?? 'en';
      const routes = {
        'Q782|en': entity({
          id: 'Q782',
          label: 'Hawaii',
          language: 'en',
          sitelink: 'Hawaii',
        }),
        'Q782|ru': entity({
          id: 'Q782',
          label: 'Гавайи',
          language: 'ru',
          sitelink: 'Гавайи',
        }),
        'Q7275|en': entity({
          id: 'Q7275',
          label: 'state',
          language: 'en',
          sitelink: 'Federated state',
        }),
        'Q7275|ru': entity({
          id: 'Q7275',
          label: 'государство',
          language: 'ru',
          sitelink: 'Государство',
        }),
      };
      const entries = String(ids ?? '')
        .split('|')
        .map((id) => routes[`${id}|${languages}`])
        .filter(Boolean);
      return jsonResponse(entries.length ? entityPayload(entries) : {});
    }
    return jsonResponse({});
  };
}

describe('issue 37 - bounded page issue reports', () => {
  it('keeps essential Translate sections while omitting oversized diagnostics', () => {
    const oversizedDiagnostics = 'diagnostic-line\n'.repeat(2000);
    const report = {
      pageId: 'translate',
      pageLabel: 'Translate',
      summary: 'Hawaii is a state.',
      environment: {
        Page: 'Translate',
        Version: 'v0.9.0 (1fb1696)',
        URL: 'https://link-assistant.github.io/meta-expression/web/#/translate',
        'User Agent': 'Safari test user agent',
      },
      sections: [
        { heading: 'Text', code: 'Hawaii is a state.' },
        { heading: 'Options', lines: ['- **From**: en', '- **To**: ru'] },
        {
          heading: 'Formalized Input Markdown',
          code: '[Hawaii](https://en.wikipedia.org/wiki/Hawaii "Q782") [is a](https://en.wiktionary.org/wiki/is-a "wikt:en:is-a#Noun:0") [state](https://en.wikipedia.org/wiki/State_(polity) "Q7275").',
        },
        { heading: 'Translated Result', lines: ['- Гавайи это штат.'] },
        {
          heading: 'Markdown',
          code: '[Гавайи](https://ru.wikipedia.org/wiki/%D0%93%D0%B0%D0%B2%D0%B0%D0%B9%D0%B8 "Q782") [это](https://en.wiktionary.org/wiki/%D1%8D%D1%82%D0%BE "wikt:ru:это#Determiner:0") [штат](https://ru.wikipedia.org/wiki/%D0%A8%D1%82%D0%B0%D1%82_%D0%A1%D0%A8%D0%90 "Q35657").',
        },
        { heading: 'Links Notation', code: oversizedDiagnostics },
        { heading: 'Translation CST', code: oversizedDiagnostics },
        { heading: 'Translation Steps', lines: [oversizedDiagnostics] },
      ],
      reproductionSteps: [
        'Open the web app',
        'Switch to the Translate page',
        'Click Report Issue',
      ],
    };

    const url = createPageIssueReportUrl(report, { maxUrlLength: 3500 });
    const body = new URL(url).searchParams.get('body') ?? '';

    expect(url.length <= 3500).toBe(true);
    expect(body).toContain('## Text');
    expect(body).toContain('Hawaii is a state.');
    expect(body).toContain('## Formalized Input Markdown');
    expect(body).toContain('https://en.wiktionary.org/wiki/is-a');
    expect(body).toContain('## Markdown');
    expect(body).toContain('https://en.wiktionary.org/wiki/%D1%8D%D1%82%D0%BE');
    expect(body).not.toContain('## Translation CST');
    expect(body).toContain('Omitted generated diagnostic sections');
  });
});

describe('issue 37 - Wiktionary grammar compounds', () => {
  it('prefers the exact Wiktionary compound over separate stop words', async () => {
    const result = await formalizeTextWith('is a', {
      fetch: makeIssue37Fetch(),
      sources: [createWiktionarySource({ language: 'en' })],
      now: () => 0,
    });

    expect(result.cst.phrases.map((phrase) => phrase.text)).toEqual(['is a']);
    expect(result.cst.phrases[0].entity.id).toBe('wikt:en:is-a#Noun:0');
    expect(result.markdown).toContain(
      '[is a](https://en.wiktionary.org/wiki/is-a "wikt:en:is-a#Noun:0")'
    );
  });

  it('translates a linked `is a` grammar phrase to linked Russian `это`', async () => {
    const result = await translateTextWith('Hawaii is a state.', {
      fetch: makeIssue37Fetch(),
      sources: [
        createWikidataSource({ language: 'en' }),
        createWiktionarySource({ language: 'en' }),
      ],
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    expect(
      result.formalization.cst.phrases.map((phrase) => phrase.text)
    ).toEqual(['Hawaii', 'is a', 'state']);
    expect(result.plainText).toBe('Гавайи это штат.');
    expect(result.markdown).toContain(
      '[это](https://en.wiktionary.org/wiki/%D1%8D%D1%82%D0%BE "wikt:ru:это#Determiner:0")'
    );
    assertCompleteTranslationCoverage(result, 'Hawaii is a state.');
  });
});
