import type { SQLiteDatabase } from 'expo-sqlite';
import { format } from 'date-fns';
import { normalizeHeightCm } from '@/lib/format';
import { normalize } from '@/lib/planText';
import { nextSchedule, type ScheduleEntry } from '@/lib/streak';
import { WALK_LABEL } from '@/lib/workout';
import type { Plan, Profile } from '@/lib/types';
import { PROFILE_TABLES } from './schema';

type ProfileRow = { id: number; name: string; height_cm: number | null; plan_json: string };

const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  name: r.name,
  height_cm: normalizeHeightCm(r.height_cm),
  plan: JSON.parse(r.plan_json),
});

export const exKey = (name: string) => normalize(name);

export async function listProfiles(db: SQLiteDatabase) {
  return db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM profiles ORDER BY name');
}

export async function getProfile(db: SQLiteDatabase, id: number): Promise<Profile | null> {
  const r = await db.getFirstAsync<ProfileRow>('SELECT * FROM profiles WHERE id = ?', id);
  return r ? toProfile(r) : null;
}

export async function createProfile(db: SQLiteDatabase, name: string, height: number | null, plan: Plan) {
  const res = await db.runAsync(
    'INSERT INTO profiles (name, height_cm, plan_json, created_at) VALUES (?, ?, ?, ?)',
    name,
    height,
    JSON.stringify(plan),
    new Date().toISOString(),
  );
  const id = res.lastInsertRowId;
  await recordSchedule(db, id, null, plan);
  return id;
}

export async function updateProfile(db: SQLiteDatabase, id: number, name: string, height: number | null) {
  await db.runAsync('UPDATE profiles SET name = ?, height_cm = ? WHERE id = ?', name, height, id);
}

export async function savePlan(db: SQLiteDatabase, id: number, plan: Plan) {
  const before = await getProfile(db, id);
  await recordSchedule(db, id, before?.plan ?? null, plan);
  await db.runAsync('UPDATE profiles SET plan_json = ? WHERE id = ?', JSON.stringify(plan), id);
}

export async function deleteProfile(db: SQLiteDatabase, id: number) {
  await db.withTransactionAsync(async () => {
    for (const t of PROFILE_TABLES) await db.runAsync(`DELETE FROM ${t} WHERE profile_id = ?`, id);
    await db.runAsync('DELETE FROM profiles WHERE id = ?', id);
    await db.runAsync('DELETE FROM settings WHERE key IN (?, ?, ?)', scheduleKey(id), `workout_reminder:${id}`, `water_reminder:${id}`);
  });
}

export async function getActiveProfileId(db: SQLiteDatabase): Promise<number | null> {
  const r = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'active_profile'");
  if (r) return Number(r.value);
  const first = await db.getFirstAsync<{ id: number }>('SELECT id FROM profiles ORDER BY id LIMIT 1');
  return first?.id ?? null;
}

export async function setActiveProfileId(db: SQLiteDatabase, id: number | null) {
  if (id === null) await db.runAsync("DELETE FROM settings WHERE key = 'active_profile'");
  else
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('active_profile', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      String(id),
    );
}

export type SetRow = { exercise: string; date: string; set_index: number; weight: number | null; reps: string | null };

export async function getSetsForDate(db: SQLiteDatabase, pid: number, date: string) {
  return db.getAllAsync<SetRow>(
    'SELECT exercise, date, set_index, weight, reps FROM set_logs WHERE profile_id = ? AND date = ? ORDER BY set_index',
    pid,
    date,
  );
}

export async function upsertSet(
  db: SQLiteDatabase,
  pid: number,
  exercise: string,
  date: string,
  setIndex: number,
  weight: number | null,
  reps: string | null,
) {
  await db.runAsync(
    `INSERT INTO set_logs (profile_id, exercise, date, set_index, weight, reps) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(profile_id, exercise, date, set_index) DO UPDATE SET weight = excluded.weight, reps = excluded.reps`,
    pid,
    exercise,
    date,
    setIndex,
    weight,
    reps,
  );
}

export async function getExerciseHistory(db: SQLiteDatabase, pid: number, exercise: string) {
  return db.getAllAsync<SetRow>(
    'SELECT exercise, date, set_index, weight, reps FROM set_logs WHERE profile_id = ? AND exercise = ? ORDER BY date, set_index',
    pid,
    exercise,
  );
}

export async function getDoneExercises(db: SQLiteDatabase, pid: number, date: string) {
  const rows = await db.getAllAsync<{ exercise: string }>(
    'SELECT exercise FROM exercise_done WHERE profile_id = ? AND date = ?',
    pid,
    date,
  );
  return new Set(rows.map((r) => r.exercise));
}

export async function setExerciseDone(db: SQLiteDatabase, pid: number, date: string, exercise: string, done: boolean) {
  if (done)
    await db.runAsync('INSERT OR IGNORE INTO exercise_done (profile_id, date, exercise) VALUES (?, ?, ?)', pid, date, exercise);
  else await db.runAsync('DELETE FROM exercise_done WHERE profile_id = ? AND date = ? AND exercise = ?', pid, date, exercise);
}

