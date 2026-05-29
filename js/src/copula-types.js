// Contextual "X is a Y" copula disambiguation (issue #128 R12).
//
// A bare noun predicate is impossible to disambiguate on its own: "state" in
// isolation could mean a sovereign polity, a condition, or a federated state.
// But in the copula sentence "Hawaii is a state." the subject already carries
// an asserted type — Hawaii `instance of` (P31) Q35657 "U.S. state". The
// predicate noun therefore *denotes that very class*. This pass reads the
// relation that is only visible once the whole sentence is hydrated and snaps
// the predicate to the subject's asserted type when their head words agree,
// e.g. "state" → Q35657 (en.wikipedia.org/wiki/U.S._state). It is fully
// language-neutral: the same logic resolves the Russian "Гавайи это штат" to
// Q35657 → Штат_США, so no per-language rule is needed downstream.
//
// The pass is extracted from formalize.js so that file stays within the
// repository's per-file line budget. Shared Wikidata-entity helpers come from
// wikidata-entity-context.js; the few formalizer-internal helpers it still
// needs (copula/article detection, label normalisation, source context) are
// injected via `deps` to avoid a circular import.

import { SOURCE_KIND } from './formalize-sources.js';
import {
  contextProperties,
  extractAliases,
  extractContextLabels,
  wikipediaArticleBaseUrl,
} from './wikidata-entity-context.js';

/**
 * Resolve every copula predicate in `phrases` to the subject's asserted type.
 *
 * @param {Array<object>} phrases hydrated formalization phrases
 * @param {object} config the formalizer config (sources, fetchImpl, steps…)
 * @param {object} deps formalizer-internal helpers:
 *   buildSourceContext, isCopula, isEnglishArticle, normalizeLabel.
 *   (Shared Wikidata-entity helpers are imported directly.)
 */
export async function resolveCopulaTypes(phrases, config, deps) {
  const wikidata = config.sources?.byName?.get(SOURCE_KIND.WIKIDATA);
  if (!wikidata?.getEntity || !config.fetchImpl) {
    return;
  }
  const sourceCtx = deps.buildSourceContext(config);
  for (let index = 0; index < phrases.length; index += 1) {
    if (!phraseIsCopula(phrases[index], deps)) {
      continue;
    }
    // The subject is the nearest contentful phrase before the copula and the
    // predicate the nearest one after it. Skipping grammatical glue (articles,
    // stray copula tokens) means "Hawaii is a state" resolves the predicate to
    // "state" rather than the article "a" — the article is not a word we can
    // type-check (issue #128).
    const subject = nearestContentfulPhrase(phrases, index - 1, -1, deps);
    const predicate = nearestContentfulPhrase(phrases, index + 1, 1, deps);
    if (!subject || !predicate) {
      continue;
    }
    await resolveCopulaPredicate(
      subject,
      predicate,
      wikidata,
      sourceCtx,
      config,
      deps
    );
  }
}

// A copula phrase is one whose surface tokens are (or begin with) a copula —
// English "is"/"are"/"was", Russian "это". The relation lexeme that the
// formalizer attaches (e.g. the Wiktionary "is a" sense) keeps those tokens,
// so this also recognises the merged "is a" phrase.
function phraseIsCopula(phrase, deps) {
  const tokens = phrase?.tokens;
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return false;
  }
  return tokens.some((token) => deps.isCopula(token));
}

// Walk the phrase list from `start` in direction `step` (+1 / -1) and return
// the first phrase that carries lexical content — i.e. is not pure
// grammatical glue (articles, copulas). Used to bridge the article in
// "is a state" so the predicate noun is found.
function nearestContentfulPhrase(phrases, start, step, deps) {
  for (let i = start; i >= 0 && i < phrases.length; i += step) {
    if (!phraseIsGrammaticalGlue(phrases[i], deps)) {
      return phrases[i];
    }
  }
  return null;
}

function phraseIsGrammaticalGlue(phrase, deps) {
  const tokens = phrase?.tokens;
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return false;
  }
  return tokens.every(
    (token) => deps.isEnglishArticle(token) || deps.isCopula(token)
  );
}

async function resolveCopulaPredicate(
  subject,
  predicate,
  wikidata,
  sourceCtx,
  config,
  deps
) {
  const predicateHead = headWord(predicate?.text, deps);
  if (!predicateHead || phraseIsCopula(predicate, deps)) {
    return;
  }
  // Only the subject's *asserted* types (instance-of / subclass-of) are
  // eligible — those are the classes the copula can license for the predicate.
  const typeLabels = subjectTypeContextLabels(subject);
  for (const typeLabel of typeLabels) {
    const typeId = typeLabel.targetId;
    if (predicate.entity?.id === typeId) {
      return; // already the most specific type — nothing to do.
    }
    const typeEntity = await wikidata.getEntity(typeId, sourceCtx);
    if (
      !typeEntity ||
      !typeMatchesPredicateHead(typeEntity, predicateHead, deps)
    ) {
      continue;
    }
    promotePredicateToType(predicate, subject, typeId, typeEntity, config);
    return;
  }
}

