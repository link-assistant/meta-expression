# First-party formalization samples for issue #21

These statements were harvested from the repository itself (README, the
canonical REQUIREMENTS document, the ROADMAP, and recent issue titles). They
serve two purposes:

1. **Smoke tests** for context detection — each entry lists the dominant
   Big-context the new pipeline is expected to elect.
2. **Living examples** that prove "we can use our own tool to fully
   formalize each statement in our own repository" (issue #21 last
   paragraph).

The shape mirrors the override file format:

```
sample
  text "<sentence>"
  expectedDominantContext "<label>"
  expectedContexts
    -
      label "<context>"
      property "P910"
      relatedQid "<Q…>"
```

## A. From `README.md`

| Sentence                                                                                                                      | Expected dominant context                      | Notes                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| "First prototype for a links-network based reasoning playground."                                                             | computer science / automated reasoning         | Drives the canonical _reasoning_ disambiguation case from the issue.            |
| "It accepts a human-language statement, generates selectable interpretations, formalizes the selected meaning when possible." | computer science / natural language processing | Tests verb-form lookup for _formalize_, _generate_, _accept_.                   |
| "Evidence with provenance for non-computable claims."                                                                         | logic / epistemology                           | Ensures that `provenance` (Q1247586) and `claim` (Q120969801) cluster together. |

## B. From `docs/REQUIREMENTS.md`

| Sentence                                                             | Expected dominant context   |
| -------------------------------------------------------------------- | --------------------------- |
| "Provide a reusable library." (R1)                                   | software engineering        |
| "Use Rust plus WebAssembly plus React on web." (R5)                  | web development             |
| "Generate multiple interpretations and require selection." (R11)     | natural language processing |
| "Bound the role of LLMs." (R12)                                      | artificial intelligence     |
| "Support explicit formalization levels." (R13)                       | formal logic                |
| "Treat question expressions separately from truth statements." (R15) | logic                       |
| "Avoid absolute confidence for real-world facts." (R17)              | epistemology                |

## C. From `docs/ROADMAP.md`

| Sentence                                                                                    | Expected dominant context                                  |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| "Library, CLI, microservice, and static web surfaces."                                      | software architecture                                      |
| "Live Wikimedia evidence resolver for liveness, capital, and orbit templates."              | astronomy / geography (mixed; resolver should detect both) |
| "Browser worker that resolves live evidence after initial render."                          | web development                                            |
| "Rust core workspace with Doublets-based relation-link encoding and WASM-ready crate type." | systems programming                                        |

## D. From recent issue titles

| Issue | Sentence                                                         | Expected dominant context                 |
| ----- | ---------------------------------------------------------------- | ----------------------------------------- |
| #16   | "Add `/translate` section."                                      | translation                               |
| #17   | "Add `/check` (and alias `/fact-check`) section."                | fact checking                             |
| #18   | "Add `/preferences` section."                                    | user-interface design                     |
| #20   | "We need to compare features with jenni.ai."                     | competitive analysis / writing assistants |
| #21   | "We need to make sure we correctly determine possible contexts." | natural language processing               |

## E. Stop-word / Wiktionary fallback set

These statements specifically exercise the new Wiktionary tier. Each
function word should still produce a link in the formalized output even
when Wikipedia and Wikidata return no useful entry:

- "the moon orbits the sun"
- "of and for"
- "is, was, were"

## F. Word-form regression set

Each verb below should snap to its canonical Wikidata item via the new
forms / aliases lookup:

| Phrase    | Expected QID | Why                                                                                      |
| --------- | ------------ | ---------------------------------------------------------------------------------------- |
| formalize | Q115492965   | Item alias _to formalize_                                                                |
| reasoning | Q1156402     | Default sense; also publishes Q484284, Q1151406, Q3478658 as alternatives                |
| orbit     | Q4022        | Astronomy default; should compete with Q3492064 (orbit, mathematics) when context allows |
