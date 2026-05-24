import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'test-anywhere';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const checkerSource = join(rootDir, 'scripts/check-file-line-limits.sh');

function writeLines(repoDir, filePath, lineCount) {
  const absolutePath = join(repoDir, filePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  const contents = Array.from(
    { length: lineCount },
    (_, index) => `line ${index + 1}`
  ).join('\n');
  writeFileSync(absolutePath, `${contents}\n`);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`
    );
  }
}

function createRepository(files) {
  const repoDir = mkdtempSync(join(tmpdir(), 'meta-expression-line-limits-'));
  mkdirSync(join(repoDir, 'scripts'), { recursive: true });
  copyFileSync(
    checkerSource,
    join(repoDir, 'scripts/check-file-line-limits.sh')
  );
  for (const [filePath, lineCount] of files) {
    writeLines(repoDir, filePath, lineCount);
  }
  run('git', ['init', '--quiet'], repoDir);
  run('git', ['add', '.'], repoDir);
  return repoDir;
}

function checkLineLimits(repoDir) {
  return spawnSync('bash', ['scripts/check-file-line-limits.sh'], {
    cwd: repoDir,
    encoding: 'utf8',
  });
}

function combinedOutput(result) {
  return `${result.stdout}\n${result.stderr}`;
}

describe('file line limit checker', () => {
  it('fails tracked Rust, JavaScript, and Markdown files above the limit', () => {
    const repoDir = createRepository([
      ['rust/src/oversized.rs', 1501],
      ['js/src/oversized.js', 1501],
      ['scripts/oversized.cjs', 1501],
      ['README.md', 1501],
    ]);
    try {
      const result = checkLineLimits(repoDir);
      const output = combinedOutput(result);

      expect(result.status).toBe(1);
      expect(output.includes('rust/src/oversized.rs')).toBe(true);
      expect(output.includes('js/src/oversized.js')).toBe(true);
      expect(output.includes('scripts/oversized.cjs')).toBe(true);
      expect(output.includes('README.md')).toBe(true);
    } finally {
      rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it('ignores case-study Markdown and unrelated file types', () => {
    const repoDir = createRepository([
      ['docs/case-studies/issue-1/large.md', 2000],
      ['data/large.json', 2000],
    ]);
    try {
      const result = checkLineLimits(repoDir);

      expect(result.status).toBe(0);
    } finally {
      rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it('warns before the hard line limit without failing', () => {
    const repoDir = createRepository([['js/src/near-limit.js', 1351]]);
    try {
      const result = checkLineLimits(repoDir);
      const output = combinedOutput(result);

      expect(result.status).toBe(0);
      expect(output.includes('WARNING: js/src/near-limit.js')).toBe(true);
    } finally {
      rmSync(repoDir, { recursive: true, force: true });
    }
  });
});
