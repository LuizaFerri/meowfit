import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { Meal } from './types';
import type { MealLogRow } from '@/db/queries';

export function startMinutes(time?: string): number | null {
  const m = time?.match(/(\d{1,2})(?::|h)(\d{2})?/);
  return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : null;
}

export type Adherence = { onPlan: number; expected: number };

export function weeklyAdherence({
  meals,
  todayLogs,
  onPlanThisWeek,
  weekStart,
  firstLog,
  today,
  now,
}: {
  meals: Meal[];
  todayLogs: Map<string, number>;
  onPlanThisWeek: number;
  weekStart: string;
  firstLog: string | null;
  today: string;
  now: Date;
}): Adherence {
  if (!firstLog || meals.length === 0) return { onPlan: 0, expected: 0 };
  const start = firstLog > weekStart ? firstLog : weekStart;
  const pastDays = Math.max(0, differenceInCalendarDays(parseISO(today), parseISO(start)));
  const expected = pastDays * meals.length + dueToday(meals, todayLogs, now);
  return { onPlan: Math.min(onPlanThisWeek, expected), expected };
}

function dueToday(meals: Meal[], todayLogs: Map<string, number>, now: Date): number {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return meals.filter((m) => {
    if (todayLogs.has(m.name)) return true;
    const t = startMinutes(m.time);
    return t !== null && t <= nowMin;
  }).length;
}

export function dailyAdherence(meals: Meal[], todayLogs: Map<string, number>, now: Date): Adherence {
  const onPlan = meals.filter((m) => (todayLogs.get(m.name) ?? -1) >= 0).length;
  return { onPlan, expected: dueToday(meals, todayLogs, now) };
}

export type HistoryEntry = {
  meal: string;
  time?: string;
  status: 'plan' | 'off' | 'none';
  option?: number;
  text?: string;
};

export type HistoryDay = { date: string; entries: HistoryEntry[]; onPlan: number; logged: number; waterMl: number };

export function buildDietHistory(meals: Meal[], rows: MealLogRow[], water: Map<string, number>): HistoryDay[] {
  const byDate = new Map<string, Map<string, MealLogRow>>();
  rows.forEach((r) => {
    if (!byDate.has(r.date)) byDate.set(r.date, new Map());
    byDate.get(r.date)!.set(r.meal, r);
  });

  return [...byDate.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const logs = byDate.get(date)!;
      const planned = meals.map<HistoryEntry>((m) => {
        const r = logs.get(m.name);
        if (!r) return { meal: m.name, time: m.time, status: 'none' };
        if (r.option_index < 0) return { meal: m.name, time: m.time, status: 'off', text: r.note ?? undefined };
        return { meal: m.name, time: m.time, status: 'plan', option: r.option_index, text: m.options[r.option_index] };
      });
      const known = new Set(meals.map((m) => m.name));
      const removed = [...logs.values()]
        .filter((r) => !known.has(r.meal))
        .map<HistoryEntry>((r) =>
          r.option_index < 0
            ? { meal: r.meal, status: 'off', text: r.note ?? undefined }
            : { meal: r.meal, status: 'plan', option: r.option_index },
        );
      const entries = [...planned, ...removed];
      return {
        date,
        entries,
        onPlan: entries.filter((e) => e.status === 'plan').length,
        logged: entries.filter((e) => e.status !== 'none').length,
        waterMl: water.get(date) ?? 0,
      };
    });
}
