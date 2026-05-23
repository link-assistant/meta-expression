#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import {
  analyzeStatement,
  analyzeStatementWithLiveEvidence,
  serializeLinksNotation,
} from './index.js';
import { formalizeTextWith, FORMALIZE_LINK_TARGETS } from './formalize.js';
import { translateTextWith } from './translate.js';
import { checkText, checkTextWithLiveEvidence } from './check.js';
import { searchTextUniqueness } from './uniqueness.js';
import { parseSourceSpec } from './formalize-sources.js';
import { loadRepoOverrides, loadUserOverrides } from './formalize-overrides.js';
import { assessArticleSet } from './translation-quality.js';

export function parseCliArguments(args) {
  const options = {
    command: 'analyze',
    format: 'json',
    inputParts: [],
    evidenceScoring: {},
  };
  let index = 0;
  const optionHandlers = {
    '--input': () => options.inputParts.push(args[++index] ?? ''),
    '-i': () => options.inputParts.push(args[++index] ?? ''),
    '--format': () => {
      options.format = args[++index] ?? 'json';
    },
    '-f': () => {
      options.format = args[++index] ?? 'json';
    },
    '--select': () => {
      options.interpretationIndex = Number(args[++index] ?? 0);
    },
    '-s': () => {
      options.interpretationIndex = Number(args[++index] ?? 0);
    },
    '--live': () => {
      options.live = true;
    },
    '--target': () => {
      options.target = args[++index] ?? 'wikipedia';
    },
    '--to': () => {
      options.targetLanguage = args[++index] ?? 'ru';
    },
    '--translation-strategy': () => {
      options.translationStrategy = args[++index] ?? '';
    },
    '--target-language': () => {
      options.targetLanguage = args[++index] ?? 'ru';
    },
    '--from': () => {
      options.sourceLanguage = args[++index] ?? 'en';
    },
    '--source-language': () => {
      options.sourceLanguage = args[++index] ?? 'en';
    },
    '--sources': () => {
      options.sourcesSpec = args[++index] ?? '';
    },
    '--override': () => {
      options.overrideFile = args[++index] ?? '';
    },
    '--no-repo-overrides': () => {
      options.noRepoOverrides = true;
    },
    '--articles': () => {
      options.articlesPath = args[++index] ?? '';
    },
    '--skip-list': () => {
      options.skipListPath = args[++index] ?? '';
    },
    '--fixes': () => {
      options.translationFixesPath = args[++index] ?? '';
    },
    '--match-threshold': () => {
      options.matchThreshold = Number(args[++index] ?? '');
    },
    '--max-ngram': () => {
      options.maxNgramSize = Number(args[++index] ?? 3);
    },
    '--score': () => {
      const [id, value] = String(args[++index] ?? '').split('=');
      const parsed = Number(value);
      if (id && Number.isFinite(parsed)) {
        options.evidenceScoring[id] = parsed;
      }
    },
    '--help': () => {
      options.command = 'help';
    },
    '-h': () => {
      options.command = 'help';
    },
  };

  for (index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (index === 0 && !arg.startsWith('-')) {
      options.command = arg;
      continue;
    }
    if (optionHandlers[arg]) {
      optionHandlers[arg]();
      continue;
    }
    options.inputParts.push(arg);
  }

  return {
    ...options,
    input: options.inputParts.join(' ').trim(),
  };
}

export function runCli(args = process.argv.slice(2), output = console) {
  const options = parseCliArguments(args);

  if (options.live) {
    throw new Error('Use runCliAsync for live evidence mode.');
  }
  if (options.command === 'formalize') {
    throw new Error('Use runCliAsync for the formalize command.');
  }
  if (options.command === 'translate') {
    throw new Error('Use runCliAsync for the translate command.');
  }
  if (options.command === 'translation-quality') {
    throw new Error('Use runCliAsync for the translation-quality command.');
  }
  if (isUniquenessCommand(options.command)) {
    throw new Error('Use runCliAsync for the uniqueness command.');
  }

  const checked = validateCliOptions(options, output);
  if (checked !== null) {
    return checked;
  }

  if (isCheckCommand(options.command)) {
    return emitCheckResult(
      options,
      output,
      checkText(options.input, {
        evidenceScoring: options.evidenceScoring,
      })
    );
  }

  return emitCliAnalysis(
    options,
    output,
    analyzeStatement(options.input, cliAnalysisOptions(options))
  );
}

