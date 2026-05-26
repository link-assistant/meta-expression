import { checkText } from './check.js';

const literatureEvidenceSituation = 'literature-screened-paper';
const bibliographyFields = [
  'citationKey',
  'type',
  'title',
  'authors',
  'year',
  'journal',
  'doi',
  'url',
];

export function reviewClaimAgainstLiterature(input, options = {}) {
  const fixture = normalizeLiteratureReviewInput(input, options);
  const evidenceItems = createLiteratureEvidenceItems(fixture);
  const checked = checkText(fixture.claim.text, {
    ...options,
    evidence: evidenceItems,
    evidenceScoring: {
      [literatureEvidenceSituation]: 1,
      ...(options.evidenceScoring ?? {}),
    },
    selectedBy: options.selectedBy ?? 'literature-review',
  });

  return {
    status: 'reviewed',
    kind: 'literature-review',
    claim: fixture.claim,
    query: fixture.query,
    screenedAt: fixture.screenedAt,
    screeningMethod: fixture.screeningMethod,
    papers: fixture.papers,
    evidenceItems,
    checked,
    summary: summarizeLiteratureReview(fixture, evidenceItems, checked),
    bibliography: {
      papers: fixture.papers.map(bibliographyPaper),
    },
  };
}

export function createLiteratureEvidenceItems(input, options = {}) {
  const fixture = normalizeLiteratureReviewInput(input, options);
  return fixture.papers
    .filter((paper) => ['support', 'refute'].includes(paper.decision.polarity))
    .map((paper, index) => createLiteratureEvidenceItem(fixture, paper, index));
}

export function exportLiteratureBibliography(input, options = {}) {
  const format = String(options.format ?? 'bibtex').toLowerCase();
  if (format === 'bibtex' || format === 'bib') {
    return exportLiteratureBibTeX(input);
  }
  if (format === 'ris') {
    return exportLiteratureRis(input);
  }
  if (format === 'csv') {
    return exportLiteratureCsv(input);
  }
  throw new Error(`Unsupported literature bibliography format: ${format}`);
}

export function exportLiteratureBibTeX(input) {
  return `${bibliographyPapersFrom(input)
    .map((paper) => {
      const fields = [
        ['title', paper.title],
        ['author', bibTeXAuthors(paper.authors)],
        ['journal', paper.journal],
        ['year', paper.year],
        ['volume', paper.volume],
        ['number', paper.issue],
        ['pages', paper.pages],
        ['doi', paper.doi],
        ['url', paper.url],
        ['publisher', paper.publisher],
      ].filter(([, value]) => stringValue(value));
      const fieldLines = fields.map(
        ([key, value]) => `  ${key} = {${escapeBibTeX(value)}}`
      );
      return `@${bibTeXType(paper.type)}{${paper.citationKey},\n${fieldLines.join(
        ',\n'
      )}\n}`;
    })
    .join('\n\n')}\n`;
}

export function exportLiteratureRis(input) {
  return `${bibliographyPapersFrom(input)
    .map((paper) => {
      const lines = [
        `TY  - ${risType(paper.type)}`,
        `ID  - ${paper.citationKey}`,
        `TI  - ${paper.title}`,
        ...paper.authors.map((author) => `AU  - ${displayAuthor(author)}`),
        `PY  - ${paper.year}`,
        risLine('JO', paper.journal),
        risLine('PB', paper.publisher),
        risLine('VL', paper.volume),
        risLine('IS', paper.issue),
        risLine('SP', firstPage(paper.pages)),
        risLine('EP', lastPage(paper.pages)),
        risLine('DO', paper.doi),
        risLine('UR', paper.url),
        'ER  -',
      ].filter(Boolean);
      return lines.join('\n');
    })
    .join('\n\n')}\n`;
}

export function exportLiteratureCsv(input) {
  const rows = bibliographyPapersFrom(input).map((paper) =>
    bibliographyFields
      .map((field) => csvValue(csvFieldValue(paper, field)))
      .join(',')
  );
  return `${bibliographyFields.join(',')}\n${rows.join('\n')}\n`;
}

