# Human Language Project

> A sophisticated web application for transforming natural language into Wikidata entity and property sequences, enabling semantic understanding and knowledge representation.

## 🎯 Vision

The Human Language project aims to create a universal meta-language that bridges all human languages by leveraging Wikidata's semantic knowledge graph. By converting natural language into sequences of entities (Q) and properties (P), we enable:

- **Cross-linguistic understanding**: Unified representation across all languages
- **Semantic precision**: Disambiguation of concepts using Wikidata's rich ontology
- **Knowledge integration**: Direct connection to the world's largest open knowledge base
- **IPA support**: Universal phonetic representation for true language unification

### Long-term Impact

This project will fundamentally transform how we store, access, and verify human knowledge:

1. **Universal Encyclopedia**: Merge all Wikipedia content into a single, instantly translatable knowledge base
2. **Language of Meaning**: Create formal definitions for every concept, enabling perfect translation without AI
3. **Fact-Checking Foundation**: Build the world's largest facts database for verifying AI outputs
4. **Knowledge Preservation**: Unify all article versions to preserve the best of human knowledge
5. **AI Training Dataset**: Provide structured knowledge for next-generation neural networks
6. **Zero-Cost Translation**: Enable LLMs to answer once and translate infinitely through semantic representation

## 🚀 Key Features

### 1. Text-to-Q/P Transformation
- **N-gram support**: Recognizes multi-word phrases as single entities
- **Configurable matching**: Adjust n-gram size (1-5) for optimal results
- **Priority-based search**: Longer matches take precedence
- **Real-time transformation**: Interactive web demo at `transformation/index.html`
- [Learn more →](transformation/README.md)

### 2. Entity & Property Viewer
- **Beautiful UI**: Modern, responsive interface with dark/light themes
- **Multi-language support**: Automatic language detection and switching
- **Rich statements display**: View all properties and relationships
- **Direct Wikidata links**: Seamlessly navigate to source data
- View entities at `entities.html` and properties at `properties.html`

### 3. Advanced Search & Disambiguation
- **Exact & fuzzy matching**: Find entities even with typos
- **Context-aware ranking**: Domain and type preferences
- **Batch searching**: Efficient parallel searches
- **Multi-language search**: Search in any supported language
- [API Documentation →](SEARCH_README.md)

### 4. Intelligent Caching System
- **Multi-tier caching**: File system (Node.js) and IndexedDB (browser)
- **Automatic fallback**: Seamless switching between cache types
- **Performance optimized**: Reduces API calls and improves response times
- **Cross-platform**: Works in both Node.js and browser environments
- **Persistent storage**: Cached data survives across sessions

### 5. Comprehensive Language Support
- **100+ languages**: Full support for all major Wikidata languages
- **Locale-specific quotes**: Proper quotation marks for each language
- **Flag emojis**: Visual language indicators for better UX
- **Language persistence**: Settings saved in localStorage

## 📋 Roadmap

