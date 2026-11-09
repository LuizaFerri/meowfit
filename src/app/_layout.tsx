import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Loading } from '@/components/ui';
import { migrate } from '@/db/schema';
import { setupNotifications, syncWaterReminders, syncWorkoutReminders } from '@/lib/notifications';
import { useApp } from '@/store/useApp';
import { refreshWidgets } from '@/widgets';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { DialogHost } from '@/components/DialogHost';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { DatabaseError } from '@/components/DatabaseError';
import { checkCloud, startCloud, syncIfLinked, useCloud } from '@/lib/cloud';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { NavigationBar } from 'expo-navigation-bar';

export const unstable_settings = { anchor: '(tabs)' };

setupNotifications();
SplashScreen.preventAutoHideAsync().catch(() => {});

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
    if (Platform.OS !== 'web') return;
    navigator.storage?.persist?.().catch(() => {});
    webRetries.set(0);
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

  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => syncWorkoutReminders(db, pid).catch(() => {}), 1500);
    return () => clearTimeout(id);
  }, [db, pid, loaded, rev]);

  useEffect(() => {
    startCloud(db).catch(() => {});
  }, [db]);

  const cloudUser = useCloud((s) => s.userId);
  const cloudLink = useCloud((s) => s.link);
  useEffect(() => {
    if (!loaded || !cloudUser || !cloudLink) return;
    checkCloud(db, pid);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && checkCloud(db, pid));
    return () => sub.remove();
  }, [db, pid, loaded, cloudUser, cloudLink]);
  useEffect(() => {
    if (!loaded || !cloudUser || !cloudLink) return;
    const id = setTimeout(() => syncIfLinked(db, pid).catch(() => {}), 4000);
    const sub = AppState.addEventListener('change', (st) => st !== 'active' && syncIfLinked(db, pid).catch(() => {}));
    return () => {
      clearTimeout(id);
      sub.remove();
    };
  }, [db, pid, loaded, rev, cloudUser, cloudLink]);

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
      <Stack.Screen name="new-profile" options={{ title: 'Boas-vindas' }} />
      <Stack.Screen name="import" options={{ title: 'Importar' }} />
      <Stack.Screen name="edit-plan" options={{ title: 'Editar' }} />
      <Stack.Screen name="cloud-login" options={{ title: 'Nuvem' }} />
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

const AUTO_RETRIES = 3;
const RETRY_KEY = 'meowfit-db-retries';

const webRetries = {
  get: () => {
    try {
      return Number(window.sessionStorage.getItem(RETRY_KEY) ?? 0);
    } catch {
      return AUTO_RETRIES;
    }
  },
  set: (n: number) => {
    try {
      if (n === 0) window.sessionStorage.removeItem(RETRY_KEY);
      else window.sessionStorage.setItem(RETRY_KEY, String(n));
    } catch {}
  },
};

export default function RootLayout() {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const onError = () => {
    if (Platform.OS === 'web') {
      const n = webRetries.get();
      if (n < AUTO_RETRIES) {
        webRetries.set(n + 1);
        setTimeout(() => window.location.reload(), 800);
      } else setFailed(true);
      return;
    }
    if (attempt < AUTO_RETRIES) setTimeout(() => setAttempt((a) => a + 1), 1000);
    else setFailed(true);
  };

  const retry = () => {
    if (Platform.OS === 'web') {
      webRetries.set(0);
      window.location.reload();
    } else {
      setFailed(false);
      setAttempt(0);
    }
  };

  if (failed) return <DatabaseError onRetry={retry} />;

  return (
    <SQLiteProvider key={attempt} databaseName="sculpt.db" onInit={migrate} onError={onError}>
      <ThemeProvider>
        <ThemedStatusBar />
        <Gate />
        <DialogHost />
        <AnimatedSplash />
      </ThemeProvider>
    </SQLiteProvider>
  );
}
