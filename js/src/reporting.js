const issueReportRepoUrl = 'https://github.com/link-assistant/meta-expression';

const formalizationLevelNames = {
  1: 'Raw text',
  2: 'Structured meaning links',
  3: 'Partial formal expression',
  4: 'Fully computable expression',
};

export function serializeLinksNotation(linksNetwork) {
  const header = [
    `(links-network: ${referenceToken(linksNetwork.id)} ${referenceToken(
      linksNetwork.beliefSystem.id
    )})`,
  ];
  const lines = linksNetwork.links.map((link) => {
    const references =
      link.references.length > 0
        ? link.references.map(referenceToken).join(' ')
        : 'self';
    const value = summarizeLinkValue(link);
    return `(${referenceToken(link.id)}: ${referenceToken(
      link.role
    )} ${references} ${value})`;
  });
  return [...header, ...lines].join('\n');
}

export function createIssueReportUrl(analysis, options = {}) {
  const repoUrl = options.repoUrl ?? issueReportRepoUrl;
  const params = new globalThis.URLSearchParams({
    title: createIssueReportTitle(analysis.statement.value.text),
    body: createIssueReportBody(analysis, options),
    labels: options.labels ?? 'bug',
  });

  return `${repoUrl.replace(/\/$/, '')}/issues/new?${params.toString()}`;
}

function createIssueReportTitle(statement) {
  const text = normalizeReportInput(statement);
  const shortened = text.length > 50 ? `${text.slice(0, 50)}...` : text;
  return `Issue with statement: ${shortened}`;
}

function createIssueReportBody(analysis, options) {
  const lines = [];
  const level = analysis.formalization.level;
  const confidence =
    analysis.result.confidence === null
      ? 'unknown'
      : `${Math.round(analysis.result.confidence * 100)}%`;

  lines.push('## Environment');
  lines.push('');
  if (options.pageUrl) {
    lines.push(`- **URL**: ${options.pageUrl}`);
  }
  if (options.userAgent) {
    lines.push(`- **User Agent**: ${options.userAgent}`);
  }
  lines.push(
    `- **Timestamp**: ${options.timestamp ?? new Date().toISOString()}`
  );
  lines.push('');
  lines.push('## Statement');
  lines.push('');
  lines.push('```');
  lines.push(analysis.statement.value.text);
  lines.push('```');
  lines.push('');
  lines.push('## Interpretation');
  lines.push('');
  lines.push(analysis.selectedInterpretation.paraphrase);
  lines.push('');
  appendInterpretationLines(lines, analysis.interpretations);
  lines.push('## Result');
  lines.push('');
  lines.push(`- **Value**: ${analysis.result.value}`);
  lines.push(`- **Confidence**: ${confidence}`);
  lines.push(
    `- **Formalization level**: ${level} - ${
      formalizationLevelNames[level] ?? 'Unknown level'
    }`
  );
  lines.push(`- **Explanation**: ${analysis.result.explanation}`);
  lines.push('');
  lines.push('## Evidence');
  lines.push('');
  appendEvidenceLines(
    lines,
    'Supporting evidence',
    analysis.result.supportingEvidence
  );
  appendEvidenceLines(
    lines,
    'Refuting evidence',
    analysis.result.refutingEvidence
  );
  appendProbabilityCalculationLines(lines, analysis.result.calculation);
  appendReasoningTraceLines(lines, analysis.linksNetwork.links);
  lines.push('');
  lines.push('## Links Notation');
  lines.push('');
  lines.push('```');
  lines.push(serializeLinksNotation(analysis.linksNetwork));
  lines.push('```');
  lines.push('');
  lines.push('## Description');
  lines.push('');
  lines.push('<!-- Please describe what looked wrong or incomplete. -->');
  lines.push('');

  return lines.join('\n');
}

function appendInterpretationLines(lines, interpretations) {
  if (!Array.isArray(interpretations) || interpretations.length <= 1) {
    return;
  }

  lines.push('## Candidate Interpretations');
  lines.push('');
  for (const interpretation of interpretations) {
    lines.push(
      `- **${interpretation.id}** (${interpretation.kind}): ${interpretation.paraphrase}`
    );
  }
  lines.push('');
}