export async function runCliAsync(
  args = process.argv.slice(2),
  output = console
) {
  const options = parseCliArguments(args);
  const checked = validateCliOptions(options, output);
  if (checked !== null) {
    return checked;
  }
  if (options.command === 'formalize') {
    return runFormalizeCommand(options, output);
  }
  if (options.command === 'translate') {
    return runTranslateCommand(options, output);
  }
  if (options.command === 'translation-quality') {
    return runTranslationQualityCommand(options, output);
  }
  if (isCheckCommand(options.command)) {
    return runCheckCommand(options, output);
  }
  if (isUniquenessCommand(options.command)) {
    return runUniquenessCommand(options, output);
  }

  const analysis = options.live
    ? await analyzeStatementWithLiveEvidence(
        options.input,
        cliAnalysisOptions(options)
      )
    : analyzeStatement(options.input, cliAnalysisOptions(options));
  return emitCliAnalysis(options, output, analysis);
}

async function runFormalizeCommand(options, output) {
  const sources = options.sourcesSpec
    ? parseSourceSpec(options.sourcesSpec)
    : undefined;
  const repoOverrides = options.noRepoOverrides
    ? []
    : await loadRepoOverrides();
  const userOverrides = options.overrideFile
    ? await loadUserOverrides(options.overrideFile)
    : [];
  const linkTargetMode = resolveCliLinkTargetMode(options.target);
  const result = await formalizeTextWith(options.input, {
    fetch: globalThis.fetch?.bind(globalThis),
    linkTargetMode,
    sources,
    overrides: [...repoOverrides, ...userOverrides],
    maxNgramSize: options.maxNgramSize,
  });
  if (options.format === 'links' || options.format === 'lino') {
    output.log(result.linksNotation);
    return 0;
  }
  if (options.format === 'markdown' || options.format === 'md') {
    output.log(result.markdown);
    return 0;
  }
  if (options.format === 'html') {
    output.log(result.html);
    return 0;
  }
  output.log(JSON.stringify(result, null, 2));
  return 0;
}

async function runTranslateCommand(options, output) {
  const sources = options.sourcesSpec
    ? parseSourceSpec(options.sourcesSpec)
    : undefined;
  const repoOverrides = options.noRepoOverrides
    ? []
    : await loadRepoOverrides();
  const userOverrides = options.overrideFile
    ? await loadUserOverrides(options.overrideFile)
    : [];
  const linkTargetMode = resolveCliLinkTargetMode(options.target ?? 'wikidata');
  const result = await translateTextWith(options.input, {
    fetch: globalThis.fetch?.bind(globalThis),
    sourceLanguage: options.sourceLanguage,
    targetLanguage: options.targetLanguage,
    linkTargetMode,
    sources,
    overrides: [...repoOverrides, ...userOverrides],
    maxNgramSize: options.maxNgramSize,
    translationStrategy: options.translationStrategy,
  });
  if (options.format === 'links' || options.format === 'lino') {
    output.log(result.linksNotation);
    return 0;
  }
  if (options.format === 'markdown' || options.format === 'md') {
    output.log(result.markdown);
    return 0;
  }
  if (options.format === 'html') {
    output.log(result.html);
    return 0;
  }
  output.log(JSON.stringify(result, null, 2));
  return 0;
}

async function runCheckCommand(options, output) {
  const result = options.live
    ? await checkTextWithLiveEvidence(options.input, {
        fetch: globalThis.fetch?.bind(globalThis),
        evidenceScoring: options.evidenceScoring,
      })
    : checkText(options.input, {
        evidenceScoring: options.evidenceScoring,
      });
  return emitCheckResult(options, output, result);
}

