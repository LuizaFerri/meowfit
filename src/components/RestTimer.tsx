import Ionicons from '@expo/vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSetting, setSetting } from '@/db/queries';
import { cancelNotification, ensurePermission, scheduleRestEnd } from '@/lib/notifications';
import { radius, type Palette } from './theme';
import { Row, type IconName } from './ui';
import { useTheme } from './ThemeProvider';

const CHOICES = [60, 90, 120];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export type RestTimer = ReturnType<typeof useRestTimer>;

export function useRestTimer() {
  const db = useSQLiteContext();
  const [seconds, setSeconds] = useState(90);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [total, setTotal] = useState(90);
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const notif = useRef<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    getSetting(db, 'rest', { seconds: 90 }).then((r) => setSeconds(r.seconds));
  }, [db]);

  useEffect(() => {
    if (endAt === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t < endAt) return;
      Vibration.vibrate([0, 400, 200, 400]);
      cancelNotification(notif.current);
      notif.current = null;
      setEndAt(null);
      setFinished(true);
    }, 250);
    return () => clearInterval(id);
  }, [endAt]);

  useEffect(() => {
    if (!finished) return;
    const id = setTimeout(() => setFinished(false), 5000);
    return () => clearTimeout(id);
  }, [finished]);

  useEffect(() => () => void cancelNotification(notif.current), []);

  const schedule = useCallback(async (secs: number) => {
    await cancelNotification(notif.current);
    if (!asked.current) {
      asked.current = true;
      await ensurePermission();
    }
    notif.current = await scheduleRestEnd(secs);
  }, []);

  const start = useCallback(
    (secs = seconds) => {
      const t = Date.now();
      setNow(t);
      setEndAt(t + secs * 1000);
      setTotal(secs);
      setFinished(false);
      schedule(secs);
    },
    [seconds, schedule],
  );

  const stop = useCallback(() => {
    cancelNotification(notif.current);
    notif.current = null;
    setEndAt(null);
    setFinished(false);
  }, []);

  const addTime = useCallback(
    (secs: number) => {
      if (endAt === null) return;
      const next = endAt + secs * 1000;
      setEndAt(next);
      setTotal((t) => t + secs);
      schedule(Math.max(1, Math.ceil((next - Date.now()) / 1000)));
    },
    [endAt, schedule],
  );

  const choose = useCallback(
    (secs: number) => {
      setSeconds(secs);
      setSetting(db, 'rest', { seconds: secs });
    },
    [db],
  );

  const remaining = endAt === null ? 0 : Math.max(0, Math.ceil((endAt - now) / 1000));
  const dismiss = useCallback(() => setFinished(false), []);

  return { seconds, running: endAt !== null, remaining, total, finished, start, stop, addTime, choose, dismiss };
}

export function RestBar({ timer }: { timer: RestTimer }) {
  const { colors } = useTheme();
  const { running, remaining, total, seconds } = timer;
  const pad = { paddingBottom: 14 + useSafeAreaInsets().bottom };
  const bar = barStyle(colors);
  const label = (c: number) => (c < 120 ? `${c}s` : `${c / 60} min`);

  if (running) {
    return (
      <View style={[bar, pad]}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: colors.muted }}>DESCANSO</Text>
            <Text
              style={{ fontSize: 44, lineHeight: 50, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] }}
              accessibilityLabel={`${remaining} segundos de descanso`}
            >
              {fmt(remaining)}
            </Text>
          </View>
          <Row style={{ gap: 10, marginBottom: 4 }}>
            <BarButton icon="add" label="15s" onPress={() => timer.addTime(15)} />
            <BarButton icon="play-skip-forward" label="Pular" onPress={timer.stop} />
          </Row>
        </Row>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' }}>
          <View
            style={{
              height: '100%',
              width: `${Math.max(0, Math.min(1, total > 0 ? remaining / total : 0)) * 100}%`,
              borderRadius: 5,
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[bar, pad]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 6 }}>
          <Ionicons name="timer-outline" size={20} color={colors.primary} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Descanso entre séries</Text>
        </Row>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] }}>{fmt(seconds)}</Text>
      </Row>
      <Row style={{ gap: 10 }}>
        {CHOICES.map((c) => (
          <Choice key={c} label={label(c)} active={seconds === c} onPress={() => timer.choose(c)} />
        ))}
        <Pressable
          onPress={() => timer.start()}
          accessibilityRole="button"
          accessibilityLabel="Iniciar descanso"
          style={({ pressed }) => ({
            width: 52,
            height: 52,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="play" size={24} color={colors.onPrimary} style={{ marginLeft: 3 }} />
        </Pressable>
      </Row>
    </View>
  );
}

function Choice({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => ({
        flex: 1,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        borderWidth: active ? 2 : 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primarySoft : colors.inputBg,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ fontSize: 16, color: active ? colors.primary : colors.text, fontWeight: active ? '800' : '600' }}>{label}</Text>
    </Pressable>
  );
}

function BarButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 46,
        paddingHorizontal: 16,
        borderRadius: radius.md,
        backgroundColor: colors.primarySoft,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>{label}</Text>
    </Pressable>
  );
}

const barStyle = (colors: Palette) => ({
  backgroundColor: colors.card,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  paddingHorizontal: 16,
  paddingTop: 14,
  gap: 12,
});

export function RestFinished({ timer }: { timer: RestTimer }) {
  const { colors } = useTheme();
  return (
    <Modal visible={timer.finished} transparent animationType="fade" onRequestClose={timer.dismiss} statusBarTranslucent>
      <Pressable
        onPress={timer.dismiss}
        accessibilityLabel="Fechar aviso"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: 'rgba(16, 10, 28, 0.55)' }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: '100%',
            maxWidth: 320,
            alignItems: 'center',
            gap: 10,
            paddingVertical: 28,
            paddingHorizontal: 24,
            borderRadius: 28,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primarySoft,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primary,
              }}
            >
              <Ionicons name="flash" size={30} color={colors.onPrimary} />
            </View>
          </View>
          <Text accessibilityRole="alert" style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
            Descanso acabou!
          </Text>
          <Text style={{ fontSize: 15, color: colors.muted, textAlign: 'center' }}>Bora pra próxima série 💪</Text>
          <Pressable
            onPress={timer.dismiss}
            accessibilityRole="button"
            style={({ pressed }) => ({
              marginTop: 8,
              alignSelf: 'stretch',
              alignItems: 'center',
              paddingVertical: 14,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.onPrimary }}>Bora!</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