export type WorkoutRow = { date: string; label: string; title: string | null };

export async function getWorkouts(db: SQLiteDatabase, pid: number, from: string, to: string) {
  return db.getAllAsync<WorkoutRow>(
    'SELECT date, label, title FROM workout_done WHERE profile_id = ? AND date BETWEEN ? AND ? ORDER BY date',
    pid,
    from,
    to,
  );
}

export async function getLastWorkout(db: SQLiteDatabase, pid: number) {
  return db.getFirstAsync<WorkoutRow>(
    'SELECT date, label, title FROM workout_done WHERE profile_id = ? AND label != ? ORDER BY date DESC LIMIT 1',
    pid,
    WALK_LABEL,
  );
}

export async function setWorkoutDone(
  db: SQLiteDatabase,
  pid: number,
  date: string,
  label: string,
  title: string,
  done: boolean,
) {
  if (done)
    await db.runAsync(
      `INSERT INTO workout_done (profile_id, date, label, title) VALUES (?, ?, ?, ?)
       ON CONFLICT(profile_id, date) DO UPDATE SET label = excluded.label, title = excluded.title`,
      pid,
      date,
      label,
      title,
    );
  else await db.runAsync('DELETE FROM workout_done WHERE profile_id = ? AND date = ?', pid, date);
}

export async function getHabitChecks(db: SQLiteDatabase, pid: number, weekStart: string) {
  const rows = await db.getAllAsync<{ habit: string }>(
    'SELECT habit FROM habit_checks WHERE profile_id = ? AND week_start = ?',
    pid,
    weekStart,
  );
  return new Set(rows.map((r) => r.habit));
}

export async function setHabit(db: SQLiteDatabase, pid: number, weekStart: string, habit: string, done: boolean) {
  if (done)
    await db.runAsync(
      'INSERT OR IGNORE INTO habit_checks (profile_id, week_start, habit) VALUES (?, ?, ?)',
      pid,
      weekStart,
      habit,
    );
  else
    await db.runAsync(
      'DELETE FROM habit_checks WHERE profile_id = ? AND week_start = ? AND habit = ?',
      pid,
      weekStart,
      habit,
    );
}

export async function getMealLogs(db: SQLiteDatabase, pid: number, date: string) {
  const rows = await db.getAllAsync<{ meal: string; option_index: number }>(
    'SELECT meal, option_index FROM meal_logs WHERE profile_id = ? AND date = ?',
    pid,
    date,
  );
  return new Map(rows.map((r) => [r.meal, r.option_index]));
}

export async function setMeal(db: SQLiteDatabase, pid: number, date: string, meal: string, option: number | null) {
  if (option === null)
    await db.runAsync('DELETE FROM meal_logs WHERE profile_id = ? AND date = ? AND meal = ?', pid, date, meal);
  else
    await db.runAsync(
      `INSERT INTO meal_logs (profile_id, date, meal, option_index) VALUES (?, ?, ?, ?)
       ON CONFLICT(profile_id, date, meal) DO UPDATE SET
         option_index = excluded.option_index,
         note = CASE WHEN excluded.option_index = -1 THEN meal_logs.note ELSE NULL END`,
      pid,
      date,
      meal,
      option,
    );
}

export type MealLogRow = { date: string; meal: string; option_index: number; note: string | null };

export async function getMealHistory(db: SQLiteDatabase, pid: number, from: string, to: string) {
  const [meals, water] = await Promise.all([
    db.getAllAsync<MealLogRow>(
      'SELECT date, meal, option_index, note FROM meal_logs WHERE profile_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
      pid,
      from,
      to,
    ),
    db.getAllAsync<{ date: string; ml: number }>(
      'SELECT date, ml FROM water_logs WHERE profile_id = ? AND date BETWEEN ? AND ?',
      pid,
      from,
      to,
    ),
  ]);
  return { meals, water: new Map(water.map((w) => [w.date, w.ml])) };
}

export async function getMealNotes(db: SQLiteDatabase, pid: number, date: string) {
  const rows = await db.getAllAsync<{ meal: string; note: string }>(
    'SELECT meal, note FROM meal_logs WHERE profile_id = ? AND date = ? AND note IS NOT NULL',
    pid,
    date,
  );
  return new Map(rows.map((r) => [r.meal, r.note]));
}

export async function setMealNote(db: SQLiteDatabase, pid: number, date: string, meal: string, note: string) {
  await db.runAsync(
    'UPDATE meal_logs SET note = ? WHERE profile_id = ? AND date = ? AND meal = ?',
    note.trim() || null,
    pid,
    date,
    meal,
  );
}

export async function getMealDaysBetween(db: SQLiteDatabase, pid: number, from: string, to: string) {
  return db.getAllAsync<{ date: string; n: number; onPlan: number }>(
    `SELECT date, COUNT(*) AS n, SUM(CASE WHEN option_index >= 0 THEN 1 ELSE 0 END) AS onPlan
     FROM meal_logs WHERE profile_id = ? AND date BETWEEN ? AND ? GROUP BY date`,
    pid,
    from,
    to,
  );
}

