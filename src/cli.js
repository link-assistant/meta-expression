#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import {
  analyzeStatement,
  analyzeStatementWithLiveEvidence,
  serializeLinksNotation,
} from './index.js';
import { formalizeTextWith, FORMALIZE_LINK_TARGETS } from './formalize.js';
import { parseSourceSpec } from './formalize-sources.js';
import { loadRepoOverrides, loadUserOverrides } from './formalize-overrides.js';

export function parseCliArguments(args) {
  const options = {
    command: 'analyze',
    format: 'json',
    inputParts: [],
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
    '--sources': () => {
      options.sourcesSpec = args[++index] ?? '';
    },
    '--override': () => {
      options.overrideFile = args[++index] ?? '';
    },
    '--no-repo-overrides': () => {
      options.noRepoOverrides = true;
    },
    '--max-ngram': () => {
      options.maxNgramSize = Number(args[++index] ?? 3);
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

  const checked = validateCliOptions(options, output);
  if (checked !== null) {
    return checked;
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

  if (!['analyze', 'formalize'].includes(options.command)) {
    output.error(`Unsupported command: ${options.command}`);
    output.error(helpText());
    return 1;
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

function helpText() {
  return `Usage:
  meta-expression analyze "1 + 1 = 2"
  meta-expression analyze --input "Earth orbits the Sun" --format links
  meta-expression analyze --input "Paris is the capital of France" --live
  meta-expression analyze --input "1 + 1 = 1" --select 0
  meta-expression formalize "Albert Einstein was born in Ulm"
  meta-expression formalize --input "Genshin Impact" --sources wikidata,fandom:genshin-impact
  meta-expression formalize --input "Hawaii" --format markdown --target wikipedia

Commands:
  analyze     Run the disambiguation/evaluation prototype.
  formalize   Tokenise text and link each phrase to a knowledge graph entity.

Options:
  -i, --input <text>             Statement text
  -f, --format <json|links|markdown|html>
  -s, --select <index>           Interpretation index (analyze), default 0
  --live                         analyze: resolve through Wikimedia APIs
  --target <wikipedia|wikidata|local>
                                 formalize: link target style
  --sources <spec>               formalize: comma-separated sources
                                   (wikidata,wordnet,fandom:<slug>,fandom-host:<host>)
  --override <file.lino|.json>   formalize: extra user override file (.lino preferred)
  --no-repo-overrides            formalize: ignore docs/formalize/overrides.lino
  --max-ngram <n>                formalize: maximum n-gram size (default 3)
  -h, --help                     Show this help`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await runCliAsync();
}
