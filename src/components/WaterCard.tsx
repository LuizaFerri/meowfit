import Ionicons from '@expo/vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Alert } from '@/lib/alert';
import { addWater, getSetting, getWater, setSetting } from '@/db/queries';
import { todayKey } from '@/lib/dates';
import { ensurePermission, notificationsAvailable, syncWaterReminders, waterKey } from '@/lib/notifications';
import { DEFAULT_WATER_REMINDER, fmtClock, type WaterReminder } from '@/lib/water';
import { useData, useProfile, useWrite } from '@/store/useApp';
import { Body, Button, Card, Chip, ProgressBar, Row, Subtitle, fmtNum } from './ui';
import { useTheme } from './ThemeProvider';

const INTERVALS = [60, 90, 120, 180];
const STARTS = [6, 7, 8, 9, 10].map((h) => h * 60);
const ENDS = [19, 20, 21, 22, 23].map((h) => h * 60);

export function WaterCard() {
  const { colors } = useTheme();
  const profile = useProfile();
  const write = useWrite();
  const date = todayKey();
  const db = useSQLiteContext();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<WaterReminder | null>(null);
  const [data] = useData(
    async (db, pid) => ({
      ml: await getWater(db, pid, date),
      reminder: await getSetting<WaterReminder>(db, waterKey(pid), DEFAULT_WATER_REMINDER),
    }),
    [date],
  );
  const goal = (profile.plan.targets.waterL ?? 2) * 1000;
  const value = data?.ml ?? 0;
  const reminder = local ?? data?.reminder ?? DEFAULT_WATER_REMINDER;

  const [seen, setSeen] = useState({ data, pid: profile.id });
  if (seen.data !== data || seen.pid !== profile.id) {
    setSeen({ data, pid: profile.id });
    setLocal(null);
  }

  const add = (delta: number) =>
    write(async (db) => {
      await addWater(db, profile.id, date, delta);
      syncWaterReminders(db, profile.id);
    });

  const update = async (patch: Partial<WaterReminder>) => {
    const next = { ...reminder, ...patch };
    if (patch.enabled && !(await ensurePermission())) {
      return Alert.alert(
        'Notificações bloqueadas',
        'Libere as notificações do app nas configurações do Android para receber os lembretes.',
      );
    }
    setLocal(next);
    await setSetting(db, waterKey(profile.id), next);
    syncWaterReminders(db, profile.id);
  };

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Subtitle>Água</Subtitle>
        <Row>
          <Body muted>
            {fmtNum(value / 1000)} / {fmtNum(goal / 1000)} L
          </Body>
          {notificationsAvailable && (
            <Pressable
              hitSlop={10}
              onPress={() => setOpen(!open)}
              accessibilityLabel="Lembretes de água"
              style={{ paddingLeft: 6 }}
            >
              <Ionicons
                name={reminder.enabled ? 'notifications' : 'notifications-outline'}
                size={20}
                color={reminder.enabled ? colors.primary : colors.muted}
              />
            </Pressable>
          )}
        </Row>
      </Row>
      <ProgressBar value={value / goal} color={value >= goal ? colors.accent : colors.info} />
      <Row style={{ marginTop: 4 }}>
        <Button small variant="ghost" label="−250" onPress={() => add(-250)} disabled={value <= 0} />
        <Button small variant="secondary" icon="water-outline" label="+250 ml" onPress={() => add(250)} style={{ flex: 1 }} />
        <Button small variant="secondary" label="+500" onPress={() => add(500)} />
      </Row>

      {open && (
        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Body style={{ flex: 1 }}>Lembrar de beber água</Body>
            <Switch
              value={reminder.enabled}
              onValueChange={(v) => update({ enabled: v })}
              trackColor={{ true: colors.primarySoft, false: colors.border }}
              thumbColor={reminder.enabled ? colors.primary : colors.muted}
            />
          </Row>
          {reminder.enabled && (
            <>
              <Body muted style={{ fontSize: 13 }}>
                A cada
              </Body>
              <Row style={{ flexWrap: 'wrap' }}>
                {INTERVALS.map((m) => (
                  <Chip key={m} label={fmtClock(m)} active={reminder.everyMin === m} onPress={() => update({ everyMin: m })} />
                ))}
              </Row>
              <Body muted style={{ fontSize: 13 }}>
                Das
              </Body>
              <Row style={{ flexWrap: 'wrap' }}>
                {STARTS.map((m) => (
                  <Chip key={m} label={fmtClock(m)} active={reminder.fromMin === m} onPress={() => update({ fromMin: m })} />
                ))}
              </Row>
              <Body muted style={{ fontSize: 13 }}>
                Até as
              </Body>
              <Row style={{ flexWrap: 'wrap' }}>
                {ENDS.map((m) => (
                  <Chip key={m} label={fmtClock(m)} active={reminder.toMin === m} onPress={() => update({ toMin: m })} />
                ))}
              </Row>
              <Body muted style={{ fontSize: 13 }}>
                Os lembretes param no dia em que você bate a meta.
              </Body>
            </>
          )}
        </View>
      )}
    </Card>
  );
}
