import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { addWater, getActiveProfileId } from '@/db/queries';
import { todayKey } from '@/lib/dates';
import { syncWaterReminders } from '@/lib/notifications';
import { loadWidgetData } from './data';
import { renderWidget, updateAllWidgets, widgetDb } from './render';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  const db = await widgetDb();

  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'ADD_WATER') {
    const pid = await getActiveProfileId(db);
    if (pid !== null) {
      await addWater(db, pid, todayKey(), 250);
      await syncWaterReminders(db, pid).catch(() => {});
      await updateAllWidgets(db, ['Today']);
    }
  }

  props.renderWidget(renderWidget(props.widgetInfo.widgetName, await loadWidgetData(db)));
}
