import { fullPlan } from '@/test/fullPlan';
import { makeBackup, parseJsonFile, restoreBackup } from '@/lib/backup';
import * as q from '../queries';
import { migrate } from '../schema';
import { memoryDb } from '@/test/memoryDb';

async function setup() {
  const db = memoryDb();
  await migrate(db);
  await migrate(db);
  const pid = await q.createProfile(db, 'Luiza', 160, fullPlan());
  return { db, pid };
}

test('profiles and active profile', async () => {
  const { db, pid } = await setup();
  expect(await q.getActiveProfileId(db)).toBe(pid);
  const other = await q.createProfile(db, 'Ana', null, fullPlan());
  await q.setActiveProfileId(db, other);
  expect(await q.getActiveProfileId(db)).toBe(other);
  expect((await q.getProfile(db, pid))?.plan.days).toHaveLength(5);
  expect((await q.listProfiles(db)).map((p) => p.name)).toEqual(['Ana', 'Luiza']);
});

test('previous sets come from the latest earlier session', async () => {
  const { db, pid } = await setup();
  const k = q.exKey('Leg press');
  await q.upsertSet(db, pid, k, '2026-11-02', 0, 40, '12');
  await q.upsertSet(db, pid, k, '2026-11-02', 1, 40, '12');
  await q.upsertSet(db, pid, k, '2026-11-04', 0, 45, '12');
  await q.upsertSet(db, pid, k, '2026-11-04', 0, 50, '10');
  await q.upsertSet(db, pid, k, '2026-11-07', 0, 55, null);

  const prev = (await q.getRecentSessions(db, pid, [k, 'nada'], '2026-11-07', 1)).map(({ rank, ...r }) => r);
  expect(prev).toEqual([{ exercise: k, date: '2026-11-04', set_index: 0, weight: 50, reps: '10' }]);
  expect(await q.getExerciseHistory(db, pid, k)).toHaveLength(4);
});

test('habits, meals, water and workouts', async () => {
  const { db, pid } = await setup();
  await q.setHabit(db, pid, '2026-11-02', 'Dormi bem', true);
  await q.setHabit(db, pid, '2026-11-02', 'Dormi bem', true);
  expect([...(await q.getHabitChecks(db, pid, '2026-11-02'))]).toEqual(['Dormi bem']);
  expect((await q.getHabitChecks(db, pid, '2026-11-09')).size).toBe(0);

  await q.setMeal(db, pid, '2026-11-07', 'Almoço', 0);
  await q.setMeal(db, pid, '2026-11-07', 'Almoço', 1);
  await q.setMeal(db, pid, '2026-11-07', 'Jantar', -1);
  expect(await q.getMealLogs(db, pid, '2026-11-07')).toEqual(new Map([['Almoço', 1], ['Jantar', -1]]));
  expect(await q.getMealDaysBetween(db, pid, '2026-11-02', '2026-11-08')).toEqual([{ date: '2026-11-07', n: 2, onPlan: 1 }]);

  await q.addWater(db, pid, '2026-11-07', -250);
  await q.addWater(db, pid, '2026-11-07', 500);
  await q.addWater(db, pid, '2026-11-07', -250);
  expect(await q.getWater(db, pid, '2026-11-07')).toBe(250);

  await q.setWorkoutDone(db, pid, '2026-11-03', 'Segunda', 'inferiores', true);
  await q.setWorkoutDone(db, pid, '2026-11-04', 'Terça', 'superiores', true);
  expect((await q.getLastWorkout(db, pid))?.label).toBe('Terça');
  await q.setWorkoutDone(db, pid, '2026-11-04', 'Terça', 'superiores', false);
  expect(await q.getWorkouts(db, pid, '2026-11-02', '2026-11-08')).toHaveLength(1);
});

test('backup round-trips into a new profile, and delete removes everything', async () => {
  const { db, pid } = await setup();
  await q.upsertSet(db, pid, 'stiff', '2026-11-05', 0, 20, '10');
  await q.addMeasurement(db, pid, '2026-11-01', 63, 78);
  await q.setHabit(db, pid, '2026-11-02', 'Dormi bem', true);
  const plan = (await q.getProfile(db, pid))!.plan;
  await q.recordSchedule(db, pid, plan, { ...plan, days: plan.days.slice(0, 2), treinoSince: '2026-10-01' }, '2026-11-03');
  await q.savePlan(db, pid, { ...plan, days: plan.days.slice(0, 2), treinoSince: '2026-10-01' });

  const backup = await makeBackup(db, pid);
  const parsed = parseJsonFile(JSON.stringify(backup));
  expect(parsed.kind).toBe('backup');
  if (parsed.kind !== 'backup') return;
  const copy = await restoreBackup(db, parsed.backup, parsed.plan, 'Luiza (cópia)');

  expect((await q.getProfile(db, copy))?.name).toBe('Luiza (cópia)');
  expect(await q.getExerciseHistory(db, copy, 'stiff')).toHaveLength(1);
  expect(await q.getMeasurements(db, copy)).toMatchObject([{ date: '2026-11-01', weight_kg: 63, waist_cm: 78 }]);
  expect((await q.getProfile(db, copy))?.plan.treinoSince).toBe('2026-10-01');
  expect(await q.getSchedule(db, copy)).toEqual([
    { since: '0000-01-01', weekdays: [1, 2, 3, 4, 5] },
    { since: '2026-11-03', weekdays: [1, 2] },
  ]);
  const { schedule: _ignored, ...oldBackup } = backup;
  const oldCopy = await restoreBackup(db, oldBackup, parsed.plan, 'Antigo');
  expect(await q.getSchedule(db, oldCopy)).toEqual([{ since: '0000-01-01', weekdays: [1, 2] }]);

  await q.deleteProfile(db, pid);
  expect(await q.getSchedule(db, pid)).toEqual([]);
  expect(await q.getProfile(db, pid)).toBeNull();
  expect(await q.getExerciseHistory(db, pid, 'stiff')).toHaveLength(0);
  expect(await q.getExerciseHistory(db, copy, 'stiff')).toHaveLength(1);
});

