import { celebrationFor } from '../celebrate';
import { SCHEDULE_START, computeStreak, nextSchedule, streakMessage } from '../streak';
import { emptyPlan, type Plan } from '../types';

const day = (label: string, weekday: number | null) => ({ label, weekday, title: '', exercises: [] });
const fixedPlan = (): Plan => ({ ...emptyPlan('x'), days: [day('Seg', 1), day('Qua', 3), day('Sex', 5)] });
const rotatingPlan = (): Plan => ({ ...emptyPlan('x'), days: [day('A', null), day('B', null)] });
const at = (key: string) => new Date(`${key}T12:00:00`);

test('no plan, no streak', () => {
  expect(computeStreak(emptyPlan('x'), [], at('2026-11-09'))).toBeNull();
});

test('counts workouts on chosen days and ignores rest days', () => {
  const s = computeStreak(fixedPlan(), ['2026-11-02', '2026-11-04', '2026-11-06'], at('2026-11-08'))!;
  expect(s).toEqual({ unit: 'treinos', count: 3, best: 3, misses: 0, state: 'descanso' });
});

test('today counts once done, and a pending training day does not break', () => {
  const done = ['2026-11-02', '2026-11-04', '2026-11-06'];
  expect(computeStreak(fixedPlan(), done, at('2026-11-09'))!.state).toBe('pendente');
  expect(computeStreak(fixedPlan(), done, at('2026-11-09'))!.count).toBe(3);
  const s = computeStreak(fixedPlan(), [...done, '2026-11-09'], at('2026-11-09'))!;
  expect(s.count).toBe(4);
  expect(s.state).toBe('feito');
});

test('one missed training day is forgiven but puts the streak at risk', () => {
  const s = computeStreak(fixedPlan(), ['2026-11-02', '2026-11-04'], at('2026-11-09'))!;
  expect(s.count).toBe(2);
  expect(s.state).toBe('risco');
  expect(streakMessage(s)).toContain('não pode faltar');
});

test('two missed training days in a row reset the streak but keep the record', () => {
  const s = computeStreak(fixedPlan(), ['2026-11-02', '2026-11-04'], at('2026-11-11'))!;
  expect(s).toMatchObject({ count: 0, best: 2, misses: 2, state: 'zerada' });
  expect(streakMessage(s)).toContain('mínimo viável');
});

test('a workout on a rest day adds to the streak', () => {
  const s = computeStreak(fixedPlan(), ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-07'], at('2026-11-08'))!;
  expect(s.count).toBe(4);
});

test('a rest-day workout clears a pending miss', () => {
  const s = computeStreak(fixedPlan(), ['2026-11-02', '2026-11-05', '2026-11-09'], at('2026-11-09'))!;
  expect(s).toMatchObject({ count: 3, state: 'feito' });
});

test('rotating plans count weeks that reached the goal', () => {
  const done = ['2026-10-26', '2026-10-28', '2026-11-03', '2026-11-05', '2026-11-09'];
  const s = computeStreak(rotatingPlan(), done, at('2026-11-10'))!;
  expect(s.unit).toBe('semanas');
  expect(s.count).toBe(2);
  expect(s.state).toBe('pendente');
  expect(computeStreak(rotatingPlan(), [...done, '2026-11-10'], at('2026-11-10'))).toMatchObject({ count: 3, state: 'feito' });
});

test('rotating plans forgive one short week and reset after two', () => {
  const done = ['2026-10-19', '2026-10-21'];
  expect(computeStreak(rotatingPlan(), done, at('2026-10-27'))).toMatchObject({ count: 1, state: 'pendente' });
  expect(computeStreak(rotatingPlan(), done, at('2026-11-03'))).toMatchObject({ count: 1, state: 'risco' });
  expect(computeStreak(rotatingPlan(), done, at('2026-11-10'))).toMatchObject({ count: 0, best: 1, state: 'zerada' });
});

test('changing training days does not turn old days into misses', () => {
  const tueThu: Plan = { ...emptyPlan('x'), days: [day('Ter', 2), day('Qui', 4)] };
  const done = ['2026-11-02', '2026-11-06', '2026-11-10'];
  expect(computeStreak(tueThu, done, at('2026-11-10'))).toMatchObject({ count: 2 });
  const schedule = [
    { since: SCHEDULE_START, weekdays: [1, 3, 5] },
    { since: '2026-11-08', weekdays: [2, 4] },
  ];
  expect(computeStreak(tueThu, done, at('2026-11-10'), schedule)).toMatchObject({ count: 3, state: 'feito' });
  expect(computeStreak(tueThu, done, at('2026-11-13'), schedule)).toMatchObject({ count: 3, misses: 1, state: 'descanso' });
});

test('schedule history records only real changes', () => {
  const mwf = fixedPlan();
  const tueThu: Plan = { ...emptyPlan('x'), days: [day('Ter', 2), day('Qui', 4)] };
  expect(nextSchedule([], null, mwf, '2026-11-01')).toEqual([{ since: SCHEDULE_START, weekdays: [1, 3, 5] }]);
  const first = [{ since: SCHEDULE_START, weekdays: [1, 3, 5] }];
  expect(nextSchedule(first, mwf, mwf, '2026-11-08')).toBeNull();
  expect(nextSchedule(first, mwf, tueThu, '2026-11-08')).toEqual([...first, { since: '2026-11-08', weekdays: [2, 4] }]);
  expect(nextSchedule([], mwf, tueThu, '2026-11-08')).toEqual([...first, { since: '2026-11-08', weekdays: [2, 4] }]);
  const twice = nextSchedule(nextSchedule(first, mwf, tueThu, '2026-11-08')!, tueThu, mwf, '2026-11-08');
  expect(twice).toEqual([first[0], { since: '2026-11-08', weekdays: [1, 3, 5] }]);
});

test('celebrates only when the streak grows, and flags a new record', () => {
  const done = ['2026-11-02', '2026-11-04', '2026-11-06'];
  expect(celebrationFor(fixedPlan(), done, [], at('2026-11-06'))).toEqual({
    title: '🔥 3 treinos na sequência!',
    message: expect.stringContaining('Novo recorde'),
  });
  expect(celebrationFor(fixedPlan(), ['2026-11-06'], [], at('2026-11-06'))!.message).toContain('começada');
  expect(celebrationFor(fixedPlan(), done, [], at('2026-11-07'))).toBeNull();
  const comeback = ['2026-10-26', '2026-10-28', '2026-10-30', '2026-11-06', '2026-11-09'];
  expect(celebrationFor(fixedPlan(), comeback, [], at('2026-11-09'))!.message).not.toContain('recorde');
});