function normalizeLiteratureReviewInput(input, options = {}) {
  const source = input && typeof input === 'object' ? input : options;
  const claim = normalizeReviewClaim(source);
  const rawPapers = normalizeReviewPapers(source);

  return {
    claim,
    query: normalizeQuery(source.query),
    screenedAt: timestampFrom(
      source.screenedAt ?? options.screenedAt ?? options.now?.() ?? new Date()
    ),
    screeningMethod:
      stringValue(source.screeningMethod) || 'mocked-literature-screening',
    papers: rawPapers.map((paper, index) => normalizePaper(paper, index)),
  };
}

function normalizeReviewClaim(source) {
  const claimText = stringValue(source.claim?.text ?? source.claim);
  if (!claimText) {
    throw new Error('Literature review input is missing claim text.');
  }
  return {
    text: claimText,
    domain: stringValue(source.claim?.domain) || null,
  };
}

function normalizeReviewPapers(source) {
  const rawPapers = Array.isArray(source.papers) ? source.papers : [];
  if (rawPapers.length === 0) {
    throw new Error('Literature review input is missing screened papers.');
  }
  return rawPapers;
}

function normalizeQuery(query) {
  if (!query || typeof query !== 'object') {
    return null;
  }
  return {
    text: stringValue(query.text) || null,
    source: stringValue(query.source) || null,
    filters:
      query.filters && typeof query.filters === 'object'
        ? jsonCompatible(query.filters)
        : {},
  };
}

function normalizePaper(paper, index) {
  const core = normalizePaperCore(paper, index);

  return {
    ...core,
    abstract: stringValue(paper.abstract) || null,
    decision: normalizeDecision(paper.decision),
    excerpts: normalizeExcerpts(paper.excerpts),
  };
}

function normalizePaperCore(paper, index) {
  const title = stringValue(paper.title) || `Untitled paper ${index + 1}`;
  const authors = normalizeAuthors(paper.authors);
  const year = stringValue(paper.year ?? paper.date).slice(0, 4);
  const citationKey =
    stringValue(paper.citationKey) ||
    createCitationKey({ title, authors, year }, index);
  return {
    id: stringValue(paper.id) || citationKey,
    citationKey,
    type: stringValue(paper.type) || 'article',
    title,
    authors,
    ...normalizePublicationFields(paper, year),
  };
}

function normalizePublicationFields(paper, year) {
  return {
    journal: stringValue(paper.journal ?? paper.containerTitle) || null,
    publisher: stringValue(paper.publisher) || null,
    year,
    date: stringValue(paper.date) || year || null,
    volume: stringValue(paper.volume) || null,
    issue: stringValue(paper.issue ?? paper.number) || null,
    pages: stringValue(paper.pages) || null,
    doi: normalizeDoi(paper.doi),
    pmid: stringValue(paper.pmid) || null,
    url: stringValue(paper.url) || doiUrl(paper.doi),
  };
}

function normalizeAuthors(value) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items
    .map((author) => {
      if (typeof author === 'string') {
        const [family, ...givenParts] = author
          .split(',')
          .map((part) => part.trim());
        return {
          given: givenParts.join(' ') || null,
          family: family || author,
          literal: author,
        };
      }
      return {
        given: stringValue(author?.given) || null,
        family: stringValue(author?.family) || null,
        literal: stringValue(author?.name) || null,
      };
    })
    .filter((author) => author.family || author.literal);
}

function normalizeDecision(value) {
  const decision = value && typeof value === 'object' ? value : {};
  const polarity = normalizePolarity(
    decision.polarity ?? decision.decision ?? decision.label
  );
  return {
    polarity,
    weight: normalizeWeight(decision.weight, polarity),
    label: stringValue(decision.label) || polarity,
    rationale: stringValue(decision.rationale) || null,
  };
}

function normalizePolarity(value) {
  const normalized = stringValue(value).toLowerCase();
  if (
    normalized.includes('refute') ||
    normalized.includes('contradict') ||
    normalized.includes('does not support')
  ) {
    return 'refute';
  }
  if (normalized.includes('support') || normalized.includes('agree')) {
    return 'support';
  }
  return 'uncertain';
}

function normalizeWeight(value, polarity) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.max(0, parsed);
  }
  return polarity === 'uncertain' ? 0 : 1;
}

