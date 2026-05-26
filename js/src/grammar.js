import {
  extractLinguisticMetadata,
  reconstructTextFromLinguisticMetadata,
} from './linguistic-metadata.js';
import { serializeLino } from './lino.js';
import { grammarRuleData } from '../data/grammar-rules.js';

export const SUPPORTED_GRAMMAR_LANGUAGES = Object.freeze([
  ...grammarRuleData.supportedLanguages,
]);

export const GRAMMAR_ISSUE_CATEGORIES = Object.freeze({
  AGREEMENT: 'agreement',
  WORD_ORDER: 'word-order',
  ARTICLE: 'article',
  PUNCTUATION: 'punctuation',
});

const terminalPunctuationByLanguage =
  grammarRuleData.terminalPunctuationByLanguage;
const allTerminalPunctuation = new Set(
  Object.values(terminalPunctuationByLanguage).flat()
);
const defaultTerminalPunctuation = grammarRuleData.defaultTerminalPunctuation;

const englishArticles = new Set(['a', 'an', 'the']);
const englishVowels = new Set(['a', 'e', 'i', 'o', 'u']);
const englishIrregularVerbForms = new Map([
  ['be:singular', 'is'],
  ['be:plural', 'are'],
  ['have:singular', 'has'],
  ['have:plural', 'have'],
]);

const russianSubjectNumbers = new Map(
  Object.entries(grammarRuleData.russianSubjectNumbers)
);
const russianAgreementVerbs = new Map(
  Object.entries(grammarRuleData.russianAgreementVerbs)
);
const hindiSubjectFeatures = new Map(
  Object.entries(grammarRuleData.hindiSubjectFeatures)
);
const hindiAgreementParticiples = new Map(
  Object.entries(grammarRuleData.hindiAgreementParticiples)
);
const chineseWordOrderPatterns = grammarRuleData.chineseWordOrderPatterns;

export function checkGrammar(input, options = {}) {
  const text = String(input ?? '');
  const language = normalizeGrammarLanguage(
    options.language ?? options.sourceLanguage ?? options.locale,
    text
  );
  const linguisticMetadata = extractLinguisticMetadata(text, { language });
  const reconstructedText =
    reconstructTextFromLinguisticMetadata(linguisticMetadata) ?? text;
  const issues = normalizeIssues(
    [
      ...collectLanguageIssues(reconstructedText, linguisticMetadata, language),
      ...collectPunctuationIssues(
        reconstructedText,
        linguisticMetadata,
        language
      ),
    ],
    reconstructedText,
    language
  );

  return buildGrammarResult({
    text: reconstructedText,
    language,
    linguisticMetadata,
    issues,
  });
}

export const grammarCheckText = checkGrammar;

function collectLanguageIssues(text, metadata, language) {
  if (language === 'en') {
    return [
      ...collectEnglishAgreementIssues(text, metadata),
      ...collectEnglishArticleIssues(text, metadata),
      ...collectEnglishWordOrderIssues(text, metadata),
    ];
  }
  if (language === 'ru') {
    return collectRussianAgreementIssues(text, metadata);
  }
  if (language === 'hi') {
    return collectHindiAgreementIssues(text, metadata);
  }
  if (language === 'zh') {
    return collectChineseWordOrderIssues(text, metadata);
  }
  return [];
}

function collectEnglishAgreementIssues(text, metadata) {
  const fragments = fragmentMap(metadata);
  const issues = [];
  for (const sentence of metadata.ast?.body ?? []) {
    const subject = fragments.get(sentence.subject?.fragmentId);
    const predicate = fragments.get(sentence.predicate?.fragmentId);
    if (!subject || !predicate) {
      continue;
    }
    const expected = expectedEnglishPredicateForm(subject, predicate);
    if (
      !expected ||
      normalizeWord(expected) === normalizeWord(predicate.text)
    ) {
      continue;
    }
    issues.push({
      code: 'subject-verb-agreement',
      category: GRAMMAR_ISSUE_CATEGORIES.AGREEMENT,
      message: `Use "${expected}" so the predicate agrees with the subject.`,
      start: predicate.sourceStart,
      end: predicate.sourceEnd,
      replacement: expected,
      metadata: {
        subjectFragmentId: subject.id,
        predicateFragmentId: predicate.id,
        agreementFeature: 'number',
      },
    });
  }
  return issues;
}

