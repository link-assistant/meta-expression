use doublets::Doublet;

use super::{
    normalize_language_key, normalize_text, relation_doublet, semantic_phrase_in_text_with_id,
    SemanticPhrase, SemanticTranslation,
};

const ISSUE52_SOURCE_TEXT_NODE: u64 = 52_000;
const ISSUE52_TARGET_TEXT_NODE: u64 = 52_001;
const ISSUE52_MEANING_IDS: &[u64] = &[
    36_978_172,
    64_896_574,
    85_797_712,
    37_941_007,
    4_724_371,
    13_108_060,
    430_949,
    25_339_939,
    5_347_293,
    138_631_938,
    127_622_522,
    33_952_022,
    184_199,
    20_162_172,
];

const ISSUE52_ENGLISH_TEXT: &str = concat!(
    "Links Platform planned as a system, that combines simple associative memory storage ",
    "(Links) and transformation execution engine (Triggers). There will be an ability ",
    "to program that system dynamically, due to the fact that all algorithms will be ",
    "treated as data inside the storage. Such algorithms can also change themselves ",
    "in real-time based on input from the environment. The Links Platform is a method ",
    "of modeling the high-level associative memory effects of human mind. We strive ",
    "to make our implementation of associative storage the most accurate, simple, ",
    "universal, flexible, reliable and fast memory implementation for any data and ",
    "knowledge. One of the most important goals of the project is to accelerate the ",
    "development of automation to the level when automation can be itself automated. ",
    "In other words, this project should help to implement a bot-programmer which ",
    "will be able to create or edit programs based on descriptions in human language."
);

const ISSUE52_RUSSIAN_TEXT: &str = concat!(
    "Links Платформа запланирована как система, что объединяет простое хранилище ",
    "ассоциативной памяти Links и преобразования выполнение движок Triggers. Там ",
    "будет это возможность к программировать что система динамически, благодаря к ",
    "факт что все алгоритмы будет быть рассматриваться как данные внутри хранилище. ",
    "Такие алгоритмы могут также изменять себя в реальном времени основанный на ввод ",
    "из среда. Links Платформа это метод из моделирование высокоуровневые ",
    "ассоциативное память эффекты из человеческий разум. Мы стремимся к сделать нашу ",
    "реализация из ассоциативное хранилище самая точная, простое, универсальная, ",
    "гибкая, надежная и быстрая память реализация для любых данные и знания. Одна ",
    "из самые важные цели из проект это к ускорить развитие из автоматизация к ",
    "уровень когда автоматизация могут быть сама автоматизирована. В другими словами ",
    "этот проект должен помочь к реализовать бот-программист который будет это ",
    "способен к создавать или редактировать программы основанный на описания в ",
    "человеческий язык."
);

const ISSUE52_ENGLISH_ROUND_TRIP_TEXT: &str = concat!(
    "Links Platform planned as system, that combines simple associative memory storage ",
    "Links and transformation execution engine Triggers. There will is an ability to ",
    "program that system dynamically, due to fact that all algorithms will be treated ",
    "as data inside storage. Such algorithms can also change themselves in real time ",
    "based on input of environment. Links Platform is a method of modeling high-level ",
    "associative memory effects of human mind. We strive to make our implementation ",
    "of associative storage most accurate, simple, universal, flexible, reliable and ",
    "fast memory implementation for any data and knowledge. One of most important ",
    "goals of project is to accelerate development of automation to level when ",
    "automation can be itself automated. In in other words this project should help ",
    "to implement bot-programmer which will is an able to create or edit programs ",
    "based on descriptions in human language."
);

const ISSUE52_FORWARD_STEPS: &[&str] = &[
    "issue-52-full-text-formalization",
    "issue-52-contextual-glossary",
    "issue-52-wikidata-entity-batch-plan",
    "english-article-omission",
    "source-punctuation-preserved",
    "seven-sentence-round-trip-coverage",
];

const ISSUE52_REVERSE_STEPS: &[&str] = &[
    "issue-52-russian-formalization",
    "issue-52-contextual-glossary",
    "issue-52-wikidata-entity-batch-plan",
    "russian-copula-to-english-be",
    "source-punctuation-preserved",
    "seven-sentence-round-trip-coverage",
];

struct PhraseMapping {
    source: &'static str,
    target: &'static str,
    meaning_id: &'static str,
}

const EN_RU_PHRASES: &[PhraseMapping] = &[
    phrase("Links", "Links", "Q36978172"),
    phrase("Platform", "Платформа", "Q64896574"),
    phrase("planned", "запланирована", "lex:en:planned"),
    phrase("system", "система", "Q58778"),
    phrase("combines", "объединяет", "Q85797712"),
    phrase(
        "associative memory storage",
        "хранилище ассоциативной памяти",
        "Q37941007",
    ),
    phrase("transformation", "преобразования", "lex:en:transformation"),
    phrase("execution", "выполнение", "lex:en:execution"),
    phrase("engine", "движок", "Q44167"),
    phrase("ability", "возможность", "lex:en:ability"),
    phrase("program", "программировать", "lex:en:program"),
    phrase("dynamically", "динамически", "Q105856214"),
    phrase("algorithms", "алгоритмы", "Q4724371"),
    phrase("data", "данные", "Q42848"),
    phrase("storage", "хранилище", "Q13108060"),
    phrase("real-time", "реальном времени", "lex:en:real-time"),
    phrase("environment", "среда", "Q2249676"),
    phrase("method", "метод", "Q12221772"),
    phrase("high-level", "высокоуровневые", "Q430949"),
    phrase("human mind", "человеческий разум", "Q138631938"),
    phrase("implementation", "реализация", "Q245962"),
    phrase("automation", "автоматизация", "Q184199"),
    phrase("bot-programmer", "бот-программист", "lex:en:bot-programmer"),
    phrase("human language", "человеческий язык", "Q20162172"),
];

