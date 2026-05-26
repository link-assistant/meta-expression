#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { makeConfig } from 'lino-arguments';
import {
  analyzeStatement,
  analyzeStatementWithLiveEvidence,
  exportEvidencePropertyGraph,
  exportEvidenceJsonLd,
  exportEvidenceProvJsonLd,
  exportEvidenceRdfTriples,
  exportLiteratureBibliography,
  exportScopedSparqlEvidence,
  naturalizeExpressionWith,
  parsePreferenceProfile,
  reviewClaimAgainstLiterature,
  serializeLinksNotation,
} from './index.js';
import { formalizeTextWith, FORMALIZE_LINK_TARGETS } from './formalize.js';
import { translateTextWith } from './translate.js';
import { checkText, checkTextWithLiveEvidence } from './check.js';
import { exportClaimReviewJsonLd } from './claim-review.js';
import { searchTextUniqueness } from './uniqueness.js';
import { parseSourceSpec } from './formalize-sources.js';
import { loadRepoOverrides, loadUserOverrides } from './formalize-overrides.js';
import { assessArticleSet } from './translation-quality.js';

const cliArgvPrefix = ['node', 'meta-expression'];

export function parseCliArguments(args) {
  const options = createCliOptions(loadCliConfiguration(args));
  let index = 0;
  let commandSlotOpen = true;
  const nextValue = (fallback = '') => args[++index] ?? fallback;
  const optionHandlers = {
    '--input': () => appendInputPart(options, nextValue()),
    '-i': () => appendInputPart(options, nextValue()),
    '--format': () => {
      options.format = nextValue('json');
    },
    '-f': () => {
      options.format = nextValue('json');
    },
    '--select': () => {
      options.interpretationIndex = Number(nextValue(0));
    },
    '-s': () => {
      options.interpretationIndex = Number(nextValue(0));
    },
    '--live': () => {
      options.live = true;
    },
    '--target': () => {
      options.target = nextValue('wikipedia');
    },
    '--to': () => {
      options.targetLanguage = nextValue('ru');
    },
    '--translation-strategy': () => {
      options.translationStrategy = nextValue();
    },
    '--target-language': () => {
      options.targetLanguage = nextValue('ru');
    },
    '--from': () => {
      options.sourceLanguage = nextValue('en');
    },
    '--source-language': () => {
      options.sourceLanguage = nextValue('en');
    },
    '--sources': () => {
      options.sourcesSpec = nextValue();
    },
    '--override': () => {
      options.overrideFile = nextValue();
    },
    '--no-repo-overrides': () => {
      options.noRepoOverrides = true;
    },
    '--articles': () => {
      options.articlesPath = nextValue();
    },
    '--skip-list': () => {
      options.skipListPath = nextValue();
    },
    '--fixes': () => {
      options.translationFixesPath = nextValue();
    },
    '--match-threshold': () => {
      options.matchThreshold = Number(nextValue());
    },
    '--limit': () => {
      options.limit = Number(nextValue());
    },
    '--max-ngram': () => {
      options.maxNgramSize = Number(nextValue(3));
    },
    '--score': () => {
      applyEvidenceScore(options.evidenceScoring, nextValue());
    },
    '--source': () => {
      options.sourceUrl = nextValue();
    },
    '--source-url': () => {
      options.sourceUrl = nextValue();
    },
    '--profile': () => {
      options.profileFile = nextValue();
    },
    '--belief-profile': () => {
      options.profileFile = nextValue();
    },
    '--preference-profile': () => {
      options.profileFile = nextValue();
    },
    '--fixture': () => {
      options.fixtureFile = nextValue();
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
    if (isConfigurationOption(arg)) {
      index += 1;
      continue;
    }
    if (commandSlotOpen && !arg.startsWith('-')) {
      options.command = arg;
      commandSlotOpen = false;
      continue;
    }
    if (optionHandlers[arg]) {
      optionHandlers[arg]();
      commandSlotOpen = false;
      continue;
    }
    appendInputPart(options, arg);
    commandSlotOpen = false;
  }

  const { inputParts, inputFromConfiguration, ...parsedOptions } = options;
  void inputFromConfiguration;
  return {
    ...parsedOptions,
    input: inputParts.join(' ').trim(),
  };
}

function loadCliConfiguration(args) {
  const originalConsole = {
    error: console.error,
    log: console.log,
    warn: console.warn,
  };
  const originalEnv = { ...process.env };
  console.error = () => {};
  console.log = () => {};
  console.warn = () => {};
  try {
    return makeConfig({
      argv: [...cliArgvPrefix, ...args],
      env: { enabled: false },
      lenv: { enabled: true, override: true },
      yargs: configureCliYargs,
    });
  } catch {
    return {};
  } finally {
    console.error = originalConsole.error;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    restoreProcessEnv(originalEnv);
  }
}

function configureCliYargs({ yargs, getenv }) {
  return yargs
    .help(false)
    .version(false)
    .exitProcess(false)
    .parserConfiguration({
      'camel-case-expansion': true,
    })
    .option('command', { type: 'string', default: getenv('COMMAND', '') })
    .option('input', {
      alias: 'i',
      type: 'string',
      default: getenv('INPUT', ''),
    })
    .option('format', {
      alias: 'f',
      type: 'string',
      default: getenv('FORMAT', 'json'),
    })
    .option('select', {
      alias: 's',
      type: 'number',
      default: getenv('SELECT', 0),
    })
    .option('live', {
      type: 'boolean',
      default: getenv('LIVE', false),
    })
    .option('target', {
      type: 'string',
      default: getenv('TARGET', ''),
    })
    .option('target-language', {
      alias: 'to',
      type: 'string',
      default: getenv('TARGET_LANGUAGE', ''),
    })
    .option('translation-strategy', {
      type: 'string',
      default: getenv('TRANSLATION_STRATEGY', ''),
    })
    .option('source-language', {
      alias: 'from',
      type: 'string',
      default: getenv('SOURCE_LANGUAGE', ''),
    })
    .option('sources', {
      type: 'string',
      default: getenv('SOURCES', ''),
    })
    .option('override', {
      type: 'string',
      default: getenv('OVERRIDE', ''),
    })
    .option('no-repo-overrides', {
      type: 'boolean',
      default: getenv('NO_REPO_OVERRIDES', false),
    })
    .option('articles', {
      type: 'string',
      default: getenv('ARTICLES', ''),
    })
    .option('skip-list', {
      type: 'string',
      default: getenv('SKIP_LIST', ''),
    })
    .option('fixes', {
      type: 'string',
      default: getenv('FIXES', ''),
    })
    .option('match-threshold', {
      type: 'number',
      default: getenv('MATCH_THRESHOLD', Number.NaN),
    })
    .option('limit', {
      type: 'number',
      default: getenv('LIMIT', Number.NaN),
    })
    .option('max-ngram', {
      type: 'number',
      default: getenv('MAX_NGRAM', Number.NaN),
    })
    .option('score', {
      type: 'string',
      default: getenv('SCORE', ''),
    })
    .option('source-url', {
      alias: 'source',
      type: 'string',
      default: getenv('SOURCE_URL', ''),
    })
    .option('profile', {
      type: 'string',
      default: getenv('PROFILE', ''),
    })
    .option('belief-profile', {
      type: 'string',
      default: getenv('BELIEF_PROFILE', ''),
    })
    .option('preference-profile', {
      type: 'string',
      default: getenv('PREFERENCE_PROFILE', ''),
    })
    .option('fixture', {
      type: 'string',
      default: getenv('FIXTURE', ''),
    })
    .option('help', {
      alias: 'h',
      type: 'boolean',
      default: getenv('HELP', false),
    });
}

function restoreProcessEnv(originalEnv) {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value;
  }
}