function expectedEnglishPredicateForm(subject, predicate) {
  const subjectNumber = subject.features?.number;
  if (!['singular', 'plural'].includes(subjectNumber)) {
    return null;
  }
  const lemma = normalizeWord(predicate.lemma ?? predicate.features?.headToken);
  if (!lemma) {
    return null;
  }
  const irregular = englishIrregularVerbForms.get(`${lemma}:${subjectNumber}`);
  const expected = irregular ?? regularEnglishVerbForm(lemma, subjectNumber);
  return preserveInitialCapitalization(predicate.text, expected);
}

function regularEnglishVerbForm(lemma, subjectNumber) {
  if (subjectNumber === 'plural') {
    return lemma;
  }
  if (lemma.endsWith('y') && !englishVowels.has(lemma.at(-2))) {
    return `${lemma.slice(0, -1)}ies`;
  }
  if (
    lemma.endsWith('s') ||
    lemma.endsWith('x') ||
    lemma.endsWith('z') ||
    lemma.endsWith('ch') ||
    lemma.endsWith('sh')
  ) {
    return `${lemma}es`;
  }
  return `${lemma}s`;
}

function collectEnglishArticleIssues(text, metadata) {
  const tokens = tokensFromMetadata(metadata);
  const issues = [];
  for (const sentence of metadata.cst?.sentences ?? []) {
    for (const [role, range] of [
      ['subject', sentence.subjectRange],
      ['object', sentence.objectRange],
    ]) {
      if (!range || hasArticleBefore(tokens, range.start, sentence)) {
        continue;
      }
      const first = tokens[range.start];
      const last = tokens[range.end];
      const head = tokens[headTokenIndex(tokens, range)];
      if (!requiresEnglishArticle(head)) {
        continue;
      }
      const phrase = text.slice(first.sourceStart, last.sourceEnd);
      const article = englishIndefiniteArticleFor(phrase);
      const replacement = `${article} ${phrase}`;
      issues.push({
        code: 'missing-article',
        category: GRAMMAR_ISSUE_CATEGORIES.ARTICLE,
        message: `Add "${article}" before this singular noun phrase.`,
        start: first.sourceStart,
        end: last.sourceEnd,
        replacement: preserveArticleCapitalization(
          first.sourceStart === sentence.sourceStart,
          replacement
        ),
        metadata: {
          role,
          tokenStart: range.start,
          tokenEnd: range.end,
        },
      });
    }
  }
  return issues;
}

function requiresEnglishArticle(token) {
  return (
    token?.partOfSpeech === 'noun' &&
    token.features?.number === 'singular' &&
    !englishArticles.has(normalizeWord(token.text))
  );
}

function hasArticleBefore(tokens, tokenIndex, sentence) {
  const previous = tokens[tokenIndex - 1];
  return (
    previous &&
    previous.index >= sentence.tokenStart &&
    englishArticles.has(normalizeWord(previous.text))
  );
}

function englishIndefiniteArticleFor(phrase) {
  const first = normalizeWord(String(phrase).split(/\s+/u)[0]);
  return englishVowels.has(first[0]) ? 'an' : 'a';
}

function preserveArticleCapitalization(atSentenceStart, replacement) {
  if (!atSentenceStart) {
    return replacement;
  }
  return `${replacement[0].toUpperCase()}${replacement.slice(1)}`;
}

