#!/usr/bin/env node

/**
 * Recorder for Wikipedia article snapshots used by the issue 96 paragraph
 * translation quality test.
 *
 * Mirrors the Topviews tool (`date=last-year`) by summing the monthly top
 * pageview lists for the requested calendar year, then for each top article
 * downloads the Wikidata sitelinks and the intro extracts (full lead, which
 * contains several paragraphs) for a curated set of the most popular Wikipedia
 * languages. The data is written to
 * `js/tests/fixtures/issue-96/articles.json` so the integration test can replay
 * the same payloads offline in CI/CD.
 *
 * Usage:
 *   node scripts/record-issue-96-articles.mjs
 *   node scripts/record-issue-96-articles.mjs --year 2025 --languages en,ru,es,de,fr
 *   node scripts/record-issue-96-articles.mjs --limit 10 --min-languages 3
 *
 * Environment variables:
 *   USER_AGENT  custom UA string sent to Wikimedia (defaults to project UA)
 *
 * Reference: https://pageviews.wmcloud.org/topviews/?project=en.wikipedia.org&platform=all-access&date=last-year&excludes=
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, '..', 'js', 'tests', 'fixtures', 'issue-96');
const defaultUserAgent =
  'meta-expression/0.10.0 (https://github.com/link-assistant/meta-expression)';

// The most-spoken / largest Wikipedia editions. Top global topics are highly
// likely to have lead paragraphs in most of these languages, which lets the
// integration test exercise paragraph translation into "most popular
// languages" as requested in issue 96.
const defaultLanguages = [
  'en',
  'es',
  'de',
  'fr',
  'ru',
  'ja',
  'zh',
  'pt',
  'it',
  'ar',
];

const skipNamespacePrefixes = [
  'Main_Page',
  'Special:',
  'Wikipedia:',
  'Portal:',
  'Help:',
  'File:',
  'User:',
  'Talk:',
  'Category:',
  'Template:',
  'Draft:',
  'Module:',
];

function parseArgs(argv) {
  const args = {
    year: null,
    languages: [...defaultLanguages],
    limit: 10,
    minLanguages: 3,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--year' && argv[i + 1]) {
      args.year = argv[(i += 1)];
    } else if (value === '--languages' && argv[i + 1]) {
      args.languages = argv[(i += 1)]
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    } else if (value === '--limit' && argv[i + 1]) {
      args.limit = Number.parseInt(argv[(i += 1)], 10) || args.limit;
    } else if (value === '--min-languages' && argv[i + 1]) {
      args.minLanguages =
        Number.parseInt(argv[(i += 1)], 10) || args.minLanguages;
    }
  }
  if (!args.year) {
    args.year = String(new Date().getUTCFullYear() - 1);
  }
  if (!args.languages.includes('en')) {
    args.languages.unshift('en');
  }
  return args;
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

function isRealArticle(title) {
  return !skipNamespacePrefixes.some((prefix) => title.startsWith(prefix));
}

/**
 * Aggregate the top viewed English Wikipedia articles across an entire year by
 * summing each month's top list, exactly like the Topviews `last-year` view.
 */
