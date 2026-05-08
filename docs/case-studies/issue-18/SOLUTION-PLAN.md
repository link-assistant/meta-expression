# Solution Plan for Issue #18

## Shipped Plan

1. Capture issue, PR, review, code-search, and package facts under
   `docs/case-studies/issue-18/data`.
2. Add failing tests for the missing preference profile behavior.
3. Implement a reusable preference profile module in `src/preferences.js`.
4. Wire `analyzeStatement` so preference profiles contribute explicit evidence.
5. Add the static `/preferences` page using `web/preferences-ui.js`.
6. Update canonical requirements and case-study documentation.
7. Run focused tests, full tests, formatting, linting, docs checks, and local
   browser verification.

## Per-Requirement Solution Notes

| Requirement               | Solution                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preferences page          | Add a top-nav page at `#/preferences` with worldview, religion, context, and Links Notation panels.                                                               |
| Basic belief sliders      | Use `preferenceBeliefDefinitions` as stable slider definitions.                                                                                                   |
| Derived religion behavior | `isPreferenceBeliefVisible` hides religion sliders until `god-exists > 0.5`; `createDerivedPreferenceEvidence` derives refuting evidence when `god-exists < 0.5`. |
| Context presets           | `preferenceContextDefinitions` holds initial lore statements for real-world and fictional contexts.                                                               |
| Calculation impact        | `analyzeStatement` merges `createPreferenceEvidence(profile)` into the evidence list before estimation.                                                           |
| Local persistence         | `web/preferences-ui.js` stores the normalized profile in `meta-expression.preferences.v1`.                                                                        |
| Links Notation            | `serializePreferenceProfile` and `parsePreferenceProfile` use the local `.lino` codec.                                                                            |
| Tests                     | `tests/issue-18.test.js` covers serialization, visibility, derived evidence, and context evidence.                                                                |

## Future Work

- Promote contexts from single-select to composable weighted profiles.
- Let users add arbitrary statement sliders from the UI.
- Add profile version migrations once the stored shape changes.
- Consider RDF/JS-compatible storage once preferences need exchange with other
  semantic tooling.
