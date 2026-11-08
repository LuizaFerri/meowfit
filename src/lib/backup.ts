import type { SQLiteDatabase } from 'expo-sqlite';
import { createProfile, getProfile } from '@/db/queries';
import { PROFILE_TABLES } from '@/db/schema';
import { PART_SECTIONS, dedupe, pickSections, type Part } from './planText';
import { emptyPlan, type Exercise, type Plan } from './types';

export const BACKUP_APP = 'meowfit';

export type PlanFile = { app: typeof BACKUP_APP; type: 'plan'; version: 1; part?: Part; plan: Plan };
export type BackupFile = {
  app: typeof BACKUP_APP;
  type: 'backup';
  version: 1;
  exportedAt: string;
  profile: { name: string; height_cm: number | null };
  plan: Plan;
  data: Partial<Record<(typeof PROFILE_TABLES)[number], Record<string, unknown>[]>>;
};

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const isDate = (v: unknown): v is string => typeof v === 'string' && /^d{4}-d{2}-d{2}$/.test(v);
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

export function validatePlan(raw: unknown): Plan {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as any).days)) {
    throw new Error('Este arquivo não tem um plano do MeowFit.');
  }
  const r = raw as any;
  const t = r.targets ?? {};
  return dedupe({
    version: 1,
    name: str(r.name, 'Plano importado'),
    days: r.days
      .filter((d: any) => d && typeof d === 'object')
      .map((d: any) => ({
        label: str(d.label, 'Treino'),
        weekday: typeof d.weekday === 'number' && d.weekday >= 0 && d.weekday <= 6 ? d.weekday : null,
        title: str(d.title),
        exercises: (Array.isArray(d.exercises) ? d.exercises : [])
          .filter((e: any) => e && typeof e.name === 'string')
          .map(
            (e: any, i: number): Exercise => ({
              id: str(e.id, `${i}`),
              name: e.name,
              sets: num(e.sets),
              reps: typeof e.reps === 'string' ? e.reps : e.reps !== undefined ? String(e.reps) : undefined,
              load: e.load === true,
              note: typeof e.note === 'string' ? e.note : undefined,
            }),
          ),
      })),
    habits: strArr(r.habits),
    meals: (Array.isArray(r.meals) ? r.meals : [])
      .filter((m: any) => m && typeof m.name === 'string')
      .map((m: any) => ({
        name: m.name,
        ...(typeof m.time === 'string' && m.time ? { time: m.time } : {}),
        options: strArr(m.options),
      })),
    rules: strArr(r.rules),
    targets: {
      kcalMin: num(t.kcalMin),
      kcalMax: num(t.kcalMax),
      proteinMin: num(t.proteinMin),
      proteinMax: num(t.proteinMax),
      waterL: num(t.waterL),
    },
    ...(isDate(r.treinoSince) ? { treinoSince: r.treinoSince } : {}),
    ...(isDate(r.treinoSnooze) ? { treinoSnooze: r.treinoSnooze } : {}),
  });
}

export type ParsedFile =
  | { kind: 'plan'; plan: Plan; part?: Part }
  | { kind: 'backup'; backup: BackupFile; plan: Plan };

export function parseJsonFile(text: string): ParsedFile {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Este arquivo não é um backup nem um plano do MeowFit.');
  }
  if (raw?.type === 'backup' && raw.plan) {
    return { kind: 'backup', backup: raw as BackupFile, plan: validatePlan(raw.plan) };
  }
  const part = raw?.part === 'treino' || raw?.part === 'dieta' ? (raw.part as Part) : undefined;
  return { kind: 'plan', part, plan: validatePlan(raw?.type === 'plan' ? raw.plan : raw) };
}

export function makePlanFile(plan: Plan, part?: Part): PlanFile {
  const only = part ? pickSections(emptyPlan(plan.name), plan, PART_SECTIONS[part]) : plan;
  return { app: BACKUP_APP, type: 'plan', version: 1, part, plan: only };
}

export async function makeBackup(db: SQLiteDatabase, pid: number): Promise<BackupFile> {
  const profile = await getProfile(db, pid);
  if (!profile) throw new Error('Perfil não encontrado');
  const data: BackupFile['data'] = {};
  for (const t of PROFILE_TABLES) {
    const rows = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${t} WHERE profile_id = ?`, pid);
    data[t] = rows.map(({ profile_id, id, ...rest }) => rest);
  }
  return {
    app: BACKUP_APP,
    type: 'backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: { name: profile.name, height_cm: profile.height_cm },
    plan: profile.plan,
    data,
  };
}

const COLUMNS: Record<(typeof PROFILE_TABLES)[number], string[]> = {
  set_logs: ['exercise', 'date', 'set_index', 'weight', 'reps'],
  exercise_done: ['date', 'exercise'],
  workout_done: ['date', 'label', 'title'],
  habit_checks: ['week_start', 'habit'],
  meal_logs: ['date', 'meal', 'option_index', 'note'],
  water_logs: ['date', 'ml'],
  measurements: ['date', 'weight_kg', 'waist_cm'],
};

export async function restoreBackup(db: SQLiteDatabase, b: BackupFile, plan: Plan, name?: string) {
  let id = 0;
  await db.withTransactionAsync(async () => {
    id = await createProfile(db, name ?? str(b.profile?.name, 'Perfil importado'), num(b.profile?.height_cm) ?? null, plan);
    for (const t of PROFILE_TABLES) {
      const cols = COLUMNS[t];
      for (const row of b.data?.[t] ?? []) {
        const values = cols.map((c) => {
          const v = (row as any)[c];
          return typeof v === 'string' || typeof v === 'number' ? v : null;
        });
        await db.runAsync(
          `INSERT OR IGNORE INTO ${t} (profile_id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`,
          id,
          ...values,
        );
      }
    }
  });
  return id;
}
