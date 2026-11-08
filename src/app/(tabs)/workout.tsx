import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { radius } from '@/components/theme';
import { Body, Button, Card, Empty, Row, Screen, fmtNum } from '@/components/ui';
import { exKey, getWorkouts } from '@/db/queries';
import { fmtShort, toKey, todayKey, weekDays } from '@/lib/dates';
import type { WorkoutDay } from '@/lib/types';
import { pickToday } from '@/lib/workout';
import { useData, useProfile } from '@/store/useApp';

const SHORT: Record<string, string> = {
  Domingo: 'DOM',
  Segunda: 'SEG',
  Terça: 'TER',
  Quarta: 'QUA',
  Quinta: 'QUI',
  Sexta: 'SEX',
  Sábado: 'SÁB',
};

const badgeText = (d: WorkoutDay) => SHORT[d.label] ?? d.label.split(' ').pop()?.slice(0, 3).toUpperCase() ?? '';
const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const isWarmup = (name: string) => /aquecimento|alongamento/i.test(name);

function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.8, color: colors.muted, marginTop: 8, marginLeft: 4 }}>
      {children.toUpperCase()}
    </Text>
  );
}

function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'accent' }) {
  const { colors } = useTheme();
  const bg = tone === 'primary' ? colors.primary : tone === 'accent' ? colors.accentSoft : colors.bg;
  const fg = tone === 'primary' ? colors.onPrimary : tone === 'accent' ? colors.accent : colors.text;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: tone === 'neutral' ? '500' : '700', color: fg }}>
        {label}
      </Text>
    </View>
  );
}

