import { addDays, startOfDay, startOfWeek } from 'date-fns';
import type { Streak } from './streak';
import type { Plan } from './types';
import { dayName } from './workout';

export type WorkoutReminder = { enabled: boolean; atMin: number };

export const DEFAULT_WORKOUT_REMINDER: WorkoutReminder = { enabled: false, atMin: 18 * 60 };

export const workoutReminderKey = (pid: number) => `workout_reminder:${pid}`;

export type ReminderSlot = { at: Date; title: string; body: string };

export function workoutReminderSlots(
  plan: Plan,
  r: WorkoutReminder,
  now: Date,
  doneToday: boolean,
  streak: Streak | null,
  days = 7,
): ReminderSlot[] {
  if (!r.enabled || plan.days.length === 0) return [];
  const rotating = plan.days.every((d) => d.weekday === null);
  const weekGoalMet = rotating && streak?.state === 'feito';
  const thisWeek = startOfWeek(now, { weekStartsOn: 1 }).getTime();
  const out: ReminderSlot[] = [];
  for (let d = 0; d < days; d++) {
    const day = startOfDay(addDays(now, d));
    const at = new Date(day.getTime() + r.atMin * 60_000);
    if (at <= now || (d === 0 && doneToday)) continue;
    const planDay = rotating ? null : plan.days.find((p) => p.weekday === day.getDay());
    if (!rotating && !planDay) continue;
    if (weekGoalMet && startOfWeek(day, { weekStartsOn: 1 }).getTime() === thisWeek) continue;
    const urgent = d === 0 && streak && (streak.state === 'risco' || streak.state === 'zerada');
    out.push(
      urgent && streak.state === 'risco'
        ? {
            at,
            title: 'Hoje não pode faltar! 🔥',
            body: `Sua sequência de ${streak.count} ${streak.unit} está em risco. Bora treinar?`,
          }
        : urgent
          ? { at, title: 'Volte hoje! 🔥', body: 'Recomece sua sequência: o mínimo viável já conta.' }
          : { at, title: 'Hora do treino! 🐾', body: planDay ? `Seu treino de hoje: ${dayName(planDay)}` : 'Bora treinar? Seu próximo treino está te esperando.' },
    );
  }
  return out;
}
