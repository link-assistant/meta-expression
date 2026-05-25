import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect } from 'test-anywhere';
import { parseCliArguments, runCliAsync } from '../../src/cli.js';
import { parseLino, serializePreferenceProfile } from '../../src/index.js';

describe('issue 62 - official Links Notation and lino-arguments', () => {
  it('parses official Links Notation tuples through the current Lino API', () => {
    const parsed = parseLino('(claim: Earth Sun)\n');

    expect(parsed).toEqual({ claim: ['Earth', 'Sun'] });
  });

  it('loads CLI defaults from a Links Notation configuration file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'meta-expression-issue-62-'));
    try {
      const configPath = join(dir, 'meta-expression.lenv');
      await writeFile(
        configPath,
        [
          'COMMAND: check',
          'INPUT: Earth orbits the Sun.',
          'FORMAT: markdown',
          'SCORE: wikipedia-cited-statement=0.8',
          '',
        ].join('\n')
      );

      const parsed = parseCliArguments(['--configuration', configPath]);

      expect(parsed.command).toBe('check');
      expect(parsed.input).toBe('Earth orbits the Sun.');
      expect(parsed.format).toBe('markdown');
      expect(parsed.evidenceScoring['wikipedia-cited-statement']).toBe(0.8);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('applies a Links Notation preference profile from the CLI', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'meta-expression-issue-62-'));
    try {
      const profilePath = join(dir, 'profile.lino');
      await writeFile(
        profilePath,
        serializePreferenceProfile({ activeContextId: 'star-wars' })
      );
      const logs = [];
      const errors = [];

      const exit = await runCliAsync(
        ['analyze', '--input', 'The Force exists', '--profile', profilePath],
        {
          log(message) {
            logs.push(message);
          },
          error(message) {
            errors.push(message);
          },
        }
      );
      const result = JSON.parse(logs[0]);

      expect(exit).toBe(0);
      expect(errors.length).toBe(0);
      expect(
        result.result.supportingEvidence.some(
          (evidence) => evidence.sourceType === 'context'
        )
      ).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
