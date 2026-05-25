questions

```
Questions
What entity or expression should "Formal" map to before translating it from en to ru?
Keep "Formal"
Map to entity
Manual answer
Manual answer
What entity or expression should "compatibility" map to before translating it from en to ru?
Keep "compatibility"
Map to entity
Manual answer
Manual answer
What ru label should represent Q18331021 for "hooks"?
Keep "hooks"
Use ru label
Manual answer
Manual answer
What entity or expression should "naturalization/deformalization" map to before translating it from en to ru?
Keep "naturalization/deformalization"
Map to entity
Manual answer
Manual answer
What ru label should represent Q15782423 for "aliases"?
Keep "aliases"
Use ru label
Manual answer
Manual answer
What entity or expression should "deterministic" map to before translating it from en to ru?
Keep "deterministic"
Map to entity
Manual answer
Manual answer
What entity or expression should "linguistic" map to before translating it from en to ru?
Keep "linguistic"
Map to entity
Manual answer
Manual answer
What entity or expression should "CST/AST" map to before translating it from en to ru?
Keep "CST/AST"
Map to entity
Manual answer
Manual answer
What entity or expression should "Formal" map to before translating it from en to ru?
Keep "Formal"
Map to entity
Manual answer
Manual answer
What ru label should represent Q106205074 for "helpers"?
Keep "helpers"
Use ru label
Manual answer
Manual answer
What entity or expression should "backed" map to before translating it from en to ru?
Keep "backed"
Map to entity
Manual answer
Manual answer
What entity or expression should "by" map to before translating it from en to ru?
Keep "by"
Map to entity
Manual answer
Manual answer
What ru label should represent Q97959764 for "pinned"?
Keep "pinned"
Use ru label
Manual answer
Manual answer
What entity or expression should "upstream" map to before translating it from en to ru?
Keep "upstream"
Map to entity
Manual answer
Manual answer
What ru label should represent Q16828062 for "corpus"?
Keep "corpus"
Use ru label
Manual answer
Manual answer
What entity or expression should "enforce" map to before translating it from en to ru?
Keep "enforce"
Map to entity
Manual answer
Manual answer
What ru label should represent Q76209946 for "1500-line"?
Keep "1500-line"
Use ru label
Manual answer
Manual answer
What entity or expression should "limit" map to before translating it from en to ru?
Keep "limit"
Map to entity
Manual answer
Manual answer
What ru label should represent Q65679590 for "tracked"?
Keep "tracked"
Use ru label
Manual answer
Manual answer
What ru label should represent Q15304961 for "Rust"?
Keep "Rust"
Use ru label
Manual answer
Manual answer
What ru label should represent Q2005 for "JavaScript"?
Keep "JavaScript"
Use ru label
Manual answer
Manual answer
What ru label should represent Q1193600 for "Markdown"?
Keep "Markdown"
Use ru label
Manual answer
Manual answer
What ru label should represent Q37287968 for "files"?
Keep "files"
Use ru label
Manual answer
Manual answer
What ru label should represent Q139722971 for "case-study research"?
Keep "case-study research"
Use ru label
Manual answer
Manual answer
What ru label should represent Q4801012 for "artifacts"?
Keep "artifacts"
Use ru label
Manual answer
Manual answer
What ru label should represent Q80855238 for "excluded"?
Keep "excluded"
Use ru label
Manual answer
```

translation steps

