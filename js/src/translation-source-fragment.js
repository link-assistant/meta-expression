export function buildSemanticSourceFragment(phrase) {
  const fragmentIds = phrase.linguisticFragmentIds ?? [];
  if (!phrase.linguisticRole && fragmentIds.length === 0) {
    return null;
  }
  return {
    phraseId: phrase.id,
    role: phrase.linguisticRole ?? null,
    fragmentIds,
  };
}

export function reconstructSourceText(sourceReconstruction) {
  if (!Array.isArray(sourceReconstruction?.units)) {
    return null;
  }
  return sourceReconstruction.units.map((unit) => unit.text ?? '').join('');
}

export function segmentSemanticMetaLanguageSource(semantic) {
  const reconstructed = segmentSourceReconstruction(
    semantic?.sourceReconstruction
  );
  if (reconstructed.length > 0) {
    return reconstructed;
  }
  return segmentSourceText(semantic?.text ?? '');
}

function segmentSourceReconstruction(sourceReconstruction) {
  if (
    !Array.isArray(sourceReconstruction?.units) ||
    !Array.isArray(sourceReconstruction?.sentences)
  ) {
    return [];
  }
  const unitsById = new Map(
    sourceReconstruction.units.map((unit) => [unit.id, unit])
  );
  return sourceReconstruction.sentences
    .map((sentence) => {
      const units = sentence.unitIds
        .map((id) => unitsById.get(id))
        .filter(Boolean);
      const text = units
        .map((unit) => unit.text ?? '')
        .join('')
        .trim();
      if (!text) {
        return null;
      }
      return {
        text,
        start: sentence.sourceStart,
        end: sentence.sourceEnd,
      };
    })
    .filter(Boolean);
}

function segmentSourceText(text) {
  const source = String(text);
  const segments = [];
  const pattern = /\S[\s\S]*?(?:[.!?]+(?=\s|$)|$)/g;
  for (const match of source.matchAll(pattern)) {
    const raw = match[0];
    const leading = raw.search(/\S/);
    const start = (match.index ?? 0) + Math.max(leading, 0);
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }
    segments.push({
      text: trimmed,
      start,
      end: start + trimmed.length,
    });
  }
  return segments.length
    ? segments
    : [{ text: source, start: 0, end: source.length }];
}
