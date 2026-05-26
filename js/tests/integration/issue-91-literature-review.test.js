import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'test-anywhere';
import {
  exportLiteratureBibliography,
  exportLiteratureBibTeX,
  exportLiteratureCsv,
  exportLiteratureRis,
  reviewClaimAgainstLiterature,
} from '../../src/index.js';
import { runCliAsync } from '../../src/cli.js';

const FIXTURE_PATH = 'js/tests/fixtures/issue-91-literature-review.json';

async function loadFixture() {
  return JSON.parse(await readFile(FIXTURE_PATH, 'utf8'));
}

describe('issue 91 - literature-review evidence workflows', () => {
  it('checks one claim against multiple screened papers without using LLM truth evidence', async () => {
    const fixture = await loadFixture();
    const review = reviewClaimAgainstLiterature(fixture, {
      realWorldUncertainty: 0,
    });

    expect(review.status).toBe('reviewed');
    expect(review.kind).toBe('literature-review');
    expect(review.claim.text).toBe(fixture.claim.text);
    expect(review.papers.length).toBe(3);
    expect(review.evidenceItems.length).toBe(3);
    expect(review.evidenceItems.every((item) => item.sourceType)).toBe(true);
    expect(review.evidenceItems.some((item) => item.sourceType === 'llm')).toBe(
      false
    );
    expect(review.summary.supportingPapers).toBe(2);
    expect(review.summary.refutingPapers).toBe(1);
    expect(review.summary.agreement.label).toBe('mixed-support');
    expect(review.summary.agreement.supportWeight).toBe(1.5);
    expect(review.summary.agreement.refuteWeight).toBe(0.5);
    expect(review.summary.agreement.uncertainty).toBeGreaterThan(0);
    expect(review.checked.statements[0].correctness).toBe(0.75);

    const evidenceLink =
      review.checked.statements[0].analysis.linksNetwork.links
        .filter((link) => link.role === 'evidence')
        .find(
          (link) => link.value.identifiers.paperId === fixture.papers[0].id
        );
    expect(evidenceLink.provenance.sourceType).toBe('literature');
    expect(evidenceLink.provenance.sourceUrl).toBe(fixture.papers[0].url);
    expect(evidenceLink.value.context.literature.paper.title).toBe(
      fixture.papers[0].title
    );
    expect(evidenceLink.value.context.literature.excerpts[0].text).toContain(
      'writing self-efficacy'
    );
    expect(evidenceLink.value.context.literature.decision.rationale).toContain(
      'intervention group'
    );
  });

  it('exports literature-backed evidence bibliography data as BibTeX, RIS, and CSV', async () => {
    const fixture = await loadFixture();
    const review = reviewClaimAgainstLiterature(fixture);
    const bibtex = exportLiteratureBibTeX(review);
    const ris = exportLiteratureRis(review);
    const csv = exportLiteratureCsv(review);

    expect(exportLiteratureBibliography(review, { format: 'bibtex' })).toBe(
      bibtex
    );
    expect(bibtex).toContain('@article{lee2022journaling,');
    expect(bibtex).toContain('doi = {10.5555/jwpf.2022.001}');
    expect(ris).toContain('TY  - JOUR');
    expect(ris).toContain('DO  - 10.5555/csfr.2023.017');
    expect(csv).toContain(
      'citationKey,type,title,authors,year,journal,doi,url'
    );
    expect(csv).toContain('"lee2022journaling"');
    expect(csv).toContain('"Lee, Mina; Patel, Owen"');
  });

  it('supports the literature-review fixture workflow from the CLI', async () => {
    const output = {
      logs: [],
      errors: [],
      log(value) {
        this.logs.push(value);
      },
      error(value) {
        this.errors.push(value);
      },
    };
    const exitCode = await runCliAsync(
      ['literature-review', '--fixture', FIXTURE_PATH, '--format', 'ris'],
      output
    );

    expect(exitCode).toBe(0);
    expect(output.errors).toEqual([]);
    expect(output.logs[0]).toContain('TY  - JOUR');
    expect(output.logs[0]).toContain('DO  - 10.5555/twfq.2024.004');
  });
});
