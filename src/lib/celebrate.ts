import type { SQLiteDatabase } from 'expo-sqlite';
import { getSchedule, getWorkoutDates } from '@/db/queries';
import { Alert } from './alert';
import { toKey } from './dates';
import { computeStreak, streakLabel, type ScheduleEntry, type Streak } from './streak';
import type { Plan } from './types';

export type Celebration = { title: string; message: string };

export function celebrationFor(plan: Plan, dates: string[], schedule: ScheduleEntry[], now = new Date()): Celebration | null {
  const today = toKey(now);
  const after = computeStreak(plan, dates, now, schedule);
  const before = computeStreak(plan, dates.filter((d) => d !== today), now, schedule);
  if (!after || !before || after.count <= before.count) return null;
  const record = after.count > before.best && after.count > 1;
  return {
    title: `🔥 ${after.count} ${streakLabel(after)}!`,
    message: record ? 'Novo recorde! É a sua maior sequência até agora. 🏆' : encouragement(after),
  };
}

function encouragement(s: Streak): string {
  if (s.count === 1) return s.unit === 'semanas' ? 'Primeira semana com a meta batida. Bora manter!' : 'Sequência começada. Bora manter!';
  return 'Continue assim! Os gatinhos estão orgulhosos. 🐾';
}

export async function celebrate(db: SQLiteDatabase, pid: number, plan: Plan) {
  const [dates, schedule] = await Promise.all([getWorkoutDates(db, pid), getSchedule(db, pid)]);
  const c = celebrationFor(plan, dates, schedule);
  if (c) Alert.alert(c.title, c.message, [{ text: 'Bora!' }]);
}
