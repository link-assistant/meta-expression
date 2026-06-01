const tokenPattern = /[^\s.,!?;:"“”/()[\]{}]+/g;

export function tokenizeTextWithSpans(text) {
  const source = String(text);
  const spans = [];
  let match;
  tokenPattern.lastIndex = 0;
  while ((match = tokenPattern.exec(source)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (isParenthesizedSlashPronunciation(source, start, end)) {
      continue;
    }
    spans.push({
      token: match[0],
      start,
      end,
      sentenceBoundaryAfter: false,
    });
  }
  markSentenceBoundaries(source, spans);
  return spans;
}

export function containsNonAscii(value) {
  return Array.from(String(value ?? '')).some(
    (character) => character.charCodeAt(0) > 127
  );
}

function markSentenceBoundaries(source, spans) {
  for (let index = 0; index < spans.length - 1; index += 1) {
    const delimiter = source.slice(spans[index].end, spans[index + 1].start);
    spans[index].sentenceBoundaryAfter = /[.!?]/.test(delimiter);
  }
  if (spans.length > 0) {
    const tail = source.slice(spans[spans.length - 1].end);
    spans[spans.length - 1].sentenceBoundaryAfter = /[.!?]/.test(tail);
  }
}

function isParenthesizedSlashPronunciation(source, start, end) {
  const leftSlash = source.lastIndexOf('/', start - 1);
  const rightSlash = source.indexOf('/', end);
  if (
    leftSlash === -1 ||
    rightSlash === -1 ||
    leftSlash >= start ||
    rightSlash < end
  ) {
    return false;
  }
  if (source[leftSlash - 1] !== '(' || source[rightSlash + 1] !== ')') {
    return false;
  }
  return containsNonAscii(source.slice(leftSlash + 1, rightSlash));
}
