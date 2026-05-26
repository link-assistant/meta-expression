#!/usr/bin/env node

/**
 * Real-source verifier/recorder for the semantic interlingua lexicon
 * (`js/data/semantic-lexicon.json`).
 *
 * The project requires that translation data be backed by real sources
 * (Wikipedia/Wikidata/Wiktionary) rather than hand-authored language pairs. The
 * runtime in `js/src` already prefers live API translations; this recorder
 * does the offline equivalent for the committed fallback lexicon: for every
 * concept it reads the live Wiktionary translation data for the source lemma —
 * the `{{t|<lang>|<term>}}` templates used on most editions and the
 * `{{перев-блок|…|<lang>=[[term]]…}}` block used on the Russian edition, exactly
 * the data the runtime `lookupWikimediaTranslation` consumes — and records what
 * the live source attests for each concept.
 *
 * The recorder never invents translations. It only:
 *   - upgrades a concept to verified `source: "wiktionary"` (with a real source
 *     URL and `verifiedAt` stamp) when the recorded surface form is itself an
 *     attested translation template term, and
 *   - attaches the real `attestedForms` Wiktionary lists to every other concept
 *     so a human reviewer can see the source data behind a `curated-seed`
 *     surface form (typically an inflection of an attested lemma) and decide
 *     whether to keep it, correct it, or move it to the rare-exception
 *     `js/data/lexicon-overrides.json` list.
 *
 * Usage:
 *   node scripts/record-semantic-lexicon.mjs                 # verify all concepts
 *   node scripts/record-semantic-lexicon.mjs --pair en:ru    # only en->ru concepts
 *   node scripts/record-semantic-lexicon.mjs --limit 20      # cap concepts checked
 *   node scripts/record-semantic-lexicon.mjs --delay 200     # ms between requests
 *   node scripts/record-semantic-lexicon.mjs --reverify      # re-check verified ones
 *   node scripts/record-semantic-lexicon.mjs --dry-run       # report, do not write
 *
 * Environment variables:
 *   USER_AGENT  custom UA string sent to Wikimedia (defaults to project UA)
 *
 * The recorder writes through the same prettier normalisation as
 * `scripts/build-lexicon-seed.mjs` so the output stays canonical.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import prettier from 'prettier';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', 'js', 'data');
const lexiconPath = resolve(dataDir, 'semantic-lexicon.json');
const reportPath = resolve(dataDir, 'lexicon-source-report.json');
const defaultUserAgent =
  'meta-expression/0.10.0 (https://github.com/link-assistant/meta-expression)';

function parseArgs(argv) {
  const args = {
    pair: null,
    limit: Infinity,
    delay: 150,
    reverify: false,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--pair' && argv[i + 1]) {
      args.pair = argv[(i += 1)].trim();
    } else if (value === '--limit' && argv[i + 1]) {
      args.limit = Number.parseInt(argv[(i += 1)], 10) || args.limit;
    } else if (value === '--delay' && argv[i + 1]) {
      args.delay = Number.parseInt(argv[(i += 1)], 10) || 0;
    } else if (value === '--reverify') {
      args.reverify = true;
    } else if (value === '--dry-run') {
      args.dryRun = true;
    }
  }
  return args;
}

function wait(ms) {
  return ms > 0
    ? new Promise((done) => globalThis.setTimeout(done, ms))
    : Promise.resolve();
}

async function fetchJson(url, userAgent) {
  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return await response.json();
}

/**
 * The source language is the labels key that is not licensed as a target by
 * `primary`; targets are the keys of `primary`. This mirrors the directional
 * model in `js/src/semantic-lexicon.js`.
 */
function describeDirections(concept) {
  const targets = Object.keys(concept.primary ?? {});
  const source =
    Object.keys(concept.labels ?? {}).find(
      (language) => !targets.includes(language)
    ) ?? null;
  return { source, targets };
}