function DayCard({
  day,
  isToday,
  doneThisWeek,
  lastDone,
  onPress,
}: {
  day: WorkoutDay;
  isToday: boolean;
  doneThisWeek: boolean;
  lastDone: string | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const main = day.exercises.filter((e) => !isWarmup(e.name));
  const sets = day.exercises.reduce((n, e) => n + (e.sets ?? 0), 0);
  const shown = main.slice(0, 3);
  const extra = main.length - shown.length;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${day.label}, ${day.title}`}>
      {({ pressed }) => (
        <Card
          style={[
            { gap: 12, opacity: pressed ? 0.8 : 1 },
            isToday && { borderColor: colors.primary, borderWidth: 2 },
          ]}
        >
          <Row style={{ gap: 12 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isToday ? colors.primary : colors.primarySoft,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: isToday ? colors.onPrimary : colors.primary }}>
                {badgeText(day)}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: colors.muted }}>
                  {day.label.toUpperCase()}
                </Text>
                {isToday && <Pill label="HOJE" tone="primary" />}
              </Row>
              <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                {day.title ? capitalize(day.title) : day.label}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>
                {day.exercises.length} exercícios{sets > 0 ? ` · ${sets} séries` : ''}
              </Text>
            </View>
          </Row>

          {shown.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {shown.map((e) => (
                <Pill key={e.id} label={e.name} />
              ))}
              {extra > 0 && <Pill label={`+${extra}`} />}
            </View>
          )}

          <View style={{ height: 1, backgroundColor: colors.border }} />

          <Row style={{ justifyContent: 'space-between' }}>
            {doneThisWeek ? (
              <Row style={{ gap: 6 }}>
                <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>Feito esta semana</Text>
              </Row>
            ) : (
              <Text style={{ fontSize: 13, color: colors.muted }}>
                {lastDone ? `Último: ${fmtShort(lastDone)}` : 'Ainda não feito'}
              </Text>
            )}
            <Row style={{ gap: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{isToday ? 'Começar' : 'Abrir'}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Row>
          </Row>
        </Card>
      )}
    </Pressable>
  );
}

export default function Workouts() {
  const { colors } = useTheme();
  const { plan } = useProfile();
  const date = todayKey();
  const days = weekDays();

  const [info] = useData(
    async (db, pid) => {
      const [workouts, lastByLabel, week, loads] = await Promise.all([
        db.getAllAsync<{ date: string; label: string; title: string | null }>(
          'SELECT date, label, title FROM workout_done WHERE profile_id = ? ORDER BY date DESC LIMIT 8',
          pid,
        ),
        db.getAllAsync<{ label: string; last: string }>(
          'SELECT label, MAX(date) AS last FROM workout_done WHERE profile_id = ? GROUP BY label',
          pid,
        ),
        getWorkouts(db, pid, toKey(days[0]), toKey(days[6])),
        db.getAllAsync<{ exercise: string; date: string; w: number }>(
          `SELECT exercise, date, MAX(weight) AS w FROM set_logs
           WHERE profile_id = ? AND weight IS NOT NULL GROUP BY exercise, date ORDER BY date`,
          pid,
        ),
      ]);
      const evolution = new Map<string, { first: number; last: number; lastDate: string; n: number }>();
      loads.forEach((r) => {
        const cur = evolution.get(r.exercise);
        if (!cur) evolution.set(r.exercise, { first: r.w, last: r.w, lastDate: r.date, n: 1 });
        else Object.assign(cur, { last: r.w, lastDate: r.date, n: cur.n + 1 });
      });
      const lastLabel = workouts.find((w) => w.date !== date)?.label ?? null;
      return {
        workouts,
        lastDone: new Map(lastByLabel.map((r) => [r.label, r.last])),
        weekLabels: new Set(week.map((w) => w.label)),
        evolution: [...evolution.entries()].sort((a, b) => b[1].lastDate.localeCompare(a[1].lastDate)),
        todayIdx: week.find((w) => w.date === date)
          ? plan.days.findIndex((d) => d.label === week.find((w) => w.date === date)!.label)
          : pickToday(plan, lastLabel),
      };
    },
    [date],
  );

  const names = new Map<string, string>();
  plan.days.forEach((d) => d.exercises.forEach((e) => names.set(exKey(e.name), e.name)));

  return (
    <Screen>
      {plan.days.length === 0 ? (
        <Empty icon="barbell-outline" text="Nenhum treino no plano ainda.">
          <Button label="Importar treino" icon="download-outline" onPress={() => router.push('/import')} />
        </Empty>
      ) : (
        <>
          <SectionTitle>Seu plano</SectionTitle>
          {plan.days.map((d, i) => (
            <DayCard
              key={i}
              day={d}
              isToday={info?.todayIdx === i}
              doneThisWeek={info?.weekLabels.has(d.label) ?? false}
              lastDone={info?.lastDone.get(d.label) ?? null}
              onPress={() => router.push(`/workout/${i}`)}
            />
          ))}
        </>
      )}

      {info && info.evolution.length > 0 && (
        <>
          <SectionTitle>Evolução das cargas</SectionTitle>
          <Card style={{ paddingVertical: 4, gap: 0 }}>
            {info.evolution.map(([key, ev], i) => {
              const diff = ev.last - ev.first;
              return (
                <Pressable
                  key={key}
                  onPress={() => router.push({ pathname: '/exercise/[name]', params: { name: key } })}
                  style={({ pressed }) => ({
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Row style={{ gap: 12 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Body style={{ fontWeight: '600', textTransform: 'capitalize' }} numberOfLines={1}>
                        {names.get(key) ?? key}
                      </Body>
                      <Text style={{ fontSize: 12, color: colors.muted }}>
                        {ev.n} {ev.n === 1 ? 'treino' : 'treinos'} · {fmtNum(ev.first)} → {fmtNum(ev.last)} kg
                      </Text>
                    </View>
                    {diff !== 0 && <Pill label={`${diff > 0 ? '+' : '−'}${fmtNum(Math.abs(diff))} kg`} tone={diff > 0 ? 'accent' : 'neutral'} />}
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </Row>
                </Pressable>
              );
            })}
          </Card>
        </>
      )}

      {info && info.workouts.length > 0 && (
        <>
          <SectionTitle>Últimos treinos</SectionTitle>
          <Card style={{ gap: 10 }}>
            {info.workouts.map((w) => (
              <Row key={w.date} style={{ gap: 12 }}>
                <View
                  style={{
                    width: 48,
                    paddingVertical: 4,
                    borderRadius: radius.sm,
                    alignItems: 'center',
                    backgroundColor: colors.accentSoft,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>{fmtShort(w.date)}</Text>
                </View>
                <Body style={{ flex: 1 }} numberOfLines={1}>
                  {w.title ? `${w.label} · ${capitalize(w.title)}` : w.label}
                </Body>
                <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
              </Row>
            ))}
          </Card>
        </>
      )}

      <Row style={{ marginTop: 4 }}>
        <Button
          small
          variant="ghost"
          label="Importar treino"
          icon="download-outline"
          onPress={() => router.push({ pathname: '/import', params: { parte: 'treino' } })}
          style={{ flex: 1 }}
        />
        <Button
          small
          variant="ghost"
          label="Editar treino"
          icon="create-outline"
          onPress={() => router.push({ pathname: '/import', params: { parte: 'treino', modo: 'editar' } })}
          style={{ flex: 1 }}
        />
      </Row>
    </Screen>
  );
}
