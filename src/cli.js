#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { analyzeStatement, serializeLinksNotation } from './index.js';

export function parseCliArguments(args) {
  const options = {
    command: 'analyze',
    format: 'json',
    inputParts: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (index === 0 && !arg.startsWith('-')) {
      options.command = arg;
      continue;
    }
    if (arg === '--input' || arg === '-i') {
      options.inputParts.push(args[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (arg === '--format' || arg === '-f') {
      options.format = args[index + 1] ?? 'json';
      index += 1;
      continue;
    }
    if (arg === '--select' || arg === '-s') {
      options.interpretationIndex = Number(args[index + 1] ?? 0);
      index += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.command = 'help';
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

  const analysis = analyzeStatement(options.input, {
    interpretationIndex: options.interpretationIndex ?? 0,
    selectedBy: 'cli',
  });

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
  meta-expression analyze --input "1 + 1 = 1" --select 0

Options:
  -i, --input <text>     Statement text
  -f, --format <json|links>
  -s, --select <index>   Interpretation index, default 0
  -h, --help             Show this help`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = runCli();
}
