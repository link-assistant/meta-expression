At the moment `Hawaii is a state.` is formalized as `[Hawaii is a](https://en.wikipedia.org/wiki/Hawaii) [state](https://en.wikipedia.org/wiki/State).` is translated as `[Гавайи](https://ru.wikipedia.org/wiki/%D0%93%D0%B0%D0%B2%D0%B0%D0%B9%D0%B8) [State](https://ru.wikipedia.org/wiki/%D0%93%D0%BE%D1%81%D1%83%D0%B4%D0%B0%D1%80%D1%81%D1%82%D0%B2%D0%BE_(%D0%B7%D0%BD%D0%B0%D1%87%D0%B5%D0%BD%D0%B8%D1%8F)).`

It works only partially, as in Russian it should be `Гавайи это штат.`

We need to expand on test cases about our translation and formalization.

The idea for translation should use this architecture:

```
source language -- formalize -> semantic meta language
semantic meta language -- formalize -> target language
```

The semantic meta language, where each text, statement, verb/noun phrases, other phases, words and symbols are doublet links in [doublet-rs](https://github.com/linksplatform/doublets-rs)/[doublet-web](https://github.com/linksplatform/doublets-web). Semantic meta language should focus on distinct meanings, not actual words. The closest match of distinct meanings are Q and P ids from wikidata. We can also generate virtual ids for Wikipedia and Wiktionary as needed.

We can execute Rust code in wasm working, and make sure all our code available not only in JavaScript, but also in Rust.

Use all the best practices from CI/CD templates (check full file tree to compare for all GitHub workflow and CI/CD scripts file):
- https://github.com/link-foundation/js-ai-driven-development-pipeline-template
- https://github.com/link-foundation/rust-ai-driven-development-pipeline-template
We should compare all files, so we don't have more CI/CD errors in the future and reuse all the best practices from these templates.

We also need to check quality of translation by continuing the loop of `source language -> target language -> source language -> target language` until translation stabilizes or it is confirmed there is no data loss, for example if `source language -> target language -> source language` results in broken back translation, we surely do something wrong. And we need to find root cause and fix it.

We also should use popular open-source legally available datasets in the GitHub or internet, to check the quality of our translation algorithm, if needed it may include some grammar transformations to provide grammatical https://en.wikipedia.org/wiki/Agreement_(linguistics).

Also in formalization we need to have links between parts of texts, to see what refers to what in the text.

That is the answer from Google Gemini:

```
The most popular standard for translation quality validation is the WMT Test Sets (e.g., $\text{newstest}$ series) used in the annual WMT Conference on Machine Translation. These gold-standard benchmarks include multi-domain human-written references and fine-grained Multidimensional Quality Metrics (MQM) annotations. [[1](https://custom.mt/top-100-open-datasets-to-train-ai-translation-models/), [2](https://www2.statmt.org/wmt26/translation-task.html), [3](https://aclanthology.org/2022.wmt-1.3/), [4](https://www.smartling.com/blog/how-to-assess-machine-translation-quality#:~:text=The%20first%20is%20monthly%2C%20third%2Dparty%20multidimensional%20quality,severity%20of%20errors%20found%20in%20translated%20text.)]
For massive multilingual and low-resource evaluation, the FLORES-200 dataset (developed by Meta AI) serves as the primary modern alternative. [[5](https://www.emergentmind.com/topics/flores-200-benchmark-dataset#:~:text=The%20FLORES%2D200%20Benchmark%20Dataset%20is%20a%20large%2Dscale%2C,development%20for%20low%2Dresource%20and%20typologically%20diverse%20languages.), [6](https://arxiv.org/html/2401.16313v1#:~:text=FLORES%2D101%20(Goyal%20et%20al.%2C%202022)%20and%20FLORES%2D200,data%20in%20101%20and%20200%20languages%20respectively.), [7](https://arxiv.org/html/2503.04797v1#:~:text=FLORES%2D200%20represents%20one%20of%20the%20largest%20human%2Dannotated,across%20a%20wide%20range%20of%20linguistic%20families.)]
If you want to tailor validation for your use case, let me know:

• What is the target domain/industry? (e.g., technical, medical, legal, e-commerce)
• Are you looking to evaluate a specific language pair (e.g., English $\to$ German) or a global model?
• What metrics do you currently use? (e.g., COMET, BLEU, human-in-the-loop evaluation)

I can recommend the most fitting benchmark or dataset size for your workflow.

AI responses may include mistakes.

[1] https://custom.mt/top-100-open-datasets-to-train-ai-translation-models/
[2] https://www2.statmt.org/wmt26/translation-task.html
[3] https://aclanthology.org/2022.wmt-1.3/
[4] [https://www.smartling.com/blog/how-to-assess-machine-translation-quality](https://www.smartling.com/blog/how-to-assess-machine-translation-quality#:~:text=The%20first%20is%20monthly%2C%20third%2Dparty%20multidimensional%20quality,severity%20of%20errors%20found%20in%20translated%20text.)
[5] [https://www.emergentmind.com/topics/flores-200-benchmark-dataset](https://www.emergentmind.com/topics/flores-200-benchmark-dataset#:~:text=The%20FLORES%2D200%20Benchmark%20Dataset%20is%20a%20large%2Dscale%2C,development%20for%20low%2Dresource%20and%20typologically%20diverse%20languages.)
[6] [https://arxiv.org/html/2401.16313v1](https://arxiv.org/html/2401.16313v1#:~:text=FLORES%2D101%20(Goyal%20et%20al.%2C%202022)%20and%20FLORES%2D200,data%20in%20101%20and%20200%20languages%20respectively.)
[7] [https://arxiv.org/html/2503.04797v1](https://arxiv.org/html/2503.04797v1#:~:text=FLORES%2D200%20represents%20one%20of%20the%20largest%20human%2Dannotated,across%20a%20wide%20range%20of%20linguistic%20families.)
```

That is the answer from ChatGPT:

```
There isn’t a single universally dominant dataset for translation quality validation, because the field uses a combination of:

1. **Benchmark corpora** (for testing translations)
2. **Human evaluation frameworks**
3. **Automatic evaluation metrics**

But in practice, these are the closest things to “the most popular” standards:

---

## 1. WMT datasets (Workshop on Machine Translation) — the de facto benchmark

The most widely used benchmark suite in machine translation research is the [Workshop on Machine Translation](chatgpt://generic-entity?number=0) shared-task datasets. Nearly every major MT paper reports results on WMT test sets.  [oai_citation:0‡MIT Press Direct](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00683/124263/xcomet-Transparent-Machine-Translation-Evaluation?utm_source=chatgpt.com)

Examples:
- WMT14 En↔De
- WMT17
- WMT20
- WMT24

These datasets are used to:
- compare MT systems,
- validate translation quality metrics,
- train/evaluate quality estimation systems.

---

## 2. MQM annotations — the current “gold standard” for human validation

For **human translation quality validation**, the most influential framework today is:

## MQM (Multidimensional Quality Metrics)

MQM is not just a dataset — it’s a structured annotation framework where expert annotators label:
- accuracy errors,
- fluency errors,
- terminology issues,
- severity (minor/major/critical),
- exact spans of errors.

It is widely considered the modern gold standard for evaluating translation quality.  [oai_citation:1‡Google Research](https://research.google/pubs/experts-errors-and-context-a-large-scale-study-of-human-evaluation-for-machine-translation/?utm_source=chatgpt.com)

The most cited MQM-based evaluation datasets come from:
- WMT 2020–2024 MQM evaluations,
- Google MQM studies,
- Unbabel/COMET training corpora.

The landmark paper:
[Experts, Errors, and Context: A Large-Scale Study of Human Evaluation for Machine Translation](chatgpt://generic-entity?number=1)
helped establish MQM as the preferred expert evaluation methodology.  [oai_citation:2‡Google Research](https://research.google/pubs/experts-errors-and-context-a-large-scale-study-of-human-evaluation-for-machine-translation/?utm_source=chatgpt.com)

---

## 3. FLORES-200 — most popular multilingual benchmark

For multilingual translation benchmarking, the most widely adopted recent dataset is:

[FLORES-200](chatgpt://generic-entity?number=2)

It covers:
- 200+ languages,
- low-resource languages,
- standardized evaluation.

Modern LLM translation papers frequently benchmark on FLORES alongside WMT.  [oai_citation:3‡Awesome Agents](https://awesomeagents.ai/leaderboards/translation-benchmarks-leaderboard/?utm_source=chatgpt.com)

---

## 4. COMET — most popular automatic quality metric today

If by “validation” you mean *automatic scoring*, then:

[COMET](chatgpt://generic-entity?number=3)
is currently the most popular high-performing evaluation metric. It correlates better with human judgments than classic BLEU.  [oai_citation:4‡help.inten.to](https://help.inten.to/article/mt-studio-mt-quality-metrics?utm_source=chatgpt.com)

Historically:
- BLEU was the standard,
- now COMET and MetricX dominate research leaderboards.

---

## Short answer

| Purpose | Most popular |
|---|---|
| General MT benchmarking | WMT datasets |
| Human quality validation | MQM annotations |
| Multilingual benchmarking | FLORES-200 |
| Automatic scoring metric | COMET |
| Historical metric | BLEU |

So if someone says:
> “What dataset/framework is the industry standard for translation quality validation?”

the safest answer today is:

> **WMT + MQM annotations**, often evaluated with **COMET**.
```

We need to download all logs and data related about the issue to this repository, make sure we compile that data to `./docs/case-studies/issue-{id}` folder, and use it to do deep case study analysis (also make sure to search online for additional facts and data), in which we will reconstruct timeline/sequence of events, list of each and all requirements from the issue, find root causes of the each problem, and propose possible solutions and solution plans for each requirement (we should also check known existing components/libraries, that solve similar problem or can help in solutions).

If there is not enough data to find actual root cause, add debug output and verbose mode if not present, that will allow us to find root cause on next iteration.

If issue related to any other repository/project, where we can report issues on GitHub, please do so. Each issue must contain reproducible examples, workarounds and suggestions for fix the issue in code.

Please plan and execute everything in this single pull request, you have unlimited time and context, as context auto-compacts and you can continue indefinitely, until it is each and every requirement fully addressed, and everything is totally done.
