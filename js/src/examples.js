const preparedExamples = Object.freeze([
  Object.freeze({
    input: '1 + 1 = 2',
    label: 'Exact arithmetic truth',
    category: 'calculator',
    description: 'Fully computable equality with confidence 100%.',
    opposite: '1 + 1 = 1',
  }),
  Object.freeze({
    input: '1 + 1 = 1',
    label: 'Exact arithmetic contradiction',
    category: 'calculator',
    description: 'Fully computable equality with confidence 0%.',
    opposite: '1 + 1 = 2',
  }),
  Object.freeze({
    input: '2 * 3 = 6',
    label: 'Multiplication truth',
    category: 'calculator',
    description: 'Fully computable multiplication.',
    opposite: '2 * 3 = 7',
  }),
  Object.freeze({
    input: '2 * 3 = 7',
    label: 'Multiplication contradiction',
    category: 'calculator',
    description: 'Fully computable multiplication that fails.',
    opposite: '2 * 3 = 6',
  }),
  Object.freeze({
    input: '10 - 4 = 6',
    label: 'Subtraction truth',
    category: 'calculator',
    description: 'Fully computable subtraction.',
    opposite: '10 - 4 = 5',
  }),
  Object.freeze({
    input: '10 - 4 = 5',
    label: 'Subtraction contradiction',
    category: 'calculator',
    description: 'Fully computable subtraction that fails.',
    opposite: '10 - 4 = 6',
  }),
  Object.freeze({
    input: '1 + 1',
    label: 'Arithmetic question',
    category: 'question',
    description: 'Question-style expression asking for the computed result.',
    opposite: '1 - 1',
  }),
  Object.freeze({
    input: '1 - 1',
    label: 'Subtraction question',
    category: 'question',
    description: 'Question-style expression that yields zero.',
    opposite: '1 + 1',
  }),
  Object.freeze({
    input: 'Earth orbits the Sun',
    label: 'Wikidata astronomy claim',
    category: 'evidence',
    description: 'Real-world evidence with provenance and bounded confidence.',
    opposite: 'Earth does not orbit the Sun',
  }),
  Object.freeze({
    input: 'Earth does not orbit the Sun',
    label: 'Negated astronomy claim',
    category: 'evidence',
    description: 'Negation of the Earth-Sun orbit claim, refuted by evidence.',
    opposite: 'Earth orbits the Sun',
  }),
  Object.freeze({
    input: 'Moon orbits the Sun',
    label: 'Wikidata orbit chain',
    category: 'evidence',
    description:
      'A real-world orbit claim that follows parent astronomical bodies.',
    opposite: 'Moon does not orbit the Sun',
  }),
  Object.freeze({
    input: 'Moon does not orbit the Sun',
    label: 'Negated orbit chain',
    category: 'evidence',
    description:
      'Negation of the Moon-Sun orbit claim. The chain still resolves through Earth.',
    opposite: 'Moon orbits the Sun',
  }),
  Object.freeze({
    input: 'Moon orbits Earth',
    label: 'Direct orbit claim',
    category: 'evidence',
    description:
      'A precise orbit claim with a single parent astronomical body.',
    opposite: 'Moon does not orbit Earth',
  }),
  Object.freeze({
    input: 'Moon does not orbit Earth',
    label: 'Negated direct orbit',
    category: 'evidence',
    description: 'Negation of the Moon-Earth orbit claim.',
    opposite: 'Moon orbits Earth',
  }),
  Object.freeze({
    input: 'Elon Musk is alive',
    label: 'Person alive claim',
    category: 'evidence',
    description:
      'A person claim backed by Wikidata identifiers without absolute certainty.',
    opposite: 'Elon Musk is dead',
  }),
  Object.freeze({
    input: 'Elon Musk is dead',
    label: 'Negated person liveness',
    category: 'evidence',
    description: 'Opposite of the Elon Musk liveness claim.',
    opposite: 'Elon Musk is alive',
  }),
  Object.freeze({
    input: 'Ada Lovelace is dead',
    label: 'Historical person dead',
    category: 'evidence',
    description: 'Wikidata-backed claim that resolves through P570.',
    opposite: 'Ada Lovelace is alive',
  }),
  Object.freeze({
    input: 'Ada Lovelace is alive',
    label: 'Negated historical liveness',
    category: 'evidence',
    description: 'Opposite of the Ada Lovelace liveness claim.',
    opposite: 'Ada Lovelace is dead',
  }),
  Object.freeze({
    input: 'Paris is the capital of France',
    label: 'Live capital claim',
    category: 'evidence',
    description: 'A live Wikimedia template for country-capital evidence.',
    opposite: 'Paris is not the capital of France',
  }),
  Object.freeze({
    input: 'Paris is not the capital of France',
    label: 'Negated capital claim',
    category: 'evidence',
    description: 'Opposite of the Paris-France capital claim.',
    opposite: 'Paris is the capital of France',
  }),
  Object.freeze({
    input: 'Berlin is the capital of France',
    label: 'Wrong capital claim',
    category: 'evidence',
    description: 'A capital claim that should be refuted by Wikidata evidence.',
    opposite: 'Berlin is not the capital of France',
  }),
  Object.freeze({
    input: 'Berlin is not the capital of France',
    label: 'Negated wrong capital claim',
    category: 'evidence',
    description: 'Opposite of the Berlin-France capital claim.',
    opposite: 'Berlin is the capital of France',
  }),
  Object.freeze({
    input: 'this statement is false',
    label: 'Self-reference',
    category: 'logic',
    description: 'A self-referential truth claim marked as undetermined.',
    opposite: 'this statement is true',
  }),
  Object.freeze({
    input: 'this statement is true',
    label: 'Self-reference (positive)',
    category: 'logic',
    description: 'A self-referential truth claim marked as undetermined.',
    opposite: 'this statement is false',
  }),
]);

export function getPreparedExamples() {
  return preparedExamples.map((example) => ({ ...example }));
}

export function findExampleOpposite(input) {
  const normalized = normalizeExampleKey(input);
  const example = preparedExamples.find(
    (item) => normalizeExampleKey(item.input) === normalized
  );
  return example?.opposite ?? null;
}

export function getRandomExamples(count = 4, options = {}) {
  const random = options.random ?? Math.random;
  const pool =
    options.pool ?? preparedExamples.map((example) => ({ ...example }));
  if (count >= pool.length) {
    return pool.map((example) => ({ ...example }));
  }

  const indices = new Set();
  while (indices.size < count) {
    indices.add(Math.floor(random() * pool.length));
  }
  return [...indices].map((index) => ({ ...pool[index] }));
}

export function createSeededRandom(seed) {
  let state = Number(seed) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 0x100000000;
    return state / 0x100000000;
  };
}

function normalizeExampleKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
