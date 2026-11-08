import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { addWater, getActiveProfileId } from '@/db/queries';
import { todayKey } from '@/lib/dates';
import { syncWaterReminders } from '@/lib/notifications';
import { loadWidgetData } from './data';
import { renderWidget, updateAllWidgets, widgetDb, WIDGET_NAMES, type WidgetName } from './render';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  const db = await widgetDb();
  const name = props.widgetInfo.widgetName;

  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'ADD_WATER') {
    const pid = await getActiveProfileId(db);
    if (pid !== null) {
      await addWater(db, pid, todayKey(), 250);
      await syncWaterReminders(db, pid).catch(() => {});
    }
  }

  props.renderWidget(renderWidget(name, await loadWidgetData(db)));

  const others = WIDGET_NAMES.filter((n: WidgetName) => n !== name);
  await updateAllWidgets(db, others).catch(() => {});
}
