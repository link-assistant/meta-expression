# Solution Plan

1. Preserve the source surface as structured metadata:
   `sourceReconstruction` stores token, separator, and symbol units with stable
   ids and sentence membership.
2. Enrich deterministic linguistic metadata:
   tokens and word fragments carry morphology; sentence metadata records
   attachments, agreement, dependency, and coreference records.
3. Route translation through the interlingua:
   `buildSemanticMetaLanguage()` copies the reconstruction into the semantic
   layer and reconstructs the semantic source text from units.
4. Route naturalization through the interlingua:
   semantic-meta-language input uses `sourceReconstruction` before consulting a
   raw text fallback.
5. Lock the behavior with a poisoning regression:
   the test mutates raw source string fields after formalization, proving the
   post-formalization translation path is not using them.
