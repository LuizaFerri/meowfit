import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { ThemeMode } from '@/components/theme';
import {
  exKey,
  getActiveProfileId,
  getDoneExercises,
  getFirstWorkoutDate,
  getLastWorkout,
  getMealLogs,
  getProfile,
  getSetting,
  getWater,
  getWorkouts,
} from '@/db/queries';
import { toKey, weekDays } from '@/lib/dates';
import { missedStreak, pickToday, trainingWeekdays } from '@/lib/workout';

export type WidgetDay = { idx: number; label: string; title: string; done: number; total: number };

export type WidgetData = {
  ready: boolean;
  mode: ThemeMode;
  name: string;
  dateLabel: string;
  day: WidgetDay | null;
  finished: boolean;
  week: { letter: string; done: boolean; today: boolean }[];
  weekDone: number;
  planned: number;
  missed: number;
  waterMl: number;
  waterGoalMl: number;
  mealsOnPlan: number;
  mealsTotal: number;
};

const LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export async function loadWidgetData(db: SQLiteDatabase, now = new Date()): Promise<WidgetData> {
  const { mode } = await getSetting(db, 'theme', { mode: 'sistema' as ThemeMode });
  const dateLabel = `${DOW[now.getDay()]}, ${format(now, 'd MMM', { locale: ptBR }).replace('.', '')}`;
  const days = weekDays(now);
  const empty: WidgetData = {
    ready: false,
    mode,
    name: '',
    dateLabel,
    day: null,
    finished: false,
    week: days.map((d, i) => ({ letter: LETTERS[i], done: false, today: toKey(d) === toKey(now) })),
    weekDone: 0,
    planned: 0,
    missed: 0,
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
  const [last, done, week, meals, water, recent, firstWorkout] = await Promise.all([
    getLastWorkout(db, profile.id),
    getDoneExercises(db, profile.id, date),
    getWorkouts(db, profile.id, toKey(days[0]), toKey(days[6])),
    getMealLogs(db, profile.id, date),
    getWater(db, profile.id, date),
    getWorkouts(db, profile.id, toKey(addDays(now, -60)), date),
    getFirstWorkoutDate(db, profile.id),
  ]);

  const doneToday = week.find((w) => w.date === date);
  const lastLabel = last?.date === date ? null : (last?.label ?? null);
  const idx = doneToday ? plan.days.findIndex((d) => d.label === doneToday.label) : pickToday(plan, lastLabel, now);
  const planDay = idx !== null && idx >= 0 ? plan.days[idx] : null;
  const weekDates = new Set(week.map((w) => w.date));
  const trainingDays = trainingWeekdays(plan);

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
    weekDone: week.length,
    planned: plan.days.filter((d) => d.weekday !== null).length || plan.days.length,
    missed:
      plan.days.length > 0 && trainingDays.has(now.getDay()) && !doneToday
        ? missedStreak({ trainingDays, doneDates: new Set(recent.map((w) => w.date)), today: now, since: firstWorkout })
        : 0,
    waterMl: water,
    waterGoalMl: (plan.targets.waterL ?? 2) * 1000,
    mealsOnPlan: plan.meals.filter((m) => (meals.get(m.name) ?? -1) >= 0).length,
    mealsTotal: plan.meals.length,
  };
}
