export function buildSourceReconstruction(parse, createProvenance) {
  const parts = [
    ...parse.tokens.map((token) => ({
      kind: 'token',
      text: token.text,
      tokenIndex: token.index,
      sourceStart: token.sourceStart,
      sourceEnd: token.sourceEnd,
    })),
    ...parse.symbols.map((symbol) => ({
      kind: 'symbol',
      text: symbol.text,
      symbolId: symbol.id,
      sourceStart: symbol.sourceStart,
      sourceEnd: symbol.sourceEnd,
    })),
  ]
    .filter(
      (part) =>
        Number.isInteger(part.sourceStart) && Number.isInteger(part.sourceEnd)
    )
    .sort(
      (left, right) =>
        left.sourceStart - right.sourceStart || left.sourceEnd - right.sourceEnd
    );
  const units = [];
  let cursor = 0;
  for (const part of parts) {
    if (part.sourceStart > cursor) {
      units.push({
        kind: 'separator',
        text: parse.text.slice(cursor, part.sourceStart),
        sourceStart: cursor,
        sourceEnd: part.sourceStart,
      });
    }
    if (part.sourceStart >= cursor) {
      units.push(part);
      cursor = part.sourceEnd;
    }
  }
  if (cursor < parse.text.length) {
    units.push({
      kind: 'separator',
      text: parse.text.slice(cursor),
      sourceStart: cursor,
      sourceEnd: parse.text.length,
    });
  }
  const numberedUnits = units.map((unit, index) => ({
    id: `source-unit-${index + 1}`,
    type: 'source-unit',
    version: 1,
    ...unit,
    provenance: createProvenance(`source-unit:${unit.kind}`),
  }));
  return {
    type: 'source-reconstruction',
    version: 1,
    language: parse.language,
    units: numberedUnits,
    sentences: parse.sentences.map((sentence) => ({
      id: sentence.id,
      tokenStart: sentence.tokenStart,
      tokenEnd: sentence.tokenEnd,
      sourceStart: sentence.sourceStart,
      sourceEnd: sentence.sourceEnd,
      unitIds: numberedUnits
        .filter((unit) => unitInsideRange(unit, sentence))
        .map((unit) => unit.id),
    })),
    provenance: createProvenance('source-reconstruction'),
  };
}

export function reconstructTextFromSourceReconstruction(sourceReconstruction) {
  if (!Array.isArray(sourceReconstruction?.units)) {
    return null;
  }
  return sourceReconstruction.units.map((unit) => unit.text ?? '').join('');
}

function unitInsideRange(unit, range) {
  return (
    unit.sourceStart >= range.sourceStart && unit.sourceEnd <= range.sourceEnd
  );
}
