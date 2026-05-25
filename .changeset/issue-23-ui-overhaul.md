---
'meta-expression': minor
---

UI/UX overhaul of the static `web/` prototype: readable contrast inside `<details>` payload panels, clean radio fieldsets for Link Target / Sources / Interpretation Display, switchable interpretation display modes (`id` / `name` / `name+meaning` / `meaning` / `replace`), clickable interpretations with the active choice always pinned to the top‑10, language switching (`en`, `ru`) with `navigator.language` detection plus `localStorage` override, theme switching (`auto` / `light` / `dark`) with `prefers-color-scheme` detection plus `localStorage` override, and a mobile-first responsive layout (single column ≤640px, two-column from 640px, full app-shell from 960px).