async function runTranslationQualityCommand(options, output) {
  if (!options.articlesPath) {
    output.error('translation-quality requires --articles <path>.');
    return 1;
  }
  const articlesPayload = await readJsonFile(options.articlesPath);
  const articles = Array.isArray(articlesPayload)
    ? articlesPayload
    : (articlesPayload.articles ?? []);
  const skipList = options.skipListPath
    ? extractEntries(await readJsonFile(options.skipListPath))
    : [];
  const translationFixes = options.translationFixesPath
    ? extractEntries(await readJsonFile(options.translationFixesPath))
    : [];
  const report = await assessArticleSet(articles, {
    fetch: globalThis.fetch?.bind(globalThis),
    skipList,
    translationFixes,
    matchThreshold: Number.isFinite(options.matchThreshold)
      ? options.matchThreshold
      : undefined,
    translationStrategy: options.translationStrategy,
  });
  if (options.format === 'json' || !options.format) {
    output.log(JSON.stringify(report, null, 2));
  } else if (options.format === 'summary') {
    output.log(formatQualitySummary(report));
  } else {
    output.error(
      `Unsupported format for translation-quality: ${options.format}`
    );
    return 1;
  }
  return report.summary.failed === 0 ? 0 : 1;
}

async function readJsonFile(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

function extractEntries(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.entries ?? [];
}

function formatQualitySummary(report) {
  const { summary } = report;
  const lines = [
    `Total articles: ${summary.total}`,
    `  matched:         ${summary.matched}`,
    `  skipped:         ${summary.skipped}`,
    `  translation-fix: ${summary['translation-fix']}`,
    `  fix-suggested:   ${summary['fix-suggested']}`,
    `  failed:          ${summary.failed}`,
    `  no-statement:    ${summary['no-statement']}`,
  ];
  if (summary.failures.length > 0) {
    lines.push('', 'Failures:');
    for (const failure of summary.failures) {
      lines.push(
        `- ${failure.enTitle ?? failure.qId ?? 'unknown'}: ${
          failure.sourceStatement
        }`
      );
    }
  }
  return lines.join('\n');
}

async function runUniquenessCommand(options, output) {
  const result = await searchTextUniqueness(options.input, {
    fetch: globalThis.fetch?.bind(globalThis),
  });
  return emitUniquenessResult(options, output, result);
}

function resolveCliLinkTargetMode(token) {
  if (!token) {
    return FORMALIZE_LINK_TARGETS.WIKIPEDIA;
  }
  const normalized = String(token).toLowerCase();
  if (normalized === 'wikidata') {
    return FORMALIZE_LINK_TARGETS.WIKIDATA;
  }
  if (normalized === 'local' || normalized === 'local-viewer') {
    return FORMALIZE_LINK_TARGETS.LOCAL;
  }
  return FORMALIZE_LINK_TARGETS.WIKIPEDIA;
}

function validateCliOptions(options, output) {
  if (options.command === 'help') {
    output.log(helpText());
    return 0;
  }

  const supportedCommands = [
    'analyze',
    'formalize',
    'translate',
    'translation-quality',
    'check',
    'fact-check',
    'uniqueness',
    'uniquness',
  ];
  if (!supportedCommands.includes(options.command)) {
    output.error(`Unsupported command: ${options.command}`);
    output.error(helpText());
    return 1;
  }

  if (options.command === 'translation-quality') {
    return null;
  }

  if (!options.input) {
    output.error('Missing statement input.');
    output.error(helpText());
    return 1;
  }

  return null;
}

function cliAnalysisOptions(options) {
  return {
    interpretationIndex: options.interpretationIndex ?? 0,
    selectedBy: 'cli',
    evidenceScoring: options.evidenceScoring,
  };
}

function emitCliAnalysis(options, output, analysis) {
  if (options.format === 'links' || options.format === 'lino') {
    output.log(serializeLinksNotation(analysis.linksNetwork));
    return 0;
  }

  output.log(JSON.stringify(analysis, null, 2));
  return 0;
}

function emitCheckResult(options, output, result) {
  if (options.format === 'links' || options.format === 'lino') {
    output.log(result.linksNotation);
    return 0;
  }
  if (options.format === 'markdown' || options.format === 'md') {
    output.log(result.markdown);
    return 0;
  }
  if (options.format === 'html') {
    output.log(result.html);
    return 0;
  }
  output.log(JSON.stringify(result, null, 2));
  return 0;
}

function emitUniquenessResult(options, output, result) {
  if (options.format === 'links' || options.format === 'lino') {
    output.log(result.linksNotation);
    return 0;
  }
  if (options.format === 'markdown' || options.format === 'md') {
    output.log(result.markdown);
    return 0;
  }
  if (options.format === 'html') {
    output.log(result.html);
    return 0;
  }
  output.log(JSON.stringify(result, null, 2));
  return 0;
}

function isCheckCommand(command) {
  return command === 'check' || command === 'fact-check';
}

function isUniquenessCommand(command) {
  return command === 'uniqueness' || command === 'uniquness';
}

function helpText() {
  return `Usage:
  meta-expression analyze "1 + 1 = 2"
  meta-expression analyze --input "Earth orbits the Sun" --format links
  meta-expression analyze --input "Paris is the capital of France" --live
  meta-expression analyze --input "1 + 1 = 1" --select 0
  meta-expression formalize "Albert Einstein was born in Ulm"
  meta-expression formalize --input "Genshin Impact" --sources wikidata,fandom:genshin-impact
  meta-expression formalize --input "Hawaii" --format markdown --target wikipedia
  meta-expression translate --input "Hawaii is a state." --to ru --format markdown
  meta-expression translation-quality --articles tests/fixtures/issue-43/articles.json \\
    --skip-list tests/fixtures/issue-43/skip-list.json \\
    --fixes tests/fixtures/issue-43/translation-fixes.json --format summary
  meta-expression check --input "Earth orbits the Sun. 1 + 1 = 1." --format html
  meta-expression check --input "Earth orbits the Sun." --score wikidata-structured-claim=0.7
  meta-expression fact-check --input "Paris is the capital of France." --live
  meta-expression uniqueness --input "Earth orbits the Sun." --format markdown

Commands:
  analyze     Run the disambiguation/evaluation prototype.
  formalize   Tokenise text and link each phrase to a knowledge graph entity.
  translate   Formalize text, then translate resolved Wikidata phrases.
  translation-quality
              Assess a recorded set of Wikipedia articles end-to-end.
  check       Color detected statements by correctness.
  fact-check  Alias for check.
  uniqueness  Search public sources for prior exact or similar statements.

Options:
  -i, --input <text>             Statement text
  -f, --format <json|links|markdown|html>
  -s, --select <index>           Interpretation index (analyze), default 0
  --live                         analyze: resolve through Wikimedia APIs
  --target <wikipedia|wikidata|local>
                                 formalize/translate: link target style
  --from, --source-language <bcp47>
                                 translate: source language (default en)
  --to, --target-language <bcp47>
                                 translate: target language (default ru for en)
  --sources <spec>               formalize: comma-separated sources
                                   (wikidata,wordnet,fandom:<slug>,fandom-host:<host>)
  --override <file.lino|.json>   formalize: extra user override file (.lino preferred)
  --no-repo-overrides            formalize: ignore docs/formalize/overrides.lino
  --max-ngram <n>                formalize: maximum n-gram size (default 3)
  --articles <file.json>         translation-quality: fixture with article extracts
  --skip-list <file.json>        translation-quality: known Wikipedia translation deltas
  --fixes <file.json>            translation-quality: curated translation fixes
  --match-threshold <0..1>       translation-quality: token coverage threshold
  --score <situation=probability>
                                 check/fact-check: override evidence scoring
  -h, --help                     Show this help`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await runCliAsync();
}