async function fetchTopArticlesForYear(year, userAgent) {
  const totals = new Map();
  for (let month = 1; month <= 12; month += 1) {
    const monthPart = String(month).padStart(2, '0');
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${year}/${monthPart}/all-days`;
    let articles = [];
    try {
      const data = await fetchJson(url, userAgent);
      articles = data.items?.[0]?.articles ?? [];
      process.stdout.write(`  ${year}-${monthPart}: ${articles.length} rows\n`);
    } catch (error) {
      process.stdout.write(
        `  ${year}-${monthPart}: skipped (${error.message})\n`
      );
      continue;
    }
    for (const entry of articles) {
      if (!isRealArticle(entry.article)) {
        continue;
      }
      const previous = totals.get(entry.article) ?? 0;
      totals.set(entry.article, previous + (entry.views ?? 0));
    }
  }
  return [...totals.entries()]
    .map(([article, views]) => ({ article, views }))
    .sort((a, b) => b.views - a.views)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

async function fetchSitelinks(title, userAgent) {
  const pagepropsUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(
    title
  )}&format=json`;
  const pageprops = await fetchJson(pagepropsUrl, userAgent);
  const pages = pageprops?.query?.pages ?? {};
  const first = Object.values(pages)[0];
  const qId = first?.pageprops?.wikibase_item;
  if (!qId) {
    return { qId: null, sitelinks: {} };
  }
  const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(
    qId
  )}&props=sitelinks&format=json`;
  const entity = await fetchJson(entityUrl, userAgent);
  const sitelinks = entity?.entities?.[qId]?.sitelinks ?? {};
  return { qId, sitelinks };
}

async function fetchExtract(language, pageTitle, userAgent) {
  const url = `https://${language}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&format=json&titles=${encodeURIComponent(
    pageTitle
  )}`;
  const data = await fetchJson(url, userAgent);
  const pages = data?.query?.pages ?? {};
  const first = Object.values(pages)[0];
  return {
    title: first?.title ?? pageTitle,
    extract: first?.extract ?? '',
  };
}

async function buildArticleRecord(article, allowedLanguages, userAgent) {
  const title = article.article;
  const { qId, sitelinks } = await fetchSitelinks(title, userAgent);
  if (!qId) {
    return null;
  }
  const langPages = {};
  for (const language of allowedLanguages) {
    const site = `${language}wiki`;
    const link = sitelinks[site];
    if (!link?.title) {
      continue;
    }
    const extract = await fetchExtract(language, link.title, userAgent);
    if (!extract.extract) {
      continue;
    }
    langPages[language] = {
      wikiTitle: link.title,
      extract: extract.extract,
      length: extract.extract.length,
    };
  }
  // The source project is en.wikipedia, so an English prose lead is required.
  // List/index pages (e.g. "Deaths in 2025") expose an empty intro extract and
  // are not meaningful paragraph-translation material.
  if (!langPages.en?.extract) {
    return { enTitle: title, qId, skip: 'no English prose lead' };
  }
  return {
    enTitle: title,
    qId,
    languages: Object.keys(langPages).sort(
      (a, b) => langPages[b].length - langPages[a].length
    ),
    pages: langPages,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const userAgent = process.env.USER_AGENT || defaultUserAgent;
  await mkdir(fixturesDir, { recursive: true });
  process.stdout.write(
    `Aggregating top viewed articles for ${args.year} from en.wikipedia…\n`
  );
  const candidates = await fetchTopArticlesForYear(args.year, userAgent);
  process.stdout.write(
    `\nResolving sitelinks and extracts for the top candidates…\n`
  );
  const records = [];
  for (const candidate of candidates) {
    if (records.length >= args.limit) {
      break;
    }
    try {
      process.stdout.write(`  ${candidate.rank}. ${candidate.article} … `);
      const record = await buildArticleRecord(
        candidate,
        args.languages,
        userAgent
      );
      if (!record) {
        process.stdout.write('skipped (no Wikidata id)\n');
        continue;
      }
      if (record.skip) {
        process.stdout.write(`skipped (${record.skip})\n`);
        continue;
      }
      if (record.languages.length < args.minLanguages) {
        process.stdout.write(
          `skipped (only ${record.languages.length} language(s))\n`
        );
        continue;
      }
      record.rank = candidate.rank;
      record.views = candidate.views;
      records.push(record);
      process.stdout.write(`captured (${record.languages.join(', ')})\n`);
    } catch (error) {
      process.stdout.write(`error: ${error.message}\n`);
    }
  }
  const payload = {
    capturedAt: new Date().toISOString(),
    pageviewsYear: args.year,
    pageviewsSource:
      'https://pageviews.wmcloud.org/topviews/?project=en.wikipedia.org&platform=all-access&date=last-year&excludes=',
    languages: args.languages,
    articles: records,
  };
  const outPath = resolve(fixturesDir, 'articles.json');
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`\nWrote ${records.length} articles to ${outPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
