import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { getProfile, getSetting, getWater } from '@/db/queries';
import { todayKey } from './dates';
import { fmtNum } from './format';
import { DEFAULT_WATER_REMINDER, waterSlots, type WaterReminder } from './water';

const WATER = 'water';
const REST = 'rest';
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

let running: Promise<void> | null = null;
let pending: { db: SQLiteDatabase; pid: number | null } | null = null;

export function syncWaterReminders(db: SQLiteDatabase, pid: number | null): Promise<void> {
  if (!notificationsAvailable) return Promise.resolve();
  pending = { db, pid };
  running ??= (async () => {
    while (pending) {
      const next = pending;
      pending = null;
      await scheduleWater(next.db, next.pid).catch(() => {});
    }
    running = null;
  })();
  return running;
}

async function scheduleWater(db: SQLiteDatabase, pid: number | null) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind === WATER)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (pid === null) return;
  const settings = await getSetting<WaterReminder>(db, waterKey(pid), DEFAULT_WATER_REMINDER);
  if (!settings.enabled || !(await Notifications.getPermissionsAsync()).granted) return;

  const profile = await getProfile(db, pid);
  const goal = (profile?.plan.targets.waterL ?? 2) * 1000;
  const ml = await getWater(db, pid, todayKey());
  const today = new Date().getDate();

  for (const at of waterSlots(settings, new Date(), ml >= goal, 4)) {
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
