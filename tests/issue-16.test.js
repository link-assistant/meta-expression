import { readFile } from 'node:fs/promises';
import { describe, it, expect } from 'test-anywhere';
import {
  createWikidataSource,
  formalizeTextWith,
  markdownFromFormalizationCst,
  translateTextWith,
} from '../src/index.js';
import { parseCliArguments, runCliAsync } from '../src/cli.js';
import { createMetaExpressionServer } from '../src/server.js';

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

function makeFetch(routes) {
  return function mockFetch(url) {
    const parsed = new URL(url);
    const action = parsed.searchParams.get('action');
    if (action === 'wbsearchentities') {
      const search = parsed.searchParams.get('search');
      const type = parsed.searchParams.get('type');
      const language = parsed.searchParams.get('language') ?? 'en';
      const route = routes.search?.[`${search}|${type}|${language}`];
      return jsonResponse(searchPayload(route ?? []));
    }
    if (action === 'wbgetentities') {
      const ids = parsed.searchParams.get('ids');
      const languages = parsed.searchParams.get('languages') ?? 'en';
      const route = routes.entities?.[`${ids}|${languages}`];
      return jsonResponse(route ? entityPayload([route]) : { entities: {} });
    }
    return jsonResponse({});
  };
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createMetaExpressionServer({
      cacheRoot: '.cache/issue-16-test',
    });
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

async function canUseLocalServer() {
  const deno = globalThis.Deno;
  if (!deno?.permissions?.query) {
    return true;
  }
  const status = await deno.permissions.query({
    name: 'net',
    host: '127.0.0.1',
  });
  return status.state === 'granted';
}

const localServerTestsEnabled = await canUseLocalServer();

describe('issue 16 — formalize CST for translation', () => {
  it('emits a CST that can regenerate formalize Markdown', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Hawaii|item|en': [
          { id: 'Q782', label: 'Hawaii', description: 'US state' },
        ],
      },
      entities: {
        'Q782|en': entity({
          id: 'Q782',
          label: 'Hawaii',
          language: 'en',
          sitelink: 'Hawaii',
        }),
      },
    });

    const result = await formalizeTextWith('Hawaii', {
      fetch: fetchImpl,
      sources: [createWikidataSource({ language: 'en' })],
      now: () => 0,
    });

    expect(result.cst.type).toBe('formalization');
    expect(result.cst.phrases[0].entity.id).toBe('Q782');
    expect(markdownFromFormalizationCst(result.cst)).toBe(result.markdown);
    expect(result.linksNotation).toContain('markdownUrl');
    expect(result.linksNotation).toContain('phrase-1');
  });
});

