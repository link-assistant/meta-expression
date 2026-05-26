import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'test-anywhere';
import {
  parseFormalAiTranslationPrompt,
  translateFormalAiPromptWith,
} from '../../src/index.js';

const corpus = JSON.parse(
  readFileSync(
    new URL('../fixtures/formal-ai-test-corpus.json', import.meta.url),
    'utf8'
  )
);

const browserSurface =
  'Formal AI browser and app-shell behavior is outside the shared meta-expression library surface.';
const assistantSurface =
  'Formal AI assistant dialogue behavior is application-specific and tracked by the compatibility contract in issue #73.';
const ciSurface =
  'Formal AI repository maintenance, CI, release, and documentation checks do not map to a meta-expression runtime feature.';
const formalizationSurface =
  'Exact Formal AI resolver selection policy is tracked by issue #73; meta-expression parser metadata has separate coverage.';
const graphSurface =
  'Formal AI answer trace and knowledge-graph schema parity is tracked by issue #73.';
const memorySurface =
  'Formal AI persistent assistant memory is not a shipped meta-expression capability.';
const proofSurface =
  'Formal AI proof-assistant behavior is tracked by issues #67 and #69.';
const integrationSurface =
  'Formal AI CLI/server integration behavior is app-specific and not part of the shared library parity gate.';
const multilingualSurface =
  'Formal AI multilingual response catalog behavior is application-specific; this gate covers shared translation primitives.';
const deferredTranslationSurface =
  'This Formal AI translation edge is not yet shipped in meta-expression; issue #73 tracks the remaining contract.';

const pathSkipReasons = new Map([
  ['tests/e2e/tests/connectivity.spec.js', browserSurface],
  ['tests/e2e/tests/demo.spec.js', assistantSurface],
  ['tests/e2e/tests/issue-135.spec.js', assistantSurface],
  ['tests/e2e/tests/issue-153.spec.js', assistantSurface],
  ['tests/e2e/tests/issue-157.spec.js', assistantSurface],
  ['tests/e2e/tests/issue-180.spec.js', assistantSurface],
  ['tests/e2e/tests/issue-193.spec.js', assistantSurface],
  ['tests/e2e/tests/issue-205.spec.js', assistantSurface],
  ['tests/e2e/tests/issue-209.spec.js', proofSurface],
  ['tests/e2e/tests/issue-210.spec.js', deferredTranslationSurface],
  ['tests/e2e/tests/issue-218.spec.js', deferredTranslationSurface],
  ['tests/e2e/tests/issue-221.spec.js', deferredTranslationSurface],
  ['tests/e2e/tests/issue-223.spec.js', assistantSurface],
  ['tests/e2e/tests/issue-224.spec.js', assistantSurface],
  ['tests/e2e/tests/issue-228.spec.js', assistantSurface],
  ['tests/e2e/tests/issue-230.spec.js', deferredTranslationSurface],
  ['tests/e2e/tests/issue-242.spec.js', assistantSurface],
  ['tests/e2e/tests/multilingual.spec.js', multilingualSurface],
  ['tests/integration/formal_ai_cli.rs', integrationSurface],
  ['tests/unit/assistant_name.rs', assistantSurface],
  ['tests/unit/ci-cd/changelog_parsing.rs', ciSurface],
  ['tests/unit/ci-cd/workflow_release.rs', ciSurface],
  ['tests/unit/ci-cd/workspace_manifest_resolution.rs', ciSurface],
  ['tests/unit/courtesy_response.rs', assistantSurface],
  ['tests/unit/data_files.rs', ciSurface],
  ['tests/unit/docker_runtime.rs', ciSurface],
  ['tests/unit/docs_requirements.rs', ciSurface],
  ['tests/unit/formal_ai.rs', assistantSurface],
  ['tests/unit/github_logs.rs', ciSurface],
  ['tests/unit/memory_maintenance.rs', memorySurface],
  ['tests/unit/multilingual_variations.rs', multilingualSurface],
  ['tests/unit/playwright_script.rs', assistantSurface],
  ['tests/unit/proof_request_config.rs', proofSurface],
  ['tests/unit/proof_request.rs', proofSurface],
  ['tests/unit/software_project.rs', assistantSurface],
  ['tests/unit/specification/agent_isolation.rs', assistantSurface],
  ['tests/unit/specification/calculator_delegation.rs', assistantSurface],
  ['tests/unit/specification/capabilities.rs', assistantSurface],
  ['tests/unit/specification/chat_surface.rs', assistantSurface],
  ['tests/unit/specification/code_generation.rs', assistantSurface],
  ['tests/unit/specification/definition_fusion.rs', assistantSurface],
  ['tests/unit/specification/formalization.rs', formalizationSurface],
  ['tests/unit/specification/issue_146.rs', assistantSurface],
  ['tests/unit/specification/links_network.rs', graphSurface],
  ['tests/unit/specification/multilingual.rs', multilingualSurface],
  ['tests/unit/specification/network_visualization.rs', graphSurface],
  ['tests/unit/specification/openai_compatibility.rs', integrationSurface],
  ['tests/unit/specification/project_lookups.rs', assistantSurface],
  ['tests/unit/specification/prompt_variations.rs', assistantSurface],
  ['tests/unit/specification/reasoning_loop.rs', proofSurface],
  ['tests/unit/specification/reasoning_paths.rs', assistantSurface],
  ['tests/unit/specification/source_cache.rs', browserSurface],
  ['tests/unit/specification/summarization_pipeline.rs', assistantSurface],
  ['tests/unit/specification/telegram_surface.rs', assistantSurface],
  [
    'tests/unit/specification/translation_via_links.rs',
    deferredTranslationSurface,
  ],
  ['tests/unit/specification/transparent_state.rs', assistantSurface],
  ['tests/unit/test_status.rs', ciSurface],
  ['tests/unit/web_requests.rs', browserSurface],
]);

