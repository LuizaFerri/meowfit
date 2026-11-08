import Ionicons from '@expo/vector-icons/Ionicons';
import { addDays } from 'date-fns';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { radius } from '@/components/theme';
import { Button, Card, Empty, Row, Screen, fmtNum } from '@/components/ui';
import { getMealHistory } from '@/db/queries';
import { fmtLong, toKey, todayKey } from '@/lib/dates';
import { buildDietHistory, type HistoryDay, type HistoryEntry } from '@/lib/diet';
import { useData, useProfile } from '@/store/useApp';

const PAGE = 30;
const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function DietHistory() {
  const { colors } = useTheme();
  const { plan } = useProfile();
  const [days, setDays] = useState(PAGE);
  const today = todayKey();
  const from = toKey(addDays(new Date(), -(days - 1)));

  const [history] = useData(
    async (db, pid) => {
      const { meals, water } = await getMealHistory(db, pid, from, today);
      return buildDietHistory(plan.meals, meals, water);
    },
    [from, today],
  );

  if (!history) return <Screen>{null}</Screen>;

  return (
    <Screen>
      {history.length === 0 ? (
        <Empty icon="restaurant-outline" text={`Nenhuma refeição registrada nos últimos ${days} dias.`} />
      ) : (
        history.map((d) => <DayCard key={d.date} day={d} />)
      )}
      <Button variant="ghost" icon="time-outline" label={`Ver mais ${PAGE} dias`} onPress={() => setDays(days + PAGE)} />
      <Text style={{ textAlign: 'center', fontSize: 12, color: colors.muted }}>Mostrando os últimos {days} dias</Text>
    </Screen>
  );
}

function DayCard({ day }: { day: HistoryDay }) {
  const { colors } = useTheme();
  const good = day.logged > 0 && day.onPlan / day.logged >= 0.8;
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{capitalize(fmtLong(day.date))}</Text>
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          <View
            style={{
              borderRadius: radius.pill,
              paddingHorizontal: 10,
              paddingVertical: 3,
              backgroundColor: good ? colors.accentSoft : colors.warnSoft,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: good ? colors.accent : colors.warn }}>
              {day.onPlan} de {day.logged} no plano
            </Text>
          </View>
          {day.waterMl > 0 && (
            <View style={{ borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: colors.bg }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.info }}>💧 {fmtNum(day.waterMl / 1000)} L</Text>
            </View>
          )}
        </Row>
      </View>
      <View style={{ height: 1, backgroundColor: colors.border }} />
      <View style={{ gap: 12 }}>
        {day.entries.map((e, i) => (
          <EntryRow key={i} entry={e} />
        ))}
      </View>
    </Card>
  );
}

function EntryRow({ entry }: { entry: HistoryEntry }) {
  const { colors } = useTheme();
  const icon = entry.status === 'plan' ? 'checkmark-circle' : entry.status === 'off' ? 'alert-circle' : 'ellipse-outline';
  const tint = entry.status === 'plan' ? colors.accent : entry.status === 'off' ? colors.warn : colors.border;
  const detail =
    entry.status === 'plan'
      ? entry.text
        ? `Opção ${(entry.option ?? 0) + 1} · ${entry.text}`
        : `Opção ${(entry.option ?? 0) + 1}`
      : entry.status === 'off'
        ? entry.text
          ? `Fora do plano · ${entry.text}`
          : 'Fora do plano'
        : 'Não registrado';

  return (
    <Row style={{ alignItems: 'flex-start', gap: 10 }}>
      <Ionicons name={icon} size={20} color={tint} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Row style={{ gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: entry.status === 'none' ? colors.muted : colors.text }}>
            {entry.meal}
          </Text>
          {entry.time ? <Text style={{ fontSize: 12, color: colors.muted }}>{entry.time}</Text> : null}
        </Row>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: entry.status === 'off' ? colors.warn : colors.muted,
            fontStyle: entry.status === 'none' ? 'italic' : 'normal',
          }}
        >
          {detail}
        </Text>
      </View>
    </Row>
  );
}
