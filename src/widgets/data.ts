import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_THEME_MODE, type ThemeMode } from '@/components/theme';
import {
  exKey,
  getActiveProfileId,
  getDoneExercises,
  getSchedule,
  getWorkoutDates,
  getLastWorkout,
  getMealLogs,
  getProfile,
  getSetting,
  getWater,
  getWorkouts,
} from '@/db/queries';
import { toKey, weekDays } from '@/lib/dates';
import { WALK_LABEL, pickToday } from '@/lib/workout';
import { computeStreak, type Streak, type StreakState } from '@/lib/streak';

export type WidgetDay = { idx: number; label: string; title: string; done: number; total: number };

export type WidgetData = {
  ready: boolean;
  mode: ThemeMode;
  name: string;
  dateLabel: string;
  day: WidgetDay | null;
  finished: boolean;
  walked: boolean;
  week: { letter: string; done: boolean; today: boolean }[];
  weekDone: number;
  planned: number;
  streak: { count: number; state: StreakState; unit: Streak['unit'] } | null;
  waterMl: number;
  waterGoalMl: number;
  mealsOnPlan: number;
  mealsTotal: number;
};

const LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export async function loadWidgetData(db: SQLiteDatabase, now = new Date()): Promise<WidgetData> {
  const { mode } = await getSetting(db, 'theme', { mode: DEFAULT_THEME_MODE });
  const dateLabel = `${DOW[now.getDay()]}, ${format(now, 'd MMM', { locale: ptBR }).replace('.', '')}`;
  const days = weekDays(now);
  const empty: WidgetData = {
    ready: false,
    mode,
    name: '',
    dateLabel,
    day: null,
    finished: false,
    walked: false,
    week: days.map((d, i) => ({ letter: LETTERS[i], done: false, today: toKey(d) === toKey(now) })),
    weekDone: 0,
    planned: 0,
    streak: null,
    waterMl: 0,
    waterGoalMl: 2000,
    mealsOnPlan: 0,
    mealsTotal: 0,
  };

  const pid = await getActiveProfileId(db);
  const profile = pid !== null ? await getProfile(db, pid) : null;
  if (!profile) return empty;

  const plan = profile.plan;
  const date = toKey(now);
  const [last, done, week, meals, water, allDates, schedule] = await Promise.all([
    getLastWorkout(db, profile.id),
    getDoneExercises(db, profile.id, date),
    getWorkouts(db, profile.id, toKey(days[0]), toKey(days[6])),
    getMealLogs(db, profile.id, date),
    getWater(db, profile.id, date),
    getWorkoutDates(db, profile.id),
    getSchedule(db, profile.id),
  ]);

  const doneToday = week.find((w) => w.date === date && w.label !== WALK_LABEL);
  const walkedToday = week.some((w) => w.date === date && w.label === WALK_LABEL);
  const lastLabel = last?.date === date ? null : (last?.label ?? null);
  const idx = doneToday ? plan.days.findIndex((d) => d.label === doneToday.label) : pickToday(plan, lastLabel, now);
  const planDay = idx !== null && idx >= 0 ? plan.days[idx] : null;
  const weekDates = new Set(week.map((w) => w.date));
  const streak = computeStreak(plan, allDates, now, schedule);

  return {
    ready: true,
    mode,
    name: profile.name,
    dateLabel,
    day: planDay
      ? {
          idx: idx!,
          label: planDay.label,
          title: planDay.title,
          done: planDay.exercises.filter((e) => done.has(exKey(e.name))).length,
          total: planDay.exercises.length,
        }
      : null,
    finished: !!doneToday,
    week: days.map((d, i) => ({ letter: LETTERS[i], done: weekDates.has(toKey(d)), today: toKey(d) === date })),
    weekDone: week.filter((w) => w.label !== WALK_LABEL).length,
    walked: walkedToday,
    planned: plan.days.filter((d) => d.weekday !== null).length || plan.days.length,
    streak: streak && { count: streak.count, state: streak.state, unit: streak.unit },
    waterMl: water,
    waterGoalMl: (plan.targets.waterL ?? 2) * 1000,
    mealsOnPlan: plan.meals.filter((m) => (meals.get(m.name) ?? -1) >= 0).length,
    mealsTotal: plan.meals.length,
  };
}
