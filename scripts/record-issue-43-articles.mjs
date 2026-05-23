#!/usr/bin/env node

/**
 * Recorder for Wikipedia article snapshots used by the issue 43 quality test.
 *
 * Downloads top monthly pageviews from Wikimedia, then for each candidate
 * article downloads the Wikidata sitelinks and the first-paragraph extracts
 * for the two largest language versions. The data is written to
 * `tests/fixtures/issue-43/articles.json` so the integration test can replay
 * the same payloads offline.
 *
 * Usage:
 *   node scripts/record-issue-43-articles.mjs
 *   node scripts/record-issue-43-articles.mjs --month 2026-04 --languages en,ru
 *
 * Environment variables:
 *   USER_AGENT  custom UA string sent to Wikimedia (defaults to project UA)
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, '..', 'tests', 'fixtures', 'issue-43');
const defaultUserAgent =
  'meta-expression/0.10.0 (https://github.com/link-assistant/meta-expression)';
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
];

function parseArgs(argv) {
  const args = { month: null, languages: ['en', 'ru'], limit: 10 };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--month' && argv[i + 1]) {
      args.month = argv[(i += 1)];
    } else if (value === '--languages' && argv[i + 1]) {
      args.languages = argv[(i += 1)]
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    } else if (value === '--limit' && argv[i + 1]) {
      args.limit = Number.parseInt(argv[(i += 1)], 10) || args.limit;
    }
  }
  if (!args.month) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    args.month = `${year}-${month}`;
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

async function fetchTopArticles(month, userAgent) {
  const [year, monthPart] = month.split('-');
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${year}/${monthPart}/all-days`;
  const data = await fetchJson(url, userAgent);
  return data.items?.[0]?.articles ?? [];
}

function isRealArticle(title) {
  return !skipNamespacePrefixes.some((prefix) => title.startsWith(prefix));
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
    langPages[language] = {
      wikiTitle: link.title,
      extract: extract.extract,
      length: extract.extract.length,
    };
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
    `Fetching top viewed articles for ${args.month} from en.wikipedia…\n`
  );
  const candidates = await fetchTopArticles(args.month, userAgent);
  const real = candidates.filter((entry) => isRealArticle(entry.article));
  const records = [];
  for (const candidate of real) {
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
      if (record.languages.length < args.languages.length) {
        process.stdout.write(
          `skipped (missing ${args.languages
            .filter((language) => !record.languages.includes(language))
            .join(', ')})\n`
        );
        continue;
      }
      record.rank = candidate.rank;
      record.views = candidate.views;
      records.push(record);
      process.stdout.write('captured\n');
    } catch (error) {
      process.stdout.write(`error: ${error.message}\n`);
    }
  }
  const payload = {
    capturedAt: new Date().toISOString(),
    pageviewsMonth: args.month,
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
