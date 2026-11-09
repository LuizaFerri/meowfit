import { fullPlan } from '@/test/fullPlan';
import { makeBackup } from '../backup';
import { backupHash, backupSignature, cloudConflict, decideLink, hashString, isLinked, validCode, validEmail } from '../cloudLogic';
import * as q from '@/db/queries';
import { migrate } from '@/db/schema';
import { memoryDb } from '@/test/memoryDb';

test('what happens when someone signs in', () => {
  expect(decideLink({ hasLocal: true, hasCloud: false })).toBe('upload');
  expect(decideLink({ hasLocal: false, hasCloud: true })).toBe('restore');
  expect(decideLink({ hasLocal: true, hasCloud: true })).toBe('choose');
  expect(decideLink({ hasLocal: false, hasCloud: false })).toBe('signup');
});

test('a device only syncs the profile linked to the signed-in account', () => {
  const link = { userId: 'u1', pid: 3 };
  expect(isLinked(link, 'u1', 3)).toBe(true);
  expect(isLinked(link, 'u2', 3)).toBe(false);
  expect(isLinked(link, 'u1', 4)).toBe(false);
  expect(isLinked(null, 'u1', 3)).toBe(false);
  expect(isLinked(link, null, 3)).toBe(false);
});

test('the signature ignores the export time, so unchanged data is not sent again', async () => {
  const db = memoryDb();
  await migrate(db);
  const pid = await q.createProfile(db, 'Luiza', 160, fullPlan());
  const a = await makeBackup(db, pid);
  const b = { ...(await makeBackup(db, pid)), exportedAt: '2030-01-01T00:00:00.000Z' };
  expect(backupSignature(a)).toBe(backupSignature(b));
  await q.addWater(db, pid, '2026-11-09', 250);
  expect(backupSignature(await makeBackup(db, pid))).not.toBe(backupSignature(a));
});

test('email and code validation', () => {
  expect(validEmail('luiza@email.com')).toBe(true);
  expect(validEmail(' luiza@email.com ')).toBe(true);
  expect(validEmail('luiza@')).toBe(false);
  expect(validCode('123456')).toBe(true);
  expect(validCode('75284495')).toBe(true);
  expect(validCode('12345678901')).toBe(false);
  expect(validCode('12345')).toBe(false);
  expect(validCode('12a456')).toBe(false);
});

test('a newer save from another device is a conflict', () => {
  const mine = '2026-11-09T12:00:00.000Z';
  expect(cloudConflict(mine, '2026-11-09T12:00:00.000+00:00')).toBe(false);
  expect(cloudConflict(mine, '2026-11-09T12:00:00.4+00:00')).toBe(false);
  expect(cloudConflict(mine, '2026-11-09T12:05:00+00:00')).toBe(true);
  expect(cloudConflict(mine, '2026-11-09T11:00:00+00:00')).toBe(false);
  expect(cloudConflict(null, '2026-11-09T12:05:00+00:00')).toBe(false);
  expect(cloudConflict(mine, null)).toBe(false);
});

test('the stored signature is a short hash that changes with the data', async () => {
  expect(hashString('abc')).toMatch(/^[0-9a-f]{16}$/);
  expect(hashString('abc')).toBe(hashString('abc'));
  expect(hashString('abc')).not.toBe(hashString('abd'));
  const db = memoryDb();
  await migrate(db);
  const pid = await q.createProfile(db, 'Luiza', 160, fullPlan());
  const before = backupHash(await makeBackup(db, pid));
  await q.addWater(db, pid, '2026-11-09', 250);
  expect(backupHash(await makeBackup(db, pid))).not.toBe(before);
});
