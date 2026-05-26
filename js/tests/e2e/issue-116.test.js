import { describe, expect, it } from 'test-anywhere';
import { verifyWebModuleGraph } from '../../../scripts/verify-web-module-graph.mjs';

describe('issue 116 - static web module graph', () => {
  it('keeps the GitHub Pages web entrypoints browser-loadable', async () => {
    const result = await verifyWebModuleGraph({
      root: new URL('../../../', import.meta.url),
    });

    expect(result.invalidImports).toEqual([]);
    expect(result.contentTypeProblems).toEqual([]);
    expect(
      result.modules.some((moduleUrl) =>
        moduleUrl.endsWith('/js/data/semantic-lexicon.json')
      )
    ).toBe(true);
  });
});
