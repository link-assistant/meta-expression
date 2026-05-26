use crate::analysis::LinksNetwork;
use doublets::{
    mem::{Global, RawMem},
    parts::LinkPart,
    unit, Doublets, DoubletsExt,
};
use serde_json::{json, Map, Number, Value};
use std::collections::HashMap;

#[cfg(not(target_arch = "wasm32"))]
use {
    doublets::mem::FileMapped,
    std::{fs, path::Path},
};

pub const DOUBLETS_NULL_LINK: u64 = 0;
pub const DOUBLETS_STRING_TAG: u64 = 0x1000_0000;
pub const DOUBLETS_NUMBER_TAG: u64 = 0x2000_0000;
pub const DOUBLETS_BOOL_TAG: u64 = 0x3000_0000;
pub const DOUBLETS_ARRAY_TAG: u64 = 0x4000_0000;
pub const DOUBLETS_OBJECT_TAG: u64 = 0x5000_0000;

const PORTABLE_CASE_SCHEMA: &str = "meta-expression.portable-case";
const TERM_DATA_SCHEMA: &str = "meta-expression.term-data";
const JSON_SCHEMA: &str = "serde-json";
const DOUBLET_CRATE_VERSION: &str = "0.3.0";

type UnitMemory = Global<LinkPart<u64>>;
type UnitStore<M> = unit::Store<u64, M>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoubletsLink {
    pub index: u64,
    pub source: u64,
    pub target: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoubletsArtifact {
    pub format: String,
    pub version: u32,
    pub root_index: u64,
    pub binary: Vec<u8>,
    pub links_notation: String,
    pub links: Vec<DoubletsLink>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PortableCaseOptions {
    pub case_id: Option<String>,
    pub exported_at: Option<String>,
    pub migrated_from: Option<String>,
}

struct JsonDoubletsStore<M: RawMem<Item = LinkPart<u64>>> {
    store: UnitStore<M>,
    string_index: HashMap<String, u64>,
}

impl<M: RawMem<Item = LinkPart<u64>>> JsonDoubletsStore<M> {
    fn new(store: UnitStore<M>) -> Self {
        Self {
            store,
            string_index: HashMap::new(),
        }
    }

    fn store_value(&mut self, value: &Value) -> Result<u64, String> {
        match value {
            Value::Null => self.create_link(DOUBLETS_NULL_LINK, DOUBLETS_NULL_LINK),
            Value::Bool(value) => self.create_link(DOUBLETS_BOOL_TAG, u64::from(*value)),
            Value::Number(value) => self.store_number(value),
            Value::String(value) => self.store_string(value),
            Value::Array(values) => self.store_array(values),
            Value::Object(value) => self.store_object(value),
        }
    }

    fn store_string(&mut self, value: &str) -> Result<u64, String> {
        if let Some(index) = self.string_index.get(value) {
            return Ok(*index);
        }

        if value.is_empty() {
            let empty = self.create_link(DOUBLETS_STRING_TAG, DOUBLETS_NULL_LINK)?;
            self.string_index.insert(value.to_string(), empty);
            return Ok(empty);
        }

        let mut head = DOUBLETS_NULL_LINK;
        for character in value.chars() {
            let point = self.create_link(DOUBLETS_STRING_TAG, character as u32 as u64)?;
            head = self.create_link(head, point)?;
        }
        let root = self.create_link(DOUBLETS_STRING_TAG, head)?;
        self.string_index.insert(value.to_string(), root);
        Ok(root)
    }

    fn store_number(&mut self, value: &Number) -> Result<u64, String> {
        let number = value
            .as_f64()
            .ok_or_else(|| format!("Number cannot be represented as f64: {value}"))?;
        let bits = number.to_bits();
        let lo = bits & 0xffff_ffff;
        let hi = bits >> 32;
        let hi_link = self.create_link(DOUBLETS_NULL_LINK, hi)?;
        let lo_link = self.create_link(hi_link, lo)?;
        self.create_link(DOUBLETS_NUMBER_TAG, lo_link)
    }

    fn store_array(&mut self, values: &[Value]) -> Result<u64, String> {
        let mut head = DOUBLETS_NULL_LINK;
        for value in values {
            let child = self.store_value(value)?;
            head = self.create_link(head, child)?;
        }
        self.create_link(DOUBLETS_ARRAY_TAG, head)
    }

    fn store_object(&mut self, value: &Map<String, Value>) -> Result<u64, String> {
        let mut head = DOUBLETS_NULL_LINK;
        for (key, entry) in value {
            let key_index = self.store_string(key)?;
            let value_index = self.store_value(entry)?;
            let pair = self.create_link(key_index, value_index)?;
            head = self.create_link(head, pair)?;
        }
        self.create_link(DOUBLETS_OBJECT_TAG, head)
    }

    fn create_link(&mut self, source: u64, target: u64) -> Result<u64, String> {
        self.store
            .create_link(source, target)
            .map_err(|error| format!("{error:?}"))
    }

    fn into_artifact(
        self,
        format: &str,
        version: u32,
        root_index: u64,
    ) -> Result<DoubletsArtifact, String> {
        let links = links_from_store(&self.store);
        Ok(DoubletsArtifact {
            format: format.to_string(),
            version,
            root_index,
            binary: serialize_links(&links)?,
            links_notation: links_notation(&links),
            links,
        })
    }
}

struct DoubletsDecoder {
    links: Vec<Option<DoubletsLink>>,
}

impl DoubletsDecoder {
    fn new(links: Vec<DoubletsLink>) -> Self {
        let max = links.iter().map(|link| link.index).max().unwrap_or(0) as usize;
        let mut indexed = vec![None; max + 1];
        for link in links {
            indexed[link.index as usize] = Some(link);
        }
        Self { links: indexed }
    }

    fn read_value(&self, root_index: u64) -> Result<Value, String> {
        let Some(root) = self.link(root_index) else {
            return Ok(Value::Null);
        };

        match root.source {
            DOUBLETS_NULL_LINK if root.target == DOUBLETS_NULL_LINK => Ok(Value::Null),
            DOUBLETS_STRING_TAG => Ok(Value::String(self.read_string(root_index)?)),
            DOUBLETS_BOOL_TAG => Ok(Value::Bool(root.target == 1)),
            DOUBLETS_ARRAY_TAG => self.read_array(root.target),
            DOUBLETS_OBJECT_TAG => self.read_object(root.target),
            DOUBLETS_NUMBER_TAG => self.read_number(root.target),
            _ => Ok(Value::Null),
        }
    }

    fn read_string(&self, root_index: u64) -> Result<String, String> {
        let Some(root) = self.link(root_index) else {
            return Ok(String::new());
        };
        if root.source != DOUBLETS_STRING_TAG {
            return Ok(String::new());
        }

        let mut codes = Vec::new();
        let mut cursor = root.target;
        let mut guard = 0usize;
        while cursor != DOUBLETS_NULL_LINK {
            guard += 1;
            if guard > self.links.len() {
                return Err("Cyclic string doublets chain.".to_string());
            }
            let Some(link) = self.link(cursor) else {
                break;
            };
            let Some(point) = self.link(link.target) else {
                break;
            };
            if point.source != DOUBLETS_STRING_TAG {
                break;
            }
            let code = u32::try_from(point.target)
                .map_err(|_| format!("String code point is out of range: {}", point.target))?;
            let character = char::from_u32(code)
                .ok_or_else(|| format!("Invalid Unicode code point: {code}"))?;
            codes.push(character);
            cursor = link.source;
        }
        codes.reverse();
        Ok(codes.into_iter().collect())
    }

    fn read_array(&self, root: u64) -> Result<Value, String> {
        let mut items = Vec::new();
        let mut cursor = root;
        let mut guard = 0usize;
        while cursor != DOUBLETS_NULL_LINK {
            guard += 1;
            if guard > self.links.len() {
                return Err("Cyclic array doublets chain.".to_string());
            }
            let Some(link) = self.link(cursor) else {
                break;
            };
            items.push(self.read_value(link.target)?);
            cursor = link.source;
        }
        items.reverse();
        Ok(Value::Array(items))
    }

    fn read_object(&self, root: u64) -> Result<Value, String> {
        let mut entries = Vec::new();
        let mut cursor = root;
        let mut guard = 0usize;
        while cursor != DOUBLETS_NULL_LINK {
            guard += 1;
            if guard > self.links.len() {
                return Err("Cyclic object doublets chain.".to_string());
            }
            let Some(link) = self.link(cursor) else {
                break;
            };
            let Some(pair) = self.link(link.target) else {
                break;
            };
            entries.push((
                self.read_string(pair.source)?,
                self.read_value(pair.target)?,
            ));
            cursor = link.source;
        }
        entries.reverse();

        let mut object = Map::new();
        for (key, value) in entries {
            object.insert(key, value);
        }
        Ok(Value::Object(object))
    }

    fn read_number(&self, root: u64) -> Result<Value, String> {
        let Some(lo_link) = self.link(root) else {
            return Ok(json!(0));
        };
        let hi = self.link(lo_link.source).map_or(0, |link| link.target);
        let lo = lo_link.target;
        let bits = (hi << 32) | lo;
        let value = f64::from_bits(bits);
        json_number_from_f64(value)
            .map(Value::Number)
            .ok_or_else(|| format!("Decoded non-finite JSON number: {value}"))
    }

    fn link(&self, index: u64) -> Option<DoubletsLink> {
        self.links.get(index as usize).and_then(|link| *link)
    }
}

pub fn encode_json_value_to_doublets(value: &Value) -> Result<DoubletsArtifact, String> {
    encode_value_with_store(value, JSON_SCHEMA, 1, memory_store()?)
}

pub fn decode_json_value_from_doublets(
    binary: &[u8],
    root_index: Option<u64>,
) -> Result<Value, String> {
    let links = parse_binary_links(binary)?;
    let root = root_index.unwrap_or_else(|| links.len().saturating_sub(1) as u64);
    DoubletsDecoder::new(links).read_value(root)
}

pub fn save_meta_language_links_to_doublets(
    links_network: &LinksNetwork,
    options: PortableCaseOptions,
) -> Result<DoubletsArtifact, String> {
    let links_network = normalize_links_network(links_network)?;
    let case_id = options.case_id.unwrap_or_else(|| {
        links_network
            .get("id")
            .and_then(Value::as_str)
            .unwrap_or("meta-expression-case")
            .to_string()
    });
    let exported_at = options
        .exported_at
        .unwrap_or_else(|| "1970-01-01T00:00:00.000Z".to_string());
    let migrated_from = options
        .migrated_from
        .unwrap_or_else(|| "links-network-v1".to_string());

    let portable = json!({
        "schema": PORTABLE_CASE_SCHEMA,
        "version": 1,
        "caseId": case_id,
        "exportedAt": exported_at,
        "migratedFrom": migrated_from,
        "storage": {
            "backend": "doublets",
            "implementation": "doublets-rs",
            "crate": "doublets",
            "crateVersion": DOUBLET_CRATE_VERSION,
            "linkFields": [
                "id",
                "role",
                "references",
                "value",
                "provenance",
                "version"
            ],
            "stringEncoding": "unicode-codepoint-sequence"
        },
        "linksNetwork": links_network
    });

    encode_value_with_store(&portable, PORTABLE_CASE_SCHEMA, 1, memory_store()?)
}

pub fn load_meta_language_links_from_doublets(
    artifact: &DoubletsArtifact,
) -> Result<Value, String> {
    if artifact.format != PORTABLE_CASE_SCHEMA {
        return Err(format!(
            "Expected {PORTABLE_CASE_SCHEMA} artifact, got {}.",
            artifact.format
        ));
    }
    decode_artifact_value(artifact)
}

pub fn save_term_data_to_doublets(record: &Value) -> Result<DoubletsArtifact, String> {
    encode_value_with_store(record, TERM_DATA_SCHEMA, 1, memory_store()?)
}

pub fn load_term_data_from_doublets(artifact: &DoubletsArtifact) -> Result<Value, String> {
    if artifact.format != TERM_DATA_SCHEMA {
        return Err(format!(
            "Expected {TERM_DATA_SCHEMA} artifact, got {}.",
            artifact.format
        ));
    }
    decode_artifact_value(artifact)
}

#[cfg(not(target_arch = "wasm32"))]
pub fn save_json_value_to_file_mapped_doublets<P: AsRef<Path>>(
    value: &Value,
    path: P,
) -> Result<DoubletsArtifact, String> {
    let path = path.as_ref();
    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    let file_store = unit::Store::<u64, _>::new(
        FileMapped::<LinkPart<u64>>::from_path(path).map_err(|error| error.to_string())?,
    )
    .map_err(|error| format!("{error:?}"))?;
    let artifact = encode_value_with_store(value, JSON_SCHEMA, 1, file_store)?;
    fs::write(path, &artifact.binary).map_err(|error| error.to_string())?;
    Ok(artifact)
}

#[cfg(not(target_arch = "wasm32"))]
pub fn read_file_mapped_doublets_links<P: AsRef<Path>>(
    path: P,
) -> Result<Vec<DoubletsLink>, String> {
    Ok(
        parse_binary_links(&fs::read(path).map_err(|error| error.to_string())?)?
            .into_iter()
            .filter(|link| link.index != DOUBLETS_NULL_LINK)
            .collect(),
    )
}

fn encode_value_with_store<M: RawMem<Item = LinkPart<u64>>>(
    value: &Value,
    format: &str,
    version: u32,
    store: UnitStore<M>,
) -> Result<DoubletsArtifact, String> {
    let mut encoder = JsonDoubletsStore::new(store);
    let root_index = encoder.store_value(value)?;
    encoder.into_artifact(format, version, root_index)
}

fn decode_artifact_value(artifact: &DoubletsArtifact) -> Result<Value, String> {
    let restored = restore_links_to_memory_store(&parse_binary_links(&artifact.binary)?)?;
    let binary = serialize_links(&links_from_store(&restored))?;
    decode_json_value_from_doublets(&binary, Some(artifact.root_index))
}

fn memory_store() -> Result<UnitStore<UnitMemory>, String> {
    unit::Store::<u64, _>::new(Global::new()).map_err(|error| format!("{error:?}"))
}

fn restore_links_to_memory_store(links: &[DoubletsLink]) -> Result<UnitStore<UnitMemory>, String> {
    let mut store = memory_store()?;
    let mut ordered = links
        .iter()
        .copied()
        .filter(|link| link.index != DOUBLETS_NULL_LINK)
        .collect::<Vec<_>>();
    ordered.sort_by_key(|link| link.index);

    for link in ordered {
        let index = store.create().map_err(|error| format!("{error:?}"))?;
        if index != link.index {
            return Err(format!(
                "Doublets binary has a non-contiguous link index: expected {index}, got {}.",
                link.index
            ));
        }
        store
            .update(index, link.source, link.target)
            .map_err(|error| format!("{error:?}"))?;
    }
    Ok(store)
}

fn links_from_store<M: RawMem<Item = LinkPart<u64>>>(store: &UnitStore<M>) -> Vec<DoubletsLink> {
    store
        .iter()
        .map(|link| DoubletsLink {
            index: link.index,
            source: link.source,
            target: link.target,
        })
        .collect()
}

fn serialize_links(links: &[DoubletsLink]) -> Result<Vec<u8>, String> {
    let mut binary = Vec::with_capacity((links.len() + 1) * 12);
    append_u32_link(
        &mut binary,
        DoubletsLink {
            index: DOUBLETS_NULL_LINK,
            source: DOUBLETS_NULL_LINK,
            target: DOUBLETS_NULL_LINK,
        },
    )?;
    for link in links {
        append_u32_link(&mut binary, *link)?;
    }
    Ok(binary)
}

fn append_u32_link(binary: &mut Vec<u8>, link: DoubletsLink) -> Result<(), String> {
    for value in [link.index, link.source, link.target] {
        let value = u32::try_from(value)
            .map_err(|_| format!("Doublets value exceeds u32 binary range: {value}"))?;
        binary.extend_from_slice(&value.to_le_bytes());
    }
    Ok(())
}

fn parse_binary_links(binary: &[u8]) -> Result<Vec<DoubletsLink>, String> {
    if binary.is_empty() {
        return Ok(vec![DoubletsLink {
            index: DOUBLETS_NULL_LINK,
            source: DOUBLETS_NULL_LINK,
            target: DOUBLETS_NULL_LINK,
        }]);
    }
    if binary.len() % 12 != 0 {
        return Err(format!(
            "Doublets binary length must be divisible by 12 bytes, got {}.",
            binary.len()
        ));
    }

    let mut links = Vec::with_capacity(binary.len() / 12);
    for chunk in binary.chunks_exact(12) {
        links.push(DoubletsLink {
            index: read_u32(chunk, 0) as u64,
            source: read_u32(chunk, 4) as u64,
            target: read_u32(chunk, 8) as u64,
        });
    }
    Ok(links)
}

fn read_u32(bytes: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes([
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
    ])
}

fn links_notation(links: &[DoubletsLink]) -> String {
    let mut lines = vec![format!("(doublets: {})", links.len())];
    lines.extend(
        links
            .iter()
            .map(|link| format!("({}: {} {})", link.index, link.source, link.target)),
    );
    lines.join("\n")
}

fn normalize_links_network(links_network: &LinksNetwork) -> Result<Value, String> {
    let mut value = serde_json::to_value(links_network).map_err(|error| error.to_string())?;
    let Some(object) = value.as_object_mut() else {
        return Err("LinksNetwork did not serialize to an object.".to_string());
    };
    object.insert("kind".to_string(), json!("links-network"));
    object.insert(
        "version".to_string(),
        json!(finite_version(object.get("version"))),
    );

    if let Some(links) = object.get_mut("links").and_then(Value::as_array_mut) {
        for (index, link) in links.iter_mut().enumerate() {
            normalize_link_record(link, index + 1);
        }
    }
    Ok(value)
}

fn normalize_link_record(link: &mut Value, fallback_index: usize) {
    let Some(object) = link.as_object_mut() else {
        return;
    };
    object
        .entry("id")
        .or_insert_with(|| json!(format!("link-{fallback_index}")));
    object.entry("role").or_insert_with(|| json!("link"));
    object
        .entry("references")
        .or_insert_with(|| Value::Array(Vec::new()));
    object.entry("value").or_insert(Value::Null);
    object
        .entry("provenance")
        .or_insert_with(|| json!({"sourceType": "unknown"}));

    let value_version = object
        .get("value")
        .and_then(|value| value.get("version"))
        .or_else(|| object.get("version"));
    object.insert("version".to_string(), json!(finite_version(value_version)));
}

fn finite_version(value: Option<&Value>) -> u64 {
    value
        .and_then(Value::as_u64)
        .filter(|version| *version > 0)
        .unwrap_or(1)
}

fn json_number_from_f64(value: f64) -> Option<Number> {
    if !value.is_finite() {
        return None;
    }
    if value.fract() == 0.0 && value >= i64::MIN as f64 && value <= i64::MAX as f64 {
        return Some(Number::from(value as i64));
    }
    Number::from_f64(value)
}
