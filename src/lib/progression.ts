import type { Exercise } from './types';

export type LoggedSet = { set_index: number; weight: number | null; reps: string | null };

export type Suggestion = { from: number; to: number; sessions: number };

export const nextLoad = (w: number) => Math.round((w + (w < 10 ? 1 : 2.5)) * 10) / 10;

function targetReps(e: Exercise): number | null {
  const m = e.reps?.match(/^\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function completedAt(e: Exercise, sets: LoggedSet[]): number | null {
  if (!e.sets || sets.length < e.sets) return null;
  const goal = targetReps(e);
  const weights = new Set<number>();
  for (let i = 0; i < e.sets; i++) {
    const s = sets.find((x) => x.set_index === i);
    if (!s || s.weight === null || s.weight <= 0) return null;
    const reps = s.reps ? parseInt(s.reps, 10) : NaN;
    if (goal !== null && Number.isFinite(reps) && reps < goal) return null;
    weights.add(s.weight);
  }
  return weights.size === 1 ? [...weights][0] : null;
}

export function suggestIncrease(e: Exercise, sessionsNewestFirst: LoggedSet[][], needed = 2): Suggestion | null {
  if (!e.load || !e.sets || sessionsNewestFirst.length < needed) return null;
  const loads = sessionsNewestFirst.slice(0, needed).map((s) => completedAt(e, s));
  if (loads.some((w) => w === null) || new Set(loads).size !== 1) return null;
  const from = loads[0]!;
  return { from, to: nextLoad(from), sessions: needed };
}