export async function getSetting<T>(db: SQLiteDatabase, key: string, fallback: T): Promise<T> {
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  if (!r) return fallback;
  try {
    return { ...fallback, ...JSON.parse(r.value) } as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(db: SQLiteDatabase, key: string, value: unknown) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  );
}

export async function getRecentSessions(db: SQLiteDatabase, pid: number, keys: string[], before: string, sessions = 2) {
  if (keys.length === 0) return [];
  const marks = keys.map(() => '?').join(',');
  return db.getAllAsync<SetRow & { rank: number }>(
    `SELECT exercise, date, set_index, weight, reps, rank FROM (
       SELECT s.*, DENSE_RANK() OVER (PARTITION BY exercise ORDER BY date DESC) AS rank
       FROM set_logs s
       WHERE profile_id = ? AND date < ? AND exercise IN (${marks})
         AND date IN (SELECT date FROM set_logs x WHERE x.profile_id = s.profile_id AND x.exercise = s.exercise AND x.weight IS NOT NULL)
     ) WHERE rank <= ? ORDER BY exercise, rank, set_index`,
    pid,
    before,
    ...keys,
    sessions,
  );
}

export async function getFirstWorkoutDate(db: SQLiteDatabase, pid: number) {
  const r = await db.getFirstAsync<{ d: string | null }>('SELECT MIN(date) AS d FROM workout_done WHERE profile_id = ?', pid);
  return r?.d ?? null;
}

export async function getFirstMealDate(db: SQLiteDatabase, pid: number) {
  const r = await db.getFirstAsync<{ d: string | null }>('SELECT MIN(date) AS d FROM meal_logs WHERE profile_id = ?', pid);
  return r?.d ?? null;
}

export async function getWater(db: SQLiteDatabase, pid: number, date: string) {
  const r = await db.getFirstAsync<{ ml: number }>(
    'SELECT ml FROM water_logs WHERE profile_id = ? AND date = ?',
    pid,
    date,
  );
  return r?.ml ?? 0;
}

export async function addWater(db: SQLiteDatabase, pid: number, date: string, delta: number) {
  await db.runAsync(
    `INSERT INTO water_logs (profile_id, date, ml) VALUES (?, ?, MAX(0, ?))
     ON CONFLICT(profile_id, date) DO UPDATE SET ml = MAX(0, ml + ?)`,
    pid,
    date,
    delta,
    delta,
  );
}

export type Measurement = { id: number; date: string; weight_kg: number | null; waist_cm: number | null };

export async function getMeasurements(db: SQLiteDatabase, pid: number) {
  return db.getAllAsync<Measurement>(
    'SELECT id, date, weight_kg, waist_cm FROM measurements WHERE profile_id = ? ORDER BY date, id',
    pid,
  );
}

export async function addMeasurement(
  db: SQLiteDatabase,
  pid: number,
  date: string,
  weight: number | null,
  waist: number | null,
) {
  await db.runAsync(
    'INSERT INTO measurements (profile_id, date, weight_kg, waist_cm) VALUES (?, ?, ?, ?)',
    pid,
    date,
    weight,
    waist,
  );
}

export async function deleteMeasurement(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM measurements WHERE id = ?', id);
}

export async function getWorkoutDates(db: SQLiteDatabase, pid: number) {
  const rows = await db.getAllAsync<{ date: string }>('SELECT date FROM workout_done WHERE profile_id = ? ORDER BY date', pid);
  return rows.map((r) => r.date);
}

const scheduleKey = (pid: number) => `schedule:${pid}`;

export async function getSchedule(db: SQLiteDatabase, pid: number): Promise<ScheduleEntry[]> {
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', scheduleKey(pid));
  try {
    const list = r ? JSON.parse(r.value) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function setSchedule(db: SQLiteDatabase, pid: number, schedule: ScheduleEntry[]) {
  await setSetting(db, scheduleKey(pid), schedule);
}

export async function recordSchedule(db: SQLiteDatabase, pid: number, before: Plan | null, after: Plan, today = format(new Date(), 'yyyy-MM-dd')) {
  const next = nextSchedule(await getSchedule(db, pid), before, after, today);
  if (next) await setSchedule(db, pid, next);
}

export async function resetWorkoutHistory(db: SQLiteDatabase, pid: number) {
  await db.withTransactionAsync(async () => {
    for (const t of ['workout_done', 'exercise_done', 'set_logs']) await db.runAsync(`DELETE FROM ${t} WHERE profile_id = ?`, pid);
  });
}

export async function updateMeasurement(db: SQLiteDatabase, id: number, weight: number | null, waist: number | null) {
  await db.runAsync('UPDATE measurements SET weight_kg = ?, waist_cm = ? WHERE id = ?', weight, waist, id);
}