function collectEnglishWordOrderIssues(text, metadata) {
  const tokens = tokensFromMetadata(metadata);
  const issues = [];
  for (const sentence of metadata.cst?.sentences ?? []) {
    const sentenceTokens = tokens.slice(
      sentence.tokenStart,
      sentence.tokenEnd + 1
    );
    if (sentenceTokens.length < 4) {
      continue;
    }
    const predicate = sentenceTokens.at(-1);
    if (predicate?.partOfSpeech !== 'verb') {
      continue;
    }
    const subjectRange = leadingEnglishNounPhraseRange(sentenceTokens);
    if (!subjectRange) {
      continue;
    }
    const objectStart = subjectRange.end + 1;
    const objectEnd = sentenceTokens.length - 2;
    if (
      objectStart > objectEnd ||
      containsVerb(sentenceTokens, objectStart, objectEnd)
    ) {
      continue;
    }
    const subjectText = sourceSlice(
      text,
      sentenceTokens[subjectRange.start],
      sentenceTokens[subjectRange.end]
    );
    const objectText = sourceSlice(
      text,
      sentenceTokens[objectStart],
      sentenceTokens[objectEnd]
    );
    const suffix = text.slice(predicate.sourceEnd, sentence.sourceEnd);
    const replacement = `${subjectText} ${predicate.text} ${objectText}${suffix}`;
    issues.push({
      code: 'predicate-after-object',
      category: GRAMMAR_ISSUE_CATEGORIES.WORD_ORDER,
      message: 'Move the predicate before the object.',
      start: sentence.sourceStart,
      end: sentence.sourceEnd,
      replacement,
      metadata: {
        sentenceId: sentence.id,
        predicateToken: predicate.index,
      },
    });
  }
  return issues;
}

function leadingEnglishNounPhraseRange(tokens) {
  if (tokens.length < 2) {
    return null;
  }
  const start = 0;
  let end = 0;
  if (englishArticles.has(normalizeWord(tokens[0]?.text))) {
    end = 1;
  }
  const head = tokens[end];
  if (!['noun', 'proper-noun'].includes(head?.partOfSpeech)) {
    return null;
  }
  return { start, end };
}

function containsVerb(tokens, start, end) {
  return tokens
    .slice(start, end + 1)
    .some((token) => token.partOfSpeech === 'verb');
}

function collectRussianAgreementIssues(text, metadata) {
  const issues = [];
  const tokens = tokensFromMetadata(metadata);
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const subject = tokens[index];
    const predicate = tokens[index + 1];
    const subjectNumber = russianSubjectNumbers.get(
      normalizeLocaleWord(subject.text, 'ru')
    );
    const predicateEntry = russianAgreementVerbs.get(
      normalizeLocaleWord(predicate.text, 'ru')
    );
    if (
      !subjectNumber ||
      !predicateEntry ||
      predicateEntry.number === subjectNumber
    ) {
      continue;
    }
    issues.push({
      code: 'subject-verb-agreement',
      category: GRAMMAR_ISSUE_CATEGORIES.AGREEMENT,
      message: 'Use a predicate form that agrees with the Russian subject.',
      start: predicate.sourceStart,
      end: predicate.sourceEnd,
      replacement: predicateEntry.forms[subjectNumber],
      metadata: {
        subjectToken: subject.id,
        predicateToken: predicate.id,
        agreementFeature: 'number',
      },
    });
  }
  return issues;
}

function collectHindiAgreementIssues(text, metadata) {
  const issues = [];
  const tokens = tokensFromMetadata(metadata);
  for (const [index, token] of tokens.entries()) {
    const subject = hindiSubjectFeatures.get(token.text);
    if (!subject) {
      continue;
    }
    const predicateIndex = tokens.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex > index && hindiAgreementParticiples.has(candidate.text)
    );
    if (predicateIndex === -1) {
      continue;
    }
    const predicate = tokens[predicateIndex];
    const predicateEntry = hindiAgreementParticiples.get(predicate.text);
    if (
      predicateEntry.gender === subject.gender &&
      predicateEntry.number === subject.number
    ) {
      continue;
    }
    issues.push({
      code: 'subject-verb-agreement',
      category: GRAMMAR_ISSUE_CATEGORIES.AGREEMENT,
      message: 'Use a Hindi participle form that agrees with the subject.',
      start: predicate.sourceStart,
      end: predicate.sourceEnd,
      replacement: predicateEntry.forms[subject.gender][subject.number],
      metadata: {
        subjectToken: token.id,
        predicateToken: predicate.id,
        agreementFeature: 'gender-number',
      },
    });
  }
  return issues;
}