Based on our [GitHub issues](https://github.com/deep-assistant/human-language/issues), here's our development roadmap:

### Phase 1: Core Infrastructure Enhancement
- [ ] **Rename properties to relations/links** ([#12](https://github.com/deep-assistant/human-language/issues/12))
  - Better semantic clarity for relationships between entities
  - Update UI and API to reflect new terminology

### Phase 2: Enhanced Language Support
- [ ] **IPA Translation Support** ([#1](https://github.com/deep-assistant/human-language/issues/1))
  - Integrate International Phonetic Alphabet for universal pronunciation
  - Enable true cross-linguistic unification
  
- [ ] **Words Page Development** ([#14](https://github.com/deep-assistant/human-language/issues/14))
  - Display words in native language and IPA
  - List all entities a word can represent
  - Support alternative names/words for entities ([#10](https://github.com/deep-assistant/human-language/issues/10))

### Phase 3: Advanced Features
- [ ] **Automatic Description Conversion** ([#11](https://github.com/deep-assistant/human-language/issues/11))
  - Convert natural language descriptions into Q/P sequences
  - Enable semantic analysis of any text
  
- [ ] **Statements Viewer** ([#3](https://github.com/deep-assistant/human-language/issues/3))
  - Display confirmations and refutations for each statement
  - Build trust through community validation

### Phase 4: External Integration
- [ ] **Wikidata Links API Access** ([#15](https://github.com/deep-assistant/human-language/issues/15))
  - Direct API-style access to Wikidata relationships
  - Enable programmatic knowledge graph traversal
  
- [ ] **Formal Ontology Integration** ([#17](https://github.com/deep-assistant/human-language/issues/17))
  - Research and integrate best formal upper ontology
  - Enhance semantic reasoning capabilities

### Phase 5: Advanced Knowledge Representation
- [ ] **Cascade Triplets Support**
  - Implement cascade triplets (not natively supported by Wikidata)
  - Enable complex relationship chains and hierarchical knowledge
  
- [ ] **Language of Meaning**
  - Transform human language into universal sequence of meaning
  - Create consistent formal definitions for every entity and property
  - Enable algorithmic translation to any language without LLMs
  
- [ ] **Wikidata Contribution Pipeline**
  - Refine and validate transformed data
  - Contribute improvements back to Wikidata
  - Automated gap filling and error correction

### Phase 6: Universal Encyclopedia Project
- [ ] **Wikipedia Content Merger**
  - Merge all Wikipedia pages into single universal encyclopedia
  - Instant translation to any language using only Wikidata
  - No dependency on LLMs or GPTs for translation
  
- [ ] **Version Unification**
  - Merge all article versions into comprehensive single versions
  - Preserve best content from all language editions
  - Create most comprehensive human knowledge database
  
- [ ] **Neural Network Dataset**
  - Prepare advanced dataset for future AI training
  - Structured knowledge representation for next-gen models

### Phase 7: Fact-Checking Infrastructure
- [ ] **World's Largest Facts Database**
  - Build comprehensive fact-checking foundation
  - Enable verification of LLM/GPT outputs
  
- [ ] **LLM Translation Pipeline**
  - LLMs answer in English → Language of Meaning → Any human language
  - Zero additional LLM cost for multilingual support
  - Guaranteed semantic accuracy across languages

## 🏗️ Architecture Overview

### Core Components

1. **Wikidata API Client** (`wikidata-api.js`)
   - Handles all Wikidata API interactions
   - Configurable caching strategies
   - Batch request optimization

2. **Text Transformer** (`transformation/text-to-qp-transformer.js`)
   - N-gram generation and matching
   - Parallel search execution
   - Priority-based result merging

3. **Search Utilities** (`wikidata-api.js`)
   - Exact and fuzzy search algorithms
   - Context-aware ranking system
   - Multi-language support

4. **Caching System** (`unified-cache.js`)
   - Factory pattern for cache creation
   - File system cache for Node.js
   - IndexedDB cache for browsers

5. **UI Components** (`statements.jsx`, `loading.jsx`)
   - React 19 components with JSX
   - No build step required (Babel in-browser)
   - Responsive and theme-aware design

### Data Flow

```
User Input → Text Transformer → N-gram Generator → Parallel Search
                                                           ↓
                                                    Wikidata API
                                                           ↓
                                                     Cache Layer
                                                           ↓
                                                   Result Merger
                                                           ↓
                                                    UI Display
```

## 🛠️ Technical Details

### Dependencies
- **React 19**: Latest features via ESM.sh CDN
- **Babel Standalone**: In-browser JSX transformation
- **No build step**: Direct browser execution

### Browser Support
- Modern browsers with ES6+ support
- IndexedDB for caching
- Fetch API for network requests

### Node.js Support
- Version 18+ recommended
- File system caching
- Native fetch support

## 🚦 Getting Started

### Quick Start
1. Clone the repository
2. Open `entities.html` in a web browser
3. Start exploring Wikidata entities!

### For Developers
```bash
# Run tests
bun run-tests.mjs

# Test n-gram features
bun transformation/test-ngram-demo.mjs

# Run comprehensive tests
bun comprehensive-test.mjs

# Run E2E tests
bun e2e-test.mjs

# Check limitations
bun limitation-test.mjs
```

### Interactive Demos
- **Entity Viewer**: Open `entities.html`
- **Property Viewer**: Open `properties.html`  
- **Text Transformer**: Open `transformation/index.html`
- **Search Demo**: Open `search-demo.html`
- **Browser Tests**: Open `run-tests.html`

## ⚠️ Known Limitations

The text transformation system currently has some limitations:

1. **Negation handling**: Phrases with "not" aren't properly processed
2. **Question parsing**: Direct questions (who, what, when) aren't supported
3. **Verb tenses**: Past/future tenses may not be accurately captured
4. **Pronoun resolution**: Cannot resolve pronouns like "he", "she", "it"
5. **Complex sentences**: Struggles with subordinate clauses

See `limitations-found.json` for detailed test results.

## 📚 Documentation

- [Search & Disambiguation API](SEARCH_README.md)
- [Text Transformation Guide](transformation/README.md)
- [N-gram Feature Documentation](transformation/ngram-feature-summary.md)

## 📊 Performance & Testing

The project includes comprehensive test suites with excellent results:

- **API Pattern Tests**: 100% success rate (8/8 tests passing)
- **N-gram Matching**: Correctly identifies multi-word entities
- **Disambiguation**: Handles ambiguous terms with multiple alternatives
- **Caching Efficiency**: Significant performance improvements with persistent cache

Test results are stored in `api-patterns.json` showing real-world transformation examples.

## 🤝 Contributing

We welcome contributions! Check our [issues](https://github.com/deep-assistant/human-language/issues) for areas where you can help.

## 📄 License

This project is released into the public domain under The Unlicense.

This means you are free to:
- Copy, modify, publish, use, compile, sell, or distribute this software
- Use it for any purpose, commercial or non-commercial
- Do so without any restrictions or attribution requirements

For more information, see [The Unlicense](https://unlicense.org)

---

*Building bridges between human languages through semantic understanding.*
