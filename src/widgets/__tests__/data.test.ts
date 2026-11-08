import { samplePlan } from '@/data/samplePlan';
import * as q from '@/db/queries';
import { migrate } from '@/db/schema';
import { memoryDb } from '@/test/memoryDb';
import { stampTreino } from '@/lib/workout';
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
  const plan = stampTreino(samplePlan(), '2026-11-01');
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
    missed: 1,
    waterMl: 1250,
    waterGoalMl: 2500,
    mealsOnPlan: 1,
    mealsTotal: 6,
  });

  await q.setWorkoutDone(db, pid, '2026-11-10', 'Terça', 'superiores', true);
  const after = await loadWidgetData(db, tuesday);
  expect(after).toMatchObject({ finished: true, missed: 0, weekDone: 1 });
  expect(after.week.map((w) => w.done)).toEqual([false, true, false, false, false, false, false]);
});
