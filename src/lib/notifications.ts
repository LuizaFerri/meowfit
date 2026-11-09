import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { getProfile, getSchedule, getSetting, getWater, getWorkoutDates, getWorkouts } from '@/db/queries';
import { todayKey } from './dates';
import { fmtNum } from './format';
import { computeStreak } from './streak';
import { WALK_LABEL } from './workout';
import { DEFAULT_WORKOUT_REMINDER, workoutReminderKey, workoutReminderSlots, type WorkoutReminder } from './workoutReminder';
import { DEFAULT_WATER_REMINDER, waterSlots, type WaterReminder } from './water';

const WATER = 'water';
const REST = 'rest';
const WORKOUT = 'workout';
const WORKOUT_CHANNEL = 'workout_alerts';
const WATER_CHANNEL = 'water_alerts';
const LEGACY_CHANNELS = ['water'];

export const notificationsAvailable = Platform.OS !== 'web';

export function setupNotifications() {
  if (!notificationsAvailable) return;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const inApp = n.request.content.data?.kind === REST;
      return { shouldShowBanner: !inApp, shouldShowList: !inApp, shouldPlaySound: !inApp, shouldSetBadge: false };
    },
  });
  if (Platform.OS === 'android') {
    LEGACY_CHANNELS.forEach((id) => Notifications.deleteNotificationChannelAsync(id).catch(() => {}));
    Notifications.setNotificationChannelAsync(WATER_CHANNEL, {
      name: 'Lembretes de água',
      description: 'Lembretes para beber água ao longo do dia',
      importance: AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 250],
    }).catch(() => {});
    Notifications.setNotificationChannelAsync(WORKOUT_CHANNEL, {
      name: 'Lembretes de treino',
      description: 'Aviso nos dias de treino e quando a sequência está em risco',
      importance: AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 250, 150, 250],
    }).catch(() => {});
    Notifications.setNotificationChannelAsync(REST, {
      name: 'Fim do descanso',
      description: 'Aviso quando o tempo de descanso entre séries acaba',
      importance: AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 400, 200, 400],
    }).catch(() => {});
  }
}

export async function ensurePermission(): Promise<boolean> {
  if (!notificationsAvailable) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function scheduleRestEnd(seconds: number): Promise<string | null> {
  if (!notificationsAvailable) return null;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Descanso acabou', body: 'Bora pra próxima série!', data: { kind: REST } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: REST },
    });
  } catch {
    return null;
  }
}

export async function cancelNotification(id: string | null) {
  if (!notificationsAvailable) return;
  if (id) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

export const waterKey = (pid: number) => `water_reminder:${pid}`;

type Job = { db: SQLiteDatabase; pid: number | null };

function serialized(task: (db: SQLiteDatabase, pid: number | null) => Promise<void>) {
  let running: Promise<void> | null = null;
  let pending: Job | null = null;
  return (db: SQLiteDatabase, pid: number | null): Promise<void> => {
    if (!notificationsAvailable) return Promise.resolve();
    pending = { db, pid };
    running ??= (async () => {
      while (pending) {
        const next: Job = pending;
        pending = null;
        await task(next.db, next.pid).catch(() => {});
      }
      running = null;
    })();
    return running;
  };
}

export const syncWaterReminders = serialized((db, pid) => scheduleWater(db, pid));

export const syncWorkoutReminders = serialized((db, pid) => scheduleWorkout(db, pid));

async function cancelKind(kind: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.content.data?.kind === kind).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function scheduleWorkout(db: SQLiteDatabase, pid: number | null) {
  await cancelKind(WORKOUT);
  if (pid === null) return;
  const settings = await getSetting<WorkoutReminder>(db, workoutReminderKey(pid), DEFAULT_WORKOUT_REMINDER);
  if (!settings.enabled || !(await Notifications.getPermissionsAsync()).granted) return;
  const profile = await getProfile(db, pid);
  if (!profile) return;
  const today = todayKey();
  const [todayRows, dates, schedule] = await Promise.all([getWorkouts(db, pid, today, today), getWorkoutDates(db, pid), getSchedule(db, pid)]);
  const now = new Date();
  const doneToday = todayRows.some((w) => w.label !== WALK_LABEL);
  const streak = computeStreak(profile.plan, dates, now, schedule);
  for (const slot of workoutReminderSlots(profile.plan, settings, now, doneToday, streak)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: slot.title, body: slot.body, data: { kind: WORKOUT } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: slot.at, channelId: WORKOUT_CHANNEL },
    });
  }
}

async function scheduleWater(db: SQLiteDatabase, pid: number | null) {
  await cancelKind(WATER);
  if (pid === null) return;
  const settings = await getSetting<WaterReminder>(db, waterKey(pid), DEFAULT_WATER_REMINDER);
  if (!settings.enabled || !(await Notifications.getPermissionsAsync()).granted) return;

  const profile = await getProfile(db, pid);
  const goal = (profile?.plan.targets.waterL ?? 2) * 1000;
  const ml = await getWater(db, pid, todayKey());
  const today = new Date().getDate();

  for (const at of waterSlots(settings, new Date(), ml >= goal, 7)) {
    const body =
      at.getDate() === today
        ? `Você está em ${fmtNum(ml / 1000)} de ${fmtNum(goal / 1000)} L hoje. Que tal um copo agora?`
        : 'Hora de um copo de água.';
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Água 💧', body, data: { kind: WATER } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: WATER_CHANNEL },
    });
  }
}

const triggerTime = (trigger: unknown): number | null => {
  const t = trigger as { value?: unknown; date?: unknown } | null;
  const v = t?.value ?? t?.date;
  if (typeof v === 'number') return v;
  if (typeof v === 'string' || v instanceof Date) {
    const ms = new Date(v).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
};

export async function nextScheduled(kind: 'water' | 'workout'): Promise<Date | null> {
  if (!notificationsAvailable) return null;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const now = Date.now();
  const times = all
    .filter((n) => n.content.data?.kind === kind)
    .map((n) => triggerTime(n.trigger))
    .filter((t): t is number => t !== null && t > now)
    .sort((a, b) => a - b);
  return times.length ? new Date(times[0]) : null;
}