test('plan-only JSON files are validated', () => {
  expect(() => parseJsonFile('not json')).toThrow('não é um backup');
  expect(() => parseJsonFile('{"foo":1}')).toThrow('não tem um plano');
  const p = parseJsonFile(JSON.stringify({ days: [{ label: 'Treino A', exercises: [{ name: 'Supino', sets: 3, reps: 10 }, { bad: 1 }] }] }));
  expect(p.plan.days[0].exercises).toEqual([expect.objectContaining({ name: 'Supino', sets: 3, reps: '10' })]);
  expect(p.plan.days[0].weekday).toBeNull();
});

test('recent sessions per exercise, settings, first workout date', async () => {
  const { db, pid } = await setup();
  for (const [date, w] of [['2026-11-01', 30], ['2026-11-03', 35], ['2026-11-05', 40]] as const) {
    await q.upsertSet(db, pid, 'leg press', date, 0, w, '12');
    await q.upsertSet(db, pid, 'leg press', date, 1, w, '12');
  }
  await q.upsertSet(db, pid, 'stiff', '2026-11-04', 0, 20, '10');
  await q.upsertSet(db, pid, 'stiff', '2026-11-06', 0, null, '10');
  await q.upsertSet(db, pid, 'leg press', '2026-11-07', 0, 45, '12');

  const rows = await q.getRecentSessions(db, pid, ['leg press', 'stiff'], '2026-11-07');
  const leg = rows.filter((r) => r.exercise === 'leg press');
  expect([...new Set(leg.map((r) => r.date))]).toEqual(['2026-11-05', '2026-11-03']);
  expect(leg.filter((r) => r.rank === 1).map((r) => r.weight)).toEqual([40, 40]);
  expect(rows.filter((r) => r.exercise === 'stiff').map((r) => r.date)).toEqual(['2026-11-04']);

  expect(await q.getSetting(db, 'x', { a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  await q.setSetting(db, 'x', { a: 5 });
  expect(await q.getSetting(db, 'x', { a: 1, b: 2 })).toEqual({ a: 5, b: 2 });

  expect(await q.getFirstWorkoutDate(db, pid)).toBeNull();
  await q.setWorkoutDone(db, pid, '2026-11-03', 'Terça', '', true);
  await q.setWorkoutDone(db, pid, '2026-11-02', 'Segunda', '', true);
  expect(await q.getFirstWorkoutDate(db, pid)).toBe('2026-11-02');
});

test('free text for meals eaten off the plan', async () => {
  const { db, pid } = await setup();
  await q.setMeal(db, pid, '2026-11-07', 'Almoço', -1);
  await q.setMealNote(db, pid, '2026-11-07', 'Almoço', '  pizza com amigos ');
  expect(await q.getMealNotes(db, pid, '2026-11-07')).toEqual(new Map([['Almoço', 'pizza com amigos']]));

  await q.setMeal(db, pid, '2026-11-07', 'Almoço', -1);
  expect((await q.getMealNotes(db, pid, '2026-11-07')).get('Almoço')).toBe('pizza com amigos');

  await q.setMeal(db, pid, '2026-11-07', 'Almoço', 0);
  expect((await q.getMealNotes(db, pid, '2026-11-07')).size).toBe(0);
  expect(await q.getMealLogs(db, pid, '2026-11-07')).toEqual(new Map([['Almoço', 0]]));

  await q.setMeal(db, pid, '2026-11-07', 'Jantar', -1);
  await q.setMealNote(db, pid, '2026-11-07', 'Jantar', 'hambúrguer');
  const backup = await makeBackup(db, pid);
  const copy = await restoreBackup(db, backup, backup.plan, 'Cópia');
  expect((await q.getMealNotes(db, copy, '2026-11-07')).get('Jantar')).toBe('hambúrguer');

  await q.setMealNote(db, pid, '2026-11-07', 'Jantar', '   ');
  expect((await q.getMealNotes(db, pid, '2026-11-07')).size).toBe(0);
});
