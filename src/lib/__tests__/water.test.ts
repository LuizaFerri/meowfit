import { DEFAULT_WATER_REMINDER, fmtClock, waterSlots } from '@/lib/water';

const on = { ...DEFAULT_WATER_REMINDER, enabled: true };

test('slots every 2 h from 8h to 22h, only in the future', () => {
  const now = new Date(2026, 10, 7, 13, 0);
  const slots = waterSlots(on, now, false, 2);
  expect(slots.slice(0, 5).map((d) => `${d.getDate()} ${d.getHours()}`)).toEqual(['7 14', '7 16', '7 18', '7 20', '7 22']);
  expect(slots).toHaveLength(5 + 8);
});

test('skips today once the goal is reached, and nothing when disabled', () => {
  const now = new Date(2026, 10, 7, 13, 0);
  expect(waterSlots(on, now, true, 2).every((d) => d.getDate() === 8)).toBe(true);
  expect(waterSlots(DEFAULT_WATER_REMINDER, now, false)).toEqual([]);
});

test('fmtClock', () => {
  expect(fmtClock(480)).toBe('8h');
  expect(fmtClock(570)).toBe('9h30');
});
