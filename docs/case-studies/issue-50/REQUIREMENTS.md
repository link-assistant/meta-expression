# Issue 50 Requirements

## Source Requirement Matrix

| ID  | Requirement                                                                         | Status     | Evidence                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Translate the reported English text fully into Russian.                             | Done       | Regression test asserts exact Russian output and no questions. Live after-capture has 0 questions.                                                                                                      |
| R2  | Improve formalization after translation instead of leaving most phrases unresolved. | Done       | Glossary-backed lexical phrases now become translated target units with traceable lexical targets.                                                                                                      |
| R3  | Do not default target links to `human-language` local entity URLs.                  | Done       | Translate defaults to Wikidata link-target mode; lexical fallbacks use Wiktionary URLs unless local mode is selected.                                                                                   |
| R4  | Add a UI switcher for link-target mode.                                             | Done       | Translate page now exposes Wikidata, Wikipedia, and Local viewer radio options.                                                                                                                         |
| R5  | Keep local entity links available and make them explicit.                           | Done       | Integration test verifies local lexical links appear only with `FORMALIZE_LINK_TARGETS.LOCAL`.                                                                                                          |
| R6  | Prefer concepts and links that can support translation across languages.            | Improved   | Translate now favors curated glossary/lexical targets before asking for target-language entity labels; Wikidata remains the default selected link target.                                               |
| R7  | Avoid a one-off memoized fix.                                                       | Done       | The implementation extends the glossary strategy, fallback target builder, concurrency control, and UI mode selection rather than hard-coding the whole sentence.                                       |
| R8  | Reduce the likelihood of untranslated text toward zero.                             | Improved   | Glossary coverage is broader, punctuation is preserved, and target fallback no longer blocks on missing Wikidata labels. Unknown domains can still require future glossary or semantic resolution work. |
| R9  | Capture issue data, logs, and a case study.                                         | Done       | Raw captures are in the ignored `data/` directory; tracked markdown summarizes the root cause and verification.                                                                                         |
| R10 | Search online for additional facts and data.                                        | Done       | See `ONLINE-RESEARCH.md`.                                                                                                                                                                               |
| R11 | Add debug output if root cause cannot be found.                                     | Not needed | Existing translation steps and CLI JSON output were sufficient to identify 429 fan-out and unresolved target causes.                                                                                    |
| R12 | File upstream issues if another project is at fault.                                | Done       | The Translate failure was internal; the later CI follow-up found matching broad test matrices in the JS and Rust CI/CD templates and filed upstream template issues 66 and 59.                          |
| R13 | Keep only Bun/Linux JavaScript tests and full Linux Rust tests in CI.               | Done       | The JS workflow now has a single `Test (bun on ubuntu-latest)` job, and the Rust workflow now has a single `Test (ubuntu-latest)` job using `cargo test --workspace --all-targets --all-features`.      |
| R14 | Avoid unnecessary full-history checkout in the changeset validation job.            | Done       | The changeset check now checks out the PR head at depth 1 and fetches only the base commit needed for the changeset diff.                                                                               |

## Reproduction

Run the Translate page or CLI with:

```text
First prototype for a links-network based reasoning playground. It accepts a human-language statement, generates selectable interpretations, formalizes the selected meaning when possible, evaluates computable fragments, and attaches evidence with provenance for non-computable claims.
```

Source language: `en`

Target language: `ru`

Before the fix, the live capture produced 27 unresolved questions and mixed
English/Russian output. After the fix, the focused integration test and live
CLI capture both produce a complete Russian output with no unresolved questions.