function collectChineseWordOrderIssues(text, metadata) {
  const issues = [];
  for (const sentence of sentenceRanges(metadata, text)) {
    const sentenceText = text.slice(sentence.start, sentence.end);
    const terminal = terminalSuffix(sentenceText);
    const body = sentenceText.slice(0, sentenceText.length - terminal.length);
    const compactBody = body.replace(/\s+/gu, '');
    for (const pattern of chineseWordOrderPatterns) {
      if (compactBody !== pattern.wrong) {
        continue;
      }
      issues.push({
        code: pattern.code,
        category: GRAMMAR_ISSUE_CATEGORIES.WORD_ORDER,
        message: pattern.message,
        start: sentence.start,
        end: sentence.end,
        replacement: `${pattern.replacement}${terminal}`,
        metadata: {
          sentenceId: sentence.id,
          source: 'source-reconstruction',
        },
      });
    }
  }
  return issues;
}

function collectPunctuationIssues(text, metadata, language) {
  const trimmedEnd = trimEndIndex(text);
  if (trimmedEnd === 0) {
    return [];
  }
  const terminalCharacters =
    terminalPunctuationByLanguage[language] ?? terminalPunctuationByLanguage.en;
  const lastCharacter = [...text.slice(0, trimmedEnd)].at(-1);
  if (terminalCharacters.includes(lastCharacter)) {
    return [];
  }
  return [
    {
      code: 'missing-terminal-punctuation',
      category: GRAMMAR_ISSUE_CATEGORIES.PUNCTUATION,
      message: 'Add sentence-ending punctuation.',
      start: trimmedEnd,
      end: trimmedEnd,
      replacement: defaultTerminalPunctuation[language] ?? '.',
      metadata: {
        source: 'source-reconstruction',
        sourceUnitCount: metadata.sourceReconstruction?.units?.length ?? 0,
      },
    },
  ];
}

function buildGrammarResult({ text, language, linguisticMetadata, issues }) {
  const summary = summarizeGrammarIssues(issues, language);
  return {
    status: 'checked',
    surface: 'grammar',
    text,
    language,
    summary,
    issues,
    linguisticMetadata: {
      language: linguisticMetadata.language,
      parser: linguisticMetadata.parser,
      sourceReconstruction: linguisticMetadata.sourceReconstruction,
      agreements: linguisticMetadata.agreements,
      dependencies: linguisticMetadata.dependencies,
    },
    html: renderGrammarHtml(text, issues),
    markdown: renderGrammarMarkdown(issues, summary),
    linksNotation: renderGrammarLino(text, issues, summary),
  };
}

function normalizeIssues(issues, text, language) {
  return issues
    .filter((issue) => validRange(issue, text))
    .sort(
      (left, right) =>
        left.start - right.start ||
        left.end - right.end ||
        left.code.localeCompare(right.code)
    )
    .map((issue, index) => {
      const replacement = String(issue.replacement ?? '');
      return {
        id: `grammar-issue-${index + 1}`,
        language,
        severity: issue.severity ?? 'warning',
        code: issue.code,
        category: issue.category,
        message: issue.message,
        text: text.slice(issue.start, issue.end),
        start: issue.start,
        end: issue.end,
        replacement,
        suggestions: [
          {
            text: applyReplacement(text, issue.start, issue.end, replacement),
            start: issue.start,
            end: issue.end,
            replacement,
          },
        ],
        metadata: issue.metadata ?? {},
      };
    });
}

function validRange(issue, text) {
  return (
    Number.isInteger(issue.start) &&
    Number.isInteger(issue.end) &&
    issue.start >= 0 &&
    issue.end >= issue.start &&
    issue.end <= text.length
  );
}

function summarizeGrammarIssues(issues, language) {
  const byCategory = Object.fromEntries(
    Object.values(GRAMMAR_ISSUE_CATEGORIES).map((category) => [category, 0])
  );
  for (const issue of issues) {
    byCategory[issue.category] = (byCategory[issue.category] ?? 0) + 1;
  }
  return {
    language,
    total: issues.length,
    issueCount: issues.length,
    clean: issues.length === 0,
    byCategory,
  };
}

