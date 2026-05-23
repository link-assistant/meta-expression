# Requirements

Source issue: https://github.com/link-assistant/meta-expression/issues/48

## Functional Requirements

- Support the complete pipeline:
  `source language -> formalize -> semantic meta language -> naturalize -> target language`.
- Show formalized source language in the UI in all cases.
- Ensure every source word is part of a concept or term.
- Ensure target naturalization is inspectable, not just the final plain text.
- Fix all subissues in one PR:
  - #45 `Найти синонимы или примеры согласования`
  - #46 `Перевести текст`
  - #47 `Сравнить значения`
- Preserve the correct plain translations:
  - `Find synonyms or examples of agreement`
  - `Translate text`
  - `Compare values`

## Quality Requirements

- Add verification for every word, not only the final translation string.
- Verify source formalization, semantic meta language, naturalization, and
  round trips.
- Recheck similar projects and competitors for relevant best practices.
- Save issue logs and data in this repository under
  `docs/case-studies/issue-48`.

## Non-Goals

- Do not replace the existing translation architecture with a neural MT model.
- Do not remove existing Wikidata/Wikipedia/Wiktionary linking. Lexical
  fallback only covers tokens that otherwise have no visible concept.
- Do not mark unknown non-glossary words as translated. They should remain
  unresolved translation variables even though source formalization can still
  expose a lexical concept.
