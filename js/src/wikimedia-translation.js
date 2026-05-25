import { fetchWikimediaJson } from './wikimedia-fetch.js';

const wiktionarySource = 'wiktionary';

export async function lookupWikimediaTranslation(phrase, config) {
  if (!config.fetchImpl || config.sourceLanguage === config.targetLanguage) {
    return null;
  }
  const sourceText = String(phrase?.text ?? '').trim();
  if (!sourceText) {
    return null;
  }
  const wiktionary = await lookupWiktionaryTranslation(phrase, config);
  if (wiktionary) {
    return wiktionary;
  }
  return null;
}

async function lookupWiktionaryTranslation(phrase, config) {
  for (const pageTitle of wiktionaryPageTitleCandidates(phrase.text)) {
    const translation = await lookupWiktionaryPageTranslation(
      pageTitle,
      phrase,
      config
    );
    if (translation) {
      return translation;
    }
  }
  config.recordStep?.('wiktionary-translation-miss', {
    sourceText: phrase.text,
    sourceLanguage: config.sourceLanguage,
    targetLanguage: config.targetLanguage,
  });
  return null;
}

async function lookupWiktionaryPageTranslation(pageTitle, phrase, config) {
  const wikitext = await fetchWiktionaryWikitext(
    config.sourceLanguage,
    pageTitle,
    config
  );
  if (!wikitext) {
    return null;
  }
  const section = selectPartOfSpeechSection(
    wikitext,
    phrase.entity?.partOfSpeech
  );
  const targetText = firstTranslationTemplateTerm(
    section,
    config.targetLanguage
  );
  if (!targetText) {
    return null;
  }
  const targetPageTitle = normalizeWiktionaryTargetTitle(targetText);
  if (
    !(await wiktionaryPageExists(
      config.targetLanguage,
      targetPageTitle,
      config
    ))
  ) {
    return null;
  }
  const translation = buildWiktionaryTranslation({
    sourceText: phrase.text,
    sourceLanguage: config.sourceLanguage,
    sourcePageTitle: pageTitle,
    targetLanguage: config.targetLanguage,
    targetText,
    targetPageTitle,
  });
  config.recordStep?.('wiktionary-translation', {
    sourceText: phrase.text,
    sourceLanguage: config.sourceLanguage,
    sourcePageTitle: pageTitle,
    targetLanguage: config.targetLanguage,
    targetText,
    targetUrl: translation.target.url,
  });
  return translation;
}

async function fetchWiktionaryWikitext(language, pageTitle, config) {
  const url = new URL(`https://${language}.wiktionary.org/w/api.php`);
  url.search = new URLSearchParams({
    action: 'parse',
    format: 'json',
    origin: '*',
    page: pageTitle,
    prop: 'wikitext',
  }).toString();
  try {
    const payload = await fetchWikimediaJson(url, config);
    return payload?.parse?.wikitext?.['*'] ?? '';
  } catch {
    return '';
  }
}

async function wiktionaryPageExists(language, pageTitle, config) {
  const url = new URL(`https://${language}.wiktionary.org/w/api.php`);
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    titles: pageTitle,
  }).toString();
  try {
    const payload = await fetchWikimediaJson(url, config);
    return Object.values(payload?.query?.pages ?? {}).some(
      (page) => page && !page.missing && Number.isInteger(page.pageid)
    );
  } catch {
    return false;
  }
}

function wiktionaryPageTitleCandidates(value) {
  const title = normalizeSourcePageTitle(value);
  if (!title) {
    return [];
  }
  const candidates = [title];
  for (const singular of singularPageTitleCandidates(title)) {
    candidates.push(singular);
  }
  return [...new Set(candidates)];
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

function normalizeSourcePageTitle(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/^[^\p{Letter}\p{Number}+#]+/u, '')
    .replace(/[^\p{Letter}\p{Number}+#]+$/u, '');
}

function normalizeWiktionaryTargetTitle(value) {
  return stripStressMarks(value).replace(/\s+/g, '_').trim();
}

function selectPartOfSpeechSection(wikitext, partOfSpeech) {
  const part = String(partOfSpeech ?? '').trim();
  if (!part) {
    return wikitext;
  }
  const escaped = escapeRegExp(part);
  const pattern = new RegExp(
    `^===\\s*${escaped}\\s*===\\s*([\\s\\S]*?)(?=^===\\s*[^=]+\\s*===|^==[^=]|(?![\\s\\S]))`,
    'gim'
  );
  const match = pattern.exec(wikitext);
  return match?.[1] ?? wikitext;
}

function firstTranslationTemplateTerm(wikitext, targetLanguage) {
  const escapedLanguage = escapeRegExp(targetLanguage);
  const pattern = new RegExp(
    `\\{\\{t(?:[+\\-]|check)?\\|${escapedLanguage}\\|([^|{}]+)`,
    'giu'
  );
  for (const match of wikitext.matchAll(pattern)) {
    const term = cleanTemplateTerm(match[1]);
    if (term) {
      return term;
    }
  }
  return null;
}

function cleanTemplateTerm(value) {
  return stripStressMarks(
    String(value ?? '')
      .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim()
  );
}

function stripStressMarks(value) {
  return String(value ?? '').replace(/[\u0300\u0301]/gu, '');
}

function buildWiktionaryTranslation({
  sourceText,
  sourceLanguage,
  sourcePageTitle,
  targetLanguage,
  targetText,
  targetPageTitle,
}) {
  const sourceUrl = wiktionaryArticleUrl(sourceLanguage, sourcePageTitle);
  const targetUrl = wiktionaryArticleUrl(targetLanguage, targetPageTitle);
  return {
    text: targetText,
    strategy: 'wiktionary-translation',
    source: wiktionarySource,
    sourceUrl,
    target: {
      entityId: `wikt:${targetLanguage}:${slugifyWiktionaryId(targetPageTitle)}`,
      description: `Wiktionary translation of "${sourceText}" from ${sourceLanguage} to ${targetLanguage}.`,
      url: targetUrl,
      sourceUrl,
      source: wiktionarySource,
    },
  };
}

function wiktionaryArticleUrl(language, pageTitle) {
  return `https://${language}.wiktionary.org/wiki/${encodeURIComponent(
    pageTitle
  )}`;
}

function slugifyWiktionaryId(value) {
  return String(value).toLowerCase().replace(/\s+/g, '_');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