```
input: step-1
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/ai
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Artificial+intelligence%7CAi%7C.ai%7CGenerative+AI%7CAI+bubble&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/ai
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Artificial+intelligence%7CAi%7C.ai%7CGenerative+AI%7CAI+bubble&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=compatibility&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=compatibility
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=compatibility
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/compatibility
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=compatibility
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=compatibility
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=compatibility&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Compatibility%7CBackward+compatibility%7CCompatibility+testing%7CList+of+backward-compatible+games+for+Xbox+One+and+Series+X%2FS%7CAstrological+compatibility&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Compatibility%7CBackward+compatibility%7CCompatibility+testing%7CList+of+backward-compatible+games+for+Xbox+One+and+Series+X%2FS%7CAstrological+compatibility&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/compatibility
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=hooks&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=hooks
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=hooks
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/hooks
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=hooks
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=hooks
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=hooks&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Hooks%7CBell+hooks%7CJan+Hooks%7CHooks+%28surname%29%7CFish+Hooks&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/hooks
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Hooks%7CBell+hooks%7CJan+Hooks%7CHooks+%28surname%29%7CFish+Hooks&ppprop=wikibase_item&origin=*
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/for
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/for
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=formalization&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=formalization
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=formalization
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/formalization
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=formalization
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=formalization
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=formalization&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Formalization%7CFormalized+Music%7CAlgorithm%7CProof+assistant%7CLogic+translation&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Formalization%7CFormalized+Music%7CAlgorithm%7CProof+assistant%7CLogic+translation&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/formalization
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=translation&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=translation
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=translation
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/translation
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=translation
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=translation
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=translation&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Translation%7CGoogle+Translate%7COdyssey+%28Emily+Wilson+translation%29%7CMachine+translation%7CLost+in+Translation&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/translation
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Translation%7CGoogle+Translate%7COdyssey+%28Emily+Wilson+translation%29%7CMachine+translation%7CLost+in+Translation&ppprop=wikibase_item&origin=*
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/and
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/and
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=naturalization%2Fdeformalization&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=naturalization%2Fdeformalization
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=naturalization%2Fdeformalization
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/naturalization%2Fdeformalization
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=naturalization%2Fdeformalization&srlimit=5&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=naturalization%2Fdeformalization
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=naturalization%2Fdeformalization
API response: 404 https://en.wiktionary.org/api/rest_v1/page/definition/naturalization%2Fdeformalization
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=aliases&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=aliases
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=aliases
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/aliases
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=aliases
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=aliases
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=aliases&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Pseudonym%7CAliasing%7CAlias%7CAlias+%28command%29%7CEmail+alias&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/aliases
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Pseudonym%7CAliasing%7CAlias%7CAlias+%28command%29%7CEmail+alias&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=deterministic&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=deterministic
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=deterministic
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/deterministic
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=deterministic
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=deterministic
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=deterministic&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Determinism%7CDeterministic+algorithm%7CChaos+theory%7CDeterministic+parsing%7CDeterministic+system&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Determinism%7CDeterministic+algorithm%7CChaos+theory%7CDeterministic+parsing%7CDeterministic+system&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/deterministic
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=linguistic&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=linguistic
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=linguistic
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/linguistic
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=linguistic
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=linguistic
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/linguistic
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=linguistic&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Linguistics%7CLanguage%7CLinguistic+relativity%7CLinguistic+anthropology%7CLanguage+family&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Linguistics%7CLanguage%7CLinguistic+relativity%7CLinguistic+anthropology%7CLanguage+family&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=CST%2FAST&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=CST%2FAST
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=CST%2FAST
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/cst%2Fast
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=CST%2FAST
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=CST%2FAST
API response: 404 https://en.wiktionary.org/api/rest_v1/page/definition/cst%2Fast
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=CST%2FAST&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Time+in+Canada%7C2007+AFC+Asian+Cup+qualification%7CList+of+tz+database+time+zones%7CTimeline+of+the+2024+Atlantic+hurricane+season%7CSurgical+technologist&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Time+in+Canada%7C2007+AFC+Asian+Cup+qualification%7CList+of+tz+database+time+zones%7CTimeline+of+the+2024+Atlantic+hurricane+season%7CSurgical+technologist&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=metadata&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=metadata
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=metadata
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/metadata
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=metadata
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=metadata
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=metadata&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Metadata%7CMetadata+removal+tool%7CExtensible+Metadata+Platform%7CSAML+metadata%7CDublin+Core&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Metadata%7CMetadata+removal+tool%7CExtensible+Metadata+Platform%7CSAML+metadata%7CDublin+Core&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/metadata
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=prompt&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=prompt
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=prompt
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/prompt
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=prompt
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=prompt
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=prompt&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Prompt%7CPrompt+engineering%7CPrompt+injection%7CConventional+Prompt+Strike%7CPrompt+criticality&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/prompt
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Prompt%7CPrompt+engineering%7CPrompt+injection%7CConventional+Prompt+Strike%7CPrompt+criticality&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=helpers&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=helpers
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=helpers
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/helpers
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=helpers
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=helpers
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=helpers&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Helper%7CHelp%7CFourteen+Holy+Helpers%7CHelp%21%7CThe+Helpers&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/helpers
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Helper%7CHelp%7CFourteen+Holy+Helpers%7CHelp%21%7CThe+Helpers&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=backed&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=backed
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=to+backed
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=backed
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=to+backed
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/backed
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=to+backed
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=backed
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=to+backed
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=backed
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/backed
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=backed&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Defender+%28association+football%29%7CWayback+Machine%7CMortgage-backed+security%7CAsset-backed+security%7CPaul+McCartney&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Defender+%28association+football%29%7CWayback+Machine%7CMortgage-backed+security%7CAsset-backed+security%7CPaul+McCartney&ppprop=wikibase_item&origin=*
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/by
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/by
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/the
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/the
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=pinned&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=pinned
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=to+pinned
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=pinned
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=to+pinned
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/pinned
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=to+pinned
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=pinned
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=pinned
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=to+pinned
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=pinned&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Pinned%7CPinner%7CPinning%7CPin%7CPin+%28chess%29&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/pinned
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Pinned%7CPinner%7CPinning%7CPin%7CPin+%28chess%29&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=upstream&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=upstream
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=upstream
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/upstream
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=upstream
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=upstream
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=upstream&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Upstream%7CRoom+641A%7CUpstream+Color%7CUpstream+%28software+development%29%7CUpstream+%28networking%29&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Upstream%7CRoom+641A%7CUpstream+Color%7CUpstream+%28software+development%29%7CUpstream+%28networking%29&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/upstream
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=test&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=test
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=test
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/test
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=test
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=test
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=test&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Test%7C.test%7CSoftware+testing%7CThis+Is+Not+a+Test%21%7CBechdel+test&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Test%7C.test%7CSoftware+testing%7CThis+Is+Not+a+Test%21%7CBechdel+test&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/test
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=corpus&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=corpus
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=corpus
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/corpus
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=corpus
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=corpus
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=corpus&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Corpus%7CHabeas+corpus%7CCorpus+Christi%2C+Texas%7CCORPUS%7CCorpus+Christi&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/corpus
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Corpus%7CHabeas+corpus%7CCorpus+Christi%2C+Texas%7CCORPUS%7CCorpus+Christi&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Also&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Also
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Also
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/also
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Also
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Also
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/also
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Also&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Also%7CAdvanced+Life+Support+in+Obstetrics%7CThe+Sun+Also+Rises%7CAlso+sprach+Zarathustra%7CSee+also&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Also%7CAdvanced+Life+Support+in+Obstetrics%7CThe+Sun+Also+Rises%7CAlso+sprach+Zarathustra%7CSee+also&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=enforce&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=enforce
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=enforce
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/enforce
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=enforce
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=enforce
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=enforce&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Enforcement+%28disambiguation%29%7CEnforcer%7CEnforcement%7CLaw+enforcement%7CCode+enforcement&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Enforcement+%28disambiguation%29%7CEnforcer%7CEnforcement%7CLaw+enforcement%7CCode+enforcement&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/enforce
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=1500-line&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=1500-line
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=1500-line
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/1500-line
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=1500-line
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=1500-line
API response: 404 https://en.wiktionary.org/api/rest_v1/page/definition/1500-line
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=1500-line&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Hazeltine+1500%7CRam+1500+%28DT%29%7CCompaq+Armada%7CRam+pickup%7CChevrolet+Silverado&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Hazeltine+1500%7CRam+1500+%28DT%29%7CCompaq+Armada%7CRam+pickup%7CChevrolet+Silverado&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=architecture&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=architecture
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=architecture
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/architecture
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/architecture
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=architecture
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=architecture
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=architecture&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Architecture%7CSoftware+architecture%7CEnterprise+architecture%7CGothic+architecture%7CVon+Neumann+architecture&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Architecture%7CSoftware+architecture%7CEnterprise+architecture%7CGothic+architecture%7CVon+Neumann+architecture&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=limit&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=limit
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=limit
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/limit
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=limit
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=limit&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Limit%7CNo+Limit%7CVertical+Limit%7CSky%27s+the+Limit%7CCentral+limit+theorem&ppprop=wikibase_item&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=limit
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/limit
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Limit%7CNo+Limit%7CVertical+Limit%7CSky%27s+the+Limit%7CCentral+limit+theorem&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=tracked&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=tracked
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=to+tracked
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=tracked
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=to+tracked
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/tracked
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=to+tracked
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=tracked
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=to+tracked
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=tracked
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=tracked&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Tracker%7CGoliath+tracked+mine%7CLanding+Vehicle%2C+Tracked%7CTrack%7CTracker+%28American+TV+series%29&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/tracked
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Tracker%7CGoliath+tracked+mine%7CLanding+Vehicle%2C+Tracked%7CTrack%7CTracker+%28American+TV+series%29&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Rust&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Rust
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Rust
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/rust
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Rust
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Rust
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Rust&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Rust%7CRust+%28programming+language%29%7CRust+%28disambiguation%29%7CRust+Belt%7CRust+%28video+game%29&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/rust
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Rust%7CRust+%28programming+language%29%7CRust+%28disambiguation%29%7CRust+Belt%7CRust+%28video+game%29&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=JavaScript&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=JavaScript
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=JavaScript
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/javascript
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=JavaScript
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=JavaScript
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=JavaScript&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=JavaScript%7CJavaScript+syntax%7CJSON-LD%7CJavaScript+library%7CList+of+JavaScript+libraries&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/javascript
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=JavaScript%7CJavaScript+syntax%7CJSON-LD%7CJavaScript+library%7CList+of+JavaScript+libraries&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Markdown&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Markdown
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Markdown
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/markdown
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Markdown
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Markdown
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Markdown&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Markdown%7CRStudio%7CObsidian+%28software%29%7CPrice+markdown%7CGoogle+Docs&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/markdown
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Markdown%7CRStudio%7CObsidian+%28software%29%7CPrice+markdown%7CGoogle+Docs&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=files&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=files
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=files
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/files
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=files
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=files
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/files
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=files&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=File%7CEpstein+files%7CThe+X-Files%7CUnited+States+UFO+files%7CList+of+people+named+in+the+Epstein+files&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=File%7CEpstein+files%7CThe+X-Files%7CUnited+States+UFO+files%7CList+of+people+named+in+the+Epstein+files&ppprop=wikibase_item&origin=*
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/with
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/with
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=case-study&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=case-study
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=case-study
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/case-study
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=case-study&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Case+study%7CThe+Case+Study+of+Vanitas%7CEmbedded+case+study%7CCase+Study+House+No.+10%7CCase+Study+01&ppprop=wikibase_item&origin=*
API response: 404 https://en.wiktionary.org/api/rest_v1/page/definition/case-study
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=case-study
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=case-study
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Case+study%7CThe+Case+Study+of+Vanitas%7CEmbedded+case+study%7CCase+Study+House+No.+10%7CCase+Study+01&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=research&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=research
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=research
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/research
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=research
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=research
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=research&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Research%7CResearch+%28disambiguation%29%7CRE%2FSearch+Publications%7CPsychology%7CArtificial+intelligence&ppprop=wikibase_item&origin=*
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/research
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Research%7CResearch+%28disambiguation%29%7CRE%2FSearch+Publications%7CPsychology%7CArtificial+intelligence&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=artifacts&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=artifacts
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=artifacts
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/artifacts
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=artifacts&srlimit=5&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=artifacts
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Artifact%7CCompression+artifact%7CRinging+artifacts%7CQuimbaya+artifacts%7CArtifacts+%28group%29&ppprop=wikibase_item&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=artifacts
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/artifacts
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Artifact%7CCompression+artifact%7CRinging+artifacts%7CQuimbaya+artifacts%7CArtifacts+%28group%29&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=excluded&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=excluded
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=to+excluded
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=excluded
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=to+excluded
API request: GET https://en.wiktionary.org/api/rest_v1/page/definition/excluded
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=excluded&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Exclude%7CLaw+of+excluded+middle%7CExcludability%7CExcluded+volume%7CSuccession+to+the+British+throne&ppprop=wikibase_item&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=excluded
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=to+excluded
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=excluded
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=to+excluded
API response: 200 https://en.wiktionary.org/api/rest_v1/page/definition/excluded
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Exclude%7CLaw+of+excluded+middle%7CExcludability%7CExcluded+volume%7CSuccession+to+the+British+throne&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Add+Formal&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Add+Formal
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Add+Formal
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Add+Formal
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Add+Formal
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Add+Formal&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Formal+language%7CFormal+wear%7CFormal+fallacy%7CFormal+methods%7CFormal+ontology&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Formal+language%7CFormal+wear%7CFormal+fallacy%7CFormal+methods%7CFormal+ontology&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Formal+AI&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Formal+AI
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Formal+AI
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Formal+AI
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Formal+AI&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Artificial+intelligence%7CAI+boom%7CArtificial+intelligence+in+video+games%7COpenAI%7CAI+slop&ppprop=wikibase_item&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Formal+AI
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Artificial+intelligence%7CAI+boom%7CArtificial+intelligence+in+video+games%7COpenAI%7CAI+slop&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=AI+compatibility&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=AI+compatibility
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=AI+compatibility
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=AI+compatibility
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=AI+compatibility
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=AI+compatibility&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Samsung+Galaxy+Z+Flip+6%7CMojo+%28programming+language%29%7CHuman-AI+interaction%7CArtificial+intelligence+content+detection%7CSurface+Pro+%2811th+generation%29&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Samsung+Galaxy+Z+Flip+6%7CMojo+%28programming+language%29%7CHuman-AI+interaction%7CArtificial+intelligence+content+detection%7CSurface+Pro+%2811th+generation%29&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=compatibility+hooks&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=compatibility+hooks
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=compatibility+hooks
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=compatibility+hooks
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=compatibility+hooks
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=compatibility+hooks&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=React+%28software%29%7CL%7CLibhybris%7CMake+Compatible%7CCrampon&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=React+%28software%29%7CL%7CLibhybris%7CMake+Compatible%7CCrampon&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=formalization+translation&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=formalization+translation
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=formalization+translation
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=formalization+translation
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=formalization+translation
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=formalization+translation&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Logic+translation%7CFormalization%7CImplementation+of+mathematics+in+set+theory%7CAlgorithm%7CFormal+ethics&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Logic+translation%7CFormalization%7CImplementation+of+mathematics+in+set+theory%7CAlgorithm%7CFormal+ethics&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=naturalization%2Fdeformalization+aliases&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=naturalization%2Fdeformalization+aliases
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=naturalization%2Fdeformalization+aliases
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=naturalization%2Fdeformalization+aliases
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=naturalization%2Fdeformalization+aliases&srlimit=5&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=naturalization%2Fdeformalization+aliases
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=aliases+deterministic&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=aliases+deterministic
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=aliases+deterministic
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=aliases+deterministic
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=aliases+deterministic&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Free+Java+implementations%7CURL+redirection%7CEnterprise+master+patient+index%7CSpatiotemporal+reservoir+resampling%7CLinear-feedback+shift+register&ppprop=wikibase_item&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=aliases+deterministic
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Free+Java+implementations%7CURL+redirection%7CEnterprise+master+patient+index%7CSpatiotemporal+reservoir+resampling%7CLinear-feedback+shift+register&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=deterministic+linguistic&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=deterministic+linguistic
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=deterministic+linguistic
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=deterministic+linguistic
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=deterministic+linguistic
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=deterministic+linguistic&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Linguistic+relativity%7CDeterminism%7CLinguistic+determinism%7CDeterminism+%28disambiguation%29%7CProposition&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Linguistic+relativity%7CDeterminism%7CLinguistic+determinism%7CDeterminism+%28disambiguation%29%7CProposition&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=linguistic+CST%2FAST&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=linguistic+CST%2FAST
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=linguistic+CST%2FAST
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=linguistic+CST%2FAST
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=linguistic+CST%2FAST
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=linguistic+CST%2FAST&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Middle+Persian%7CList+of+glossing+abbreviations%7C2017+Conservative+Party+of+Canada+leadership+election%7CInuit+Nunangat&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Middle+Persian%7CList+of+glossing+abbreviations%7C2017+Conservative+Party+of+Canada+leadership+election%7CInuit+Nunangat&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=CST%2FAST+metadata&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=CST%2FAST+metadata
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=CST%2FAST+metadata
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=CST%2FAST+metadata
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=CST%2FAST+metadata
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=CST%2FAST+metadata&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Hurricane+Dean&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Hurricane+Dean&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=AI+prompt&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=AI+prompt
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=AI+prompt
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=AI+prompt
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=AI+prompt&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Prompt+engineering%7CPrompt+injection%7CStable+Diffusion%7CGrok+%28chatbot%29%7CCrungus&ppprop=wikibase_item&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=AI+prompt
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Prompt+engineering%7CPrompt+injection%7CStable+Diffusion%7CGrok+%28chatbot%29%7CCrungus&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=prompt+translation&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=prompt+translation
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=prompt+translation
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=prompt+translation
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=prompt+translation
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=prompt+translation&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Prompt+engineering%7CPrompt+injection%7CMachine+translation%7CLost+in+Translation+%28film%29%7CNeural+machine+translation&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Prompt+engineering%7CPrompt+injection%7CMachine+translation%7CLost+in+Translation+%28film%29%7CNeural+machine+translation&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=translation+helpers&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=translation+helpers
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=translation+helpers
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=translation+helpers
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=translation+helpers
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=translation+helpers&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Google+Translate%7CTranslation%7CMachine+translation%7CLost+in+Translation+%28film%29%7CTranslation+studies&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Google+Translate%7CTranslation%7CMachine+translation%7CLost+in+Translation+%28film%29%7CTranslation+studies&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=helpers+backed&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=helpers+backed
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=helpers+backed
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=helpers+backed
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=helpers+backed
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=helpers+backed&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=The+Helpers%7CHelp%21%7CSend+Help%7CBasilica+of+the+Fourteen+Holy+Helpers%7CDefender+%28association+football%29&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=The+Helpers%7CHelp%21%7CSend+Help%7CBasilica+of+the+Fourteen+Holy+Helpers%7CDefender+%28association+football%29&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=pinned+upstream&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=pinned+upstream
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=pinned+upstream
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=pinned+upstream&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Rivi%C3%A8re+des+Pins+%28Nicolet+River+tributary%29%7CAmy+Seimetz%7CUSB+hardware%7CRivi%C3%A8re+au+Pin%7CPCI+Express&ppprop=wikibase_item&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=pinned+upstream
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=pinned+upstream
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Rivi%C3%A8re+des+Pins+%28Nicolet+River+tributary%29%7CAmy+Seimetz%7CUSB+hardware%7CRivi%C3%A8re+au+Pin%7CPCI+Express&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=upstream+test&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=upstream+test
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=upstream+test
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=upstream+test
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=upstream+test
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=upstream+test&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Upstream+%28petroleum+industry%29%7CRandom+number+generator+attack%7CUpstream+PH%7CRiver+Test%7CShane+Carruth&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Upstream+%28petroleum+industry%29%7CRandom+number+generator+attack%7CUpstream+PH%7CRiver+Test%7CShane+Carruth&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=test+corpus&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=test+corpus
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=test+corpus
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=test+corpus
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=test+corpus
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=test+corpus&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Text+corpus%7CCorpus+callosum%7CHabeas+corpus%7CCanterbury+corpus%7CLossless+compression&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Text+corpus%7CCorpus+callosum%7CHabeas+corpus%7CCanterbury+corpus%7CLossless+compression&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Also+enforce&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Also+enforce
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Also+enforce
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Also+enforce
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Also+enforce
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Also+enforce&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Code+enforcement%7CStyle+guide%7CEnforcer%7CUnited+States+antitrust+law%7CCompetition+regulator&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Code+enforcement%7CStyle+guide%7CEnforcer%7CUnited+States+antitrust+law%7CCompetition+regulator&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=1500-line+architecture&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=1500-line+architecture
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=1500-line+architecture
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=1500-line+architecture
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=1500-line+architecture&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Timurid+architecture%7CChevrolet+Silverado%7CChevrolet+Express%7CMughal+architecture%7CHigh+Renaissance&ppprop=wikibase_item&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=1500-line+architecture
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Timurid+architecture%7CChevrolet+Silverado%7CChevrolet+Express%7CMughal+architecture%7CHigh+Renaissance&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=architecture+limit&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=architecture+limit
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=architecture+limit
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=architecture+limit
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=architecture+limit
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=architecture+limit&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Architecture%7CX86-64%7C3+GB+barrier%7CRAM+limit%7CBlackwell+%28microarchitecture%29&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Architecture%7CX86-64%7C3+GB+barrier%7CRAM+limit%7CBlackwell+%28microarchitecture%29&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=tracked+Rust&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=tracked+Rust
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=tracked+Rust
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=tracked+Rust
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=tracked+Rust
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=tracked+Rust&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Rust+%28programming+language%29%7CMathias+Rust%7CBreaking+Rust%7COctober+Rust%7CRust+%28video+game%29&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Rust+%28programming+language%29%7CMathias+Rust%7CBreaking+Rust%7COctober+Rust%7CRust+%28video+game%29&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Rust+JavaScript&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Rust+JavaScript
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Rust+JavaScript
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Rust+JavaScript
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Rust+JavaScript
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Rust+JavaScript&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Safe+navigation+operator%7CList+of+JavaScript+engines%7CV8+%28JavaScript+engine%29%7CJavaScript%7CDeno+%28software%29&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Safe+navigation+operator%7CList+of+JavaScript+engines%7CV8+%28JavaScript+engine%29%7CJavaScript%7CDeno+%28software%29&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Markdown+files&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Markdown+files
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Markdown+files
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Markdown+files
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Markdown+files
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Markdown+files&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Markdown%7CObsidian+%28software%29%7CZettlr%7CRStudio%7CMermaid+%28software%29&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Markdown%7CObsidian+%28software%29%7CZettlr%7CRStudio%7CMermaid+%28software%29&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=case-study+research&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=case-study+research
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=case-study+research
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=case-study+research
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=case-study+research
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=case-study+research&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Case+study%7CEmbedded+case+study%7CResearch+design%7CCase+study+%28psychology%29%7CCase+Study+Houses&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Case+study%7CEmbedded+case+study%7CResearch+design%7CCase+study+%28psychology%29%7CCase+Study+Houses&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=research+artifacts&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=research+artifacts
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=research+artifacts
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=research+artifacts
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=research+artifacts
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=research+artifacts&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Methodology%7COut-of-place+artifact%7CJulio+Palmaz%7CDigital+artifact%7CDesign+science+%28methodology%29&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Methodology%7COut-of-place+artifact%7CJulio+Palmaz%7CDigital+artifact%7CDesign+science+%28methodology%29&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=artifacts+excluded&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=artifacts+excluded
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=artifacts+excluded
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=artifacts+excluded
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=artifacts+excluded
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=artifacts+excluded&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Out-of-place+artifact%7CList+of+biblical+figures+identified+in+extra-biblical+sources%7CList+of+The+Weekly+with+Charlie+Pickering+episodes%7CPurinosome%7CArchives+and+Artifacts&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Out-of-place+artifact%7CList+of+biblical+figures+identified+in+extra-biblical+sources%7CList+of+The+Weekly+with+Charlie+Pickering+episodes%7CPurinosome%7CArchives+and+Artifacts&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Add+Formal+AI&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Add+Formal+AI
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Add+Formal+AI
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Add+Formal+AI
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Add+Formal+AI&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Artificial+intelligence%7COpenAI%7CHistory+of+artificial+intelligence%7CSora+%28text-to-video+model%29%7CVibe+coding&ppprop=wikibase_item&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Add+Formal+AI
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Artificial+intelligence%7COpenAI%7CHistory+of+artificial+intelligence%7CSora+%28text-to-video+model%29%7CVibe+coding&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Formal+AI+compatibility&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Formal+AI+compatibility
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Formal+AI+compatibility
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Formal+AI+compatibility
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Formal+AI+compatibility
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Formal+AI+compatibility&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=USB4%7CArtificial+intelligence+engineering%7CArtificial+intelligence+content+detection%7CPOSIX%7CVerisimilitude&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=USB4%7CArtificial+intelligence+engineering%7CArtificial+intelligence+content+detection%7CPOSIX%7CVerisimilitude&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=AI+compatibility+hooks&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=AI+compatibility+hooks
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=AI+compatibility+hooks
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=AI+compatibility+hooks
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=AI+compatibility+hooks
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=AI+compatibility+hooks&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=React+%28software%29%7CLakeFS%7CA%7CList+of+collaborative+software%7CIWI+Negev&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=React+%28software%29%7CLakeFS%7CA%7CList+of+collaborative+software%7CIWI+Negev&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=hooks+for+formalization&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=hooks+for+formalization
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=hooks+for+formalization
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=hooks+for+formalization
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=hooks+for+formalization
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=hooks+for+formalization&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Rug+hooking%7CArm+wrestling%7CDialectic%7CList+of+Brazilian+jiu-jitsu+techniques%7CAchaemenid+Empire&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Rug+hooking%7CArm+wrestling%7CDialectic%7CList+of+Brazilian+jiu-jitsu+techniques%7CAchaemenid+Empire&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=translation+and+naturalization%2Fdeformalization&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=translation+and+naturalization%2Fdeformalization
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=translation+and+naturalization%2Fdeformalization
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=translation+and+naturalization%2Fdeformalization
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=translation+and+naturalization%2Fdeformalization
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=translation+and+naturalization%2Fdeformalization&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=naturalization%2Fdeformalization+aliases+deterministic&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=naturalization%2Fdeformalization+aliases+deterministic
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=naturalization%2Fdeformalization+aliases+deterministic
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=naturalization%2Fdeformalization+aliases+deterministic
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=naturalization%2Fdeformalization+aliases+deterministic&srlimit=5&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=naturalization%2Fdeformalization+aliases+deterministic
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=aliases+deterministic+linguistic&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=aliases+deterministic+linguistic
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=aliases+deterministic+linguistic
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=aliases+deterministic+linguistic
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=aliases+deterministic+linguistic
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=aliases+deterministic+linguistic&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Memoization%7CControl+flow&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Memoization%7CControl+flow&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=deterministic+linguistic+CST%2FAST&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=deterministic+linguistic+CST%2FAST
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=deterministic+linguistic+CST%2FAST
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=deterministic+linguistic+CST%2FAST
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=deterministic+linguistic+CST%2FAST
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=deterministic+linguistic+CST%2FAST&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=linguistic+CST%2FAST+metadata&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=linguistic+CST%2FAST+metadata
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=linguistic+CST%2FAST+metadata
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=linguistic+CST%2FAST+metadata
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=linguistic+CST%2FAST+metadata
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=linguistic+CST%2FAST+metadata&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=metadata+and+Formal&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=metadata+and+Formal
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=metadata+and+Formal
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=metadata+and+Formal
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=metadata+and+Formal
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=metadata+and+Formal&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Metadata%7CRDFa%7CDublin+Core%7CMetadata+registry%7CGeospatial+metadata&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Metadata%7CRDFa%7CDublin+Core%7CMetadata+registry%7CGeospatial+metadata&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Formal+AI+prompt&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Formal+AI+prompt
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Formal+AI+prompt
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=Formal+AI+prompt
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Formal+AI+prompt&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Prompt+engineering%7CAI+slop%7CArtificial+intelligence%7CAI+boom%7CVibe+coding&ppprop=wikibase_item&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=Formal+AI+prompt
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Prompt+engineering%7CAI+slop%7CArtificial+intelligence%7CAI+boom%7CVibe+coding&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=AI+prompt+translation&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=AI+prompt+translation
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=AI+prompt+translation
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=AI+prompt+translation
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=AI+prompt+translation
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=AI+prompt+translation&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Prompt+injection%7CPrompt+engineering%7COpenAI+Codex+%28language+model%29%7CStable+Diffusion%7CKling+AI&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Prompt+injection%7CPrompt+engineering%7COpenAI+Codex+%28language+model%29%7CStable+Diffusion%7CKling+AI&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=prompt+translation+helpers&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=prompt+translation+helpers
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=prompt+translation+helpers
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=prompt+translation+helpers
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=prompt+translation+helpers
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=prompt+translation+helpers&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Prompt+injection%7CPrompt+engineering%7CMachine+translation%7CLost+in+Translation+%28film%29%7CCan+This+Love+Be+Translated%3F&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Prompt+injection%7CPrompt+engineering%7CMachine+translation%7CLost+in+Translation+%28film%29%7CCan+This+Love+Be+Translated%3F&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=translation+helpers+backed&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=translation+helpers+backed
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=translation+helpers+backed
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=translation+helpers+backed
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=translation+helpers+backed
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=translation+helpers+backed&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Translation%7CGoogle+Translate%7CLost+in+Translation+%28film%29%7CMachine+translation%7CCan+This+Love+Be+Translated%3F&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Translation%7CGoogle+Translate%7CLost+in+Translation+%28film%29%7CMachine+translation%7CCan+This+Love+Be+Translated%3F&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=pinned+upstream+test&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=pinned+upstream+test
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=pinned+upstream+test
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=pinned+upstream+test
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=pinned+upstream+test
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=pinned+upstream+test&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=USB+hardware%7CMobile+High-Definition+Link%7CStage+pin+connector%7CUSB-C%7CPCI+Express&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=USB+hardware%7CMobile+High-Definition+Link%7CStage+pin+connector%7CUSB-C%7CPCI+Express&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=upstream+test+corpus&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=upstream+test+corpus
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=upstream+test+corpus
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=upstream+test+corpus
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=upstream+test+corpus&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Harbor+Bridge+Project%7CAmerican+Fuzzy+Lop+%28software%29%7CAcrocallosal+syndrome%7CFoundation+model%7CAnne+McDonald&ppprop=wikibase_item&origin=*
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=upstream+test+corpus
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Harbor+Bridge+Project%7CAmerican+Fuzzy+Lop+%28software%29%7CAcrocallosal+syndrome%7CFoundation+model%7CAnne+McDonald&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=enforce+the+1500-line&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=enforce+the+1500-line
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=enforce+the+1500-line
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=enforce+the+1500-line
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=enforce+the+1500-line
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=enforce+the+1500-line&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Howa+1500%7CChevrolet+Silverado%7CModel+500+telephone%7CWar+of+the+Katzenelnbogen+Succession%7CList+of+law+enforcement+agencies+in+Canada&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Howa+1500%7CChevrolet+Silverado%7CModel+500+telephone%7CWar+of+the+Katzenelnbogen+Succession%7CList+of+law+enforcement+agencies+in+Canada&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=1500-line+architecture+limit&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=1500-line+architecture+limit
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=1500-line+architecture+limit
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=1500-line+architecture+limit
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=1500-line+architecture+limit
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=1500-line+architecture+limit&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Piranhas%2C+Alagoas%7CCircle+of+confusion%7CArchitecture+of+Scotland%7CKorean+architecture%7CRDNA+3&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Piranhas%2C+Alagoas%7CCircle+of+confusion%7CArchitecture+of+Scotland%7CKorean+architecture%7CRDNA+3&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=limit+for+tracked&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=limit+for+tracked
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=limit+for+tracked
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=limit+for+tracked
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=limit+for+tracked
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=limit+for+tracked&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Rail+speed+limits+in+the+United+States%7CFast+Track%3A+No+Limits%7CIdentifier+for+Advertisers%7CRailway+track%7CNo+Limits&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Rail+speed+limits+in+the+United+States%7CFast+Track%3A+No+Limits%7CIdentifier+for+Advertisers%7CRailway+track%7CNo+Limits&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=tracked+Rust+JavaScript&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=tracked+Rust+JavaScript
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=tracked+Rust+JavaScript
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=tracked+Rust+JavaScript
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=tracked+Rust+JavaScript
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=tracked+Rust+JavaScript&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Rust+%28programming+language%29%7CList+of+tools+for+static+code+analysis%7CNext.js%7CEntry+point%7CNull+coalescing+operator&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Rust+%28programming+language%29%7CList+of+tools+for+static+code+analysis%7CNext.js%7CEntry+point%7CNull+coalescing+operator&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=JavaScript+and+Markdown&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=JavaScript+and+Markdown
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=JavaScript+and+Markdown
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=JavaScript+and+Markdown
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=JavaScript+and+Markdown
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=JavaScript+and+Markdown&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Gatsby+%28software%29%7CMermaid+%28software%29%7CRStudio%7CCoffeeScript%7CStatic+web+page&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Gatsby+%28software%29%7CMermaid+%28software%29%7CRStudio%7CCoffeeScript%7CStatic+web+page&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=files+with+case-study&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=files+with+case-study
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=files+with+case-study
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=files+with+case-study
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=files+with+case-study
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=files+with+case-study&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Epstein+files%7CUnited+States+UFO+files%7CList+of+people+named+in+the+Epstein+files%7CThe+X-Files%7CMetallica+v.+Napster%2C+Inc.&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Epstein+files%7CUnited+States+UFO+files%7CList+of+people+named+in+the+Epstein+files%7CThe+X-Files%7CMetallica+v.+Napster%2C+Inc.&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=case-study+research+artifacts&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=case-study+research+artifacts
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=case-study+research+artifacts
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=case-study+research+artifacts
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=case-study+research+artifacts
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=case-study+research+artifacts&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Embedded+case+study%7CMethodology%7CHungry+judge+effect%7CArtifact+%28archaeology%29%7COut-of-place+artifact&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Embedded+case+study%7CMethodology%7CHungry+judge+effect%7CArtifact+%28archaeology%29%7COut-of-place+artifact&ppprop=wikibase_item&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=research+artifacts+excluded&srlimit=5&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=research+artifacts+excluded
API request: GET https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=research+artifacts+excluded
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=property&limit=5&search=research+artifacts+excluded
API response: 200 https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&origin=*&type=item&limit=5&search=research+artifacts+excluded
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=research+artifacts+excluded&srlimit=5&origin=*
API request: GET https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Out-of-place+artifact%7CList+of+biblical+figures+identified+in+extra-biblical+sources%7CKomani-Kruja+culture%7CKetef+Hinnom+scrolls%7CHawthorne+effect&ppprop=wikibase_item&origin=*
API response: 200 https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&titles=Out-of-place+artifact%7CList+of+biblical+figures+identified+in+extra-biblical+sources%7CKomani-Kruja+culture%7CKetef+Hinnom+scrolls%7CHawthorne+effect&ppprop=wikibase_item&origin=*
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q208027&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q40689&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q96184770&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q18331021&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q415670&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q5469988&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q23899718&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q7553&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q15782423&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q81983931&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q180160&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q117217619&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q108941486&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q139300090&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q106205074&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q123401820&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q97959764&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q914732&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q16828062&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q76209946&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q52063690&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q104857229&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q12271&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q65679590&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q15304961&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q575650&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q184197&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q2005&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q783866&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1193600&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q107380638&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q37287968&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q139722971&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q155207&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q111717306&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q4801012&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q122364077&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q80855238&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q23899718&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q123401820&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q108941486&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q914732&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q5469988&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q81983931&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q18331021&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q96184770&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q107380638&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q106205074&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q16828062&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q76209946&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q117217619&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q208027&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q97959764&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q40689&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q15782423&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q139300090&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q52063690&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q783866&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q155207&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q415670&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1193600&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q80855238&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q139722971&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q37287968&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q104857229&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q65679590&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q7553&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q111717306&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q180160&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q4801012&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q15304961&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q2005&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q184197&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q122364077&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q575650&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q12271&languages=en&origin=*&props=labels%7Caliases%7Cdescriptions%7Cclaims%7Csitelinks&sitefilter=enwiki
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q42032&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q42032&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q202444&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q202444&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q4393498&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q4393498&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q4671286&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q4671286&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q12737077&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q12737077&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q2207288&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q2207288&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q7406919&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q7406919&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q110452794&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q110452794&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1875737&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1875737&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1066689&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1066689&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q65757353&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q65757353&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q484344&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q484344&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q658349&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q658349&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q59157145&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q59157145&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q190087&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q190087&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q59157859&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q59157859&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q16686448&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q16686448&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q59139053&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q59139053&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q925783&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q925783&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1079196&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1079196&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q759676&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q759676&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q2695280&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q2695280&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q627436&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q627436&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q110484020&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q110484020&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q80006&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q80006&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q189210&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q189210&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q21191270&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q21191270&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1697305&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1697305&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q2995443&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q2995443&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q56862961&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q56862961&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1323572&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1323572&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q2742167&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q2742167&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q10929058&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q10929058&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q216640&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q216640&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q3231690&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q3231690&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q3962&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q3962&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q56055944&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q56055944&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1047113&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1047113&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q2267705&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q2267705&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q82604&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q82604&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q89358787&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q89358787&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q113129241&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q113129241&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q114436249&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q114436249&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q226730&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q226730&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q343568&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q343568&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q21030988&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q21030988&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q4282636&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q4282636&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q9143&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q9143&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q3839507&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q3839507&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q12772052&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q12772052&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q21562092&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q21562092&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q4117397&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q4117397&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q506883&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q506883&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q651794&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q651794&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q721849&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q721849&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q187432&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q187432&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q28920810&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q28920810&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q28920813&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q28920813&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q241317&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q241317&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1993334&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1993334&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q28923017&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q28923017&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q211496&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q211496&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q180868&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q180868&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1051282&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1051282&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q193076&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q193076&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q275596&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q275596&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q30267&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q30267&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1135914&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1135914&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q188860&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q188860&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1028939&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1028939&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q336705&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q336705&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q29642950&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q29642950&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q571&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q571&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q46857&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q46857&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q78088984&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q78088984&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1568346&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q1568346&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q193946&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q193946&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q185698&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q185698&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q118563234&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q118563234&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q3331189&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q3331189&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q11401&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q11401&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q270948&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q270948&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q23916&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q23916&languages=en&origin=*&props=labels%7Cclaims
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q47461344&languages=en&origin=*&props=labels%7Cclaims
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q47461344&languages=en&origin=*&props=labels%7Cclaims
Formalization: 44 phrases
semantic-meta-language: step-975
Phrase: Add -> Добавьте (translated)
Phrase: Formal -> Formal (non-wikidata-source)
Phrase: compatibility -> compatibility (non-wikidata-source)
Phrase: for -> для (translated)
Phrase: and -> и (translated)
Phrase: naturalization/deformalization -> naturalization/deformalization (non-wikidata-source)
Phrase: deterministic -> deterministic (non-wikidata-source)
Phrase: linguistic -> linguistic (non-wikidata-source)
Phrase: CST/AST -> CST/AST (non-wikidata-source)
Phrase: and -> и (translated)
Phrase: Formal -> Formal (non-wikidata-source)
Phrase: backed -> backed (non-wikidata-source)
Phrase: by -> by (non-wikidata-source)
Phrase: the -> the (non-wikidata-source)
Phrase: upstream -> upstream (non-wikidata-source)
Phrase: Also -> Также (translated)
Phrase: enforce -> enforce (non-wikidata-source)
Phrase: the -> the (non-wikidata-source)
Phrase: limit -> limit (non-wikidata-source)
Phrase: for -> для (translated)
Phrase: and -> и (translated)
Phrase: with -> с (translated)
API request: GET https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q208027%7CQ18331021%7CQ5469988%7CQ7553%7CQ15782423%7CQ180160%7CQ117217619%7CQ106205074%7CQ97959764%7CQ914732%7CQ16828062%7CQ76209946%7CQ12271%7CQ65679590%7CQ15304961%7CQ2005%7CQ1193600%7CQ37287968%7CQ139722971%7CQ4801012%7CQ80855238&languages=ru&origin=*&props=labels%7Cdescriptions%7Csitelinks&sitefilter=ruwiki
API response: 200 https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q208027%7CQ18331021%7CQ5469988%7CQ7553%7CQ15782423%7CQ180160%7CQ117217619%7CQ106205074%7CQ97959764%7CQ914732%7CQ16828062%7CQ76209946%7CQ12271%7CQ65679590%7CQ15304961%7CQ2005%7CQ1193600%7CQ37287968%7CQ139722971%7CQ4801012%7CQ80855238&languages=ru&origin=*&props=labels%7Cdescriptions%7Csitelinks&sitefilter=ruwiki
Phrase: AI -> AI (translated)
Phrase: hooks -> hooks (missing-target-label)
Phrase: formalization -> формализация (translated)
Phrase: translation -> перевод (translated)
Phrase: translation -> перевод (translated)
Phrase: aliases -> aliases (missing-target-label)
Phrase: metadata -> метаданные (translated)
Phrase: AI prompt -> ИИ-промпт (translated)
Phrase: helpers -> helpers (missing-target-label)
Phrase: pinned -> pinned (missing-target-label)
Phrase: test -> .test (translated)
Phrase: corpus -> corpus (missing-target-label)
Phrase: 1500-line -> 1500-line (missing-target-label)
Phrase: architecture -> архитектура (translated)
Phrase: tracked -> tracked (missing-target-label)
Phrase: Rust -> Rust (missing-target-label)
Phrase: JavaScript -> JavaScript (missing-target-label)
Phrase: Markdown -> Markdown (missing-target-label)
Phrase: files -> files (missing-target-label)
Phrase: case-study research -> case-study research (missing-target-label)
Phrase: artifacts -> artifacts (missing-target-label)
Phrase: excluded -> excluded (missing-target-label)
Rule: english-article-omission (sentence-1)
Rule: source-interior-punctuation-preserved (sentence-1)
Sentence: Add Formal AI compatibility hooks for formalization, translation, and naturalization/deformalization aliases, deterministic linguistic CST/AST metadata, and Formal AI prompt translation helpers backed by the pinned upstream test corpus. -> Добавьте Formal AI compatibility hooks для формализация, перевод, и naturalization/deformalization aliases, deterministic linguistic CST/AST метаданные, и Formal ИИ-промпт перевод helpers backed by pinned upstream .test corpus.
Rule: english-article-omission (sentence-2)
Rule: source-interior-punctuation-preserved (sentence-2)
Sentence: Also enforce the 1500-line architecture limit for tracked Rust, JavaScript, and Markdown files, with case-study research artifacts excluded. -> Также enforce 1500-line архитектура limit для tracked Rust, JavaScript, и Markdown files, с case-study research artifacts excluded.
Text: Добавьте Formal AI compatibility hooks для формализация, перевод, и naturalization/deformalization aliases, deterministic linguistic CST/AST метаданные, и Formal ИИ-промпт перевод helpers backed by pinned upstream .test corpus. Также enforce 1500-line архитектура limit для tracked Rust, JavaScript, и Markdown files, с case-study research artifacts excluded.
```
