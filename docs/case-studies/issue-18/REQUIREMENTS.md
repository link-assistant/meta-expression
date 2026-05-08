# Requirements for Issue #18

## Atomic Requirements

| ID      | Requirement                                                                                        | Implemented in this PR |
| ------- | -------------------------------------------------------------------------------------------------- | ---------------------- |
| I18-R1  | Add a `/preferences` section to the static web app.                                                | Yes                    |
| I18-R2  | Let statements and sliders act as basic axioms or personal beliefs.                                | Yes                    |
| I18-R3  | Feed configured beliefs into correctness calculation for other statements.                         | Yes                    |
| I18-R4  | Include a God or gods belief slider.                                                               | Yes                    |
| I18-R5  | Show specific religion sliders only when the God belief is positive.                               | Yes                    |
| I18-R6  | For atheist profiles, avoid showing religion sliders and derive religion refutations.              | Yes                    |
| I18-R7  | Let the user select a preferred context.                                                           | Yes                    |
| I18-R8  | Include context presets for real world, World of Warcraft, StarCraft, Harry Potter, and Star Wars. | Yes                    |
| I18-R9  | Treat context lore as explicit evidence for matching statements.                                   | Yes                    |
| I18-R10 | Persist configuration in localStorage.                                                             | Yes                    |
| I18-R11 | Import and export configuration as Links Notation.                                                 | Yes                    |
| I18-R12 | Keep repository requirements updated with the new vision.                                          | Yes                    |
| I18-R13 | Compile issue data and analysis under `docs/case-studies/issue-18`.                                | Yes                    |
| I18-R14 | Search online for related facts, components, and libraries.                                        | Yes                    |

## Guardrails

- Preferences are explicit evidence, not hidden truth.
- Fictional context presets only affect matching lore statements.
- The current implementation is a deterministic prototype, not a full belief
  revision or probabilistic reasoning engine.
- Import/export uses the repository's Links Notation codec; RDF libraries are
  deferred until profile data needs external interoperability.
