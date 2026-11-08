import { buildDietHistory, dailyAdherence, startMinutes, weeklyAdherence } from '@/lib/diet';
import type { Meal } from '@/lib/types';

const meals: Meal[] = [
  { name: 'Café da manhã', time: '7:30', options: ['a'] },
  { name: 'Pós-treino', time: '10:15 a 10:30', options: ['a'] },
  { name: 'Almoço', time: '12:30 a 13:00', options: ['a'] },
  { name: 'Lanche da tarde', time: '16:00', options: ['a'] },
  { name: 'Jantar', time: '19h30 - 20h', options: ['a'] },
  { name: 'Ceia', options: ['a'] },
];

const base = {
  meals,
  weekStart: '2026-11-02',
  today: '2026-11-07',
  now: new Date(2026, 10, 7, 17, 33),
};

test('startMinutes reads the first clock time', () => {
  expect(startMinutes('7:30')).toBe(450);
  expect(startMinutes('12:30 a 13:00')).toBe(750);
  expect(startMinutes('19h30 - 20h')).toBe(1170);
  expect(startMinutes('20h')).toBe(1200);
  expect(startMinutes(undefined)).toBeNull();
});

test('only one meal logged on the first day counts the meals already due', () => {
  const r = weeklyAdherence({
    ...base,
    todayLogs: new Map([['Café da manhã', 0]]),
    onPlanThisWeek: 1,
    firstLog: '2026-11-07',
  });
  expect(r).toEqual({ onPlan: 1, expected: 4 });
});

test('earlier days of the week count every meal, but not before the first log', () => {
  const r = weeklyAdherence({
    ...base,
    todayLogs: new Map([['Ceia', 0]]),
    onPlanThisWeek: 10,
    firstLog: '2026-11-05',
  });
  expect(r).toEqual({ onPlan: 10, expected: 2 * 6 + 5 });
  const fromMonday = weeklyAdherence({ ...base, todayLogs: new Map(), onPlanThisWeek: 0, firstLog: '2026-10-01' });
  expect(fromMonday.expected).toBe(5 * 6 + 4);
});

test('nothing logged yet means nothing to show', () => {
  expect(weeklyAdherence({ ...base, todayLogs: new Map(), onPlanThisWeek: 0, firstLog: null })).toEqual({
    onPlan: 0,
    expected: 0,
  });
});

test('daily adherence counts today only', () => {
  const logs = new Map([
    ['Café da manhã', 0],
    ['Pós-treino', -1],
  ]);
  expect(dailyAdherence(meals, logs, base.now)).toEqual({ onPlan: 1, expected: 4 });
  expect(dailyAdherence(meals, new Map(), new Date(2026, 10, 7, 6, 0))).toEqual({ onPlan: 0, expected: 0 });
});

describe('buildDietHistory', () => {
  const plan: Meal[] = [
    { name: 'Café da manhã', time: '7:30', options: ['ovos', 'iogurte'] },
    { name: 'Almoço', time: '12:30', options: ['frango', 'peixe'] },
    { name: 'Jantar', options: ['omelete'] },
  ];

  it('groups by day, newest first, with plan text, off-plan notes and gaps', () => {
    const days = buildDietHistory(
      plan,
      [
        { date: '2026-11-06', meal: 'Almoço', option_index: 1, note: null },
        { date: '2026-11-07', meal: 'Café da manhã', option_index: 0, note: null },
        { date: '2026-11-07', meal: 'Almoço', option_index: -1, note: 'pizza' },
        { date: '2026-11-07', meal: 'Lanche antigo', option_index: 0, note: null },
      ],
      new Map([['2026-11-07', 1800]]),
    );
    expect(days.map((d) => d.date)).toEqual(['2026-11-07', '2026-11-06']);
    expect(days[0]).toMatchObject({ onPlan: 2, logged: 3, waterMl: 1800 });
    expect(days[0].entries).toEqual([
      { meal: 'Café da manhã', time: '7:30', status: 'plan', option: 0, text: 'ovos' },
      { meal: 'Almoço', time: '12:30', status: 'off', text: 'pizza' },
      { meal: 'Jantar', time: undefined, status: 'none' },
      { meal: 'Lanche antigo', status: 'plan', option: 0 },
    ]);
    expect(days[1]).toMatchObject({ onPlan: 1, logged: 1, waterMl: 0 });
    expect(days[1].entries[1]).toMatchObject({ status: 'plan', text: 'peixe' });
  });

  it('no logs means no days', () => {
    expect(buildDietHistory(plan, [], new Map())).toEqual([]);
  });
});
