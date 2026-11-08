import { samplePlan } from '@/data/samplePlan';
import { parsePlanText } from '@/lib/planText';
import { missedStreak, pickToday, shouldSuggestChange, stampTreino, trainingWeekdays, weeksOnPlan } from '@/lib/workout';

test('weekday plans pick the matching day, weekends are rest', () => {
  const plan = samplePlan();
  expect(pickToday(plan, null, new Date(2026, 10, 2))).toBe(0);
  expect(pickToday(plan, null, new Date(2026, 10, 6))).toBe(4);
  expect(pickToday(plan, 'Sexta', new Date(2026, 10, 7))).toBeNull();
});

test('rotating plans continue after the last workout', () => {
  const { plan } = parsePlanText('Treino A\nSupino: 3 x 10\nTreino B\nRemada: 3 x 10\nTreino C\nAgachamento: 3 x 10');
  const sat = new Date(2026, 10, 7);
  expect(pickToday(plan, null, sat)).toBe(0);
  expect(pickToday(plan, 'Treino A', sat)).toBe(1);
  expect(pickToday(plan, 'Treino C', sat)).toBe(0);
});

describe('regra das duas faltas', () => {
  const plan = samplePlan();
  const trainingDays = trainingWeekdays(plan);
  const mon = new Date(2026, 10, 9);
  const tue = new Date(2026, 10, 10);
  const wed = new Date(2026, 10, 11);

  it('weekends never count', () => {
    expect([...trainingDays].sort()).toEqual([1, 2, 3, 4, 5]);
    const done = new Set(['2026-11-06']);
    expect(missedStreak({ trainingDays, doneDates: done, today: mon, since: '2026-11-01' })).toBe(0);
  });

  it('counts consecutive missed training days', () => {
    const done = new Set(['2026-11-06']);
    expect(missedStreak({ trainingDays, doneDates: done, today: tue, since: '2026-11-01' })).toBe(1);
    expect(missedStreak({ trainingDays, doneDates: done, today: wed, since: '2026-11-01' })).toBe(2);
  });

  it('a weekend workout resets the streak, and nothing counts before the first workout', () => {
    expect(missedStreak({ trainingDays, doneDates: new Set(['2026-11-08']), today: tue, since: '2026-11-01' })).toBe(1);
    expect(missedStreak({ trainingDays, doneDates: new Set(), today: wed, since: null })).toBe(0);
    expect(missedStreak({ trainingDays, doneDates: new Set(['2026-11-10']), today: wed, since: '2026-11-10' })).toBe(0);
  });

  it('rotating plans use monday to friday', () => {
    const { plan: rot } = parsePlanText('Treino A\nSupino: 3 x 10\nTreino B\nRemada: 3 x 10');
    expect([...trainingWeekdays(rot)].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('troca de treino', () => {
  it('suggests a change after 8 weeks, respecting snooze', () => {
    const plan = { ...samplePlan(), treinoSince: '2026-09-01' };
    expect(weeksOnPlan('2026-09-01', '2026-10-26')).toBe(7);
    expect(shouldSuggestChange(plan, null, '2026-10-26')).toBeNull();
    expect(shouldSuggestChange(plan, null, '2026-10-27')).toBe(8);
    expect(shouldSuggestChange({ ...plan, treinoSnooze: '2026-11-10' }, null, '2026-10-27')).toBeNull();
    expect(shouldSuggestChange({ ...samplePlan() }, '2026-09-01', '2026-10-27')).toBe(8);
    expect(stampTreino(plan, '2026-11-07')).toMatchObject({ treinoSince: '2026-11-07', treinoSnooze: undefined });
  });
});
