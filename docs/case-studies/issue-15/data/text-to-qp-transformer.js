// Text to Wikidata Q/P Transformer
// Transforms English text into sequences of Wikidata entities (Q) and properties (P)
// with disambiguation support using [Q1 or Q2 or Q3] syntax

// Import appropriate API based on environment
let WikidataAPIClient, WikidataSearchUtility;

if (typeof window !== 'undefined') {
  // Browser environment
  const module = await import('../wikidata-api-browser.js');
  WikidataAPIClient = module.WikidataAPIClient;
  WikidataSearchUtility = module.WikidataSearchUtility;
} else {
  // Node.js environment
  const module = await import('../wikidata-api.js');
  WikidataAPIClient = module.WikidataAPIClient;  
  WikidataSearchUtility = module.WikidataSearchUtility;
}

/**
 * Text to Q/P Transformer Class
 * Converts English text into sequences of Wikidata identifiers
 */
class TextToQPTransformer {
  constructor() {
    this.apiClient = new WikidataAPIClient();
    this.searchUtility = new WikidataSearchUtility(this.apiClient, null, null);
    
    // Common English words that should be properties
    this.propertyIndicators = [
      'is', 'was', 'are', 'were', 'has', 'have', 'had',
      'born', 'died', 'located', 'created', 'founded',
      'married', 'wrote', 'directed', 'invented', 'discovered',
      'contains', 'belongs', 'relates', 'connects', 'instance of',
      'part of', 'member of', 'capital of', 'owned by', 'child of',
      'parent of', 'spouse of', 'sibling of'
    ];
    
    // Words to skip entirely
    this.stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  }

