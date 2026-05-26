//! Architecture guard for issue #96 / PR #107, the Rust mirror of
//! `js/tests/integration/issue-96-no-hardcoded-translations.test.js`.
//!
//! `rust/src` must never embed a direct source<->target translation dictionary.
//! Every lexical translation is routed through the semantic interlingua: a source
//! surface form maps to a language-neutral concept id and the target form is
//! derived from `js/data/semantic-lexicon.json` at runtime. The rare offline
//! fixtures the pure Rust engine cannot fetch live (issues #35/#52) live in
//! `rust/data/reference-translations.json`, loaded only through
//! `reference_data.rs`. These tests fail loudly the moment a foreign surface form
//! is hardcoded back into the source, which is exactly how the old direct-pair
//! dictionaries crept in.
//!
//! Unlike the JavaScript guard, this one keeps *no* allowlist: every foreign
//! surface form has been relocated to data, so `rust/src` is required to hold zero
//! non-Latin letters outside comments.

use std::fs;
use std::path::{Path, PathBuf};

/// Unicode blocks for the non-Latin scripts the project translates. A direct
/// en<->ru / en<->hi / en<->zh translation table cannot exist without embedding
/// letters from one of these blocks, so their absence (outside comments) proves
/// no such table lives in the source. Ranges are numeric so this guard file stays
/// ASCII-only and never trips the very rule it enforces.
const NON_LATIN_RANGES: [(u32, u32); 5] = [
    (0x0400, 0x04ff), // Cyrillic
    (0x0900, 0x097f), // Devanagari
    (0x3040, 0x30ff), // Hiragana + Katakana
    (0x4e00, 0x9fff), // CJK unified ideographs
    (0xac00, 0xd7af), // Hangul syllables
];

fn src_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("src")
}

fn has_non_latin_letter(text: &str) -> bool {
    text.chars().any(|character| {
        let code_point = character as u32;
        NON_LATIN_RANGES
            .iter()
            .any(|(start, end)| code_point >= *start && code_point <= *end)
    })
}

/// Blank out `/* ... */` block comments, replacing every non-newline character
/// with a space so line numbers stay accurate. Mirrors the JavaScript guard's
/// block-comment pass.
fn remove_block_comments(source: &str) -> String {
    let chars: Vec<char> = source.chars().collect();
    let mut out = String::with_capacity(source.len());
    let mut index = 0;
    while index < chars.len() {
        if chars[index] == '/' && index + 1 < chars.len() && chars[index + 1] == '*' {
            out.push(' ');
            out.push(' ');
            index += 2;
            while index < chars.len()
                && !(chars[index] == '*' && index + 1 < chars.len() && chars[index + 1] == '/')
            {
                out.push(if chars[index] == '\n' { '\n' } else { ' ' });
                index += 1;
            }
            if index < chars.len() {
                out.push(' ');
                out.push(' ');
                index += 2; // consume the closing `*/`
            }
        } else {
            out.push(chars[index]);
            index += 1;
        }
    }
    out
}

/// Drop a `//` line comment (line, `///`, and `//!` doc comments) from a single
/// line, but leave a `//` preceded by `:` intact so URLs such as `https://` in
/// string literals are never mistaken for comments. Mirrors the JavaScript
/// guard's line-comment regexes.
fn strip_line_comment(line: &str) -> String {
    let chars: Vec<char> = line.chars().collect();
    let mut previous = '\0';
    for index in 0..chars.len() {
        if chars[index] == '/'
            && index + 1 < chars.len()
            && chars[index + 1] == '/'
            && previous != ':'
        {
            return chars[..index].iter().collect();
        }
        previous = chars[index];
    }
    line.to_string()
}

/// Remove comments while preserving line numbers, so the source seen by the guard
/// is code and string literals only.
fn strip_comments(source: &str) -> String {
    remove_block_comments(source)
        .lines()
        .map(strip_line_comment)
        .collect::<Vec<_>>()
        .join("\n")
}