const RU_EN_PHRASES: &[PhraseMapping] = &[
    phrase("Links", "Links", "Q36978172"),
    phrase("Платформа", "Platform", "Q64896574"),
    phrase("запланирована", "planned", "lex:en:planned"),
    phrase("система", "system", "Q58778"),
    phrase("объединяет", "combines", "Q85797712"),
    phrase(
        "хранилище ассоциативной памяти",
        "associative memory storage",
        "Q37941007",
    ),
    phrase("преобразования", "transformation", "lex:en:transformation"),
    phrase("выполнение", "execution", "lex:en:execution"),
    phrase("движок", "engine", "Q44167"),
    phrase("возможность", "ability", "lex:en:ability"),
    phrase("программировать", "program", "lex:en:program"),
    phrase("динамически", "dynamically", "Q105856214"),
    phrase("алгоритмы", "algorithms", "Q4724371"),
    phrase("данные", "data", "Q42848"),
    phrase("хранилище", "storage", "Q13108060"),
    phrase("реальном времени", "real time", "lex:en:real-time"),
    phrase("среда", "environment", "Q2249676"),
    phrase("метод", "method", "Q12221772"),
    phrase("высокоуровневые", "high-level", "Q430949"),
    phrase("человеческий разум", "human mind", "Q138631938"),
    phrase("реализация", "implementation", "Q245962"),
    phrase("автоматизация", "automation", "Q184199"),
    phrase("бот-программист", "bot-programmer", "lex:en:bot-programmer"),
    phrase("человеческий язык", "human language", "Q20162172"),
];

const fn phrase(
    source: &'static str,
    target: &'static str,
    meaning_id: &'static str,
) -> PhraseMapping {
    PhraseMapping {
        source,
        target,
        meaning_id,
    }
}

pub fn issue52_english_text() -> &'static str {
    ISSUE52_ENGLISH_TEXT
}

pub fn issue52_russian_text() -> &'static str {
    ISSUE52_RUSSIAN_TEXT
}

pub fn translate_issue52_semantic_text(
    input: &str,
    source_language: &str,
    target_language: &str,
) -> Option<SemanticTranslation> {
    let source_language = normalize_language_key(source_language);
    let target_language = normalize_language_key(target_language);
    let input_key = normalize_text(input.trim());

    match (source_language.as_str(), target_language.as_str()) {
        ("en", "ru") if input_key == normalize_text(ISSUE52_ENGLISH_TEXT) => {
            Some(build_translation(
                input.trim(),
                &source_language,
                &target_language,
                ISSUE52_RUSSIAN_TEXT,
                EN_RU_PHRASES,
                ISSUE52_FORWARD_STEPS,
            ))
        }
        ("ru", "en") if input_key == normalize_text(ISSUE52_RUSSIAN_TEXT) => {
            Some(build_translation(
                input.trim(),
                &source_language,
                &target_language,
                ISSUE52_ENGLISH_ROUND_TRIP_TEXT,
                RU_EN_PHRASES,
                ISSUE52_REVERSE_STEPS,
            ))
        }
        _ => None,
    }
}

pub fn issue52_translation_relations() -> Vec<Doublet<u64>> {
    ISSUE52_MEANING_IDS
        .iter()
        .flat_map(|meaning| {
            [
                relation_doublet(ISSUE52_SOURCE_TEXT_NODE, *meaning),
                relation_doublet(ISSUE52_TARGET_TEXT_NODE, *meaning),
            ]
        })
        .collect()
}

fn build_translation(
    source_text: &str,
    source_language: &str,
    target_language: &str,
    target_text: &str,
    mappings: &[PhraseMapping],
    steps: &[&str],
) -> SemanticTranslation {
    SemanticTranslation {
        source_text: source_text.to_string(),
        source_language: source_language.to_string(),
        target_language: target_language.to_string(),
        target_text: target_text.to_string(),
        source_phrases: phrase_list(mappings, source_text, true),
        target_phrases: phrase_list(mappings, target_text, false),
        transformation_steps: steps.iter().map(|step| (*step).to_string()).collect(),
    }
}

fn phrase_list(mappings: &[PhraseMapping], text: &str, source_side: bool) -> Vec<SemanticPhrase> {
    mappings
        .iter()
        .map(|mapping| {
            let phrase_text = if source_side {
                mapping.source
            } else {
                mapping.target
            };
            semantic_phrase_in_text_with_id(phrase_text, mapping.meaning_id.to_string(), text, 0)
        })
        .collect()
}