function createCliOptions(config) {
  const input = stringOption(config.input);
  const options = {
    command: stringOption(config.command) || 'analyze',
    format: stringOption(config.format) || 'json',
    inputParts: input ? [input] : [],
    inputFromConfiguration: Boolean(input),
    evidenceScoring: parseEvidenceScoring(config.score),
  };
  assignNumberOption(options, 'interpretationIndex', config.select);
  assignBooleanOption(options, 'live', config.live);
  assignStringOption(options, 'target', config.target);
  assignStringOption(
    options,
    'targetLanguage',
    firstPresent(config.targetLanguage, config.to)
  );
  assignStringOption(
    options,
    'translationStrategy',
    config.translationStrategy
  );
  assignStringOption(
    options,
    'sourceLanguage',
    firstPresent(config.sourceLanguage, config.from)
  );
  assignStringOption(options, 'sourcesSpec', config.sources);
  assignStringOption(options, 'overrideFile', config.override);
  assignBooleanOption(options, 'noRepoOverrides', config.noRepoOverrides);
  assignStringOption(options, 'articlesPath', config.articles);
  assignStringOption(options, 'skipListPath', config.skipList);
  assignStringOption(options, 'translationFixesPath', config.fixes);
  assignNumberOption(options, 'matchThreshold', config.matchThreshold);
  assignNumberOption(options, 'limit', config.limit);
  assignNumberOption(options, 'maxNgramSize', config.maxNgram);
  assignStringOption(
    options,
    'profileFile',
    firstPresent(config.profile, config.beliefProfile, config.preferenceProfile)
  );
  assignStringOption(
    options,
    'sourceUrl',
    firstPresent(config.sourceUrl, config.source)
  );
  assignStringOption(options, 'fixtureFile', config.fixture);
  if (config.help === true) {
    options.command = 'help';
  }
  return options;
}

