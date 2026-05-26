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

## Formal-AI Audit Refresh

The latest audit pass reviewed `link-assistant/formal-ai` at commit
`39530ef2e71f787561f9252b72032eb81e329c3e`
(`2026-05-26T00:48:52+00:00`, `chore: release v0.123.0`). Issue #72 refreshed
the local corpus to that release and added a parity gate that either executes
the mapped upstream test identity locally or records an explicit skip reason.
The most relevant executable coverage still maps to
`tests/unit/specification/translation_via_links.rs`,
`tests/unit/specification/summarization_pipeline.rs`, `tests/unit/formal_ai.rs`,
and `tests/e2e/tests/issue-210.spec.js`, `tests/e2e/tests/issue-218.spec.js`,
`tests/e2e/tests/issue-221.spec.js`, and `tests/e2e/tests/issue-230.spec.js`.

## Extension Components

No new parser, grammar, or semantic network dependency was required for the
baseline. The PR now provides a stable schema and deterministic extraction; a
future parser or graph source can enrich those same fields after benchmarks
against formal-ai examples.
