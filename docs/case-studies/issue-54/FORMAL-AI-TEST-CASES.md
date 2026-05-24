# Formal AI Test Case Corpus

The upstream `link-assistant/formal-ai` tests were indexed at:

```text
e1467d531534af582a2f457e69695ac6861131b8
2026-05-23T23:02:47+00:00
chore: release v0.107.0
```

The generated local fixture is
`js/tests/fixtures/formal-ai-test-corpus.json`. It records every `.rs`, `.js`,
and `.mjs` file under upstream `tests/`, each file SHA-256, and every detected
Rust `#[test]` / `#[tokio::test]` plus JavaScript or Playwright `test(...)` /
`it(...)` case.

Summary asserted by `js/tests/integration/issue-54-formal-ai-corpus.test.js`:

| Source files | Rust tests | JS tests | Total tests | Ignored Rust tests |
| ------------ | ---------- | -------- | ----------- | ------------------ |
| 61           | 534        | 172      | 706         | 69                 |

Regenerate with:

```bash
FORMAL_AI_REPO=/tmp/formal-ai-issue54 node experiments/extract-formal-ai-test-cases.mjs
```

## File Coverage

| Formal AI source file                                      | Language   | Tests | Ignored |
| ---------------------------------------------------------- | ---------- | ----- | ------- |
| `tests/e2e/playwright.adhoc.config.js`                     | javascript | 0     | 0       |
| `tests/e2e/playwright.local.config.js`                     | javascript | 0     | 0       |
| `tests/e2e/playwright.pages.config.js`                     | javascript | 0     | 0       |
| `tests/e2e/scripts/check-i18n-catalog.mjs`                 | javascript | 0     | 0       |
| `tests/e2e/scripts/check-language-change-parity.mjs`       | javascript | 0     | 0       |
| `tests/e2e/scripts/check-language-test-coverage.mjs`       | javascript | 0     | 0       |
| `tests/e2e/scripts/check-multilingual-intent-coverage.mjs` | javascript | 0     | 0       |
| `tests/e2e/tests/connectivity.spec.js`                     | javascript | 5     | 0       |
| `tests/e2e/tests/demo.spec.js`                             | javascript | 44    | 0       |
| `tests/e2e/tests/issue-153.spec.js`                        | javascript | 12    | 0       |
| `tests/e2e/tests/issue-157.spec.js`                        | javascript | 1     | 0       |
| `tests/e2e/tests/issue-180.spec.js`                        | javascript | 4     | 0       |
| `tests/e2e/tests/issue-193.spec.js`                        | javascript | 1     | 0       |
| `tests/e2e/tests/issue-205.spec.js`                        | javascript | 2     | 0       |
| `tests/e2e/tests/issue-210.spec.js`                        | javascript | 1     | 0       |
| `tests/e2e/tests/issue-218.spec.js`                        | javascript | 7     | 0       |
| `tests/e2e/tests/issue-221.spec.js`                        | javascript | 5     | 0       |
| `tests/e2e/tests/issue-224.spec.js`                        | javascript | 1     | 0       |
| `tests/e2e/tests/issue-228.spec.js`                        | javascript | 1     | 0       |
| `tests/e2e/tests/issue-230.spec.js`                        | javascript | 2     | 0       |
| `tests/e2e/tests/multilingual.spec.js`                     | javascript | 86    | 0       |
| `tests/integration/formal_ai_cli.rs`                       | rust       | 11    | 0       |
| `tests/integration/mod.rs`                                 | rust       | 0     | 0       |
| `tests/unit/assistant_name.rs`                             | rust       | 2     | 0       |
| `tests/unit/ci-cd/changelog_parsing.rs`                    | rust       | 5     | 0       |
| `tests/unit/ci-cd/mod.rs`                                  | rust       | 0     | 0       |
| `tests/unit/ci-cd/workflow_release.rs`                     | rust       | 14    | 0       |
| `tests/unit/ci-cd/workspace_manifest_resolution.rs`        | rust       | 6     | 0       |
| `tests/unit/courtesy_response.rs`                          | rust       | 3     | 0       |
| `tests/unit/data_files.rs`                                 | rust       | 1     | 0       |
| `tests/unit/docker_runtime.rs`                             | rust       | 2     | 0       |
| `tests/unit/docs_requirements.rs`                          | rust       | 10    | 0       |
| `tests/unit/formal_ai.rs`                                  | rust       | 33    | 0       |
| `tests/unit/github_logs.rs`                                | rust       | 3     | 0       |
| `tests/unit/mod.rs`                                        | rust       | 0     | 0       |
| `tests/unit/multilingual_variations.rs`                    | rust       | 16    | 0       |
| `tests/unit/proof_request_config.rs`                       | rust       | 16    | 0       |
| `tests/unit/proof_request.rs`                              | rust       | 13    | 0       |
| `tests/unit/software_project.rs`                           | rust       | 4     | 0       |
| `tests/unit/specification/agent_isolation.rs`              | rust       | 11    | 9       |
| `tests/unit/specification/calculator_delegation.rs`        | rust       | 13    | 0       |
| `tests/unit/specification/capabilities.rs`                 | rust       | 5     | 0       |
| `tests/unit/specification/chat_surface.rs`                 | rust       | 67    | 6       |
| `tests/unit/specification/code_generation.rs`              | rust       | 20    | 6       |
| `tests/unit/specification/definition_fusion.rs`            | rust       | 5     | 0       |
| `tests/unit/specification/links_network.rs`                | rust       | 16    | 10      |
| `tests/unit/specification/mod.rs`                          | rust       | 0     | 0       |
| `tests/unit/specification/multilingual.rs`                 | rust       | 54    | 0       |
| `tests/unit/specification/network_visualization.rs`        | rust       | 8     | 1       |
| `tests/unit/specification/openai_compatibility.rs`         | rust       | 19    | 2       |
| `tests/unit/specification/project_lookups.rs`              | rust       | 12    | 0       |
| `tests/unit/specification/prompt_variations.rs`            | rust       | 25    | 0       |
| `tests/unit/specification/reasoning_loop.rs`               | rust       | 15    | 11      |
| `tests/unit/specification/reasoning_paths.rs`              | rust       | 47    | 0       |
| `tests/unit/specification/source_cache.rs`                 | rust       | 9     | 8       |
| `tests/unit/specification/summarization_pipeline.rs`       | rust       | 11    | 0       |
| `tests/unit/specification/telegram_surface.rs`             | rust       | 14    | 1       |
| `tests/unit/specification/translation_via_links.rs`        | rust       | 23    | 7       |
| `tests/unit/specification/transparent_state.rs`            | rust       | 11    | 8       |
| `tests/unit/test_status.rs`                                | rust       | 2     | 0       |
| `tests/unit/web_requests.rs`                               | rust       | 8     | 0       |