  /**
   * Transform English text into Q/P sequences
   * @param {string} text - The English text to transform
   * @param {Object} options - Transformation options
   * @returns {Promise<Object>} - Transformation result
   */
  async transform(text, options = {}) {
    const {
      maxCandidates = 3,
      includeLabels = false,
      searchLimit = 10,
      preferProperties = false,
      maxNgramSize = 3 // Configurable max n-gram size
    } = options;

    const result = {
      original: text,
      tokens: [],
      sequence: [],
      formatted: '',
      alternatives: []
    };

    try {
      // Tokenize the text
      const tokens = this.tokenize(text);
      result.tokens = tokens;

      // Generate all n-grams
      const ngrams = this.generateNgrams(tokens, maxNgramSize);
      
      // Search for all n-grams in parallel to find matches
      const ngramResults = await this.searchNgrams(ngrams, preferProperties, searchLimit);
      
      // Match tokens using longest-first priority
      const matches = this.matchTokensWithPriority(tokens, ngramResults, maxCandidates, includeLabels);
      
      // Build the final sequence
      result.sequence = matches;

      // Format the final sequence
      result.formatted = this.formatSequence(result.sequence);
      result.formattedWithLinks = this.formatSequenceWithLinks(result.sequence);
      
      // Generate alternative sequences if there are ambiguous matches
      result.alternatives = this.generateAlternatives(result.sequence);

    } catch (error) {
      console.error('Error transforming text:', error);
      throw new Error(`Transformation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Tokenize the input text
   * @param {string} text - Text to tokenize
   * @returns {Array<string>} - Array of tokens
   */
  tokenize(text) {
    // Basic tokenization - can be improved with NLP libraries
    return text
      .replace(/[.,!?;:]/g, '') // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter(token => token.length > 0);
  }

  /**
   * Generate all n-grams from tokens
   * @param {Array<string>} tokens - Array of tokens
   * @param {number} maxNgramSize - Maximum n-gram size
   * @returns {Object} - Object with n-grams organized by size
   */
  generateNgrams(tokens, maxNgramSize) {
    const ngrams = {};
    
    // Generate n-grams for each size
    for (let size = 1; size <= maxNgramSize; size++) {
      ngrams[size] = [];
      
      for (let i = 0; i <= tokens.length - size; i++) {
        const ngram = tokens.slice(i, i + size);
        const ngramText = ngram.join(' ');
        
        // Skip if it contains only stop words
        const nonStopWords = ngram.filter(word => !this.stopWords.includes(word.toLowerCase()));
        if (nonStopWords.length > 0) {
          ngrams[size].push({
            text: ngramText,
            tokens: ngram,
            start: i,
            end: i + size - 1,
            size: size
          });
        }
      }
    }
    
    return ngrams;
  }

  /**
   * Search for all n-grams in parallel
   * @param {Object} ngrams - N-grams organized by size
   * @param {boolean} preferProperties - Whether to prefer properties
   * @param {number} searchLimit - Search limit
   * @returns {Promise<Array>} - Array of n-gram results with search matches
   */
  async searchNgrams(ngrams, preferProperties, searchLimit) {
    const allSearchPromises = [];
    const ngramInfoList = [];
    
    // Create search promises for all n-grams
    for (const size in ngrams) {
      for (const ngram of ngrams[size]) {
        allSearchPromises.push(this.searchForTerm(ngram.text, preferProperties, searchLimit));
        ngramInfoList.push(ngram);
      }
    }
    
    // Execute all searches in parallel
    const searchResults = await Promise.all(allSearchPromises);
    
    // Combine n-gram info with search results
    const ngramResults = [];
    for (let i = 0; i < searchResults.length; i++) {
      const ngram = ngramInfoList[i];
      const results = searchResults[i];
      
      if (results.exact.length > 0 || results.fuzzy.length > 0) {
        ngramResults.push({
          ...ngram,
          searchResults: results
        });
      }
    }
    
    return ngramResults;
  }

  /**
   * Match tokens with priority given to longer n-grams
   * @param {Array<string>} tokens - Original tokens
   * @param {Array} ngramResults - N-gram search results
   * @param {number} maxCandidates - Max candidates per match
   * @param {boolean} includeLabels - Whether to include labels
   * @returns {Array} - Array of matched items for the sequence
   */
  matchTokensWithPriority(tokens, ngramResults, maxCandidates, includeLabels) {
    const matches = [];
    const usedTokenIndices = new Set();
    
    // Sort n-gram results by size (descending) to prioritize longer matches
    const sortedNgrams = ngramResults.sort((a, b) => b.size - a.size);
    
    // Process n-grams in order of size
    for (const ngram of sortedNgrams) {
      // Check if any token in this n-gram is already used
      let isUsed = false;
      for (let i = ngram.start; i <= ngram.end; i++) {
        if (usedTokenIndices.has(i)) {
          isUsed = true;
          break;
        }
      }
      
      if (!isUsed) {
        // Mark all tokens in this n-gram as used
        for (let i = ngram.start; i <= ngram.end; i++) {
          usedTokenIndices.add(i);
        }
        
        // Process candidates and add to matches
        const candidates = this.processCandidates(ngram.searchResults, maxCandidates);
        if (candidates.length > 0) {
          const qpItem = this.formatCandidates(candidates, includeLabels);
          matches.push({
            ...qpItem,
            position: ngram.start, // Track position for proper ordering
            ngramSize: ngram.size,
            originalText: ngram.text // Keep track of original text for debugging
          });
        }
      }
    }
    
    // Sort matches by position to maintain original order
    matches.sort((a, b) => a.position - b.position);
    
    // Remove only position info before returning, keep ngramSize and originalText
    return matches.map(match => {
      const { position, ...item } = match;
      return item;
    });
  }

  /**
   * Search for a term in Wikidata
   * @param {string} term - Term to search for
   * @param {boolean} preferProperties - Whether to prefer properties over entities
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Object>} - Search results
   */
  async searchForTerm(term, preferProperties, limit) {
    // Determine if this term is likely a property
    const isLikelyProperty = this.propertyIndicators.some(indicator => 
      term.toLowerCase().includes(indicator)
    );
    
    const searchType = (preferProperties || isLikelyProperty) ? 'property' : 'both';
    
    // Use disambiguation search for better results
    return await this.searchUtility.disambiguateSearch(term, 'en', limit, searchType);
  }

  /**
   * Process candidates from search results
   * @param {Object} searchResults - Search results from Wikidata
   * @param {number} maxCandidates - Maximum number of candidates to return
   * @returns {Array} - Processed candidates
   */
  processCandidates(searchResults, maxCandidates) {
    const candidates = [];
    const seenIds = new Set();
    
    // Add exact matches first
    searchResults.exact.forEach(item => {
      if (candidates.length < maxCandidates && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        candidates.push({
          id: item.id,
          label: item.label,
          description: item.description,
          type: item.id.startsWith('P') ? 'property' : 'entity',
          matchType: 'exact'
        });
      }
    });
    
    // Add fuzzy matches if needed
    if (candidates.length < maxCandidates) {
      searchResults.fuzzy.forEach(item => {
        if (candidates.length < maxCandidates && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          candidates.push({
            id: item.id,
            label: item.label,
            description: item.description,
            type: item.id.startsWith('P') ? 'property' : 'entity',
            matchType: 'fuzzy'
          });
        }
      });
    }
    
    return candidates;
  }

  /**
   * Format candidates into Q/P notation
   * @param {Array} candidates - Array of candidates
   * @param {boolean} includeLabels - Whether to include labels
   * @returns {Object} - Formatted Q/P item
   */
  formatCandidates(candidates, includeLabels) {
    if (candidates.length === 0) {
      return null;
    }
    
    if (candidates.length === 1) {
      // Single match
      const candidate = candidates[0];
      return {
        id: candidate.id,
        label: includeLabels ? candidate.label : null,
        type: candidate.type,
        alternatives: []
      };
    } else {
      // Multiple matches - use disambiguation syntax
      return {
        id: `[${candidates.map(c => c.id).join(' or ')}]`,
        label: includeLabels ? `[${candidates.map(c => c.label).join(' or ')}]` : null,
        type: 'ambiguous',
        alternatives: candidates
      };
    }
  }

  /**
   * Format the sequence into a string
   * @param {Array} sequence - Array of Q/P items
   * @returns {string} - Formatted string
   */
  formatSequence(sequence) {
    return sequence
      .filter(item => item !== null)
      .map(item => item.id)
      .join(' ');
  }

  /**
   * Format the sequence into HTML with links
   * @param {Array} sequence - Array of Q/P items
   * @returns {string} - Formatted HTML string with links
   */
  formatSequenceWithLinks(sequence) {
    return sequence
      .filter(item => item !== null)
      .map(item => {
        if (item.type === 'ambiguous') {
          // For ambiguous items, we need to handle the bracketed format
          const ids = item.id.match(/[QP]\d+/g) || [];
          const linkedIds = ids.map(id => {
            if (id.startsWith('Q')) {
              return `<a href="../entities.html#${id}" target="_blank">${id}</a>`;
            } else if (id.startsWith('P')) {
              return `<a href="../properties.html#${id}" target="_blank">${id}</a>`;
            }
            return id;
          });
          // Reconstruct the ambiguous format with links
          return `[${linkedIds.join(' or ')}]`;
        } else {
          // Single ID
          const id = item.id;
          if (id.startsWith('Q')) {
            return `<a href="../entities.html#${id}" target="_blank">${id}</a>`;
          } else if (id.startsWith('P')) {
            return `<a href="../properties.html#${id}" target="_blank">${id}</a>`;
          }
          return id;
        }
      })
      .join(' ');
  }

  /**
   * Generate alternative sequences for disambiguation
   * @param {Array} sequence - Original sequence with ambiguous items
   * @returns {Array} - Array of alternative sequences
   */
  generateAlternatives(sequence) {
    const alternatives = [];
    const ambiguousItems = sequence.filter(item => item && item.type === 'ambiguous');
    
    if (ambiguousItems.length === 0) {
      return alternatives;
    }
    
    // For now, just return the first alternative for each ambiguous item
    // This could be expanded to generate all possible combinations
    const alternativeSequence = sequence.map(item => {
      if (item && item.type === 'ambiguous' && item.alternatives.length > 0) {
        return item.alternatives[0].id;
      }
      return item ? item.id : null;
    }).filter(id => id !== null);
    
    if (alternativeSequence.length > 0) {
      alternatives.push({
        sequence: alternativeSequence.join(' '),
        confidence: 'low'
      });
    }
    
    return alternatives;
  }

  /**
   * Transform with context for better disambiguation
   * @param {string} text - Text to transform
   * @param {Object} context - Context information
   * @param {Object} options - Transformation options
   * @returns {Promise<Object>} - Transformation result with context-aware disambiguation
   */
  async transformWithContext(text, context = {}, options = {}) {
    // This could be enhanced to use context for better disambiguation
    const result = await this.transform(text, options);
    
    // Apply context-based filtering if available
    if (context.domain) {
      // Filter candidates based on domain
      result.sequence = result.sequence.map(item => {
        if (item && item.type === 'ambiguous') {
          const filtered = item.alternatives.filter(alt => 
            alt.description && alt.description.toLowerCase().includes(context.domain.toLowerCase())
          );
          if (filtered.length > 0) {
            return this.formatCandidates(filtered, options.includeLabels);
          }
        }
        return item;
      });
      
      result.formatted = this.formatSequence(result.sequence);
      result.formattedWithLinks = this.formatSequenceWithLinks(result.sequence);
    }
    
    return result;
  }
}

export { TextToQPTransformer };