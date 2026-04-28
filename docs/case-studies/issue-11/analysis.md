# Case Study: Issue 11 — Reasoning Steps aligned to bottom, not top

## Issue

URL: https://github.com/link-assistant/meta-expression/issues/11  
Reporter: @konard  
Label: bug

### Description

In the web UI, the right pane ("Reasoning Steps") shows its step rows aligned to the **bottom** of the panel, leaving a large empty space at the top between the strategy summary and the first step.

Screenshot from issue: shows rows 1 and 2 (MEANING/DISAMBIGUATION) appearing near the bottom of the visible area.

---

## Timeline / Sequence of Events

1. **Issue #9 work** (PR #10): Right pane was renamed to "Reasoning Steps" and a `.strategy-summary` paragraph was added as a second direct child of `.network-panel`.
2. The `.network-panel` CSS grid was defined with `grid-template-rows: auto 1fr auto` — three rows for what were originally three children (header, link-lanes, pre).
3. After adding `.strategy-summary`, the panel now has **four** direct children but the grid only defines **three** rows.
4. The implicit grid behavior causes the fourth child (`pre#lino-output`) to create a fourth implicit row, and critically, the `1fr` row is consumed by `.strategy-summary` instead of `.link-lanes`.

---

## Root Cause Analysis

### Direct Cause

`web/styles.css` line 422:

```css
.network-panel {
  display: grid;
  grid-template-rows: auto 1fr auto; /* only 3 rows */
  gap: 18px;
}
```

`.network-panel` has **4 direct children** in `web/index.html`:

1. `.network-header` → Row 1 (auto)
2. `.strategy-summary` → Row 2 (**1fr** — gets all remaining height!)
3. `.link-lanes` → Row 3 (auto — shrinks to content)
4. `pre#lino-output` → Row 4 (implicit auto)

Because `.strategy-summary` gets the `1fr` row, it expands to fill the available vertical space. `.link-lanes` is then placed in the third row (auto-sized to its content), which appears visually at the bottom of the viewport. Since the strategy summary is empty or very short, the effect is a large empty gap followed by the steps at the bottom.

### Why the `align-content: start` on `.link-lanes` didn't help

`align-content: start` controls alignment of content **within** `.link-lanes` itself. It cannot prevent the grid from placing `.link-lanes` in the wrong row. The row assignment is determined by `grid-template-rows`, not `align-content`.

---

## Requirements from Issue

1. Steps in the right pane must be **aligned to the top**, not the bottom.
2. There should be **no large empty space** between the strategy summary and the first step.

---

## Solution

### Fix (implemented)

Change `grid-template-rows` from 3 rows to 4 rows to correctly map all four children:

```css
/* Before (bug) */
.network-panel {
  grid-template-rows: auto 1fr auto;
}

/* After (fix) */
.network-panel {
  grid-template-rows: auto auto 1fr auto;
}
```

Row mapping after fix:

1. `.network-header` → auto
2. `.strategy-summary` → auto
3. `.link-lanes` → **1fr** (correct — expands to fill space, content starts at top via `align-content: start`)
4. `pre#lino-output` → auto

### Why this works

`.link-lanes` now correctly receives the `1fr` row, so it expands to fill available space. Its own `align-content: start` ensures the step rows render from the top of that space downward, eliminating the empty gap.

---

## Alternative Solutions Considered

| Approach                                 | Verdict                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| Add `align-self: start` to `.link-lanes` | Would not fix root cause; the element would still be in the wrong grid row                |
| Use `grid-auto-rows`                     | Would apply to implicit rows only; doesn't fix the explicit row mismatch                  |
| Wrap header + summary in a single div    | Reduces children to 3, matching the original template — works but adds unnecessary markup |
| **Fix `grid-template-rows` to 4 rows**   | **Correct, minimal, no markup changes**                                                   |

---

## Files Changed

- `web/styles.css` line 422: `grid-template-rows: auto 1fr auto` → `grid-template-rows: auto auto 1fr auto`
