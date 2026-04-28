# Case Study: Issue 13 — Show two metrics by default (Confidence & Correctness) + Analyse / Compare pages

## Issue

URL: https://github.com/link-assistant/meta-expression/issues/13
Reporter: @konard
Labels: documentation, enhancement
Title: "Show two metricts by default"

### Description (verbatim)

> Confidence (or better name, or maybe it is error margin) from -100% to 100%,
> so all our expressions can be relative to each other.
>
> For example `Population of Russia as 100m` or `Population of Russia as 200m`
> has some relative percentage of correctness to actual fact as of now.
>
> And correctness from 0% to 100%.
>
> Also we should have analyse and compare pages, with ability to switch between
> them at top menu.
>
> Double check my reasoning, because I don't know how to name it best in UI and
> code, just follow the idea.

---

## What the issue asks for

Two distinct, complementary metrics should be the default surface in the
prototype:

1. **Confidence** (signed, **−100% … +100%**) — also called "error margin".
   It expresses how a claim relates to the actual fact: a positive value means
   the claim is closer to truth than to its negation, a negative value means
   the claim is closer to its negation than to truth, and 0% means the claim is
   entirely indecisive. This is the **relative** signal that lets two
   competing claims (e.g. `Population of Russia as 100m` and
   `Population of Russia as 200m`) be compared against each other and against
   the actual fact.

2. **Correctness** (unsigned, **0% … 100%**) — how correct the claim is in
   absolute terms. 100% means perfectly correct, 0% means perfectly wrong.

Additionally:

3. The web UI should expose a **top menu** with at least two pages, **Analyse**
   and **Compare**, and the user must be able to switch between them.

The reporter is explicitly asking us to "double check the reasoning" — pick
good names in code and UI, and follow the idea rather than the literal wording.

---

## Naming decision

The reporter signals uncertainty about names. We adopt the following terms in
both UI and code:

| UI label    | Code identifier       | Range         | Meaning                                                        |
| ----------- | --------------------- | ------------- | -------------------------------------------------------------- |
| Confidence  | `confidence` (signed) | -100% … +100% | Net evidential weight; sign indicates direction toward truth.  |
| Correctness | `correctness`         | 0% … 100%     | Magnitude of correctness; how close to fact in absolute terms. |

Why these names?

- **Confidence** matches the term already used throughout the prototype but
  re-defines its codomain to a signed range so it can express direction (truth
  vs. falsity) and magnitude (how decisively) in a single number. This is the
  same shape as `rawBalance` already computed internally
  (`src/index.js:756`), so we are mostly **renaming and surfacing** an
  existing quantity rather than inventing one.
- **Correctness** is more intuitive than "accuracy" or "truthfulness" for
  end-users and avoids the ML-specific overload of "accuracy". It maps cleanly
  to the existing `result.confidence` (0..1) value, which we keep but rename
  in the UI to match the issue's vocabulary.

### Mathematical relationship

For a claim with normalized support `s ∈ [0,1]` and refutation `r ∈ [0,1]`
where `s + r > 0`:

```
correctness = s / (s + r)               in [0, 1]
confidence  = (s − r) / (s + r)         in [-1, 1]
confidence  = 2 · correctness − 1
```

So the two numbers are not independent — they are two **views of the same
weighted-evidence balance**. Surfacing both is still useful because:

- Correctness answers "**how correct is it?**" (good for absolute reads,
  ranking).
- Confidence answers "**which way does the evidence point, and how strongly?**"
  (good for relative comparisons between claims; e.g. `100m` vs. `200m`).

Both metrics are deliberately bounded for real-world claims so they never read
exactly ±100% (see existing `boundRealWorldConfidence` at
`src/index.js:774`).

---

## Requirements (extracted)

R1. Expose a **signed Confidence** metric in the UI ranging from -100% to
+100%. Default visibility on the main page.
R2. Expose a **Correctness** metric in the UI ranging from 0% to 100%.
Default visibility on the main page.
R3. Both metrics must be derivable for every analysis and consistent with each
other (so a user can sanity-check one against the other).
R4. The web prototype must have a **top menu** with at least two views:
**Analyse** and **Compare**, with a working switcher.
R5. The Compare page must let the user enter two (or more) claims about the
same subject and visualise their **relative confidence/correctness** so
that competing claims (`100m` vs `200m` for the same population) can be
compared side-by-side.
R6. Implementation should not break existing tests, examples, CLI, or
microservice surfaces. Existing analyses should continue to work.
R7. Document the new metrics and pages in the README and add unit tests
covering signed-confidence math and Compare-page behaviour.

---

## Existing implementation (what we already have)

Reading `src/index.js`:

- `EvaluationResult.confidence` (`src/index.js:1143`) — currently the
  unsigned 0..1 weighted-support ratio, bounded for real-world claims.
- `EvaluationResult.rawBalance` (`src/index.js:1144`) — the **signed** -1..1
  net balance `(support − refute) / total`. This is exactly the quantity the
  issue calls "confidence (or error margin) from -100% to 100%". It is
  computed but **not surfaced in the UI**.
