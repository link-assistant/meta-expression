# Issue #39 Solution Plan

## Implemented in This PR

1. Add a reproducing test for the reported Translate text.
2. Add explicit translation strategies:
   - contextual glossary for readable default output,
   - semantic labels for strict Wikidata traceability,
   - lexical glossary for direct phrase-first output.
3. Add a small English-to-Russian technical glossary and allow multi-token
   phrases to decompose when every token has an entry.
4. Add narrow English-to-Russian transformation rules for the reported grammar:
   `with Wikidata`, comma before `then`, and `transformation rules`.
5. Tighten n-gram boundaries so formalization does not accept multi-token
   phrases starting or ending with grammar glue, or crossing sentence
   punctuation.
6. Add structured question options for unresolved variables.
7. Add Translate UI samples and strategy controls.

## Next Iterations

1. Add a Wiktionary translation source instead of relying only on definitions.
2. Add a target-label lookup path that can use Wikidata REST label fallback
   endpoints and batch requests where possible.
3. Extend the glossary format into repository/user override files so users can
   add bilingual phrases without code changes.
4. Let question option choices re-run translation with explicit user mappings,
   rather than only recording the selected default in the result payload.
5. Add more grammar rules behind the same strategy interface:
   - adjective/noun agreement,
   - noun phrase reordering,
   - preposition-specific case handling,
   - imperative verb handling.
6. Add UI tests for strategy selection and question-option selection.

## Non-Goals for This PR

- Full natural-language machine translation.
- Complete English/Russian grammar coverage.
- Large-scale bilingual lexicon management.
- Replacing the current Wikidata/Wikipedia formalization pipeline.
