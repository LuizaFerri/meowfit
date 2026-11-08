import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Switch } from 'react-native';
import { getSetting, setSetting } from '@/db/queries';
import { Alert } from '@/lib/alert';
import { ensurePermission, notificationsAvailable, syncWorkoutReminders } from '@/lib/notifications';
import { fmtClock } from '@/lib/water';
import { DEFAULT_WORKOUT_REMINDER, workoutReminderKey, type WorkoutReminder } from '@/lib/workoutReminder';
import { useData, useProfile } from '@/store/useApp';
import { Body, Card, Chip, Row, Subtitle } from './ui';
import { useTheme } from './ThemeProvider';

const TIMES = [6, 7, 8, 12, 17, 18, 19, 20, 21].map((h) => h * 60);

export function WorkoutReminderCard() {
  const { colors } = useTheme();
  const profile = useProfile();
  const db = useSQLiteContext();
  const [local, setLocal] = useState<WorkoutReminder | null>(null);
  const [saved] = useData((db, pid) => getSetting<WorkoutReminder>(db, workoutReminderKey(pid), DEFAULT_WORKOUT_REMINDER));

  if (!notificationsAvailable) return null;
  const reminder = local ?? saved ?? DEFAULT_WORKOUT_REMINDER;

  const update = async (patch: Partial<WorkoutReminder>) => {
    const next = { ...reminder, ...patch };
    if (patch.enabled && !(await ensurePermission())) {
      return Alert.alert(
        'Notificações bloqueadas',
        'Libere as notificações do app nas configurações do Android para receber os lembretes.',
      );
    }
    setLocal(next);
    await setSetting(db, workoutReminderKey(profile.id), next);
    syncWorkoutReminders(db, profile.id);
  };

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Subtitle>Lembrete de treino</Subtitle>
        <Switch
          value={reminder.enabled}
          onValueChange={(v) => update({ enabled: v })}
          trackColor={{ true: colors.primarySoft, false: colors.border }}
          thumbColor={reminder.enabled ? colors.primary : colors.muted}
          accessibilityLabel="Lembrete de treino"
        />
      </Row>
      <Body muted style={{ fontSize: 13 }}>
        Avisa nos dias de treino, se ele ainda não foi feito. Quando a sequência estiver em risco, o aviso é mais insistente. 🔥
      </Body>
      {reminder.enabled && (
        <>
          <Body muted style={{ fontSize: 13 }}>
            Horário
          </Body>
          <Row style={{ flexWrap: 'wrap' }}>
            {TIMES.map((m) => (
              <Chip key={m} label={fmtClock(m)} active={reminder.atMin === m} onPress={() => update({ atMin: m })} />
            ))}
          </Row>
        </>
      )}
    </Card>
  );
}
