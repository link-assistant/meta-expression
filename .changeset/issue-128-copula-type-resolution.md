---
'meta-expression': minor
---

Resolve copula predicates to the subject's asserted type during formalization
(issue #128 R12). In "Hawaii is a state." the predicate "state" now resolves to
the contextually-correct `Q35657` (U.S. state) — matching its Russian
counterpart `Штат США` — instead of the generic federated-state concept
`Q7275`. The disambiguation is language-neutral: it reads the subject's
`instance of` / `subclass of` relations and promotes the predicate noun when it
is the head of the type's name, so the same logic resolves the Russian
"Гавайи это штат" without a per-language rule. The bespoke
`english-us-state-predicate-to-russian-shtat` translation rule is removed, the
Rust core, its curated reference, and the committed WASM build are flipped to
the resolved `Q35657` meaning for JS↔Rust parity, and the case study and
repository docs are updated.
