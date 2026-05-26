import { describe, expect, it } from 'test-anywhere';
import { extractLinguisticMetadata } from '../../src/index.js';

describe('issue 70 - parser-backed reasoning metadata', () => {
  it('publishes parser CST plus versioned provenance on every reasoning artifact', () => {
    const metadata = extractLinguisticMetadata('OpenAI creates useful tools.');
    const subject = metadata.fragments.find(
      (fragment) => fragment.role === 'subject'
    );
    const predicate = metadata.fragments.find(
      (fragment) => fragment.role === 'predicate'
    );
    const object = metadata.fragments.find(
      (fragment) => fragment.role === 'object'
    );
    const sentence = metadata.ast.body[0];

    expect(metadata.parser.id).toBe('meta-expression-linguistic-parser');
    expect(metadata.parser.version).toBe(1);
    expect(metadata.version).toBe(1);
    expect(metadata.provenance.parserId).toBe(metadata.parser.id);
    expect(metadata.cst.type).toBe('document-cst');
    expect(metadata.cst.parser).toEqual(metadata.parser);
    expect(metadata.cst.tokens.map((token) => token.text)).toEqual([
      'OpenAI',
      'creates',
      'useful',
      'tools',
    ]);
    expect(metadata.cst.symbols.map((symbol) => symbol.text)).toEqual(['.']);
    expect(metadata.cst.sentences[0].predicateToken).toBe(1);

    expect(subject.text).toBe('OpenAI');
    expect(predicate.text).toBe('creates');
    expect(object.text).toBe('useful tools');
    expect(sentence.version).toBe(1);
    expect(sentence.provenance.parserId).toBe(metadata.parser.id);
    expect(sentence.subject.fragmentId).toBe(subject.id);
    expect(sentence.predicate.fragmentId).toBe(predicate.id);
    expect(sentence.object.fragmentId).toBe(object.id);

    for (const fragment of metadata.fragments) {
      expect(fragment.version).toBe(1);
      expect(fragment.provenance.sourceType).toBe('algorithm');
      expect(fragment.provenance.parserId).toBe(metadata.parser.id);
    }
    for (const dependency of metadata.dependencies) {
      expect(dependency.version).toBe(1);
      expect(dependency.source).toBe(metadata.parser.id);
      expect(dependency.provenance.parserId).toBe(metadata.parser.id);
    }
    for (const relation of metadata.relations) {
      expect(relation.version).toBe(1);
      expect(relation.provenance.parserId).toBe(metadata.parser.id);
    }
  });
});
