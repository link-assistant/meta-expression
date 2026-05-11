import { analyzeStatement } from '../src/index.js';

const samples = [
  '1 + 1 = 2',
  '1 + 1 = 1',
  '2 + 2 = 4',
  '2 + 2 = 5',
  '2 * 3 = 6',
  '2 * 3 = 7',
  '10 - 4 = 6',
  '10 - 4 = 5',
  '1 + 1',
  '1 - 1',
  'Earth orbits the Sun',
  'Earth does not orbit the Sun',
  'Moon orbits the Sun',
  'Moon orbits Earth',
  'Paris is the capital of France',
  'Berlin is the capital of France',
  'Elon Musk is alive',
  'Elon Musk is dead',
  'Ada Lovelace is dead',
  'Ada Lovelace is alive',
  'this statement is false',
  'this statement is true',
];

for (const input of samples) {
  const a = analyzeStatement(input);
  const r = a.result || {};
  console.log(
    JSON.stringify({
      input,
      correctness: r.correctness,
      signedConfidence: r.signedConfidence,
      confidence: r.confidence,
      kind: r.kind ?? null,
      value: r.value ?? null,
      interpretation: r.interpretation ?? null,
    })
  );
}
