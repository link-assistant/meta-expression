# Case Study: Issue #23 — UI/UX improvements

> Source issue: [link-assistant/meta-expression #23](https://github.com/link-assistant/meta-expression/issues/23)

## 1. Problem statement

The static web prototype (`web/index.html` + `web/styles.css` + `web/app.js`)
shipped with three concrete UI/UX defects on the **Formalize** page and one
broader request to make the whole UI mobile-first, themeable, and language-aware.

The original issue body lists the problems with screenshots. We mirror the
screenshots into [`./data/`](./data/) so the case study is self-contained.

| #   | Defect / Request                                                                                                                                                                                                                                                                 | Screenshot                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Text contrast inside the **Markdown** and **Links Notation** `<details>` panels is far too low — the content is almost invisible against the panel background.                                                                                                                   | [`data/issue-original-image-1-low-contrast-panels.png`](./data/issue-original-image-1-low-contrast-panels.png)             |
| 2   | The **Link target** and **Sources** radio/checkbox fieldsets render with a buggy whitespace arrangement: the label text floats far to the right of the input, lines wrap awkwardly, and the layout uses too much vertical space.                                                 | [`data/issue-original-image-2-radio-whitespace.png`](./data/issue-original-image-2-radio-whitespace.png)                   |
| 3   | The **Top 10 Interpretations** list dumps `[Q…]` ids for every phrase, making it almost unreadable, and there is no way to switch to a more compact / human-friendly form. The currently selected interpretation is also missing from the top‑10 and the rows are not clickable. | [`data/issue-original-image-3-cluttered-interpretations.png`](./data/issue-original-image-3-cluttered-interpretations.png) |
| 4   | The UI must support **language switching** _and_ detection.                                                                                                                                                                                                                      | n/a                                                                                                                        |
| 5   | The UI must support **theme switching** _and_ detection.                                                                                                                                                                                                                         | n/a                                                                                                                        |
| 6   | The UI must be **mobile-first friendly** but use desktop space wisely.                                                                                                                                                                                                           | n/a                                                                                                                        |

## 2. Decomposed requirements

Each requirement is given an ID we reference from commits and tests.

### R1 — Contrast inside expandable panels (`<details class="formalize-payload">`)

- The `<pre>` content uses `background: #172026; color: #f5f7f9` from the global
  `pre` rule, but the `.formalize-payload pre` rule overrides the background to
  `#ffffff` _without_ overriding the color, leaving near-white text on white. (See
  [`web/styles.css:962-984`](../../../web/styles.css) before the fix.)
- **Acceptance:** Markdown and Links Notation panel bodies must reach
  WCAG 2.1 AA contrast (≥4.5:1) in both light and dark themes.

### R2 — Radio / checkbox fieldsets (`<fieldset class="formalize-target">`, `<fieldset class="formalize-sources">`)

- Default browser fieldset styles plus `display: grid; gap: 6px;` cause the
  control + text to be split onto two visual columns when the parent grid widens,
  producing the “whitespace bug”.
- **Acceptance:** the radio/checkbox sits flush left, the label text is close to
  it (≤8px), the rows do not wrap awkwardly on desktop or mobile, and the
  fieldset is no taller than the sum of its rows + 8px padding.

### R3 — Switchable interpretation display modes

- A user must be able to choose how each interpretation row is rendered. Modes:
  - `id` — `Hawaii [Q782]` (current behaviour, kept as opt-in)
  - `name` — `Hawaii (Hawaii)` — entity full name only, replaces the source token
  - `name+meaning` — `Hawaii (state of the United States)`
  - `meaning` — `state of the United States`
  - `replace` — show only the entity label, no parens, no original token
- **Acceptance:** a single radio control on the Formalize page toggles all
  interpretation rows live, with the choice persisted in `localStorage`.

### R4 — Clickable interpretations + “current is in the top 10”

- Clicking an interpretation row must replace the main rendered output with that
  interpretation’s phrases and re-render the Markdown/Links Notation payloads.
- The currently active interpretation must always be present in the list (its
  rank is preserved when it’s already in the top‑N, otherwise it is appended at
  position 10 and visually marked as `active`).
- **Acceptance:** each row is a real `<button>`, has `aria-pressed`,
  keyboard-focuses, and the active row is visually distinct.

### R5 — Language switching + detection

- The web prototype hard-codes English UI strings. We need
  - a small i18n table with at least `en` and `ru`,
  - automatic detection from `navigator.language`,
  - a manual `<select>` in the top nav that overrides detection and persists to
    `localStorage`.
- **Acceptance:** all visible UI strings (nav, headings, buttons, hints) come
  from the table; switching the language updates the page without a reload.

### R6 — Theme switching + detection

- Detect `prefers-color-scheme` on first load. Provide a manual “Light / Dark /
  Auto” toggle in the top nav that persists to `localStorage`. Wire dark mode
  through CSS custom properties so every screen (Analyse, Compare, Formalize)
  picks it up.
- **Acceptance:** light + dark themes both pass AA contrast on every component
  touched in R1–R4.

### R7 — Mobile-first / wise desktop space

- The current `@media (max-width: 820px)` block is too coarse. We need:
  - a fluid `clamp()`-based `max-width` for the formalize panel so it doesn’t
    feel lost on 1440px+ displays but still fills small phones,
  - the radio/checkbox fieldsets switch to single-column on `<480px`,
  - the top nav becomes scrollable horizontally on narrow widths instead of
    wrapping into multiple rows.
- **Acceptance:** Lighthouse mobile audit passes, and desktop screenshots show
  the formalize panel filling a sensible reading column rather than a 1100px
  hard cap whose corners feel empty.

## 3. Root-cause analysis

| Defect          | Root cause                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 low contrast | Specificity + cascade order: the global `pre { color: #f5f7f9 }` selector matches `.formalize-payload pre`, so when `.formalize-payload pre` resets the background to white the text colour is _not_ reset.                                                                                                                                                                                                                                                                                                                 |
| R2 whitespace   | `.formalize-target label { display: flex; align-items: center; gap: 6px; }` is correct in isolation, but the parent `.formalize-options` is a 2-column grid (`minmax(180px, 1fr) minmax(220px, 2fr)`) which forces the fieldset to share its row with `<input id="formalize-ngram-size">`. Inside the fieldset, the labels then stretch to the full grid track. The legacy WebKit default of `display: list-item` on `<legend>` plus an implicit `padding` on `<fieldset>` add the extra whitespace seen in the screenshot. |
| R3 / R4         | The interpretation list is rendered as static `<li>` rows with phrase IDs hard-coded into the template. There is no display mode state, no click handler, and no concept of an “active interpretation”.                                                                                                                                                                                                                                                                                                                     |
| R5 / R6 / R7    | The prototype was built with a single `:root` light palette and no i18n layer. Theme + locale state live nowhere.                                                                                                                                                                                                                                                                                                                                                                                                           |

## 4. Existing components / libraries surveyed

We deliberately stay zero-dependency to keep the prototype small and offline-friendly. The patterns below were referenced when designing the fix.

| Concern                    | Reference component / pattern                                                                                                                                   | Why we didn’t adopt it                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Theme toggling             | [`@radix-ui/react-toggle-group`](https://www.radix-ui.com/primitives/docs/components/toggle-group), [`next-themes`](https://github.com/pacocoursey/next-themes) | React-only and pulls a runtime; we only need ~30 lines of vanilla JS + CSS variables.                                              |
| i18n                       | [`i18next`](https://www.i18next.com/), [`@formatjs/intl`](https://formatjs.io/)                                                                                 | Heavy for a prototype; for two locales a 1-file dictionary is enough and keeps the bundle empty.                                   |
| Accessible radio fieldsets | [GOV.UK Design System — Radios](https://design-system.service.gov.uk/components/radios/)                                                                        | We only need its layout rules (icon + label, 8px gap, 16px row gap), reproduced inline.                                            |
| `<details>` styling        | [Open UI: Customizable details/summary](https://open-ui.org/components/disclosure.research/)                                                                    | We only need a colour change + cursor; native works fine.                                                                          |
| Mobile-first grid          | [Every Layout — Switcher](https://every-layout.dev/layouts/switcher/)                                                                                           | We adopt the _idea_ (single CSS rule that flips between row and column based on container width) without depending on the library. |

## 5. Solution plan (executed in this PR)

1. **R1 — Contrast.** Move all colours into CSS custom properties on `:root` and
   `:root[data-theme='dark']`. Re-style `.formalize-payload pre` to use
   `var(--surface)` + `var(--ink)` so it inherits theme automatically. Confirm
   AA contrast for both themes.
2. **R2 — Radio whitespace.** Strip default `<fieldset>` padding, give each
   `<label>` `display: inline-flex; align-items: center; gap: 8px;` and put the
   fieldsets in their own auto-fitting grid (`grid-template-columns:
repeat(auto-fit, minmax(220px, 1fr))`).
3. **R3 — Display modes.** Introduce a `<fieldset class="formalize-display-mode">`
   with five radios (id / name / name+meaning / meaning / replace). Persist the
   selection in `localStorage` (`meta-expression.interpretation-display.v1`).
   Refactor the interpretation row renderer to format each phrase based on the
   mode and on `entityLabel` / `entityDescription` carried from the formalize
   pipeline. Surface those fields from `generateFormalizeInterpretations` in
   `src/formalize.js`.
4. **R4 — Clickability + “active in top 10”.** Compute an `activeInterpretationKey`
   from the selected entity ids. Render the interpretation list as
   `<button class="formalize-interpretation-row">` elements; clicking one calls
   the same renderer the toggle uses. If the active interpretation is missing
   from the top‑N, push it as rank 10 and tag it `data-active="true"`.
5. **R5 — Language.** Add `web/i18n.js` with two dictionaries (`en`, `ru`).
   Replace every static UI string in `index.html` with a `data-i18n` attribute
   the dictionary fills in on `DOMContentLoaded`. Add a `<select id="locale">`
   in the top nav. Auto-pick from `navigator.language`, persist overrides.
6. **R6 — Theme.** Add a `<button id="theme-toggle">` cycling Auto → Light →
   Dark. Default to `Auto` which obeys `prefers-color-scheme`. Persist override
   to `localStorage`. All component colours move to CSS custom properties.
7. **R7 — Mobile-first / wise desktop.** Replace the single hard `820px`
   breakpoint with a small mobile-first reset (single column under 720px,
   fluid `clamp(320px, 100%, 1200px)` shell over 720px, scrollable nav under
   560px). Verify with Playwright at 375×812 (iPhone SE), 768×1024 (iPad), and
   1440×900 (desktop).

## 6. Verification matrix

| Requirement | Automated test                                                                            | Visual evidence                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| R1          | `tests/issue-23.test.js` — contrast tokens come from theme                                | `docs/screenshots/issue-23/after-formalize-light.png`, `docs/screenshots/issue-23/after-formalize-dark.png` |
| R2          | `tests/issue-23.test.js` — fieldsets render with no leftover padding                      | same screenshots above                                                                                      |
| R3          | `tests/issue-23.test.js` — `formatInterpretationPhrase` covers all five modes             | `docs/screenshots/issue-23/after-display-mode-meaning.png`                                                  |
| R4          | `tests/issue-23.test.js` — current interpretation is always included and tagged active    | `docs/screenshots/issue-23/after-active-interpretation.png`                                                 |
| R5          | `tests/issue-23.test.js` — i18n dictionary exposes the same set of keys for `en` and `ru` | `docs/screenshots/issue-23/after-locale-ru.png`                                                             |
| R6          | `tests/issue-23.test.js` — theme tokens are defined for both light and dark               | `docs/screenshots/issue-23/after-formalize-dark.png`                                                        |
| R7          | manual Playwright sweep at 375 / 768 / 1440                                               | `docs/screenshots/issue-23/after-mobile-375.png`                                                            |

## 7. Files in this case study

```
docs/case-studies/issue-23/
├── README.md                                                  # this file
└── data/
    ├── issue-23-details.json                                  # raw GitHub issue payload
    ├── issue-original-image-1-low-contrast-panels.png         # original screenshot 1
    ├── issue-original-image-2-radio-whitespace.png            # original screenshot 2
    └── issue-original-image-3-cluttered-interpretations.png   # original screenshot 3
```

## 8. References

- WCAG 2.1 — [SC 1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG21/#contrast-minimum)
- MDN — [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- MDN — [`<fieldset>` and `<legend>` styling pitfalls](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset)
- MDN — [`navigator.language` / `navigator.languages`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language)
- Every Layout — [Switcher pattern](https://every-layout.dev/layouts/switcher/)
- GOV.UK Design System — [Radios component](https://design-system.service.gov.uk/components/radios/)