fn list_source_files() -> Vec<String> {
    let mut names: Vec<String> = fs::read_dir(src_dir())
        .expect("rust/src must be readable")
        .filter_map(|entry| {
            let name = entry.ok()?.file_name().into_string().ok()?;
            name.ends_with(".rs").then_some(name)
        })
        .collect();
    names.sort();
    names
}

fn read_source(name: &str) -> String {
    fs::read_to_string(src_dir().join(name)).expect("source file must be readable")
}

fn non_latin_lines(source: &str) -> Vec<(usize, String)> {
    strip_comments(source)
        .lines()
        .enumerate()
        .filter(|(_, line)| has_non_latin_letter(line))
        .map(|(index, line)| (index + 1, line.trim().to_string()))
        .collect()
}

/// Source files that mention `needle` outside comments, i.e. that actually read
/// the named data file at build time rather than merely documenting it.
fn code_readers_of(needle: &str) -> Vec<String> {
    list_source_files()
        .into_iter()
        .filter(|name| strip_comments(&read_source(name)).contains(needle))
        .collect()
}

#[test]
fn keeps_the_lexical_translation_pipeline_free_of_foreign_surface_forms() {
    let mut violations = Vec::new();
    for name in list_source_files() {
        let offenders = non_latin_lines(&read_source(&name));
        if let Some((line, text)) = offenders.first() {
            violations.push(format!(
                "{name}: {} line(s) with non-Latin letters outside comments, e.g. {line}: {text}",
                offenders.len()
            ));
        }
    }
    assert_eq!(violations, Vec::<String>::new());
}

#[test]
fn routes_every_lexicon_read_through_the_single_interlingua_module() {
    // The shared interlingua data file is the directional glossary. If any source
    // file other than `semantic_lexicon.rs` reads it directly, the
    // single-source-of-truth invariant is broken and ad-hoc translation tables
    // can reappear.
    assert_eq!(
        code_readers_of("semantic-lexicon.json"),
        vec!["semantic_lexicon.rs".to_string()]
    );
}

#[test]
fn routes_every_reference_fixture_read_through_the_single_reference_module() {
    // The offline reference fixtures (the documented, rare overrides for issues
    // #35/#52) must be loaded only through `reference_data.rs`. A second reader
    // would mean another component is smuggling in its own translation table.
    assert_eq!(
        code_readers_of("reference-translations.json"),
        vec!["reference_data.rs".to_string()]
    );
}

#[test]
fn the_guard_detects_planted_translations_yet_ignores_comments() {
    // Proves the guard has teeth: a foreign surface form planted in code is
    // reported, while the same letters in a `//` line comment, a `///` doc
    // comment, or a `/* */` block comment are not. The Cyrillic here is built
    // from numeric code points so this guard file itself stays ASCII-only.
    let apple_ru: String = [0x044f, 0x0431, 0x043b, 0x043e, 0x043a, 0x043e]
        .iter()
        .map(|code| char::from_u32(*code).expect("valid code point"))
        .collect();

    let offending_code = format!("const PAIR: &str = \"{apple_ru}\";");
    assert_eq!(non_latin_lines(&offending_code).len(), 1);

    let line_comment = format!("// glosses {apple_ru} for documentation only");
    assert!(non_latin_lines(&line_comment).is_empty());

    let doc_comment = format!("/// e.g. apple -> {apple_ru}, never hardcoded here");
    assert!(non_latin_lines(&doc_comment).is_empty());

    let block_comment = format!("let value = 1; /* {apple_ru} */ let other = 2;");
    assert!(non_latin_lines(&block_comment).is_empty());

    // A `//` inside a URL string literal must not be treated as a comment, so a
    // foreign letter following it is still detected.
    let url_then_word = format!("let note = \"https://example.com {apple_ru}\";");
    assert_eq!(non_latin_lines(&url_then_word).len(), 1);
}
