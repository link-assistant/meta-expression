import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'test-anywhere';
import {
  FORMALIZE_LINK_TARGETS,
  formalizeTextWith,
  translateTextWith,
} from '../../src/index.js';
import { assertCompleteTranslationCoverage } from '../helpers/translation-coverage.js';

const issue56Input =
  'Add Formal AI compatibility hooks for formalization, translation, and naturalization/deformalization aliases, deterministic linguistic CST/AST metadata, and Formal AI prompt translation helpers backed by the pinned upstream test corpus. Also enforce the 1500-line architecture limit for tracked Rust, JavaScript, and Markdown files, with case-study research artifacts excluded.';

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
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

  it('translates the reported technical prose without slash-variable questions', async () => {
    const result = await translateTextWith(issue56Input, {
      fetch: () => emptyJsonResponse(),
      sourceLanguage: 'en',
      targetLanguage: 'ru',
      linkTargetMode: FORMALIZE_LINK_TARGETS.WIKIDATA,
      now: () => 0,
    });

    expect(result.plainText.toLowerCase()).toContain('совместим');
    expect(result.plainText).toContain('формализация');
    expect(result.plainText).toContain('метаданные');
    expect(result.plainText).toContain('артефакты');
    expect(result.questions).toEqual([]);
    expect(
      result.questionDetails.map((question) => question.sourceText)
    ).not.toContain('naturalization/deformalization');
    expect(
      result.questionDetails.map((question) => question.sourceText)
    ).not.toContain('CST/AST');
    expect(result.markdown).not.toContain('naturalization%2Fdeformalization');
    expect(result.markdown).not.toContain('CST%2FAST');
    assertCompleteTranslationCoverage(result, issue56Input);
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
    expect(translateUi).toContain('formatDebugLog');
    expect(translateUi).toContain("placeholder = 'Type answer'");
    expect(translateUi).toContain('setupSourcePriorityList');
    expect(appUi).toContain('setupSourcePriorityList');
    expect(pageReport).toContain('Debug Log');
    expect(pageReport).toContain('sourceSpecFromPriorityList');
    expect(pageReport).toContain('#translate-debug-log');
  });
});