function isConfigurationOption(arg) {
  return arg === '--configuration' || arg === '-c';
}

function appendInputPart(options, value) {
  if (options.inputFromConfiguration) {
    options.inputParts.length = 0;
    options.inputFromConfiguration = false;
  }
  options.inputParts.push(value ?? '');
}

function parseEvidenceScoring(value) {
  const scoring = {};
  applyEvidenceScore(scoring, value);
  return scoring;
}

function applyEvidenceScore(scoring, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }
  const entries = Array.isArray(value) ? value : String(value).split(',');
  for (const entry of entries) {
    const [id, score] = String(entry).split('=');
    const parsed = Number(score);
    if (id && Number.isFinite(parsed)) {
      scoring[id] = parsed;
    }
  }
}

function firstPresent(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ''
  );
}

function assignStringOption(options, key, value) {
  const parsed = stringOption(value);
  if (parsed) {
    options[key] = parsed;
  }
}

function assignNumberOption(options, key, value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    options[key] = parsed;
  }
}

function assignBooleanOption(options, key, value) {
  const parsed = booleanOption(value);
  if (parsed !== undefined) {
    options[key] = parsed;
  }
}

function stringOption(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

function booleanOption(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return Boolean(value);
}

export function runCli(args = process.argv.slice(2), output = console) {
  const options = parseCliArguments(args);

  if (options.live) {
    throw new Error('Use runCliAsync for live evidence mode.');
  }
  if (options.profileFile) {
    throw new Error('Use runCliAsync for preference profile files.');
  }
  if (options.command === 'formalize') {
    throw new Error('Use runCliAsync for the formalize command.');
  }
  if (options.command === 'translate') {
    throw new Error('Use runCliAsync for the translate command.');
  }
  if (isNaturalizeCommand(options.command)) {
    throw new Error('Use runCliAsync for the naturalize command.');
  }
  if (options.command === 'translation-quality') {
    throw new Error('Use runCliAsync for the translation-quality command.');
  }
  if (isUniquenessCommand(options.command)) {
    throw new Error('Use runCliAsync for the uniqueness command.');
  }
  if (isLiteratureReviewCommand(options.command)) {
    throw new Error('Use runCliAsync for the literature-review command.');
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
        preferenceProfile: options.preferenceProfile,
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
  let options = parseCliArguments(args);
  const checked = validateCliOptions(options, output);
  if (checked !== null) {
    return checked;
  }
  options = await hydrateCliOptions(options);
  if (options.command === 'formalize') {
    return runFormalizeCommand(options, output);
  }
  if (options.command === 'translate') {
    return runTranslateCommand(options, output);
  }
  if (isNaturalizeCommand(options.command)) {
    return runNaturalizeCommand(options, output);
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
  if (isLiteratureReviewCommand(options.command)) {
    return runLiteratureReviewCommand(options, output);
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
    ? parseSourceSpec(options.sourcesSpec, {
        language: options.sourceLanguage ?? 'en',
      })
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
    ? parseSourceSpec(options.sourcesSpec, {
        language: options.sourceLanguage ?? 'en',
      })
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

async function runNaturalizeCommand(options, output) {
  const result = await naturalizeExpressionWith(options.input, {
    sourceLanguage: options.sourceLanguage,
    targetLanguage: options.targetLanguage,
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
        preferenceProfile: options.preferenceProfile,
      })
    : checkText(options.input, {
        evidenceScoring: options.evidenceScoring,
        preferenceProfile: options.preferenceProfile,
      });
  return emitCheckResult(options, output, result);
}

async function hydrateCliOptions(options) {
  if (!options.profileFile) {
    return options;
  }
  const raw = await readFile(options.profileFile, 'utf8');
  const preferenceProfile = parseCliPreferenceProfile(raw);
  return {
    ...options,
    preferenceProfile,
  };
}

function parseCliPreferenceProfile(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return parsePreferenceProfile('');
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }
  return parsePreferenceProfile(raw);
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

async function runLiteratureReviewCommand(options, output) {
  const fixture = options.fixtureFile
    ? await readJsonFile(options.fixtureFile)
    : parseLiteratureReviewInput(options.input);
  const result = reviewClaimAgainstLiterature(fixture);
  return emitLiteratureReviewResult(options, output, result);
}

function parseLiteratureReviewInput(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) {
    throw new Error('literature-review requires JSON input or --fixture.');
  }
  return JSON.parse(trimmed);
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
    'naturalize',
    'deformalize',
    'translation-quality',
    'check',
    'fact-check',
    'uniqueness',
    'uniquness',
    'literature-review',
    'lit-review',
  ];
  if (!supportedCommands.includes(options.command)) {
    output.error(`Unsupported command: ${options.command}`);
    output.error(helpText());
    return 1;
  }

  if (options.command === 'translation-quality') {
    return null;
  }
  if (isLiteratureReviewCommand(options.command)) {
    if (!options.fixtureFile && !options.input) {
      output.error('literature-review requires --fixture <file.json>.');
      output.error(helpText());
      return 1;
    }
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
    preferenceProfile: options.preferenceProfile,
  };
}

function emitCliAnalysis(options, output, analysis) {
  if (isSparqlFormat(options.format)) {
    output.log(
      exportScopedSparqlEvidence(analysis, { limit: options.limit }).query
    );
    return 0;
  }
  if (isPropertyGraphFormat(options.format)) {
    output.log(
      JSON.stringify(
        exportEvidencePropertyGraph(analysis, { limit: options.limit }),
        null,
        2
      )
    );
    return 0;
  }
  if (isRdfFormat(options.format)) {
    output.log(
      JSON.stringify(
        exportEvidenceRdfTriples(analysis, { limit: options.limit }),
        null,
        2
      )
    );
    return 0;
  }
  if (isProvOFormat(options.format)) {
    output.log(JSON.stringify(exportEvidenceProvJsonLd(analysis), null, 2));
    return 0;
  }
  if (isJsonLdFormat(options.format)) {
    output.log(JSON.stringify(exportEvidenceJsonLd(analysis), null, 2));
    return 0;
  }
  if (options.format === 'links' || options.format === 'lino') {
    output.log(serializeLinksNotation(analysis.linksNetwork));
    return 0;
  }

  output.log(JSON.stringify(analysis, null, 2));
  return 0;
}

function emitCheckResult(options, output, result) {
  if (isSparqlFormat(options.format)) {
    output.log(
      exportScopedSparqlEvidence(result, { limit: options.limit }).query
    );
    return 0;
  }
  if (isPropertyGraphFormat(options.format)) {
    output.log(
      JSON.stringify(
        exportEvidencePropertyGraph(result, { limit: options.limit }),
        null,
        2
      )
    );
    return 0;
  }
  if (isRdfFormat(options.format)) {
    output.log(
      JSON.stringify(
        exportEvidenceRdfTriples(result, { limit: options.limit }),
        null,
        2
      )
    );
    return 0;
  }
  if (isClaimReviewFormat(options.format)) {
    output.log(
      JSON.stringify(
        exportClaimReviewJsonLd(result, {
          sourceUrl: options.sourceUrl,
        }),
        null,
        2
      )
    );
    return 0;
  }
  if (isProvOFormat(options.format)) {
    output.log(JSON.stringify(exportEvidenceProvJsonLd(result), null, 2));
    return 0;
  }
  if (isJsonLdFormat(options.format)) {
    output.log(JSON.stringify(exportEvidenceJsonLd(result), null, 2));
    return 0;
  }
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

function emitLiteratureReviewResult(options, output, result) {
  if (isLiteratureBibliographyFormat(options.format)) {
    output.log(
      exportLiteratureBibliography(result, { format: options.format })
    );
    return 0;
  }
  if (options.format === 'markdown' || options.format === 'md') {
    output.log(formatLiteratureReviewMarkdown(result));
    return 0;
  }
  output.log(JSON.stringify(result, null, 2));
  return 0;
}

function formatLiteratureReviewMarkdown(result) {
  const lines = [
    `# Literature review: ${result.claim.text}`,
    '',
    `Agreement: ${result.summary.agreement.label}`,
    `Support weight: ${result.summary.agreement.supportWeight}`,
    `Refute weight: ${result.summary.agreement.refuteWeight}`,
    `Uncertainty: ${result.summary.agreement.uncertainty}`,
    '',
  ];
  for (const paper of result.papers) {
    lines.push(
      `- ${paper.citationKey}: ${paper.decision.label} (${paper.decision.weight}) - ${paper.title}`
    );
  }
  return `${lines.join('\n')}\n`;
}

function isCheckCommand(command) {
  return command === 'check' || command === 'fact-check';
}

function isClaimReviewFormat(format) {
  return format === 'claim-review' || format === 'claimreview';
}

function isSparqlFormat(format) {
  return format === 'sparql' || format === 'sparql-query';
}

function isPropertyGraphFormat(format) {
  return format === 'property-graph' || format === 'graph';
}

function isRdfFormat(format) {
  return format === 'rdf' || format === 'rdf-triples';
}

function isJsonLdFormat(format) {
  return (
    format === 'json-ld' ||
    format === 'jsonld' ||
    format === 'ld+json' ||
    format === 'evidence-json-ld'
  );
}

function isProvOFormat(format) {
  return (
    format === 'prov-o' ||
    format === 'provo' ||
    format === 'prov' ||
    format === 'prov-json-ld'
  );
}

function isUniquenessCommand(command) {
  return command === 'uniqueness' || command === 'uniquness';
}

function isNaturalizeCommand(command) {
  return command === 'naturalize' || command === 'deformalize';
}

function isLiteratureReviewCommand(command) {
  return command === 'literature-review' || command === 'lit-review';
}

function isLiteratureBibliographyFormat(format) {
  return ['bibtex', 'bib', 'ris', 'csv'].includes(format);
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
  meta-expression naturalize --input "(claim: subject (OpenAI) predicate (creates) object (tools))"
  meta-expression translation-quality --articles tests/fixtures/issue-43/articles.json \\
    --skip-list tests/fixtures/issue-43/skip-list.json \\
    --fixes tests/fixtures/issue-43/translation-fixes.json --format summary
  meta-expression check --input "Earth orbits the Sun. 1 + 1 = 1." --format html
  meta-expression check --input "Earth orbits the Sun." --score wikidata-structured-claim=0.7
  meta-expression fact-check --input "Paris is the capital of France." --live
  meta-expression uniqueness --input "Earth orbits the Sun." --format markdown
  meta-expression literature-review --fixture js/tests/fixtures/issue-91-literature-review.json --format bibtex

Commands:
  analyze     Run the disambiguation/evaluation prototype.
  formalize   Tokenise text and link each phrase to a knowledge graph entity.
  translate   Formalize text, then translate resolved Wikidata phrases.
  naturalize  Render a formal expression back to natural language.
  deformalize Alias for naturalize.
  translation-quality
              Assess a recorded set of Wikipedia articles end-to-end.
  check       Color detected statements by correctness.
  fact-check  Alias for check.
  uniqueness  Search public sources for prior exact or similar statements.
  literature-review
              Check one claim against a screened paper fixture and export bibliography data.

Options:
  -i, --input <text>             Statement text
  -f, --format <json|links|markdown|html|claim-review|json-ld|prov-o|sparql|rdf|property-graph>
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
  --configuration, -c <file.lenv>
                                 Load CLI defaults from a Links Notation env file
  --profile <file.lino|.json>    analyze/check: preference or belief profile
  --no-repo-overrides            formalize: ignore docs/formalize/overrides.lino
  --max-ngram <n>                formalize: maximum n-gram size (default 3)
  --articles <file.json>         translation-quality: fixture with article extracts
  --skip-list <file.json>        translation-quality: known Wikipedia translation deltas
  --fixes <file.json>            translation-quality: curated translation fixes
  --match-threshold <0..1>       translation-quality: token coverage threshold
  --limit <n>                    graph/SPARQL export record limit (default 50)
  --score <situation=probability>
                                 check/fact-check: override evidence scoring
  --source, --source-url <url>    check/fact-check: source URL for ClaimReview
                                 exports
  --fixture <file.json>           literature-review: screened paper fixture
  -h, --help                     Show this help`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await runCliAsync();
}