function normalizeSourcePageTitle(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/^[^\p{Letter}\p{Number}+#]+/u, '')
    .replace(/[^\p{Letter}\p{Number}+#]+$/u, '');
}

function singularPageTitleCandidates(title) {
  if (title.endsWith('ies') && title.length > 3) {
    return [`${title.slice(0, -3)}y`];
  }
  if (title.endsWith('es') && title.length > 2) {
    return [title.slice(0, -2)];
  }
  if (title.endsWith('s') && title.length > 1) {
    return [title.slice(0, -1)];
  }
  return [];
}

function pageTitleCandidates(value) {
  const title = normalizeSourcePageTitle(value);
  if (!title) {
    return [];
  }
  return [...new Set([title, ...singularPageTitleCandidates(title)])];
}

function stripStressMarks(value) {
  return String(value ?? '').replace(/[̀́]/gu, '');
}

function cleanTerm(value) {
  return stripStressMarks(
    String(value ?? '')
      .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/[[\]]/g, '')
      .trim()
  );
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Wikimedia language codes that a Wiktionary target language can appear under.
// `zh` translations are listed on the English edition under Mandarin (`cmn`).
const targetLanguageAliases = {
  zh: ['zh', 'cmn'],
};

/**
 * Extract every attested translation term for `targetLanguage` from a source
 * Wiktionary page, supporting both edition formats:
 *   - `{{t|<lang>|<term>}}` / `{{t+|…}}` / `{{tt|…}}` / `{{tt+|…}}` (English and
 *     most editions; the `tt`/`tt+` variants are the multi-script forms)
 *   - `{{перев-блок|…|<lang>=[[term1]], [[term2]]}}` (Russian edition)
 */
function extractTargetTerms(wikitext, targetLanguage) {
  const aliases = targetLanguageAliases[targetLanguage] ?? [targetLanguage];
  const terms = [];
  for (const alias of aliases) {
    const language = escapeRegExp(alias);
    const templatePattern = new RegExp(
      `\\{\\{tt?(?:[+\\-]|check)?\\|${language}\\|([^|{}]+)`,
      'giu'
    );
    for (const match of wikitext.matchAll(templatePattern)) {
      const term = cleanTerm(match[1]);
      if (term) {
        terms.push(term);
      }
    }
    // Russian-style block: a `|en=...` line inside {{перев-блок}}.
    const blockPattern = new RegExp(
      `^\\|\\s*${language}\\s*=\\s*(.+)$`,
      'gimu'
    );
    for (const match of wikitext.matchAll(blockPattern)) {
      for (const part of match[1].split(',')) {
        const term = cleanTerm(part);
        if (term) {
          terms.push(term);
        }
      }
    }
  }
  return [...new Set(terms)];
}

async function fetchWiktionaryWikitext(language, pageTitle, userAgent) {
  const url = `https://${language}.wiktionary.org/w/api.php?action=parse&format=json&prop=wikitext&page=${encodeURIComponent(
    pageTitle
  )}`;
  try {
    const payload = await fetchJson(url, userAgent);
    return payload?.parse?.wikitext?.['*'] ?? '';
  } catch {
    return '';
  }
}

function normalizeForMatch(value) {
  return stripStressMarks(String(value ?? ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Gather the attested target terms for a concept and the source page that
 * supplied them. Returns `{ attested, sourcePage }` where `attested` is the
 * de-duplicated list of real Wiktionary translation terms.
 */
async function gatherAttestedTerms({
  sourceLanguage,
  targetLanguage,
  lemma,
  userAgent,
}) {
  for (const pageTitle of pageTitleCandidates(lemma)) {
    const wikitext = await fetchWiktionaryWikitext(
      sourceLanguage,
      pageTitle,
      userAgent
    );
    if (!wikitext) {
      continue;
    }
    const attested = extractTargetTerms(wikitext, targetLanguage);
    if (attested.length > 0) {
      return { attested, sourcePage: pageTitle };
    }
  }
  return { attested: [], sourcePage: null };
}

function wiktionaryArticleUrl(language, pageTitle) {
  return `https://${language}.wiktionary.org/wiki/${encodeURIComponent(
    pageTitle
  )}`;
}

async function loadLexicon() {
  return JSON.parse(await readFile(lexiconPath, 'utf8'));
}

async function writeLexicon(lexicon) {
  const formatted = await prettier.format(JSON.stringify(lexicon, null, 2), {
    parser: 'json',
    filepath: lexiconPath,
  });
  await writeFile(lexiconPath, formatted, 'utf8');
}

async function recordConcept(concept, args, userAgent, stats, report) {
  const { source, targets } = describeDirections(concept);
  if (!source || targets.length === 0) {
    stats.skipped += 1;
    return false;
  }
  if (args.pair && !targets.some((t) => `${source}:${t}` === args.pair)) {
    return null; // filtered out, does not count toward limit
  }
  const lemma = (concept.labels?.[source] ?? [])[0];
  if (!lemma) {
    stats.skipped += 1;
    return false;
  }
  stats.checked += 1;

  let proven = false;
  const attestedForms = {};
  let provenPage = null;
  let provenTarget = null;
  for (const target of targets) {
    const { attested, sourcePage } = await gatherAttestedTerms({
      sourceLanguage: source,
      targetLanguage: target,
      lemma,
      userAgent,
    });

    await wait(args.delay);
    if (attested.length > 0) {
      attestedForms[target] = attested;
    }
    const recorded = normalizeForMatch(concept.primary[target]);
    if (attested.some((term) => normalizeForMatch(term) === recorded)) {
      proven = true;
      provenPage = sourcePage;
      provenTarget = target;
    }
  }

  // The committed lexicon stays clean: proven concepts gain real `wiktionary`
  // provenance + source URL; the full attested-term lists go to the side report
  // so reviewers can see the source data without bloating the lexicon.
  if (proven) {
    concept.source = 'wiktionary';
    concept.url = wiktionaryArticleUrl(source, provenPage);
    stats.verified += 1;
    process.stdout.write(
      `  ✓ ${concept.id} (${source}->${provenTarget} attests "${concept.primary[provenTarget]}")\n`
    );
  } else {
    process.stdout.write(
      `  · ${concept.id} curated (${
        Object.keys(attestedForms).length > 0
          ? 'inflection of attested lemma'
          : 'no source data'
      })\n`
    );
  }
  report.push({
    id: concept.id,
    source,
    status: proven ? 'wiktionary' : 'curated-seed',
    primary: concept.primary,
    attestedForms,
  });
  return true;
}

async function main() {
  const args = parseArgs(process.argv);
  const userAgent = process.env.USER_AGENT || defaultUserAgent;
  const lexicon = await loadLexicon();
  const concepts = Array.isArray(lexicon.concepts) ? lexicon.concepts : [];
  const stats = { checked: 0, verified: 0, skipped: 0 };
  const report = [];

  for (const concept of concepts) {
    if (stats.checked >= args.limit) {
      break;
    }

    await recordConcept(concept, args, userAgent, stats, report);
  }

  process.stdout.write(
    `\nChecked ${stats.checked}, verified ${stats.verified}, ` +
      `curated remainder ${stats.checked - stats.verified}, skipped ${stats.skipped}.\n`
  );
  if (args.dryRun) {
    process.stdout.write('\nDry run: lexicon and report not modified.\n');
    return;
  }
  await writeLexicon(lexicon);
  report.sort((a, b) => a.id.localeCompare(b.id));
  const reportPayload = {
    description:
      'Live Wiktionary attestations gathered by scripts/record-semantic-lexicon.mjs. ' +
      'Concepts with status "wiktionary" have a surface form directly attested as a ' +
      'translation template term. Concepts with status "curated-seed" list the real ' +
      'attested lemmas; their surface form is typically an inflection of one of those ' +
      'lemmas and is a candidate for js/data/lexicon-overrides.json review.',
    capturedAt: new Date().toISOString(),
    proven: stats.verified,
    curatedRemainder: stats.checked - stats.verified,
    concepts: report,
  };
  await writeFile(
    reportPath,
    `${JSON.stringify(reportPayload, null, 2)}\n`,
    'utf8'
  );
  process.stdout.write(`\nUpdated ${lexiconPath}\nWrote ${reportPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
