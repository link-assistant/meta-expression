# Issue 126 — Reconstructed Timeline

All timestamps come from [`data/issue.json`](data/issue.json) and the captured
[`data/debug-log.md`](data/debug-log.md).

1. **2026-05-26T23:28:15Z — Build deployed.** GitHub Pages publishes the
   Translate prototype at `v0.9.0`, commit `5679058`, ref `main`
   (`build source: github-pages`).

2. **2026-05-27T07:40:40Z — Reproduction captured.** The reporter translates the
   opening paragraph of an "Artificial intelligence" article (`en` → `ru`, all
   three sources enabled) and the Translate page records the status:
   _"Translated 3 sentences (36/55 linked phrases, 4 rule-resolved; 15
   unresolved)."_

3. **2026-05-27T07:40Z — Debug log exported.** The reporter copies the full
   debug log to a gist
   (`https://gist.github.com/konard/00ab324733988bd521ff71ef998ab8d7`). At this
   point there was no in-app copy button, so the export was manual.

4. **2026-05-27T07:48:37Z — Issue #126 filed.** Title: _"Issue on Translate
   page: Artificial intelligence (AI) is a subfield of comp…"_. Labelled `bug`.
   The body bundles the environment, the input text, the options, the status,
   the formalized markdown, the translated result, the questions, and a
   (truncated) debug log, plus the multi-part description enumerated in
   [`REQUIREMENTS.md`](REQUIREMENTS.md).

5. **Symptoms visible in the captured data.** The debug log shows the
   disambiguation failures in concrete form (see [`ROOT-CAUSES.md`](ROOT-CAUSES.md)
   for the evidence):
   - `Artificial intelligence (AI)` → Q113894124 _"Artificial Intelligence (AI)
     in Cardiotocography (CTG) Interpretation"_ (a paper).
   - `developing systems` → Q41668433 _"Developing systems for cost-effective
     auditing of clinical trials"_ (a paper).
   - `tasks requiring` → Q118765798 _"tasks requiring miraculous speed"_.
   - `which` → Q7993544 _"WHO-convened Global Study of Origins of SARS-CoV-2"_.
   - `solving human` → Q46230901 _"Solving human β-cell development—what does
     the mouse say?"_.
   - `term` → Q1054121 _"Макукин"_ (a surname), `has` → Q37436935 _"Хас"_.
   - 15 phrases left untranslated, several rendered as transliterations.

6. **2026-05-27 — Work begins on branch `issue-126-e1ac50244d41` / PR #127.**
   The fix proceeds in the order: scholarly-article rejection + per-word context
   surfacing → copy-debug-log button + enriched log → persistent
   context-selection questions that re-run translation → version-bump workflow
   fix → this case study.
