# Issue 133 - Online Research

Research dates: 2026-06-04 and 2026-06-06.

## Wikidata `Q35657`

Source URL:
https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q35657&props=labels%7Cdescriptions%7Csitelinks&languages=en%7Cru&sitefilter=enwiki%7Cruwiki&format=json

Saved artifact: [`wikidata-q35657-sitelinks.json`](wikidata-q35657-sitelinks.json).

Findings:

- English label: `U.S. state`
- Russian label: `штат США`
- English Wikipedia sitelink: `U.S. state`
- Russian Wikipedia sitelink: `Штат США`

This confirms that the correct default target for `Q35657` in an English to
Russian Translate run is the Russian Wikipedia article:
https://ru.wikipedia.org/wiki/%D0%A8%D1%82%D0%B0%D1%82_%D0%A1%D0%A8%D0%90

## Wikidata `Q782`

Source URL:
https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q782&props=labels%7Cdescriptions%7Csitelinks&languages=en%7Cru&sitefilter=enwiki%7Cruwiki&format=json

Saved artifact: [`wikidata-q782-sitelinks.json`](wikidata-q782-sitelinks.json).

Findings:

- English label: `Hawaii`
- Russian label: `Гавайи`
- English Wikipedia sitelink: `Hawaii`
- Russian Wikipedia sitelink: `Гавайи`

This confirms that the sentence's subject has a target-language Wikipedia
sitelink and should remain a Russian Wikipedia link in the fixed output.

## Wikidata `Q99`

Source URL:
https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q99&languages=en%7Cru&props=labels%7Cdescriptions%7Csitelinks&sitefilter=enwiki%7Cruwiki

Saved artifact: [`wikidata-q99-sitelinks.json`](wikidata-q99-sitelinks.json).

Findings:

- English label: `California`
- Russian label: `Калифорния`
- English Wikipedia sitelink: `California`
- Russian Wikipedia sitelink: `Калифорния`

This confirms that the correct default target for `Q99` in an English to
Russian Translate run is the Russian Wikipedia article:
https://ru.wikipedia.org/wiki/%D0%9A%D0%B0%D0%BB%D0%B8%D1%84%D0%BE%D1%80%D0%BD%D0%B8%D1%8F

## Russian Wikipedia summaries

State summary source:
https://ru.wikipedia.org/api/rest_v1/page/summary/%D0%A8%D1%82%D0%B0%D1%82_%D0%A1%D0%A8%D0%90

Saved artifact: [`ruwiki-state-summary.json`](ruwiki-state-summary.json).

Hawaii summary source:
https://ru.wikipedia.org/api/rest_v1/page/summary/%D0%93%D0%B0%D0%B2%D0%B0%D0%B9%D0%B8

Saved artifact: [`ruwiki-hawaii-summary.json`](ruwiki-hawaii-summary.json).

California summary source:
https://ru.wikipedia.org/api/rest_v1/page/summary/%D0%9A%D0%B0%D0%BB%D0%B8%D1%84%D0%BE%D1%80%D0%BD%D0%B8%D1%8F

Saved artifact:
[`ruwiki-california-summary.json`](ruwiki-california-summary.json).

Findings:

- The `Штат США` summary canonical URL is the expected encoded target URL.
- The `Гавайи` summary canonical URL is the expected encoded target URL.
- The `Калифорния` summary canonical URL is the expected encoded target URL.

## Local research

- `live-translation-before.json` showed the regression: `linkTargetMode` was
  `wikidata`, source order placed `virtual-source-overrides` before
  `wiktionary`, and `штат` linked to `https://www.wikidata.org/wiki/Q35657`.
- `live-translation-after.json` shows the fixed behavior: `linkTargetMode` is
  `wikipedia`, sources are ordered
  `wikipedia,wikidata,wiktionary,virtual-source-overrides`, and `штат` links to
  the Russian Wikipedia article for `Q35657`.
- `california-translation-debug-log.txt` showed a follow-up regression:
  `California` mapped to `Q99` and translated to `Калифорния`, but linked to
  `https://www.wikidata.org/wiki/Q99` despite the live `ruwiki` sitelink.
