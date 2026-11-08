import { addDays, startOfDay } from 'date-fns';

export type WaterReminder = {
  enabled: boolean;
  everyMin: number;
  fromMin: number;
  toMin: number;
};

export const DEFAULT_WATER_REMINDER: WaterReminder = {
  enabled: false,
  everyMin: 120,
  fromMin: 8 * 60,
  toMin: 22 * 60,
};

export const fmtClock = (min: number) => `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}`;

export function waterSlots(r: WaterReminder, now: Date, goalReachedToday: boolean, days = 7): Date[] {
  if (!r.enabled || r.everyMin <= 0 || r.toMin < r.fromMin) return [];
  const out: Date[] = [];
  for (let d = 0; d < days; d++) {
    if (d === 0 && goalReachedToday) continue;
    const day = startOfDay(addDays(now, d));
    for (let m = r.fromMin; m <= r.toMin; m += r.everyMin) {
      const at = new Date(day.getTime() + m * 60_000);
      if (at > now) out.push(at);
    }
  }
  return out;
}
