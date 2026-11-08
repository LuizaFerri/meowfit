import { Stack, useLocalSearchParams } from 'expo-router';
import { LineChart } from '@/components/LineChart';
import { Body, Card, Empty, Row, Screen, Subtitle, fmtNum } from '@/components/ui';
import { exKey, getExerciseHistory, type SetRow } from '@/db/queries';
import { fmtShort } from '@/lib/dates';
import { useData, useProfile } from '@/store/useApp';
import { useTheme } from '@/components/ThemeProvider';

export default function ExerciseHistory() {
  const { colors } = useTheme();
  const { name, label } = useLocalSearchParams<{ name: string; label?: string }>();
  const { plan } = useProfile();
  const display =
    label ?? plan.days.flatMap((d) => d.exercises).find((e) => exKey(e.name) === name)?.name ?? name;

  const [rows] = useData((db, pid) => getExerciseHistory(db, pid, name), [name]);

  const sessions = new Map<string, SetRow[]>();
  (rows ?? []).forEach((r) => sessions.set(r.date, [...(sessions.get(r.date) ?? []), r]));
  const list = [...sessions.entries()]
    .map(([date, sets]) => ({ date, sets, max: Math.max(...sets.map((s) => s.weight ?? 0)) }))
    .filter((x) => x.max > 0);
  const best = list.reduce((m, x) => Math.max(m, x.max), 0);
  const first = list[0]?.max;
  const last = list[list.length - 1]?.max;

  return (
    <Screen>
      <Stack.Screen options={{ title: display }} />
      {list.length === 0 ? (
        <Empty icon="stats-chart-outline" text="Ainda sem cargas anotadas para este exercício." />
      ) : (
        <>
          <Card>
            <Subtitle>Carga máxima por treino</Subtitle>
            <LineChart data={list.map((x) => ({ label: fmtShort(x.date), value: x.max }))} unit=" kg" />
            <Row style={{ justifyContent: 'space-around', marginTop: 4 }}>
              <Stat label="Início" value={`${fmtNum(first)} kg`} />
              <Stat label="Atual" value={`${fmtNum(last)} kg`} />
              <Stat label="Recorde" value={`${fmtNum(best)} kg`} />
            </Row>
            {last !== undefined && first !== undefined && last > first && (
              <Body style={{ color: colors.accent, textAlign: 'center', fontWeight: '600' }}>
                +{fmtNum(last - first)} kg desde o começo 💪
              </Body>
            )}
          </Card>
          <Card>
            <Subtitle>Histórico</Subtitle>
            {[...list].reverse().map((x) => (
              <Row key={x.date} style={{ paddingVertical: 4 }}>
                <Body muted style={{ width: 52 }}>
                  {fmtShort(x.date)}
                </Body>
                <Body style={{ flex: 1 }}>
                  {x.sets.map((s) => `${fmtNum(s.weight)}${s.reps ? `×${s.reps}` : ''}`).join('  ·  ')}
                </Body>
              </Row>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <Card style={{ alignItems: 'center', padding: 8, borderWidth: 0, gap: 0 }}>
      <Body muted style={{ fontSize: 12 }}>
        {label}
      </Body>
      <Body style={{ fontWeight: '700', fontSize: 17 }}>{value}</Body>
    </Card>
  );
}
