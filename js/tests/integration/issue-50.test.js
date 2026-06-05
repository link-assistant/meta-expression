import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'test-anywhere';
import {
  FORMALIZE_LINK_TARGETS,
  formalizeTextWith,
  translateTextWith,
} from '../../src/index.js';
import { assertCompleteTranslationCoverage } from '../helpers/translation-coverage.js';

const issue50Input =
  'First prototype for a links-network based reasoning playground. It accepts a human-language statement, generates selectable interpretations, formalizes the selected meaning when possible, evaluates computable fragments, and attaches evidence with provenance for non-computable claims.';

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

describe('issue 50 - Translate page coverage and link targets', () => {
  it('translates the reported technical prose without unresolved variables', async () => {
    const result = await translateTextWith(issue50Input, {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
      now: () => 0,
    });

    expect(result.plainText).toBe(
      'Первый прототип для основанной на сети ссылок площадки для рассуждений. Он принимает человеко-языковое утверждение, создает выбираемые интерпретации, формализует выбранный смысл когда возможно, вычисляет вычислимые фрагменты, и прикрепляет доказательства с происхождением для невычислимых утверждений.'
    );
    expect(result.questions).toEqual([]);
    expect(result.markdown).not.toContain(
      'https://link-assistant.github.io/human-language/entities.html#lex'
    );
    expect(result.markdown).toContain('https://ru.wiktionary.org/wiki/');
    assertCompleteTranslationCoverage(result, issue50Input);
  });

  it('keeps local lexical links opt-in for Translate output', async () => {
    const result = await translateTextWith('statement and evidence', {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      linkTargetMode: FORMALIZE_LINK_TARGETS.LOCAL,
      now: () => 0,
    });

    expect(result.plainText).toBe('утверждение и доказательства');
    expect(result.markdown).toContain(
      'https://link-assistant.github.io/human-language/entities.html#lex'
    );
    expect(result.questions).toEqual([]);
  });

  it('uses Wikipedia link targets by default in Translate', async () => {
    const result = await translateTextWith('statement', {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      now: () => 0,
    });

    expect(result.formalization.linkTargetMode).toBe(
      FORMALIZE_LINK_TARGETS.WIKIPEDIA
    );
    expect(result.markdown).not.toContain(
      'https://link-assistant.github.io/human-language/entities.html#lex'
    );
  });

  it('limits source lookup concurrency so long text does not burst Wikimedia', async () => {
    let activeLookups = 0;
    let maxActiveLookups = 0;
    const source = {
      name: 'slow-test-source',
      async searchPhrase() {
        activeLookups += 1;
        maxActiveLookups = Math.max(maxActiveLookups, activeLookups);
        await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
        activeLookups -= 1;
        return [];
      },
    };

    await formalizeTextWith(
      'alpha beta gamma delta epsilon zeta eta theta iota kappa',
      {
        fetch: () => emptyJsonResponse(),
        sources: [source],
        maxNgramSize: 3,
        searchConcurrency: 3,
        now: () => 0,
      }
    );

    expect(maxActiveLookups <= 3).toBe(true);
  });

  it('exposes a Translate link-target selector in the web UI', async () => {
    const html = await readFile(
      new URL('../../../web/index.html', import.meta.url),
      'utf8'
    );
    const translateUi = await readFile(
      new URL('../../../web/translate-ui.js', import.meta.url),
      'utf8'
    );

    expect(html).toContain('id="translate-link-target"');
    expect(html).toContain('id="translate-local-viewer-links"');
    expect(html).not.toContain('name="translate-target"');
    expect(translateUi).toContain('selectedTranslateLinkTargetMode');
  });
});
