import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Loading } from '@/components/ui';
import { migrate } from '@/db/schema';
import { setupNotifications, syncWaterReminders } from '@/lib/notifications';
import { useApp } from '@/store/useApp';
import { refreshWidgets } from '@/widgets';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { DialogHost } from '@/components/DialogHost';
import * as SystemUI from 'expo-system-ui';
import { NavigationBar } from 'expo-navigation-bar';

setupNotifications();

function Gate() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const loaded = useApp((s) => s.loaded);
  const loadActive = useApp((s) => s.loadActive);
  const pid = useApp((s) => s.profile?.id ?? null);
  const rev = useApp((s) => s.rev);
  const { mode } = useTheme();

  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => refreshWidgets(db), 800);
    return () => clearTimeout(id);
  }, [db, loaded, rev, pid, mode]);

  useEffect(() => {
    loadActive(db);
  }, [db, loadActive]);

  useEffect(() => {
    if (Platform.OS === 'web') navigator.storage?.persist?.().catch(() => {});
  }, []);

  const bump = useApp((s) => s.bump);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && bump());
    let timer: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      const next = new Date();
      next.setHours(24, 0, 5, 0);
      timer = setTimeout(() => {
        bump();
        scheduleMidnight();
      }, next.getTime() - Date.now());
    };
    scheduleMidnight();
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [bump]);

  useEffect(() => {
    if (!loaded) return;
    const sync = () => syncWaterReminders(db, pid).catch(() => {});
    sync();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && sync());
    return () => sub.remove();
  }, [db, pid, loaded]);

  if (!loaded) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="new-profile" options={{ title: 'Novo perfil' }} />
      <Stack.Screen name="import" options={{ title: 'Importar' }} />
      <Stack.Screen name="workout/[day]" options={{ title: 'Treino' }} />
      <Stack.Screen name="exercise/[name]" options={{ title: 'Evolução' }} />
      <Stack.Screen name="diet-history" options={{ title: 'Histórico da dieta' }} />
    </Stack>
  );
}

function ThemedStatusBar() {
  const { isDark, colors } = useTheme();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationBar style={isDark ? 'dark' : 'light'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="sculpt.db" onInit={migrate}>
      <ThemeProvider>
        <ThemedStatusBar />
        <Gate />
        <DialogHost />
      </ThemeProvider>
    </SQLiteProvider>
  );
}