function appendEvidenceLines(lines, heading, evidenceItems) {
  lines.push(`### ${heading}`);
  if (evidenceItems.length === 0) {
    lines.push('');
    lines.push('None.');
    lines.push('');
    return;
  }

  for (const evidence of evidenceItems) {
    const source = evidence.sourceUrl
      ? `[${evidence.sourceType}](${evidence.sourceUrl})`
      : evidence.sourceType;
    lines.push(`- ${source}: ${evidence.claim}`);
  }
  lines.push('');
}

function appendProbabilityCalculationLines(lines, calculation) {
  if (!calculation) {
    return;
  }

  lines.push('## Probability Calculation');
  lines.push('');
  appendCalculationMetric(lines, 'Strategy', calculation.strategy);
  appendCalculationMetric(lines, 'Probability', calculation.probability);
  appendCalculationMetric(
    lines,
    'Signed confidence',
    calculation.signedConfidence
  );
  appendCalculationMetric(lines, 'Truth range', calculation.truthRange);
  appendCalculationMetric(lines, 'Valence', calculation.valence);
  appendCalculationMetric(lines, 'Support weight', calculation.supportWeight);
  appendCalculationMetric(lines, 'Refute weight', calculation.refuteWeight);
  appendCalculationMetric(lines, 'Raw confidence', calculation.rawConfidence);
  appendCalculationMetric(
    lines,
    'Bounded confidence',
    calculation.boundedConfidence
  );
  lines.push('');
  for (const input of calculation.inputs ?? []) {
    lines.push(formatCalculationInput(input));
  }
  lines.push('');
  for (const evidence of calculation.evidence ?? []) {
    const situation = evidence.situationId
      ? `, situation ${evidence.situationId}`
      : '';
    lines.push(
      `- ${evidence.polarity} weight ${evidence.weight}${situation}: ${evidence.claim}`
    );
  }
  lines.push('');
}

function appendCalculationMetric(lines, label, value) {
  if (value === undefined) {
    return;
  }
  lines.push(`- **${label}**: ${formatCalculationValue(value)}`);
}

function formatCalculationInput(input) {
  const { kind, id, ...details } = input;
  const idText = id ? ` ${id}` : '';
  const detailText = Object.entries(details)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${formatCalculationValue(value)}`)
    .join(', ');
  return `- input ${kind}${idText}${detailText ? `: ${detailText}` : ''}`;
}

function formatCalculationValue(value) {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatCalculationValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function appendReasoningTraceLines(lines, links) {
  const traceLinks = links.filter((link) =>
    ['meaning', 'reasoning-step'].includes(link.role)
  );
  if (traceLinks.length === 0) {
    return;
  }

  lines.push('## Reasoning Trace');
  lines.push('');
  for (const link of traceLinks) {
    const source = link.value?.sourceUrl
      ? ` ([source](${link.value.sourceUrl}))`
      : '';
    lines.push(
      `- **${link.role}**: ${summarizeReportValue(link.value)}${source}`
    );
  }
  lines.push('');
}

function summarizeReportValue(value) {
  if (value === null) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return (
    value.text ??
    value.paraphrase ??
    value.claim ??
    value.relation ??
    value.kind ??
    value.expression?.type ??
    ''
  );
}

function summarizeLinkValue(link) {
  const value = link.value;
  if (value === null) {
    return referenceToken(link.role);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return linoText(value);
  }
  if (value.relation) {
    return referenceToken(value.relation);
  }
  if (value.text) {
    return linoText(value.text);
  }
  if (value.paraphrase) {
    return linoText(value.paraphrase);
  }
  if (value.claim) {
    return linoText(value.claim);
  }
  if (value.expression?.type) {
    return referenceToken(value.expression.type);
  }
  if (value.kind) {
    return referenceToken(value.kind);
  }
  return referenceToken(link.role);
}

function linoText(value) {
  return `(${String(value).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()})`;
}

function referenceToken(value) {
  const token = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return token || 'value';
}

function normalizeReportInput(input) {
  return String(input ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}
