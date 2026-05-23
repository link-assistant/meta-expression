# Issue 54 Online Research

Research date: 2026-05-23

## Sources Consulted

| Source                                                                                                                                     | Relevant finding                                                                                                                                 | Impact on this PR                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| [Grammatical Framework](https://www.grammaticalframework.org/)                                                                             | GF separates abstract syntax from concrete syntaxes and is used for multilingual grammars, translation systems, and natural-language interfaces. | Supports the issue's direction: translation should be a structured formalize/deformalize pipeline, not only string replacement.        |
| [Tree-sitter introduction](https://tree-sitter.github.io/)                                                                                 | Tree-sitter builds concrete syntax trees and can update them incrementally.                                                                      | Confirms that preserving CST-like debug metadata is a standard parser design goal; this PR keeps CST output and adds linguistic spans. |
| [Universal Dependencies syntax overview](https://universaldependencies.org/u/overview/syntax.html)                                         | UD provides cross-language dependency relations while allowing language-specific refinements.                                                    | Informs the dependency-style `nsubj`, `root`, and `obj` baseline records now emitted by the formalizer.                                |
| [Open Multilingual Wordnet](https://omwn.org/)                                                                                             | OMW links wordnets for many languages through Princeton WordNet.                                                                                 | Useful candidate resource for future lexical sense alignment and contextual term selection.                                            |
| [ConceptNet](https://conceptnet.media.mit.edu/)                                                                                            | ConceptNet is a freely available semantic network with multilingual and commonsense sources.                                                     | Candidate future source for semantic fallback, but not necessary for the scoped hook/alias implementation.                             |
| [NL2LOGIC: AST-Guided Translation of Natural Language into First-Order Logic with Large Language Models](https://arxiv.org/abs/2602.13237) | Recent semantic parsing work uses AST-guided generation to produce solver-ready logic code.                                                      | Reinforces the value of explicit AST/CST and transformation traces for formal-language output.                                         |

## Existing Components Used

- Existing JS formalization pipeline, CST, phrase spans, and links network.
- Existing JS translation semantic meta-language and naturalization result.
- Existing Rust semantic translation type.
- Existing repository test and changeset workflow.
- New deterministic JS and Rust linguistic metadata extraction for the required
  baseline categories.

## Extension Components

No new parser, grammar, or semantic network dependency was required for the
baseline. The PR now provides a stable schema and deterministic extraction; a
future parser or graph source can enrich those same fields after benchmarks
against formal-ai examples.
