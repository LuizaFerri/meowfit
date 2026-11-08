import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

export const widgetsAvailable =
  Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export function refreshWidgets(db: SQLiteDatabase) {
  if (!widgetsAvailable) return;
  const { updateAllWidgets } = require('./render') as typeof import('./render');
  updateAllWidgets(db).catch(() => {});
}

export function registerWidgets() {
  if (!widgetsAvailable) return;
  const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { widgetTaskHandler } = require('./handler') as typeof import('./handler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