function normalizeExcerpts(value) {
  const excerpts = Array.isArray(value) ? value : [];
  return excerpts.map((excerpt, index) => ({
    id: stringValue(excerpt.id) || `excerpt-${index + 1}`,
    section: stringValue(excerpt.section) || null,
    page: stringValue(excerpt.page ?? excerpt.pages) || null,
    text: stringValue(excerpt.text ?? excerpt.quote),
  }));
}

function createLiteratureEvidenceItem(fixture, paper, index) {
  const sourceUrl = paper.url || doiUrl(paper.doi);
  const excerptIds = paper.excerpts.map((excerpt) => excerpt.id);
  return {
    id: `literature-${safeReference(paper.id || index + 1)}`,
    key: normalizeClaimKey(fixture.claim.text),
    polarity: paper.decision.polarity,
    weight: paper.decision.weight,
    sourceType: 'literature',
    situation: literatureEvidenceSituation,
    sourceUrl,
    retrievedAt: fixture.screenedAt,
    claim: literatureEvidenceClaim(fixture.claim.text, paper),
    identifiers: {
      paperId: paper.id,
      citationKey: paper.citationKey,
      doi: paper.doi ?? '',
      pmid: paper.pmid ?? '',
      decision: paper.decision.polarity,
      excerptIds: excerptIds.join(','),
    },
    context: {
      literature: {
        claim: fixture.claim,
        query: fixture.query,
        paper: bibliographyPaper(paper),
        excerpts: paper.excerpts,
        decision: paper.decision,
        screenedAt: fixture.screenedAt,
        screeningMethod: fixture.screeningMethod,
        provenance: {
          sourceType: 'literature',
          sourceUrl,
          retrievedAt: fixture.screenedAt,
        },
      },
      reasoningSteps: literatureReasoningSteps(paper, sourceUrl),
    },
  };
}

function literatureEvidenceClaim(claimText, paper) {
  const verb = paper.decision.polarity === 'support' ? 'supports' : 'refutes';
  const rationale = paper.decision.rationale
    ? ` ${paper.decision.rationale}`
    : '';
  return `Paper "${paper.title}" ${verb} the claim "${claimText}".${rationale}`;
}

function literatureReasoningSteps(paper, sourceUrl) {
  const steps = [
    {
      text: `${paper.title} (${paper.year || 'n.d.'}) screened as ${
        paper.decision.label
      }.`,
      sourceUrl,
    },
  ];
  for (const excerpt of paper.excerpts) {
    steps.push({
      text: excerpt.section
        ? `${excerpt.section}: ${excerpt.text}`
        : excerpt.text,
      sourceUrl,
    });
  }
  return steps;
}

function summarizeLiteratureReview(fixture, evidenceItems, checked) {
  const supportWeight = roundWeight(
    evidenceItems
      .filter((item) => item.polarity === 'support')
      .reduce((sum, item) => sum + item.weight, 0)
  );
  const refuteWeight = roundWeight(
    evidenceItems
      .filter((item) => item.polarity === 'refute')
      .reduce((sum, item) => sum + item.weight, 0)
  );
  const totalWeight = supportWeight + refuteWeight;
  const rawBalance =
    totalWeight === 0 ? null : (supportWeight - refuteWeight) / totalWeight;
  const uncertainty =
    rawBalance === null ? 1 : roundWeight(1 - Math.abs(rawBalance));
  const statement = checked.statements[0] ?? null;

  return {
    totalPapers: fixture.papers.length,
    screenedPapers: fixture.papers.length,
    supportingPapers: fixture.papers.filter(
      (paper) => paper.decision.polarity === 'support'
    ).length,
    refutingPapers: fixture.papers.filter(
      (paper) => paper.decision.polarity === 'refute'
    ).length,
    uncertainPapers: fixture.papers.filter(
      (paper) => paper.decision.polarity === 'uncertain'
    ).length,
    evidenceLinks: evidenceItems.length,
    confidence: statement?.correctness ?? null,
    agreement: {
      label: agreementLabel(supportWeight, refuteWeight),
      supportWeight,
      refuteWeight,
      rawBalance: rawBalance === null ? null : roundWeight(rawBalance),
      uncertainty,
    },
  };
}

