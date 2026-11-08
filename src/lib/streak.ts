import { addDays, addWeeks, parseISO, startOfWeek } from 'date-fns';
import { toKey } from './dates';
import type { Plan } from './types';

export type StreakState = 'feito' | 'pendente' | 'risco' | 'zerada' | 'descanso';

export type Streak = {
  unit: 'treinos' | 'semanas';
  count: number;
  best: number;
  misses: number;
  state: StreakState;
};

export type ScheduleEntry = { since: string; weekdays: number[] };

export const SCHEDULE_START = '0000-01-01';

const MISSES_TO_BREAK = 2;

export const fixedWeekdays = (plan: Plan) =>
  [...new Set(plan.days.map((d) => d.weekday).filter((w): w is number => w !== null))].sort();

export function computeStreak(
  plan: Plan,
  doneDates: Iterable<string>,
  today = new Date(),
  schedule: ScheduleEntry[] = [],
): Streak | null {
  if (plan.days.length === 0) return null;
  const done = new Set(doneDates);
  const current = fixedWeekdays(plan);
  const first = [...done].sort()[0] ?? null;
  if (current.length === 0) return weeklyStreak(Math.min(7, plan.days.length), done, first, today);
  const sorted = [...schedule].sort((a, b) => a.since.localeCompare(b.since));
  const daysOn = (key: string): Set<number> => {
    let found: number[] | null = null;
    for (const e of sorted) if (e.since <= key) found = e.weekdays;
    return new Set(found ?? current);
  };
  return dailyStreak(daysOn, new Set(current), done, first, today);
}

function dailyStreak(
  daysOn: (key: string) => Set<number>,
  todayDays: Set<number>,
  done: Set<string>,
  first: string | null,
  today: Date,
): Streak {
  const todayKey = toKey(today);
  let count = 0;
  let best = 0;
  let misses = 0;
  if (first && first <= todayKey) {
    for (let d = parseISO(first); toKey(d) <= todayKey; d = addDays(d, 1)) {
      const key = toKey(d);
      if (done.has(key)) {
        count++;
        misses = 0;
      } else if (key !== todayKey && daysOn(key).has(d.getDay())) {
        misses++;
        if (misses >= MISSES_TO_BREAK) count = 0;
      }
      best = Math.max(best, count);
    }
  }
  const state: StreakState = done.has(todayKey)
    ? 'feito'
    : !todayDays.has(today.getDay())
      ? 'descanso'
      : stateFor(count, misses);
  return { unit: 'treinos', count, best, misses, state };
}

function weeklyStreak(goal: number, done: Set<string>, first: string | null, today: Date): Streak {
  const weekOf = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });
  const perWeek = new Map<string, number>();
  for (const key of done) {
    const w = toKey(weekOf(parseISO(key)));
    perWeek.set(w, (perWeek.get(w) ?? 0) + 1);
  }
  const current = toKey(weekOf(today));
  let count = 0;
  let best = 0;
  let misses = 0;
  if (first && first <= toKey(today)) {
    for (let w = weekOf(parseISO(first)); toKey(w) <= current; w = addWeeks(w, 1)) {
      const key = toKey(w);
      if ((perWeek.get(key) ?? 0) >= goal) {
        count++;
        misses = 0;
      } else if (key !== current) {
        misses++;
        if (misses >= MISSES_TO_BREAK) count = 0;
      }
      best = Math.max(best, count);
    }
  }
  const state: StreakState = (perWeek.get(current) ?? 0) >= goal ? 'feito' : stateFor(count, misses);
  return { unit: 'semanas', count, best, misses, state };
}

function stateFor(count: number, misses: number): StreakState {
  if (misses >= MISSES_TO_BREAK) return 'zerada';
  if (misses === 1 && count > 0) return 'risco';
  return 'pendente';
}

export function nextSchedule(history: ScheduleEntry[], before: Plan | null, after: Plan, today: string): ScheduleEntry[] | null {
  const next = fixedWeekdays(after);
  const list = [...history];
  if (list.length === 0) {
    const prev = before ? fixedWeekdays(before) : next;
    list.push({ since: SCHEDULE_START, weekdays: prev });
  }
  const last = list[list.length - 1];
  if (last.weekdays.join(',') === next.join(',')) return list.length === history.length ? null : list;
  if (last.since === today) list[list.length - 1] = { since: today, weekdays: next };
  else list.push({ since: today, weekdays: next });
  return list;
}

export function streakLabel(s: Streak): string {
  if (s.unit === 'semanas') return s.count === 1 ? 'semana na sequência' : 'semanas na sequência';
  return s.count === 1 ? 'treino na sequência' : 'treinos na sequência';
}

export function streakMessage(s: Streak): string {
  const weekly = s.unit === 'semanas';
  if (s.state === 'feito') return weekly ? 'Meta da semana batida! Sequência garantida.' : 'Treino de hoje feito! Sequência garantida.';
  if (s.state === 'descanso') return s.count > 0 ? 'Dia de descanso: sua sequência está segura.' : 'Dia de descanso. A sequência começa no próximo treino.';
  if (s.state === 'risco')
    return weekly ? 'Você não bateu a meta na semana passada: nesta não pode faltar!' : 'Você faltou no último treino: hoje não pode faltar!';
  if (s.state === 'zerada')
    return weekly
      ? 'Duas semanas abaixo da meta zeraram a sequência. Recomece nesta: o mínimo viável já conta.'
      : 'Duas faltas seguidas zeraram a sequência. Volte hoje, nem que seja o mínimo viável: só os 3 primeiros exercícios, uns 30 minutos.';
  if (s.count === 0) return weekly ? 'Bata a meta desta semana para começar uma sequência.' : 'Treine hoje para começar uma sequência.';
  return weekly ? 'Bata a meta desta semana para a sequência crescer.' : `Treine hoje para chegar a ${s.count + 1}.`;
}
