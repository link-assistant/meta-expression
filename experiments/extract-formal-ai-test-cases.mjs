import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoDir = process.env.FORMAL_AI_REPO ?? '/tmp/formal-ai-issue54';
const outputPath =
  process.env.FORMAL_AI_CORPUS_OUTPUT ??
  fileURLToPath(
    new URL('../js/tests/fixtures/formal-ai-test-corpus.json', import.meta.url)
  );

const testFiles = walk(join(repoDir, 'tests'))
  .filter((file) => ['.js', '.mjs', '.rs'].includes(extname(file)))
  .sort((left, right) => left.localeCompare(right));

const source = {
  repository: 'link-assistant/formal-ai',
  commit: git(['rev-parse', 'HEAD']),
  committedAt: git(['show', '-s', '--format=%cI', 'HEAD']),
  subject: git(['show', '-s', '--format=%s', 'HEAD']),
};

const files = testFiles.map((absolutePath) => {
  const path = relative(repoDir, absolutePath).replaceAll('\\', '/');
  const text = readFileSync(absolutePath, 'utf8');
  const language = extname(absolutePath) === '.rs' ? 'rust' : 'javascript';
  const tests =
    language === 'rust'
      ? parseRustTests(text, path)
      : parseJavaScriptTests(text, path);
  return {
    path,
    language,
    sha256: createHash('sha256').update(text).digest('hex'),
    testCount: tests.length,
    ignoredTestCount: tests.filter((test) => test.ignored).length,
    tests,
  };
});

const rustTestCount = countTests(files, 'rust');
const jsTestCount = countTests(files, 'javascript');
const ignoredRustTestCount = countIgnoredTests(files, 'rust');
const ignoredJsTestCount = countIgnoredTests(files, 'javascript');
const corpus = {
  source,
  summary: {
    testFileCount: files.length,
    rustTestCount,
    jsTestCount,
    totalTestCount: rustTestCount + jsTestCount,
    ignoredRustTestCount,
    ignoredJsTestCount,
    ignoredTotalTestCount: ignoredRustTestCount + ignoredJsTestCount,
  },
  files,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(corpus, null, 2)}\n`);
console.log(
  `Wrote ${corpus.summary.totalTestCount} Formal AI tests from ${files.length} files to ${outputPath}`
);

function walk(directory) {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory() ? walk(path) : [path];
    })
    .sort((left, right) => left.localeCompare(right));
}

function git(args) {
  return execFileSync('git', ['-C', repoDir, ...args], {
    encoding: 'utf8',
  }).trim();
}

function parseRustTests(text, path) {
  const tests = [];
  const lines = text.split(/\r?\n/);
  let attributes = [];
  for (const [index, line] of lines.entries()) {
    const attribute = line.match(/^\s*#\[(.+?)\]\s*$/);
    if (attribute) {
      attributes.push({ value: attribute[1], line: index + 1 });
      continue;
    }
    const functionMatch = line.match(
      /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(/u
    );
    if (functionMatch) {
      if (attributes.some((entry) => isRustTestAttribute(entry.value))) {
        const testLine =
          attributes.find((entry) => isRustTestAttribute(entry.value))?.line ??
          index + 1;
        const ignored = attributes.some((entry) =>
          entry.value.trim().startsWith('ignore')
        );
        const name = functionMatch[1];
        tests.push({
          id: `${path}::${name}`,
          name,
          line: testLine,
          framework: attributes.some((entry) =>
            entry.value.trim().startsWith('tokio::test')
          )
            ? 'tokio::test'
            : 'test',
          ignored,
        });
      }
      attributes = [];
      continue;
    }
    if (line.trim() && !line.trim().startsWith('//')) {
      attributes = [];
    }
  }
  return tests;
}

function isRustTestAttribute(value) {
  const normalized = value.trim();
  return normalized === 'test' || normalized.startsWith('tokio::test');
}

function parseJavaScriptTests(text, path) {
  const tests = [];
  const pattern =
    /(?<![\w$])(?<callee>test|it)(?<modifier>\.(?:skip|fixme|only))?\s*\(\s*(?<quote>['"`])(?<name>(?:\\.|(?!\k<quote>)[\s\S])*?)\k<quote>/gu;
  for (const match of text.matchAll(pattern)) {
    const name = unescapeTestName(match.groups.name, match.groups.quote);
    tests.push({
      id: `${path}::${name}`,
      name,
      line: lineNumberAt(text, match.index),
      framework: match.groups.callee,
      ignored: ['.skip', '.fixme'].includes(match.groups.modifier ?? ''),
    });
  }
  return tests;
}

function unescapeTestName(name, quote) {
  if (quote === '`') {
    return name.replaceAll('\\`', '`');
  }
  if (quote === '"') {
    return name.replaceAll('\\"', '"');
  }
  return name.replaceAll("\\'", "'");
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function countTests(files, language) {
  return files
    .filter((file) => file.language === language)
    .reduce((total, file) => total + file.testCount, 0);
}

function countIgnoredTests(files, language) {
  return files
    .filter((file) => file.language === language)
    .reduce((total, file) => total + file.ignoredTestCount, 0);
}