function agreementLabel(supportWeight, refuteWeight) {
  if (supportWeight > 0 && refuteWeight > 0) {
    return supportWeight >= refuteWeight ? 'mixed-support' : 'mixed-refute';
  }
  if (supportWeight > 0) {
    return 'supports';
  }
  if (refuteWeight > 0) {
    return 'refutes';
  }
  return 'uncertain';
}

function bibliographyPapersFrom(input) {
  if (Array.isArray(input)) {
    return input.map((paper, index) => normalizePaper(paper, index));
  }
  if (input?.bibliography?.papers) {
    return input.bibliography.papers.map((paper, index) =>
      normalizePaper(paper, index)
    );
  }
  if (Array.isArray(input?.papers)) {
    return input.papers.map((paper, index) => normalizePaper(paper, index));
  }
  throw new Error('Literature bibliography export requires papers.');
}

function bibliographyPaper(paper) {
  return {
    id: paper.id,
    citationKey: paper.citationKey,
    type: paper.type,
    title: paper.title,
    authors: paper.authors,
    journal: paper.journal,
    publisher: paper.publisher,
    year: paper.year,
    date: paper.date,
    volume: paper.volume,
    issue: paper.issue,
    pages: paper.pages,
    doi: paper.doi,
    pmid: paper.pmid,
    url: paper.url,
  };
}

function bibTeXType(type) {
  const normalized = String(type ?? '').toLowerCase();
  if (normalized.includes('book')) {
    return 'book';
  }
  if (normalized.includes('proceeding') || normalized.includes('conference')) {
    return 'inproceedings';
  }
  if (normalized.includes('article')) {
    return 'article';
  }
  return 'misc';
}

function risType(type) {
  const normalized = String(type ?? '').toLowerCase();
  if (normalized.includes('book')) {
    return 'BOOK';
  }
  if (normalized.includes('proceeding') || normalized.includes('conference')) {
    return 'CONF';
  }
  if (normalized.includes('article')) {
    return 'JOUR';
  }
  return 'GEN';
}

function bibTeXAuthors(authors) {
  return authors.map(displayAuthor).join(' and ');
}

function displayAuthor(author) {
  if (author.literal && !author.family) {
    return author.literal;
  }
  if (author.given) {
    return `${author.family}, ${author.given}`;
  }
  return author.family ?? author.literal ?? '';
}

function risLine(tag, value) {
  const text = stringValue(value);
  return text ? `${tag}  - ${text}` : '';
}

function firstPage(pages) {
  return splitPages(pages)[0] ?? '';
}

function lastPage(pages) {
  return splitPages(pages)[1] ?? '';
}

function splitPages(pages) {
  const text = stringValue(pages);
  return text ? text.split(/\s*[-–]\s*/u) : [];
}

function csvFieldValue(paper, field) {
  if (field === 'authors') {
    return paper.authors.map(displayAuthor).join('; ');
  }
  return paper[field] ?? '';
}

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function createCitationKey(paper, index) {
  const firstAuthor = paper.authors[0]?.family ?? 'source';
  const year = paper.year || 'nd';
  const titleWord = paper.title.split(/\s+/u).find(Boolean) ?? 'paper';
  return (
    safeReference(`${firstAuthor}${year}${titleWord}`) || `paper${index + 1}`
  );
}

function normalizeDoi(value) {
  return stringValue(value).replace(/^https?:\/\/doi\.org\//iu, '') || null;
}

function doiUrl(value) {
  const doi = normalizeDoi(value);
  return doi ? `https://doi.org/${doi}` : null;
}

function normalizeClaimKey(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

function timestampFrom(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const raw = String(value ?? '').trim();
  if (!raw) {
    return new Date().toISOString();
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}

function stringValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  return '';
}

function escapeBibTeX(value) {
  return String(value ?? '').replace(/[{}]/gu, '');
}

function safeReference(value) {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'value'
  );
}

function roundWeight(value) {
  return Number(Number(value).toFixed(6));
}

function jsonCompatible(value) {
  return JSON.parse(JSON.stringify(value));
}
