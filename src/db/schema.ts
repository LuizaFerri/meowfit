import type { SQLiteDatabase } from 'expo-sqlite';

const MIGRATIONS: string[] = [
  `
  CREATE TABLE profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    height_cm REAL,
    plan_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT);
  CREATE TABLE set_logs (
    profile_id INTEGER NOT NULL,
    exercise TEXT NOT NULL,
    date TEXT NOT NULL,
    set_index INTEGER NOT NULL,
    weight REAL,
    reps TEXT,
    PRIMARY KEY (profile_id, exercise, date, set_index)
  );
  CREATE TABLE exercise_done (
    profile_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    exercise TEXT NOT NULL,
    PRIMARY KEY (profile_id, date, exercise)
  );
  CREATE TABLE workout_done (
    profile_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    label TEXT NOT NULL,
    title TEXT,
    PRIMARY KEY (profile_id, date)
  );
  CREATE TABLE habit_checks (
    profile_id INTEGER NOT NULL,
    week_start TEXT NOT NULL,
    habit TEXT NOT NULL,
    PRIMARY KEY (profile_id, week_start, habit)
  );
  CREATE TABLE meal_logs (
    profile_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    meal TEXT NOT NULL,
    option_index INTEGER NOT NULL,
    PRIMARY KEY (profile_id, date, meal)
  );
  CREATE TABLE water_logs (
    profile_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    ml INTEGER NOT NULL,
    PRIMARY KEY (profile_id, date)
  );
  CREATE TABLE measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    weight_kg REAL,
    waist_cm REAL
  );
  CREATE INDEX idx_set_logs_ex ON set_logs (profile_id, exercise, date);
  `,
  `ALTER TABLE meal_logs ADD COLUMN note TEXT;`,
];

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL;').catch(() => {});
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
    version++;
  }
}

export const PROFILE_TABLES = [
  'set_logs',
  'exercise_done',
  'workout_done',
  'habit_checks',
  'meal_logs',
  'water_logs',
  'measurements',
] as const;