function renderGrammarHtml(text, issues) {
  let cursor = 0;
  let html = '';
  for (const issue of issues) {
    if (issue.start < cursor) {
      continue;
    }
    html += escapeHtml(text.slice(cursor, issue.start));
    const issueText =
      issue.start === issue.end
        ? issue.replacement
        : text.slice(issue.start, issue.end);
    html += `<span class="grammar-issue grammar-${escapeHtml(issue.category)}" data-grammar-issue="true" data-grammar-code="${escapeHtml(issue.code)}" title="${escapeHtml(issue.message)}">${escapeHtml(issueText)}</span>`;
    cursor = issue.end;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}

function renderGrammarMarkdown(issues, summary) {
  if (issues.length === 0) {
    return `No grammar issues found.\n`;
  }
  const lines = [
    `Grammar check found ${summary.issueCount} issue${
      summary.issueCount === 1 ? '' : 's'
    }.`,
    '',
  ];
  for (const issue of issues) {
    const original = issue.text ? `"${issue.text}"` : 'missing text';
    lines.push(
      `- ${issue.category}/${issue.code}: replace ${original} with "${issue.replacement}".`
    );
    lines.push(`  - suggestion: ${issue.suggestions[0].text}`);
  }
  return `${lines.join('\n')}\n`;
}

function renderGrammarLino(text, issues, summary) {
  return serializeLino(
    {
      text,
      summary,
      issues: issues.map((issue) => ({
        id: issue.id,
        language: issue.language,
        severity: issue.severity,
        code: issue.code,
        category: issue.category,
        message: issue.message,
        text: issue.text,
        start: issue.start,
        end: issue.end,
        replacement: issue.replacement,
        suggestion: issue.suggestions[0]?.text ?? '',
      })),
    },
    { rootIdentifier: 'grammar' }
  );
}

function sentenceRanges(metadata, text) {
  const sentences = metadata.sourceReconstruction?.sentences ?? [];
  if (sentences.length === 0) {
    return [{ id: 'sentence-1', start: 0, end: text.length }];
  }
  return sentences.map((sentence, index) => ({
    id: sentence.id ?? `sentence-${index + 1}`,
    start: sentence.sourceStart ?? 0,
    end: sentence.sourceEnd ?? text.length,
  }));
}

function tokensFromMetadata(metadata) {
  return metadata.cst?.tokens ?? [];
}

function fragmentMap(metadata) {
  return new Map(
    (metadata.fragments ?? []).map((fragment) => [fragment.id, fragment])
  );
}

function headTokenIndex(tokens, range) {
  for (let index = range.end; index >= range.start; index -= 1) {
    if (tokens[index]) {
      return index;
    }
  }
  return range.end;
}

function sourceSlice(text, firstToken, lastToken) {
  return text.slice(firstToken.sourceStart, lastToken.sourceEnd);
}

function applyReplacement(text, start, end, replacement) {
  return `${text.slice(0, start)}${replacement}${text.slice(end)}`;
}

function terminalSuffix(text) {
  let suffix = '';
  const characters = [...String(text)];
  for (let index = characters.length - 1; index >= 0; index -= 1) {
    const character = characters[index];
    if (!allTerminalPunctuation.has(character)) {
      break;
    }
    suffix = `${character}${suffix}`;
  }
  return suffix;
}

function trimEndIndex(text) {
  const match = String(text).match(/\s*$/u);
  return text.length - (match?.[0].length ?? 0);
}

function normalizeGrammarLanguage(value, text) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (SUPPORTED_GRAMMAR_LANGUAGES.includes(normalized)) {
    return normalized;
  }
  const primaryLanguage = normalized.split(/[-_]/u)[0];
  if (SUPPORTED_GRAMMAR_LANGUAGES.includes(primaryLanguage)) {
    return primaryLanguage;
  }
  return inferGrammarLanguage(text);
}

function inferGrammarLanguage(value) {
  const text = String(value ?? '');
  if (/\p{Script=Cyrillic}/u.test(text)) {
    return 'ru';
  }
  if (/\p{Script=Devanagari}/u.test(text)) {
    return 'hi';
  }
  if (/\p{Script=Han}/u.test(text)) {
    return 'zh';
  }
  return 'en';
}

function normalizeWord(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}'_-]+/gu, '');
}

function normalizeLocaleWord(value, locale) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase(locale)
    .replace(/[^\p{Letter}\p{Number}'_-]+/gu, '');
}

function preserveInitialCapitalization(source, replacement) {
  const text = String(source ?? '');
  const next = String(replacement ?? '');
  if (!text || text[0] !== text[0].toUpperCase()) {
    return next;
  }
  return `${next[0].toUpperCase()}${next.slice(1)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
