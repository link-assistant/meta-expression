/**
 * Basic meta-expression prototype usage.
 *
 * Run with any supported runtime:
 * - Bun: bun examples/basic-usage.js
 * - Node.js: node examples/basic-usage.js
 * - Deno: deno run --allow-read examples/basic-usage.js
 */

import {
  analyzeStatement,
  getPreparedExamples,
  serializeLinksNotation,
} from '../js/src/index.js';

const examples = getPreparedExamples().map((example) => example.input);

for (const statement of examples) {
  const analysis = analyzeStatement(statement);
  console.log(`\n${statement}`);
  console.log(
    `  interpretation: ${analysis.selectedInterpretation.paraphrase}`
  );
  console.log(`  result: ${analysis.result.value}`);
  console.log(`  confidence: ${analysis.result.confidence}`);
}

const analysis = analyzeStatement('Earth orbits the Sun');
console.log('\nLinks Notation:');
console.log(serializeLinksNotation(analysis.linksNetwork));
