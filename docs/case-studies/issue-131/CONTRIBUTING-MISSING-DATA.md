# Contributing Missing Wiki Data and Overrides

This guide is specific to the data gaps exposed by issue #131.

## When to edit Wikidata

Use Wikidata when the missing data is about an entity such as `Q430265`
(`Pacific coast`):

1. Verify the item is the correct concept.
2. Add missing labels, descriptions, or aliases in the target language.
3. Add sitelinks only when a real page exists on that wiki.
4. Use a clear edit summary and cite sources when the claim or label is not
   obvious.

For issue #131, adding or improving Russian terms for `Q430265` is a Wikidata
task. The `virtual-source-overrides` entry is a source-backed workaround so the
app works before or regardless of upstream edits.

## When to edit Wiktionary

Use Wiktionary when the missing data is lexical, such as a word, idiom, or
phrasal verb:

1. Check the target Wiktionary's entry policy for multi-word terms.
2. Add the term only when it meets that project's attestation rules.
3. Include definitions, usage labels, translations, and examples according to
   local formatting rules.

For issue #131, the lexical problem is the geographic `lie on` / `lies on`
sense. A Wiktionary entry or translation table is an upstream maintenance path,
while this PR uses an Oxford-backed `virtual-source-overrides` entry because
the app needs deterministic behavior in CI.

## When to add a local repository override

Add a `virtual-source-overrides` entry when:

- external data exists but is not exposed through the source adapter yet;
- external data is missing in one target language;
- CI needs deterministic behavior;
- a phrase must be fixed before upstream data can be edited and reviewed.

Local entries should include:

- a stable id;
- `sourceStatus` and `upstreamTarget`;
- source language labels and aliases;
- target language labels;
- grammatical forms when the target language needs case or agreement;
- a source URL;
- a test that proves the entry fixes a real translation or formalization case.

The override registry feeds both the formalizer source layer and the semantic
lexicon. This keeps provenance visible in links while preserving deterministic
translation behavior.

## Credentials and automation

Do not store Wikimedia credentials, bot passwords, OAuth tokens, or cookies in
this repository. Automated contribution workflows should read credentials from a
local secret store or CI secret and should default to a dry run.

## External GitHub issues

No external GitHub issue was filed for issue #131. The concrete failures are in
this repository or in wiki-editable data. For Wikimedia data, the right path is
editing Wikidata or Wiktionary directly, not opening a GitHub issue.
