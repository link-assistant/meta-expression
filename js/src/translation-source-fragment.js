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
