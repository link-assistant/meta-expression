const schemaContext = 'https://schema.org';
const schemaClaimReview = 'ClaimReview';
const defaultFactCheckUrl = 'https://github.com/link-assistant/meta-expression';

export function parseClaimReviewJsonLd(input, options = {}) {
  return importClaimReviewJsonLd(input, options);
}

export function importClaimReviewJsonLd(input, options = {}) {
  const jsonLd = parseJsonLdInput(input);
  const review = findSchemaNode(jsonLd, schemaClaimReview);
  if (!review) {
    throw new Error('ClaimReview JSON-LD record not found.');
  }

  const claimText = claimTextFromReview(review);
  if (!claimText) {
    throw new Error('ClaimReview record is missing claimReviewed text.');
  }

  const verdict = verdictFromReview(review.reviewRating);
  const source = sourceFromReview(review);
  const retrievedAt = timestampFrom(
    options.retrievedAt ?? options.now?.() ?? source.publishedAt ?? new Date()
  );
  const provenance = {
    sourceType: 'claim-review',
    sourceUrl: source.url,
    retrievedAt,
    schemaContext: contextFromReview(review),
    schemaType: schemaClaimReview,
    sourceExampleUrl: options.sourceExampleUrl ?? null,
  };
  const evidence = evidenceFromClaimReview({
    claimText,
    verdict,
    source,
    provenance,
    review,
  });

  return {
    status: 'imported',
    format: 'schema.org/ClaimReview',
    claim: {
      text: claimText,
      itemReviewed: review.itemReviewed ?? null,
    },
    verdict,
    source,
    provenance,
    evidence,
    evidenceItems: [evidence],
    jsonLd: review,
  };
}

export function exportClaimReviewJsonLd(input, options = {}) {
  const statement = selectCheckedStatement(input, options);
  const claimReviewed = statementText(statement);
  if (!claimReviewed) {
    throw new Error('Cannot export ClaimReview without a checked statement.');
  }

  const correctness = statementCorrectness(statement);
  const rating = ratingFromCorrectness(correctness);
  const evidenceUrl = primaryEvidenceUrl(statement);
  const sourceUrl =
    options.url ??
    options.factCheckUrl ??
    options.sourceUrl ??
    evidenceUrl ??
    defaultFactCheckUrl;
  const retrievedAt = timestampFrom(
    options.retrievedAt ?? options.now?.() ?? primaryRetrievedAt(statement)
  );
  const citations = uniqueStrings([options.sourceUrl, evidenceUrl]).filter(
    (url) => url && url !== sourceUrl
  );

  const jsonLd = {
    '@context': schemaContext,
    '@type': schemaClaimReview,
    url: sourceUrl,
    claimReviewed,
    itemReviewed: {
      '@type': 'Claim',
      name: claimReviewed,
    },
    author: organization(
      options.author ?? options.authorName ?? 'meta-expression'
    ),
    datePublished: datePart(retrievedAt),
    sdDatePublished: retrievedAt,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: rating.ratingValue,
      bestRating: rating.bestRating,
      worstRating: rating.worstRating,
      alternateName: rating.label,
    },
  };

  if (citations.length === 1) {
    jsonLd.citation = citations[0];
  } else if (citations.length > 1) {
    jsonLd.citation = citations;
  }

  return jsonLd;
}

function parseJsonLdInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('ClaimReview JSON-LD input is empty.');
  }
  if (trimmed.startsWith('<')) {
    return parseJsonLdScript(trimmed);
  }
  return JSON.parse(trimmed);
}

function parseJsonLdScript(html) {
  const scripts = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu
    ),
  ];
  if (scripts.length === 0) {
    throw new Error('No application/ld+json script tag found.');
  }
  return scripts.map((match) => JSON.parse(decodeHtml(match[1].trim())));
}

function findSchemaNode(value, typeName) {
  const stack = [value];
  const seen = new Set();
  while (stack.length > 0) {
    const item = stack.pop();
    if (!item || typeof item !== 'object' || seen.has(item)) {
      continue;
    }
    seen.add(item);
    if (hasSchemaType(item, typeName)) {
      return item;
    }
    for (const child of Object.values(item)) {
      if (child && typeof child === 'object') {
        stack.push(child);
      }
    }
  }
  return null;
}

