# Issue 131 - Online Research

## Oxford Learner's Dictionaries

Source: https://www.oxfordlearnersdictionaries.com/definition/english/lie_1

Oxford's `lie_1` entry includes a geographic `lie + adv./prep.` sense for towns
or natural features meaning "to be located in a particular place", with an
example using "lies on the coast". This supports treating `lies on` in the
California sentence as one location predicate rather than as independent `lies`
and `on` words.

The retrieved HTML is preserved at
[`data/oxford-lie_1.html`](data/oxford-lie_1.html).

## Wiktionary

Source: https://en.wiktionary.org/api/rest_v1/page/definition/lie

The Wiktionary REST definition endpoint can provide structured definitions for
single words, but it does not by itself solve a missing multi-word geographic
phrase such as `lies on`. For this PR it is useful as supporting data and as a
future upstream contribution target, not as a complete fix.

The API snapshot is preserved at
[`data/wiktionary-lie-definition.json`](data/wiktionary-lie-definition.json).

## Wikidata item Q430265

Source: https://www.wikidata.org/wiki/Q430265

Source data endpoint:
https://www.wikidata.org/wiki/Special:EntityData/Q430265.json

The captured `wbgetentities` lookup for `Q430265` returned English label
`Pacific coast` and English description `part of any country's coast bordering
the Pacific Ocean`, but no Russian label in the `en|ru` term lookup. That is why
the PR supplies a local Russian target while preserving the Wikidata entity id.

Snapshots are preserved at
[`data/wikidata-Q430265.json`](data/wikidata-Q430265.json) and
[`data/wikidata-Q430265-en-ru.json`](data/wikidata-Q430265-en-ru.json).

## Wikidata and MediaWiki APIs

Sources:

- https://www.wikidata.org/wiki/Help:Data_access
- https://www.mediawiki.org/wiki/Wikibase/API
- https://www.mediawiki.org/wiki/API:Search_and_discovery/en

Wikidata's linked-data interface can return entity JSON through
`Special:EntityData`, and Wikibase API actions such as `wbgetentities` can fetch
labels, descriptions, aliases, and sitelinks. These are already consistent with
the repository's existing source model, so no new dependency is required for the
issue #131 fix.

## Libraries and components considered

- Existing repository source adapters for Wikidata, Wikipedia, Wiktionary, and
  the semantic lexicon are sufficient for this fix.
- Adding a new dictionary package would not address the core tokenizer and
  phrase-gate bugs.
- The implemented repository-native addition is an override/virtual-link
  registry, described in [`SOLUTION-PLAN.md`](SOLUTION-PLAN.md), rather than a
  new external library.

## External issue filing

No external GitHub issue was filed. The concrete bugs are local implementation
bugs or local semantic-data gaps. Wikimedia data gaps are best handled through
Wikidata/Wiktionary editing workflows, documented in
[`CONTRIBUTING-MISSING-DATA.md`](CONTRIBUTING-MISSING-DATA.md).