- `result-band` in `web/index.html` (lines 102–115) — currently shows
  Confidence (unsigned %), Level, Result. No Correctness field, no signed
  field.
- The web app has no top navigation; everything lives on one page.

So technically the **signed metric already exists in the data model** — the
issue is largely about **surfacing it** under the right name and adding a
companion **Correctness** read-out plus a Compare page.

---

## Proposed solution plan

### 1. Library / data model (`src/index.js`)

Add a single new field on `EvaluationResult`:

```js
{
  ...existingFields,
  correctness: confidence,        // alias of unsigned 0..1 confidence
  confidence: rawBalance,         // re-aim the canonical "confidence" term to the signed -1..1 measure
}
```

To avoid breaking existing consumers, take a non-destructive path:

- Keep all existing properties (`confidence` 0..1, `rawBalance` -1..1) intact
  for backwards compatibility. The properties are stable API.
- Add two new explicit fields **derived in one place**:
  - `correctness` (0..1) — alias of the existing unsigned `confidence`.
  - `signedConfidence` (-1..1) — alias of the existing `rawBalance`.

This keeps every existing test green while giving the UI two well-named knobs
to display. The README will note that `result.confidence` (legacy) is
identical to `result.correctness` and that `result.signedConfidence` is the
new -100%..+100% quantity from issue 13.

### 2. Web prototype (`web/`)

- Add a top-bar nav (`<nav class="top-nav">`) with two buttons: "Analyse" and
  "Compare". State managed in URL hash (`#/analyse`, `#/compare`) so deep
  links work and the nav is keyboard-accessible.
- Update `result-band` to show **Correctness** and **Confidence (signed)** as
  two adjacent cards plus the existing Level/Result. Both cards render
  percentages; the signed one uses `+`/`−` prefix and a colour cue
  (green for positive, red for negative, grey for zero/unknown).
- Add a new `compare` view (`<section class="compare-panel">`) with:
  - An input list (start with 2 rows, allow add/remove rows).
  - For each row: a text input for a claim and read-only Correctness +
    Confidence cards.
  - A small bar visualisation showing the two metrics aligned across rows so
    two competing claims about the same subject can be eyeballed.
- Switching pages is purely client-side; no router library needed.

### 3. Tests (`tests/`)

- New `tests/issue-13.test.js` covering:
  - `analyzeStatement(...)` exposes both `correctness` and `signedConfidence`
    with the right ranges and the right relationship
    (`signedConfidence ≈ 2·correctness − 1` whenever `correctness !== null`).
  - For an unsupported claim, both metrics are `null` (unknown).
  - For a clearly-true arithmetic claim (`1 + 1 = 2`), correctness is 1 and
    signed confidence is 1.
  - For a clearly-false arithmetic claim (`1 + 1 = 1`), correctness is 0 and
    signed confidence is -1.
- Web prototype: keep manual validation via Playwright screenshots; we don't
  add a JS-DOM harness because the project doesn't currently have one.

### 4. Documentation

- `README.md`: short section "Default metrics" explaining Correctness vs.
  Confidence (signed), with a worked example using the population numbers from
  the issue.
- This case study lives at `docs/case-studies/issue-13/analysis.md`.

---

## Alternatives considered

| Alternative                                              | Verdict                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Replace `result.confidence` (0..1) with the signed value | Rejected: hard breaking change for CLI, tests, microservice, README, examples.                          |
| Use names `accuracy` + `errorMargin`                     | Rejected: "accuracy" overloads ML terminology; "error margin" is the issue's own tentative phrasing.    |
| Single combined "score" widget with a -1..1 slider only  | Rejected: the issue explicitly asks for **two** metrics on by default.                                  |
| Add full SPA router for top nav                          | Rejected: overkill for two views — hash-based switch is enough and keeps the prototype dependency-free. |
| Render the Compare page as a separate HTML file          | Rejected: would duplicate stylesheet wiring and the live-evidence worker handshake.                     |

---

## Files expected to change

- `src/index.js` — add `correctness` and `signedConfidence` to evaluation
  result objects (computed/evidence/self-reference paths).
- `src/index.d.ts` — add the two fields to `EvaluationResult`.
- `web/index.html` — add top nav, second metric card, and a Compare panel.
- `web/app.js` — wire up the nav switch, Compare-row management, and metric
  rendering.
- `web/styles.css` — styles for the top nav, second metric card, Compare panel,
  positive/negative confidence colouring.
- `tests/issue-13.test.js` — new tests for the metrics.
- `README.md` — short doc update for the new metrics and Compare page.
- `docs/case-studies/issue-13/analysis.md` — this file.

---

## References

- Issue: https://github.com/link-assistant/meta-expression/issues/13
- Existing signed balance computation: `src/index.js:730–759`
  (`computeEvidenceConfidence`).
- Existing real-world bounding: `src/index.js:774–783`
  (`boundRealWorldConfidence`).
- Prior case-study style: `docs/case-studies/issue-11/analysis.md`.
