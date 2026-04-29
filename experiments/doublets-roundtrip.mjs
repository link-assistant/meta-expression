import { encodeAsDoublets, decodeFromDoublets } from '../src/doublets.js';

const value = {
  cache: {
    key: 'abc123',
    hits: 12,
    payload: {
      phrases: [
        { id: 'Q5', label: 'human' },
        { id: 'Q937', label: 'Albert Einstein' },
      ],
      contexts: ['Q5', 'Q169470'],
    },
    flag: true,
    notes: null,
  },
};

const { binary, rootIndex, store } = encodeAsDoublets(value);
console.log(`encoded ${binary.length} bytes, ${store.size()} doublets`);
const decoded = decodeFromDoublets(binary, rootIndex);
console.log(JSON.stringify(decoded, null, 2));
console.log('--- links notation ---');
console.log(
  store.toLinksNotation().split('\n').slice(0, 6).join('\n'),
  '... (truncated)'
);

const matches = JSON.stringify(decoded) === JSON.stringify(value);
console.log('round-trip matches:', matches);
process.exitCode = matches ? 0 : 1;
