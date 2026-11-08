import type { SQLiteDatabase } from 'expo-sqlite';

const mockScheduled: { identifier: string; content: { data: { kind: string } } }[] = [];
let mockNextId = 0;

jest.mock('expo-notifications', () => ({
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockScheduled]),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    const i = mockScheduled.findIndex((n) => n.identifier === id);
    if (i >= 0) mockScheduled.splice(i, 1);
  }),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async (req: { content: { data: { kind: string } } }) => {
    await new Promise((r) => setTimeout(r, 1));
    const identifier = `n${mockNextId++}`;
    mockScheduled.push({ identifier, content: req.content });
    return identifier;
  }),
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  deleteNotificationChannelAsync: jest.fn(async () => null),
}));

const mockSettings = { current: { enabled: true, everyMin: 120, fromMin: 0, toMin: 23 * 60 } };
jest.mock('@/db/queries', () => ({
  getSetting: jest.fn(async () => mockSettings.current),
  getProfile: jest.fn(async () => ({ plan: { targets: { waterL: 2 } } })),
  getWater: jest.fn(async () => 0),
}));

const { syncWaterReminders } = require('@/lib/notifications') as typeof import('@/lib/notifications');
const Notifications = require('expo-notifications');
const db = {} as SQLiteDatabase;

beforeEach(() => {
  mockScheduled.length = 0;
  jest.clearAllMocks();
});

test('rapid changes are coalesced and the last settings win, with no duplicates', async () => {
  mockSettings.current = { enabled: true, everyMin: 60, fromMin: 0, toMin: 23 * 60 };
  const first = syncWaterReminders(db, 1);
  mockSettings.current = { enabled: true, everyMin: 120, fromMin: 0, toMin: 23 * 60 };
  syncWaterReminders(db, 1);
  mockSettings.current = { enabled: true, everyMin: 180, fromMin: 0, toMin: 23 * 60 };
  const last = syncWaterReminders(db, 1);
  expect(last).toBe(first);
  await last;

  expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(2);
  const now = new Date();
  const remainingToday = Math.floor((23 * 60 - (now.getHours() * 60 + now.getMinutes())) / 180) + 1;
  expect(mockScheduled.length).toBeGreaterThanOrEqual(3 * 8);
  expect(mockScheduled.length).toBeLessThanOrEqual(remainingToday + 3 * 8);
});

test('turning reminders off cancels everything', async () => {
  mockSettings.current = { enabled: true, everyMin: 120, fromMin: 0, toMin: 23 * 60 };
  await syncWaterReminders(db, 1);
  expect(mockScheduled.length).toBeGreaterThan(0);
  mockSettings.current = { ...mockSettings.current, enabled: false };
  await syncWaterReminders(db, 1);
  expect(mockScheduled).toHaveLength(0);
});