const formalAiAssertions = new Map([
  [
    'tests/unit/specification/translation_via_links.rs::every_answer_publishes_a_links_notation_trace',
    () => expectSemanticTrace('Translate apple to Russian', 'яблоко'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::russian_translate_how_are_you_prompt_returns_english_surface',
    () =>
      expectTranslation(
        'Переведи "как у тебя дела?" на английский.',
        'how are you?'
      ),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::russian_capitalized_how_are_you_keeps_target_capitalization',
    () =>
      expectTranslation(
        'Переведи "Как у тебя дела?" на английский.',
        'How are you?'
      ),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::natural_translation_drops_terminal_when_source_has_none',
    () => expectTranslation('Переведи как дела на английский', 'how are you'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::issue_210_russian_translation_prompts_keep_translation_intent',
    () =>
      expectTranslation('Переведи кто ты такой на ангилйский', 'who are you'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::issue_230_russian_compositional_translation_handles_search_phrase',
    () =>
      expectTranslation('Переведи доброе яблоко на английский', 'good apple'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::translation_gaps_are_reported_without_language_placeholders',
    () => expectTranslationGap('Translate "zzqxqv" to Russian'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::translation_meaning_registry_covers_extended_phrases',
    () => expectCommonNouns(),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::issue_216_translate_apple_to_russian_without_quotes',
    () => expectTranslation('Translate apple to Russian', 'яблоко'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::issue_216_unquoted_apple_covers_every_supported_target_language',
    () => expectAppleAllLanguages(),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::native_hindi_and_chinese_unquoted_translation_prompts_are_supported',
    () => expectNativeHindiAndChinesePrompts(),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::issue_217_single_russian_noun_quoted',
    () => expectTranslation('Переведи "яблоко" на английский', 'apple'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::issue_218_unquoted_russian_translation',
    () => expectTranslation('Переведи яблоко на английский', 'apple'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::issue_221_common_russian_nouns_translate_to_english',
    () => expectTranslation('Переведи помидор на английский', 'tomato'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::issue_221_common_english_nouns_translate_to_russian',
    () => expectTranslation('Translate tomato to Russian', 'помидор'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::issue_221_unquoted_common_noun_works_in_all_languages',
    () => expectTranslation('Переведи огурец на английский', 'cucumber'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::translation_request_returns_target_surface_form',
    () => expectTranslation('Translate hello to Chinese', '你好'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::translation_declares_source_and_target_language_tags',
    () => expectLanguageEvidence('Translate hello to Hindi', 'en', 'hi'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::translation_trace_includes_intermediate_meaning',
    () => expectSemanticTrace('Translate hello to Russian', 'привет'),
  ],
  [
    'tests/unit/specification/translation_via_links.rs::untranslatable_concepts_are_flagged',
    () => expectTranslationGap('Переведи "неведомослово" на английский'),
  ],
  [
    'tests/e2e/tests/issue-210.spec.js::translate quoted Russian prompts instead of identity, capabilities, or placeholders',
    () =>
      expectTranslation(
        'Переведи "что это такое?" на английский',
        'what is this?'
      ),
  ],
  [
    'tests/e2e/tests/issue-218.spec.js::#216 — translate apple to russian without quotes',
    () => expectTranslation('Translate apple to Russian', 'яблоко'),
  ],
  [
    'tests/e2e/tests/issue-218.spec.js::#216 — Translate Apple to Russian preserves capitalization',
    () => expectTranslation('Translate Apple to Russian', 'Яблоко'),
  ],
  [
    'tests/e2e/tests/issue-218.spec.js::#216 — unquoted apple covers all supported target languages',
    () => expectAppleAllLanguages(),
  ],
  [
    'tests/e2e/tests/issue-218.spec.js::native Hindi and Chinese translation prompts work without quotes',
    () => expectNativeHindiAndChinesePrompts(),
  ],
  [
    'tests/e2e/tests/issue-218.spec.js::#217 — single Russian noun quoted with ASCII quotes',
    () => expectTranslation('Переведи "яблоко" на английский', 'apple'),
  ],
  [
    'tests/e2e/tests/issue-218.spec.js::#217 — single Russian noun quoted with chevron quotes',
    () => expectTranslation('Переведи «яблоко» на английский', 'apple'),
  ],
  [
    'tests/e2e/tests/issue-218.spec.js::round-trip: ru→en→ru lands on the original noun',
    () =>
      expectRoundTrip(
        'Переведи яблоко на английский',
        'Translate apple to Russian',
        'яблоко'
      ),
  ],
  [
    'tests/e2e/tests/issue-221.spec.js::quoted Russian common nouns translate to English',
    () => expectTranslation('Переведи "огурец" на английский', 'cucumber'),
  ],
  [
    'tests/e2e/tests/issue-221.spec.js::quoted English common nouns translate to Russian',
    () => expectTranslation('Translate "cucumber" to Russian', 'огурец'),
  ],
  [
    'tests/e2e/tests/issue-221.spec.js::unquoted common-noun prompts work in both directions',
    () => expectCommonNouns(),
  ],
  [
    'tests/e2e/tests/issue-221.spec.js::round-trip: tomato → помидор → tomato',
    () =>
      expectRoundTrip(
        'Translate tomato to Russian',
        'Переведи помидор на английский',
        'tomato'
      ),
  ],
  [
    'tests/e2e/tests/issue-230.spec.js::reported quoted phrase translates instead of using a placeholder',
    () =>
      expectTranslation('Переведи "доброе яблоко" на английский', 'good apple'),
  ],
  [
    'tests/e2e/tests/issue-230.spec.js::unknown translation gaps are explicit for every supported target language',
    () => expectTranslationGap('Translate "zzqxqv" to Chinese'),
  ],
]);

function corpusCases() {
  return corpus.files.flatMap((file) =>
    file.tests.map((test) => ({
      ...test,
      path: file.path,
      language: file.language,
    }))
  );
}

function emptyJsonResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return {};
    },
  });
}

async function translatePrompt(prompt) {
  return translateFormalAiPromptWith(prompt, {
    fetch: () => emptyJsonResponse(),
    now: () => 0,
  });
}

async function expectTranslation(prompt, expected) {
  const result = await translatePrompt(prompt);
  expect(result.answer).toBe(expected);
  expect(result.questions).toEqual([]);
  expect(result.formalAiPrompt).toEqual(parseFormalAiTranslationPrompt(prompt));
  expect(result.evidenceLinks).toContain(
    `language_from:${result.formalAiPrompt.sourceLanguage}`
  );
  expect(result.evidenceLinks).toContain(
    `language_to:${result.formalAiPrompt.targetLanguage}`
  );
  return result;
}

async function expectTranslationGap(prompt) {
  const result = await translatePrompt(prompt);
  expect(result.questions.length).toBeGreaterThan(0);
  expect(result.answer).toBe(
    `could not translate "${result.formalAiPrompt.sourceText}" to ${result.formalAiPrompt.targetLanguage}`
  );
  expect(result.answer).not.toContain(
    `[${result.formalAiPrompt.targetLanguage}]`
  );
  expect(result.evidenceLinks).toContain(
    `translation_gap:${result.formalAiPrompt.sourceText}`
  );
}

async function expectLanguageEvidence(prompt, sourceLanguage, targetLanguage) {
  const result = await translatePrompt(prompt);
  expect(result.formalAiPrompt.sourceLanguage).toBe(sourceLanguage);
  expect(result.formalAiPrompt.targetLanguage).toBe(targetLanguage);
  expect(result.evidenceLinks).toContain(`language_from:${sourceLanguage}`);
  expect(result.evidenceLinks).toContain(`language_to:${targetLanguage}`);
}

async function expectSemanticTrace(prompt, expected) {
  const result = await expectTranslation(prompt, expected);
  expect(result.semanticMetaLanguage.links.length).toBeGreaterThan(0);
  expect(result.semanticMetaLanguage.linksNotation).toContain(
    'semantic-meta-language'
  );
  expect(result.evidenceLinks.some((link) => link.startsWith('meaning:'))).toBe(
    true
  );
}

async function expectAppleAllLanguages() {
  for (const [prompt, expected] of [
    ['Translate apple to Russian', 'яблоко'],
    ['Translate apple to English', 'apple'],
    ['apple का हिंदी में अनुवाद करो', 'सेब'],
    ['把 apple 翻译成中文', '苹果'],
  ]) {
    await expectTranslation(prompt, expected);
  }
}

async function expectNativeHindiAndChinesePrompts() {
  await expectTranslation('apple का हिंदी में अनुवाद करो', 'सेब');
  await expectTranslation('把 apple 翻译成中文', '苹果');
}

async function expectCommonNouns() {
  for (const [russian, english] of [
    ['помидор', 'tomato'],
    ['огурец', 'cucumber'],
    ['картофель', 'potato'],
    ['морковь', 'carrot'],
    ['хлеб', 'bread'],
    ['вода', 'water'],
  ]) {
    await expectTranslation(`Переведи ${russian} на английский`, english);
    await expectTranslation(`Translate ${english} to Russian`, russian);
  }
}

async function expectRoundTrip(firstPrompt, secondPrompt, expectedFinalAnswer) {
  const first = await translatePrompt(firstPrompt);
  expect(first.questions).toEqual([]);
  const second = await translatePrompt(secondPrompt);
  expect(second.questions).toEqual([]);
  expect(second.answer).toBe(expectedFinalAnswer);
}

function skipReason(testCase) {
  if (testCase.ignored) {
    return 'The upstream Formal AI corpus marks this case ignored.';
  }
  return pathSkipReasons.get(testCase.path) ?? null;
}

describe('issue 72 - formal-ai upstream corpus parity gate', () => {
  it('pins the current upstream release instead of the stale 706-case release', () => {
    expect(corpus.source).toEqual({
      repository: 'link-assistant/formal-ai',
      commit: '39530ef2e71f787561f9252b72032eb81e329c3e',
      committedAt: '2026-05-26T00:48:52+00:00',
      subject: 'chore: release v0.123.0',
    });
    expect(corpus.summary.totalTestCount).toBe(750);
    expect(corpus.summary.testFileCount).toBe(69);
  });

  it('assigns every upstream test case either a local assertion or an explicit skip reason', () => {
    const cases = corpusCases();
    const caseIds = new Set(cases.map((testCase) => testCase.id));
    const missingAssertionIds = [...formalAiAssertions.keys()].filter(
      (id) => !caseIds.has(id)
    );
    const unaccounted = cases.filter(
      (testCase) =>
        !formalAiAssertions.has(testCase.id) && !skipReason(testCase)
    );

    expect(missingAssertionIds).toEqual([]);
    expect(unaccounted.map((testCase) => testCase.id)).toEqual([]);
    expect(formalAiAssertions.size).toBeGreaterThan(30);
  });

  it('executes the currently shipped Formal AI translation parity assertions', async () => {
    for (const [id, assertion] of formalAiAssertions) {
      try {
        await assertion();
      } catch (error) {
        error.message = `${id}: ${error.message}`;
        throw error;
      }
    }
  });
});
