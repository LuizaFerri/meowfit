import { fmtHeightM, normalizeHeightCm, parseHeightCm } from '../format';
import * as q from '@/db/queries';
import { migrate } from '@/db/schema';
import { emptyPlan } from '@/lib/types';
import { memoryDb } from '@/test/memoryDb';

test('height can be typed in centimeters or meters', () => {
  expect(parseHeightCm('160')).toBe(160);
  expect(parseHeightCm('1,60')).toBe(160);
  expect(parseHeightCm('1.72')).toBe(172);
  expect(parseHeightCm('165,5')).toBe(165.5);
  expect(parseHeightCm('')).toBeNull();
  expect(parseHeightCm('0')).toBeNull();
  expect(normalizeHeightCm(null)).toBeNull();
});

test('height shows with two decimals in meters', () => {
  expect(fmtHeightM(160)).toBe('1,60 m');
  expect(fmtHeightM(172.5)).toBe('1,73 m');
});

test('a height saved in meters is read back in centimeters', async () => {
  const db = memoryDb();
  await migrate(db);
  const pid = await q.createProfile(db, 'Luiza', 1.6, emptyPlan('x'));
  expect((await q.getProfile(db, pid))?.height_cm).toBe(160);
});
