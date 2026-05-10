# Requirements

| ID  | Requirement                                                                | Status | Acceptance check                                                                                       |
| --- | -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| R1  | Add a `/uniquness` section requested by the issue.                         | Done   | `/uniquness` is supported as a CLI, HTTP, and hash-route alias.                                        |
| R2  | Prefer the correct spelling where possible.                                | Done   | The canonical command, route, hash route, nav label, and page id use `uniqueness`.                     |
| R3  | Calculate a per-statement likelihood that the statement already exists.    | Done   | `searchTextUniqueness()` returns `existingLikelihood` and `uniqueness` for every detected statement.   |
| R4  | Search every detected statement literally.                                 | Done   | Each adapter receives a normalized per-statement query and the Wikimedia/DDG adapters quote it.        |
| R5  | Suggest quote/citation or wording changes when prior matches are found.    | Done   | Results include `suggestedAction` values: `cite-or-quote`, `review-matches`, or `likely-original`.     |
| R6  | Use Wikipedia and additional public resources reachable from browser code. | Done   | Default adapters cover Wikimedia, OpenAlex, Crossref, and DuckDuckGo Instant Answer.                   |
| R7  | Check API availability and CORS behavior for candidate search providers.   | Done   | Header/body probes are committed under `data/*-cors.*` with `access-control-allow-origin: *` findings. |
| R8  | Expose output as structured data and copyable artifacts.                   | Done   | The API/web/CLI support JSON, HTML, Markdown, and Links Notation outputs.                              |
| R9  | Add a static web section.                                                  | Done   | `web/index.html` includes `#nav-uniqueness` and `#page-uniqueness`.                                    |
| R10 | Compile issue data and analysis under `docs/case-studies/issue-27`.        | Done   | Raw issue/PR/API probe data plus analysis docs are committed in this folder.                           |
| R11 | Add automated regression coverage.                                         | Done   | `tests/issue-27.test.js` covers scoring, CLI aliasing, docs route references, and web wiring.          |

## Result Fields

| Field                | Meaning                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `existingLikelihood` | Combined probability-like score from source matches; higher means likely already public. |
| `uniqueness`         | `1 - existingLikelihood`, bounded to `0..1`.                                             |
| `suggestedAction`    | Reviewer action based on thresholds: cite/quote, review matches, or likely original.     |
| `matches`            | Source hits with title, URL, snippet, score, source id, and match kind.                  |
| `sourceErrors`       | Per-source failures retained without failing the entire statement check.                 |

## Non-Goals

- This is not plagiarism detection with full-web indexing. It uses public APIs
  available from a static browser app.
- This is not a final legal originality judgment. The scores are triage signals
  that identify statements worth citation or rewording review.
- Google, Bing, Brave, or other key-required search APIs are not enabled by
  default in the static app because a public browser client cannot safely store
  API credentials.