function hasSchemaType(node, expected) {
  const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
  return types.some((type) => schemaTypeName(type) === expected);
}

function schemaTypeName(value) {
  const text = stringValue(value);
  return text ? text.split(/[/:#]/u).pop() : '';
}

function claimTextFromReview(review) {
  return (
    stringValue(review.claimReviewed) ||
    stringValue(review.itemReviewed?.name) ||
    stringValue(review.itemReviewed?.description)
  );
}

function verdictFromReview(reviewRating) {
  const rating = firstObject(reviewRating) ?? {};
  const ratingValue = numberValue(rating.ratingValue);
  const bestRating = numberValue(rating.bestRating) ?? 5;
  const worstRating = numberValue(rating.worstRating) ?? 1;
  const label =
    stringValue(rating.alternateName) ||
    stringValue(rating.name) ||
    labelFromCorrectness(
      correctnessFromRating(ratingValue, bestRating, worstRating)
    );
  const correctness =
    correctnessFromRating(ratingValue, bestRating, worstRating) ??
    correctnessFromLabel(label);
  const polarity =
    correctness === null || correctness >= 0.5 ? 'support' : 'refute';

  return {
    label,
    ratingValue,
    bestRating,
    worstRating,
    correctness,
    polarity,
  };
}

function sourceFromReview(review) {
  const itemReviewed = firstObject(review.itemReviewed);
  const appearance = firstObject(itemReviewed?.appearance);
  return {
    url: firstString([review.url, review.mainEntityOfPage?.url, review['@id']]),
    author: entitySummary(review.author ?? review.publisher),
    publishedAt: stringValue(review.datePublished) || null,
    modifiedAt: stringValue(review.dateModified) || null,
    claimSource: claimSourceFromReview(itemReviewed, appearance),
  };
}

function claimSourceFromReview(itemReviewed, appearance) {
  return {
    author: entitySummary(itemReviewed?.author ?? appearance?.author),
    url: firstString([
      itemReviewed?.url,
      itemReviewed?.sameAs,
      appearance?.url,
    ]),
    publishedAt: firstString([
      itemReviewed?.datePublished,
      appearance?.datePublished,
    ]),
    headline: stringValue(appearance?.headline) || null,
  };
}

function evidenceFromClaimReview({
  claimText,
  verdict,
  source,
  provenance,
  review,
}) {
  const ratingText = verdict.label || 'Unrated';
  return {
    key: normalizeClaimKey(claimText),
    polarity: verdict.polarity,
    weight: evidenceWeight(verdict),
    sourceType: 'claim-review',
    situation: 'schema-org-claim-review',
    sourceUrl: source.url,
    retrievedAt: provenance.retrievedAt,
    claim: `ClaimReview rated "${claimText}" as "${ratingText}".`,
    identifiers: {
      schemaType: schemaClaimReview,
      ratingValue: stringFromNullable(verdict.ratingValue),
      bestRating: stringFromNullable(verdict.bestRating),
      worstRating: stringFromNullable(verdict.worstRating),
    },
    context: {
      verdict,
      source,
      provenance,
      jsonLd: review,
    },
  };
}

function selectCheckedStatement(input, options) {
  if (input?.status === 'checked' && Array.isArray(input.statements)) {
    const index = Number.isInteger(options.statementIndex)
      ? options.statementIndex
      : 0;
    return input.statements[index] ?? null;
  }
  return input;
}

function statementText(statement) {
  return (
    stringValue(statement?.text) ||
    stringValue(statement?.analysisInput) ||
    stringValue(statement?.statement?.value?.text)
  );
}

function statementCorrectness(statement) {
  return firstNormalizedNumber([
    statement?.correctness,
    statement?.analysis?.result?.correctness,
    statement?.result?.correctness,
    statement?.analysis?.result?.confidence,
    statement?.result?.confidence,
  ]);
}

function primaryEvidenceUrl(statement) {
  return stringValue(primaryEvidence(statement)?.sourceUrl);
}

function primaryRetrievedAt(statement) {
  return stringValue(primaryEvidence(statement)?.retrievedAt) || new Date();
}

function primaryEvidence(statement) {
  const result = statement?.analysis?.result ?? statement?.result;
  const evidence = [
    ...(result?.supportingEvidence ?? []),
    ...(result?.refutingEvidence ?? []),
  ];
  return evidence.find((item) => item?.sourceUrl) ?? evidence[0] ?? null;
}

function ratingFromCorrectness(correctness) {
  if (correctness === null) {
    return {
      ratingValue: 3,
      bestRating: 5,
      worstRating: 1,
      label: 'Unverified',
    };
  }
  const ratingValue = Math.round(1 + clamp(correctness, 0, 1) * 4);
  return {
    ratingValue,
    bestRating: 5,
    worstRating: 1,
    label: ratingLabel(ratingValue),
  };
}

function ratingLabel(value) {
  switch (value) {
    case 1:
      return 'False';
    case 2:
      return 'Mostly false';
    case 3:
      return 'Half true';
    case 4:
      return 'Mostly true';
    case 5:
      return 'True';
    default:
      return 'Unverified';
  }
}

function labelFromCorrectness(correctness) {
  if (correctness === null) {
    return 'Unverified';
  }
  return ratingLabel(Math.round(1 + clamp(correctness, 0, 1) * 4));
}

function correctnessFromRating(value, best, worst) {
  if (value === null || best === worst) {
    return null;
  }
  return clamp((value - worst) / (best - worst), 0, 1);
}

function correctnessFromLabel(label) {
  const normalized = stringValue(label).toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized.includes('mostly true')) {
    return 0.75;
  }
  if (normalized.includes('half') || normalized.includes('mixed')) {
    return 0.5;
  }
  if (
    normalized.includes('mostly false') ||
    normalized.includes('misleading')
  ) {
    return 0.25;
  }
  if (normalized.includes('false') || normalized.includes('pants on fire')) {
    return 0;
  }
  if (normalized.includes('true') || normalized.includes('correct')) {
    return 1;
  }
  return null;
}

function evidenceWeight(verdict) {
  if (verdict.correctness === null) {
    return 1;
  }
  return verdict.polarity === 'refute'
    ? clamp(1 - verdict.correctness, 0, 1)
    : clamp(verdict.correctness, 0, 1);
}

function entitySummary(entity) {
  if (typeof entity === 'string') {
    return {
      type: null,
      name: entity,
      url: null,
    };
  }
  const item = firstObject(entity);
  if (!item) {
    return null;
  }
  return {
    type: schemaTypeName(item['@type']) || null,
    name: stringValue(item.name) || null,
    url: stringValue(item.url) || stringValue(item.sameAs) || null,
  };
}

function firstObject(value) {
  const item = Array.isArray(value) ? value.find(Boolean) : value;
  return item && typeof item === 'object' ? item : null;
}

function contextFromReview(review) {
  return stringValue(review['@context']) || schemaContext;
}

function organization(value) {
  if (value && typeof value === 'object') {
    return value;
  }
  return {
    '@type': 'Organization',
    name: String(value ?? 'meta-expression'),
  };
}

function stringValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return stringValue(value.find((item) => stringValue(item)));
  }
  return '';
}

function firstString(values) {
  for (const value of values) {
    const text = stringValue(value);
    if (text) {
      return text;
    }
  }
  return null;
}

function numberValue(value) {
  const parsed = Number(stringValue(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNormalizedNumber(values) {
  for (const value of values) {
    const parsed = normalizedNumber(value);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
}

function normalizedNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, 0, 1)
    : null;
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

function datePart(value) {
  return String(value).slice(0, 10);
}

function uniqueStrings(values) {
  return [...new Set(values.map(stringValue).filter(Boolean))];
}

function stringFromNullable(value) {
  return value === null || value === undefined ? '' : String(value);
}

function normalizeClaimKey(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
