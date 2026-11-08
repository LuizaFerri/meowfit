import { emptyPlan, type Plan } from '../types';
import { workoutReminderSlots } from '../workoutReminder';

const day = (label: string, weekday: number | null, title = '') => ({ label, weekday, title, exercises: [] });
const fixed = (): Plan => ({ ...emptyPlan('x'), days: [day('Segunda', 1, 'pernas'), day('Quarta', 3), day('Sexta', 5)] });
const rotating = (): Plan => ({ ...emptyPlan('x'), days: [day('Treino A', null), day('Treino B', null)] });
const on = { enabled: true, atMin: 18 * 60 };
const monMorning = new Date(2026, 10, 9, 9, 0);

test('nothing when disabled or without a plan', () => {
  expect(workoutReminderSlots(fixed(), { ...on, enabled: false }, monMorning, false, null)).toEqual([]);
  expect(workoutReminderSlots(emptyPlan('x'), on, monMorning, false, null)).toEqual([]);
});

test('fixed plans remind on training days at the chosen time', () => {
  const slots = workoutReminderSlots(fixed(), on, monMorning, false, null);
  expect(slots.map((s) => [s.at.getDate(), s.at.getHours()])).toEqual([
    [9, 18],
    [11, 18],
    [13, 18],
  ]);
  expect(slots[0]).toMatchObject({ title: 'Hora do treino! 🐾', body: 'Seu treino de hoje: Segunda · pernas' });
});

test('skips today when already trained or the time has passed', () => {
  expect(workoutReminderSlots(fixed(), on, monMorning, true, null)[0].at.getDate()).toBe(11);
  expect(workoutReminderSlots(fixed(), on, new Date(2026, 10, 9, 19), false, null)[0].at.getDate()).toBe(11);
});

test('today gets an urgent message when the streak is at risk or reset', () => {
  const risk = { unit: 'treinos' as const, count: 5, best: 5, misses: 1, state: 'risco' as const };
  const [today, next] = workoutReminderSlots(fixed(), on, monMorning, false, risk);
  expect(today).toMatchObject({ title: 'Hoje não pode faltar! 🔥', body: expect.stringContaining('5 treinos') });
  expect(next.title).toBe('Hora do treino! 🐾');
  const reset = { ...risk, count: 0, misses: 2, state: 'zerada' as const };
  expect(workoutReminderSlots(fixed(), on, monMorning, false, reset)[0].title).toBe('Volte hoje! 🔥');
});

test('rotating plans remind daily until the weekly goal is met', () => {
  expect(workoutReminderSlots(rotating(), on, monMorning, false, null)).toHaveLength(7);
  const met = { unit: 'semanas' as const, count: 2, best: 2, misses: 0, state: 'feito' as const };
  const slots = workoutReminderSlots(rotating(), on, new Date(2026, 10, 12, 9), false, met);
  expect(slots.map((s) => s.at.getDate())).toEqual([16, 17, 18]);
});
