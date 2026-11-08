import { nextLoad, suggestIncrease, type LoggedSet } from '@/lib/progression';
import type { Exercise } from '@/lib/types';

const leg: Exercise = { id: 'leg', name: 'Leg press', sets: 3, reps: '12', load: true };
const session = (w: number, reps: (string | null)[] = ['12', '12', '12']): LoggedSet[] =>
  reps.map((r, i) => ({ set_index: i, weight: w, reps: r }));

test('suggests more load after two complete sessions at the same weight', () => {
  expect(suggestIncrease(leg, [session(40), session(40)])).toEqual({ from: 40, to: 42.5, sessions: 2 });
  expect(suggestIncrease(leg, [session(40, [null, null, null]), session(40)])).toEqual({ from: 40, to: 42.5, sessions: 2 });
});

test('no suggestion when reps fell short, loads differ, sets are missing or history is short', () => {
  expect(suggestIncrease(leg, [session(40, ['12', '10', '12']), session(40)])).toBeNull();
  expect(suggestIncrease(leg, [session(42.5), session(40)])).toBeNull();
  expect(suggestIncrease(leg, [session(40).slice(0, 2), session(40)])).toBeNull();
  expect(suggestIncrease(leg, [session(40)])).toBeNull();
  expect(suggestIncrease({ ...leg, load: false }, [session(40), session(40)])).toBeNull();
});

test('small loads go up by 1 kg', () => {
  expect(nextLoad(6)).toBe(7);
  expect(nextLoad(20)).toBe(22.5);
  const lunge: Exercise = { id: 'a', name: 'Afundo', sets: 2, reps: '10 cada perna', load: true };
  expect(suggestIncrease(lunge, [session(8, ['10', '10']), session(8, ['10', '11'])])).toEqual({ from: 8, to: 9, sessions: 2 });
});
