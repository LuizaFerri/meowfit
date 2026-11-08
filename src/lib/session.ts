export type SetEntry = { weight: string; reps: string };

export const setSignature = (e: SetEntry) => `${e.weight.trim()}|${e.reps.trim()}`;

export function isSetFinished(before: string | undefined, entry: SetEntry): boolean {
  const reps = entry.reps.trim();
  if (!reps) return false;
  const previousReps = before?.split('|')[1] ?? '';
  return reps !== previousReps;
}
