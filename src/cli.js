#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import {
  analyzeStatement,
  analyzeStatementWithLiveEvidence,
  serializeLinksNotation,
} from './index.js';

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

  const analysis = options.live
    ? await analyzeStatementWithLiveEvidence(
        options.input,
        cliAnalysisOptions(options)
      )
    : analyzeStatement(options.input, cliAnalysisOptions(options));
  return emitCliAnalysis(options, output, analysis);
}

function validateCliOptions(options, output) {
  if (options.command === 'help') {
    output.log(helpText());
    return 0;
  }

  if (options.command !== 'analyze') {
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

Options:
  -i, --input <text>     Statement text
  -f, --format <json|links>
  -s, --select <index>   Interpretation index, default 0
  --live                 Resolve supported claims through Wikimedia APIs
  -h, --help             Show this help`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await runCliAsync();
}
