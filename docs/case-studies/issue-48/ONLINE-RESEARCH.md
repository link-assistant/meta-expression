# Online Research

Checked on 2026-05-23.

## Translation Quality Benchmarks

- [WMT26 General MT](https://www2.statmt.org/wmt26/translation-task.html)
  evaluates translation systems across languages, domains, and modalities with
  human evaluation. Its 2026 notes call out instruction following, glossaries,
  structured translation, style, and test suites as important translation
  phenomena.
- [WMT26 Automated MT Evaluation](https://www2.statmt.org/wmt26/mteval-task.html)
  focuses on segment-level error span annotation, quality score prediction,
  detection of error-free segments, and challenge sets.
- [WMT26 Terminology Translation](https://www2.statmt.org/wmt26/terminology.html)
  is explicitly planned as a terminology task, although the task details are
  still under preparation.
- [MQM](https://themqm.org/error-types-2/typology/) provides a human-readable
  error taxonomy. The relevant categories for this bug are terminology,
  accuracy, omission, and design/markup because the plain translation was
  correct while the semantic links and rendered markup omitted words.
- [COMET](https://github.com/Unbabel/COMET) and XCOMET provide learned MT
  quality scoring and span-level error analysis. They are useful for future
  quality scoring, but they do not replace the need for deterministic UI-level
  checks that every source and target word is linked to a semantic unit.

## Data And Semantic Representation

- [OLDI](https://oldi.org/) emphasizes community-maintained open language data
  for improving translation coverage, especially for under-served languages.
- [FLORES+](https://github.com/openlanguagedata/flores) is an evaluation
  benchmark for multilingual machine translation. The GitHub repository is
  archived and points to the Hugging Face dataset for current data.
- [AMR guidelines](https://github.com/amrisi/amr-guidelines) describe
  translating language into Abstract Meaning Representation. AMR is a useful
  precedent for explicit semantic representation, but this project also needs
  word-level source and target inspectability in the UI.

## Similar And Competing Systems

- [Apertium](https://wiki.apertium.org/wiki/Main_Page) is a free/open-source
  platform for rule-based machine translation systems. Its rule-based approach
  is closest to this project when deterministic lexical coverage and visible
  transfer behavior matter.
- [Marian](https://marian-nmt.github.io/) is an efficient C++ neural machine
  translation framework with Transformer support and production use. It is a
  strong MT engine, but its core output is not a word-by-word linked semantic
  graph.
- [OpenNMT](https://opennmt.net/) is an open-source neural MT ecosystem for
  training, serving, and related sequence tasks. It provides broad NMT
  infrastructure rather than the transparent formalize/naturalize UI required
  here.
- [Google Cloud Translation glossaries](https://docs.cloud.google.com/translate/docs/advanced/glossary)
  support custom dictionaries for consistent domain terminology and ambiguous
  words.
- [DeepL glossaries](https://developers.deepl.com/api-reference/glossaries)
  let clients create glossary entries that map phrases in one language to
  phrases in another language.
- [Microsoft Custom Translator](https://learn.microsoft.com/en-us/azure/ai-services/translator/custom-translator/overview)
  supports custom NMT systems built from parallel data and dictionaries for
  business terminology.

## Applied Conclusions

- Translation quality checks should cover more than final plain text. For this
  project, the minimum regression must validate source formalization, semantic
  links, target naturalization links, and round-trip behavior.
- Glossary and terminology behavior should be explicit in data structures.
  Glossary-backed words now produce source lexical concepts and target lexical
  units instead of disappearing into plain text.
- Unknown source words still need visible concepts so the UI can show complete
  formalization, but unknown non-glossary concepts must not be silently marked
  as translated.
- Future work can add MQM-style error categories and COMET-style quality
  scoring, but issue 48 is best fixed with deterministic coverage checks and
  visible lexical fallback links.