// The subject's instance-of / subclass-of votes, most specific first. Reuses
// the already-hydrated contextLabels so no extra fetch is needed to discover
// the candidate types.
function subjectTypeContextLabels(subject) {
  if (!subject?.entity || !/^Q\d+$/.test(subject.entity.id)) {
    return [];
  }
  const labels = subject.entity.contextLabels ?? [];
  return labels.filter(
    (label) => label.property === 'P31' || label.property === 'P279'
  );
}

function headWord(text, deps) {
  const normalized = deps.normalizeLabel(text);
  if (!normalized) {
    return '';
  }
  const words = normalized.split(' ');
  return words[words.length - 1];
}

// The predicate noun must be the head of the type's name in some language form
// — "state" is the head of "U.S. state" (label) or any alias. This keeps the
// promotion conservative: "Hawaii is a country" would not snap to Q35657
// because "country" is not the head of "U.S. state".
function typeMatchesPredicateHead(typeEntity, predicateHead, deps) {
  return typeEntityNameForms(typeEntity).some((form) => {
    const normalized = deps.normalizeLabel(form);
    if (!normalized) {
      return false;
    }
    return (
      normalized === predicateHead ||
      headWord(normalized, deps) === predicateHead
    );
  });
}

function typeEntityNameForms(typeEntity) {
  const forms = [];
  for (const value of Object.values(typeEntity?.labels ?? {})) {
    if (value?.value) {
      forms.push(value.value);
    }
  }
  for (const aliasList of Object.values(typeEntity?.aliases ?? {})) {
    if (!Array.isArray(aliasList)) {
      continue;
    }
    for (const alias of aliasList) {
      if (alias?.value) {
        forms.push(alias.value);
      }
    }
  }
  return forms;
}

function typeWikipediaUrl(typeEntity) {
  const sitelink = typeEntity.sitelinks?.enwiki?.title;
  if (!sitelink) {
    return { sitelink: null, url: null };
  }
  const url = `${wikipediaArticleBaseUrl}${encodeURIComponent(
    sitelink.replace(/ /g, '_')
  )}`;
  return { sitelink, url };
}

function buildPromotedEntity(predicate, typeId, typeEntity, link) {
  return {
    id: typeId,
    label: typeEntity.labels?.en?.value ?? predicate.entity?.label ?? typeId,
    description: typeEntity.descriptions?.en?.value ?? null,
    kind: 'entity',
    source: SOURCE_KIND.WIKIDATA,
    sourceUrl: null,
    // Outrank the prior generic sense so the promoted type wins selection and
    // dominates the context election.
    score: (predicate.entity?.score ?? 0) + 100,
    wikipediaUrl: link.url,
    wikipediaTitle: link.sitelink,
    // Carry the type's own categories so the contexts panel keeps explaining
    // the world the predicate now lives in, plus a self-vote for the shared
    // class so the copula's "subject and predicate share this type" relation
    // is reflected as a shared context (issue #128 R5).
    contextLabels: [
      ...extractContextLabels(typeEntity),
      {
        property: 'P31',
        propertyLabel: contextProperties.P31,
        targetId: typeId,
      },
    ],
    aliases: extractAliases(typeEntity),
  };
}

function recordCopulaStep(config, subject, predicate, previousId, promoted) {
  if (config.trace === false) {
    return;
  }
  config.steps?.push({
    type: 'copula-type-resolution',
    subject: subject?.text ?? null,
    subjectEntityId: subject?.entity?.id ?? null,
    predicate: predicate.text,
    previousEntityId: previousId,
    resolvedEntityId: promoted.id,
    resolvedLabel: promoted.label,
    wikipediaUrl: promoted.wikipediaUrl,
    reason:
      'predicate noun denotes the subject’s asserted instance-of / subclass-of type',
  });
}

function promotePredicateToType(
  predicate,
  subject,
  typeId,
  typeEntity,
  config
) {
  const link = typeWikipediaUrl(typeEntity);
  const previousId = predicate.entity?.id ?? null;
  const promoted = buildPromotedEntity(predicate, typeId, typeEntity, link);
  predicate.entity = promoted;
  predicate.candidates = [promoted, ...(predicate.candidates ?? [])];
  recordCopulaStep(config, subject, predicate, previousId, promoted);
}
