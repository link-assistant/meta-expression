# Issue 54 Online Research

Research date: 2026-05-23

## Sources Consulted

| Source                                                                                                                                     | Relevant finding                                                                                                                                 | Impact on this PR                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [Grammatical Framework](https://www.grammaticalframework.org/)                                                                             | GF separates abstract syntax from concrete syntaxes and is used for multilingual grammars, translation systems, and natural-language interfaces. | Supports the issue's direction: translation should be a structured formalize/deformalize pipeline, not only string replacement.           |
| [Tree-sitter introduction](https://tree-sitter.github.io/)                                                                                 | Tree-sitter builds concrete syntax trees and can update them incrementally.                                                                      | Confirms that preserving CST-like debug metadata is a standard parser design goal; this PR keeps CST output and adds hook trace metadata. |
| [Universal Dependencies syntax overview](https://universaldependencies.org/u/overview/syntax.html)                                         | UD provides cross-language dependency relations while allowing language-specific refinements.                                                    | Identifies a plausible follow-up schema for noun phrase, verb phrase, subject/predicate, SVO, and dependency metadata.                    |
| [Open Multilingual Wordnet](https://omwn.org/)                                                                                             | OMW links wordnets for many languages through Princeton WordNet.                                                                                 | Useful candidate resource for future lexical sense alignment and contextual term selection.                                               |
| [ConceptNet](https://conceptnet.media.mit.edu/)                                                                                            | ConceptNet is a freely available semantic network with multilingual and commonsense sources.                                                     | Candidate future source for semantic fallback, but not necessary for the scoped hook/alias implementation.                                |
| [NL2LOGIC: AST-Guided Translation of Natural Language into First-Order Logic with Large Language Models](https://arxiv.org/abs/2602.13237) | Recent semantic parsing work uses AST-guided generation to produce solver-ready logic code.                                                      | Reinforces the value of explicit AST/CST and transformation traces for formal-language output.                                            |

## Existing Components Used

- Existing JS formalization pipeline, AST, CST, phrase spans, and links network.
- Existing JS translation semantic meta-language and naturalization result.
- Existing Rust semantic translation type.
- Existing repository test and changeset workflow.

## Components Deferred

No new parser, grammar, or semantic network dependency was added in this PR.
Those options are better handled after a stable metadata schema is designed and
benchmarked against formal-ai examples.
