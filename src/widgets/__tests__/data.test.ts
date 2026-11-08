import { fullPlan } from '@/test/fullPlan';
import * as q from '@/db/queries';
import { migrate } from '@/db/schema';
import { memoryDb } from '@/test/memoryDb';
import { WALK_LABEL, stampTreino } from '@/lib/workout';
import { loadWidgetData } from '../data';

const tuesday = new Date(2026, 10, 10, 18, 0);

async function setup() {
  const db = memoryDb();
  await migrate(db);
  return db;
}

test('without a profile the widgets ask to open the app', async () => {
  const d = await loadWidgetData(await setup(), tuesday);
  expect(d.ready).toBe(false);
  expect(d.dateLabel).toBe('Ter, 10 nov');
  expect(d.week.map((w) => w.today)).toEqual([false, true, false, false, false, false, false]);
});

test('summarizes today, the week, water and meals', async () => {
  const db = await setup();
  const plan = stampTreino(fullPlan(), '2026-11-01');
  const pid = await q.createProfile(db, 'Luiza', 160, plan);
  await q.setWorkoutDone(db, pid, '2026-11-06', 'Sexta', '', true);
  await q.setExerciseDone(db, pid, '2026-11-10', q.exKey('Aquecimento'), true);
  await q.setExerciseDone(db, pid, '2026-11-10', q.exKey('Supino (máquina ou halteres)'), true);
  await q.addWater(db, pid, '2026-11-10', 1250);
  await q.setMeal(db, pid, '2026-11-10', plan.meals[0].name, 0);
  await q.setMeal(db, pid, '2026-11-10', plan.meals[1].name, -1);
  await q.setSetting(db, 'theme', { mode: 'escuro' });

  const d = await loadWidgetData(db, tuesday);
  expect(d).toMatchObject({
    ready: true,
    mode: 'escuro',
    name: 'Luiza',
    day: { idx: 1, label: 'Terça', title: 'superiores', done: 2, total: 7 },
    finished: false,
    weekDone: 0,
    planned: 5,
    walked: false,
    streak: { count: 1, state: 'risco', unit: 'treinos' },
    waterMl: 1250,
    waterGoalMl: 2500,
    mealsOnPlan: 1,
    mealsTotal: 6,
  });

  await q.setWorkoutDone(db, pid, '2026-11-10', 'Terça', 'superiores', true);
  const after = await loadWidgetData(db, tuesday);
  expect(after).toMatchObject({ finished: true, weekDone: 1, streak: { count: 2, state: 'feito' } });
  expect(after.week.map((w) => w.done)).toEqual([false, true, false, false, false, false, false]);
});

test('a walk counts for the streak but not as a workout or for the rotation', async () => {
  const db = await setup();
  const pid = await q.createProfile(db, 'Luiza', 160, fullPlan());
  await q.setWorkoutDone(db, pid, '2026-11-06', 'Sexta', '', true);
  await q.setWorkoutDone(db, pid, '2026-11-07', WALK_LABEL, '', true);
  expect((await q.getLastWorkout(db, pid))?.label).toBe('Sexta');
  const sat = await loadWidgetData(db, new Date(2026, 10, 7, 9));
  expect(sat).toMatchObject({ day: null, walked: true, finished: false, weekDone: 1, streak: { count: 2, state: 'feito' } });
});

test('saving the plan keeps a history of training days', async () => {
  const db = await setup();
  const plan = fullPlan();
  const pid = await q.createProfile(db, 'Luiza', 160, plan);
  const initial = await q.getSchedule(db, pid);
  expect(initial).toEqual([{ since: '0000-01-01', weekdays: [1, 2, 3, 4, 5] }]);
  await q.savePlan(db, pid, { ...plan, name: 'outro' });
  expect(await q.getSchedule(db, pid)).toEqual(initial);
  await q.savePlan(db, pid, { ...plan, days: plan.days.filter((d) => d.weekday !== 5) });
  const after = await q.getSchedule(db, pid);
  expect(after).toHaveLength(2);
  expect(after[1].weekdays).toEqual([1, 2, 3, 4]);
});
