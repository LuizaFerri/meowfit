import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';
import { requestWidgetUpdate, type WidgetRepresentation } from 'react-native-android-widget';
import { dark, lilac, type Palette } from '@/components/theme';
import { migrate } from '@/db/schema';
import { TodayWidget, WaterWidget, WeekWidget } from './components';
import { loadWidgetData, type WidgetData } from './data';

export const WIDGET_NAMES = ['Today', 'Week', 'Water'] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];

const COMPONENTS: Record<WidgetName, (p: { d: WidgetData; c: Palette }) => any> = {
  Today: TodayWidget,
  Week: WeekWidget,
  Water: WaterWidget,
};

export function renderWidget(name: string, d: WidgetData): WidgetRepresentation {
  const Component = COMPONENTS[name as WidgetName] ?? TodayWidget;
  if (d.mode === 'lilas') return <Component d={d} c={lilac} />;
  if (d.mode === 'escuro') return <Component d={d} c={dark} />;
  return { light: <Component d={d} c={lilac} />, dark: <Component d={d} c={dark} /> };
}

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function widgetDb(): Promise<SQLiteDatabase> {
  dbPromise ??= openDatabaseAsync('sculpt.db').then(async (db) => {
    await migrate(db);
    return db;
  });
  return dbPromise;
}

export async function updateAllWidgets(db: SQLiteDatabase, only?: WidgetName[]) {
  const data = await loadWidgetData(db);
  await Promise.all(
    (only ?? WIDGET_NAMES).map((widgetName) =>
      requestWidgetUpdate({ widgetName, renderWidget: () => renderWidget(widgetName, data) }).catch(() => {}),
    ),
  );
}
