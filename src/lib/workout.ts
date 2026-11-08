import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { toKey } from './dates';
import type { Plan, WorkoutDay } from './types';

export function pickToday(plan: Plan, lastLabel: string | null, date = new Date()): number | null {
  const byWeekday = plan.days.findIndex((d) => d.weekday === date.getDay());
  if (byWeekday >= 0) return byWeekday;
  const rotating = plan.days.map((d, i) => ({ d, i })).filter(({ d }) => d.weekday === null);
  if (rotating.length === 0) return null;
  const lastPos = rotating.findIndex(({ d }) => d.label === lastLabel);
  return rotating[(lastPos + 1) % rotating.length].i;
}

export const dayName = (d: WorkoutDay) => (d.title ? `${d.label} · ${d.title}` : d.label);

export const target = (e: { sets?: number; reps?: string; note?: string }) =>
  e.sets !== undefined ? `${e.sets} × ${e.reps ?? ''}` : (e.note ?? '');

const WEEKEND = new Set([0, 6]);

export function trainingWeekdays(plan: Plan): Set<number> {
  const fixed = plan.days.map((d) => d.weekday).filter((w): w is number => w !== null && !WEEKEND.has(w));
  return new Set(fixed.length > 0 ? fixed : [1, 2, 3, 4, 5]);
}

export function missedStreak({
  trainingDays,
  doneDates,
  today,
  since,
}: {
  trainingDays: Set<number>;
  doneDates: Set<string>;
  today: Date;
  since: string | null;
}): number {
  if (!since) return 0;
  let streak = 0;
  for (let i = 1, d = addDays(today, -1); i <= 60 && toKey(d) >= since; i++, d = addDays(d, -1)) {
    if (doneDates.has(toKey(d))) break;
    if (trainingDays.has(d.getDay())) streak++;
  }
  return streak;
}

export const CHANGE_AFTER_WEEKS = 8;

export function weeksOnPlan(since: string | null | undefined, today: string): number {
  if (!since) return 0;
  return Math.floor(differenceInCalendarDays(parseISO(today), parseISO(since)) / 7);
}

export function shouldSuggestChange(plan: Plan, fallbackSince: string | null, today: string): number | null {
  if (plan.days.length === 0) return null;
  if (plan.treinoSnooze && today < plan.treinoSnooze) return null;
  const weeks = weeksOnPlan(plan.treinoSince ?? fallbackSince, today);
  return weeks >= CHANGE_AFTER_WEEKS ? weeks : null;
}

export const stampTreino = (plan: Plan, today: string): Plan => ({
  ...plan,
  treinoSince: today,
  treinoSnooze: undefined,
});
