import { differenceInCalendarDays, parseISO } from 'date-fns';
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

export const WALK_LABEL = 'Caminhada';

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
