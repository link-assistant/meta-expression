# Requirements for issue #90

> Parent: [#71](https://github.com/link-assistant/meta-expression/issues/71)
> and [#58](https://github.com/link-assistant/meta-expression/issues/58).

## R90.1 Document-level originality report

`/uniqueness` must return a document-level originality report that groups
matched sources and lists each matched passage.

## R90.2 Matched-source spans

Every report match must carry the input span, source URL, source span, match
kind, and numeric match strength.

## R90.3 Exclusion metadata

The report must include exclusion metadata for text that is reported but not
counted toward document originality scoring, including quoted text and
reference-list sections.

## R90.4 Document fixture

Automated coverage must include a document-level fixture with at least two exact
matched passages and one paraphrase or semantic-similarity match.

## R90.5 Backward-compatible score shape

Existing consumers that read the top-level `/uniqueness` summary and per
statement score fields must continue to work.
