import { fullPlan } from '@/test/fullPlan';
import { parsePlanText } from '@/lib/planText';
import { pickToday, shouldSuggestChange, stampTreino, weeksOnPlan } from '@/lib/workout';

test('weekday plans pick the matching day, weekends are rest', () => {
  const plan = fullPlan();
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

describe('troca de treino', () => {
  it('suggests a change after 8 weeks, respecting snooze', () => {
    const plan = { ...fullPlan(), treinoSince: '2026-09-01' };
    expect(weeksOnPlan('2026-09-01', '2026-10-26')).toBe(7);
    expect(shouldSuggestChange(plan, null, '2026-10-26')).toBeNull();
    expect(shouldSuggestChange(plan, null, '2026-10-27')).toBe(8);
    expect(shouldSuggestChange({ ...plan, treinoSnooze: '2026-11-10' }, null, '2026-10-27')).toBeNull();
    expect(shouldSuggestChange({ ...fullPlan() }, '2026-09-01', '2026-10-27')).toBe(8);
    expect(stampTreino(plan, '2026-11-07')).toMatchObject({ treinoSince: '2026-11-07', treinoSnooze: undefined });
  });
});