describe('issue 16 — translate through formalized Wikidata labels', () => {
  it('translates linked phrases with target-language labels and links', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Hawaii|item|en': [
          { id: 'Q782', label: 'Hawaii', description: 'US state' },
        ],
      },
      entities: {
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
      },
    });

    const result = await translateTextWith('Hawaii', {
      fetch: fetchImpl,
      sources: [createWikidataSource({ language: 'en' })],
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    expect(result.plainText).toBe('Гавайи');
    expect(result.markdown).toContain('[Гавайи](');
    expect(result.markdown).toContain('"Q782"');
    expect(result.markdown).toContain('ru.wikipedia.org/wiki/');
    expect(result.phrases[0].source.text).toBe('Hawaii');
    expect(result.phrases[0].target.text).toBe('Гавайи');
    expect(result.variables.length).toBe(0);
    expect(result.questions.length).toBe(0);
    expect(result.linksNotation).toContain('(translation:');
  });

  it('translates full sentences and records formalization plus rule steps', async () => {
    const fetchImpl = makeFetch({
      search: {
        'Hawaii|item|en': [
          { id: 'Q782', label: 'Hawaii', description: 'US state' },
        ],
        'state|item|en': [
          { id: 'Q7275', label: 'state', description: 'federated state' },
        ],
      },
      entities: {
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
      },
    });

    const result = await translateTextWith('Hawaii is a state.', {
      fetch: fetchImpl,
      sources: [createWikidataSource({ language: 'en' })],
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    expect(result.formalization.markdown.endsWith('.')).toBe(true);
    expect(result.formalization.html.endsWith('.')).toBe(true);
    expect(result.sentences.length).toBe(1);
    expect(result.sentences[0].source.text).toBe('Hawaii is a state.');
    expect(result.sentences[0].plainText).toBe('Гавайи это штат.');
    expect(result.sentences[0].transformations).toEqual([
      'english-article-omission',
      'english-copula-to-russian-eto',
      'english-us-state-predicate-to-russian-shtat',
    ]);
    expect(result.plainText).toBe('Гавайи это штат.');
    expect(result.markdown).toContain('[Гавайи](');
    expect(result.markdown).toContain('это [штат](');
    expect(result.questions.length).toBe(0);
    expect(result.steps.some((step) => step.type === 'api-request')).toBe(true);
    expect(result.steps.some((step) => step.type === 'formalization')).toBe(
      true
    );
    expect(
      result.steps.some(
        (step) =>
          step.type === 'transformation-rule' &&
          step.rule === 'english-copula-to-russian-eto'
      )
    ).toBe(true);
    expect(result.cst.sentences[0].targetText).toBe('Гавайи это штат.');
    expect(result.linksNotation).toContain('sentence-1');
    expect(result.linksNotation).toContain('step-');
  });

  it('keeps unresolved parts as variables with clarifying questions', async () => {
    const result = await translateTextWith('xyzzy', {
      fetch: makeFetch({}),
      sources: [createWikidataSource({ language: 'en' })],
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    expect(result.plainText).toBe('xyzzy');
    expect(result.variables.length).toBe(1);
    expect(result.variables[0].name).toBe('variable-1');
    expect(result.questions[0]).toContain('xyzzy');
    expect(result.linksNotation).toContain('variable-1');
  });
});

describe('issue 16 — CLI and HTTP translate surfaces', () => {
  it('parses translate-specific flags', () => {
    const parsed = parseCliArguments([
      'translate',
      '--input',
      'Hawaii',
      '--to',
      'ru',
      '--from',
      'en',
      '--format',
      'markdown',
    ]);
    expect(parsed.command).toBe('translate');
    expect(parsed.input).toBe('Hawaii');
    expect(parsed.targetLanguage).toBe('ru');
    expect(parsed.sourceLanguage).toBe('en');
    expect(parsed.format).toBe('markdown');
  });

  it('runs the translate command as Markdown', async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = makeFetch({
      search: {
        'Hawaii|item|en': [
          { id: 'Q782', label: 'Hawaii', description: 'US state' },
        ],
      },
      entities: {
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
      },
    });
    try {
      const messages = [];
      const errors = [];
      const exit = await runCliAsync(
        [
          'translate',
          '--input',
          'Hawaii',
          '--to',
          'ru',
          '--format',
          'markdown',
          '--no-repo-overrides',
        ],
        {
          log: (line) => messages.push(line),
          error: (line) => errors.push(line),
        }
      );
      expect(exit).toBe(0);
      expect(errors.length).toBe(0);
      expect(messages[0]).toContain('Гавайи');
      expect(messages[0]).toContain('"Q782"');
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it('serves POST /translate', async () => {
    if (!localServerTestsEnabled) {
      return;
    }
    const previousFetch = globalThis.fetch;
    globalThis.fetch = makeFetch({
      search: {
        'Hawaii|item|en': [
          { id: 'Q782', label: 'Hawaii', description: 'US state' },
        ],
      },
      entities: {
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
      },
    });
    let started = null;
    try {
      started = await startServer();
      const response = await previousFetch(
        `http://127.0.0.1:${started.port}/translate`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            input: 'Hawaii',
            targetLanguage: 'ru',
            noRepoOverrides: true,
          }),
        }
      );
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.plainText).toBe('Гавайи');
      expect(payload.markdown).toContain('"Q782"');
    } finally {
      if (started) {
        await stopServer(started.server);
      }
      globalThis.fetch = previousFetch;
    }
  });
});

describe('issue 16 — web translate surface', () => {
  it('adds a translated workspace to the static web app', async () => {
    const html = await readFile(
      new URL('../web/index.html', import.meta.url),
      'utf8'
    );
    const app = await readFile(
      new URL('../web/app.js', import.meta.url),
      'utf8'
    );

    expect(html).toContain('id="nav-translate"');
    expect(html).toContain('id="page-translate"');
    expect(html).toContain('id="translate-formalized"');
    expect(html).toContain('id="translate-output"');
    expect(html).toContain('id="translate-steps"');
    expect(html).toContain('id="translate-cst"');
    expect(app).toContain('setupTranslatePage({ cache: wikimediaCache })');
  });
});
