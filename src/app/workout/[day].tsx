import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { RestBar, RestFinished, useRestTimer } from '@/components/RestTimer';
import { radius, type Palette } from '@/components/theme';
import { Button, Card, Empty, ProgressBar, Row, Screen, fmtNum, parseNum, type IconName } from '@/components/ui';
import {
  exKey,
  getDoneExercises,
  getRecentSessions,
  getSetsForDate,
  getWorkouts,
  setExerciseDone,
  setWorkoutDone,
  upsertSet,
  type SetRow,
} from '@/db/queries';
import { Alert } from '@/lib/alert';
import { celebrate } from '@/lib/celebrate';
import { fmtLong, fmtShort, todayKey } from '@/lib/dates';
import { suggestIncrease } from '@/lib/progression';
import { isSetFinished } from '@/lib/session';
import { WALK_LABEL } from '@/lib/workout';
import type { Exercise } from '@/lib/types';
import { useData, useProfile, useWrite } from '@/store/useApp';
import { useTheme } from '@/components/ThemeProvider';

type Entry = { weight: string; reps: string };

function group(rows: SetRow[]) {
  const m = new Map<string, SetRow[]>();
  rows.forEach((r) => m.set(r.exercise, [...(m.get(r.exercise) ?? []), r]));
  return m;
}

export default function Session() {
  const { colors, s } = useTheme();
  const st = sessionStyles(colors);
  const { day: dayParam, data: dateParam } = useLocalSearchParams<{ day: string; data?: string }>();
  const profile = useProfile();
  const write = useWrite();
  const db = useSQLiteContext();
  const day = profile.plan.days[Number(dayParam)];
  const [today] = useState(todayKey);
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam < today ? dateParam : today;
  const readOnly = date !== today;
  const keys = day ? day.exercises.map((e) => exKey(e.name)) : [];

  const timer = useRestTimer();

  const [data] = useData(
    async (db, pid) => {
      const [today, recent, done, w] = await Promise.all([
        getSetsForDate(db, pid, date),
        getRecentSessions(db, pid, keys, date, 2),
        getDoneExercises(db, pid, date),
        getWorkouts(db, pid, date, date),
      ]);
      const sessions = new Map<string, SetRow[][]>();
      recent.forEach((r) => {
        const list = sessions.get(r.exercise) ?? [];
        (list[r.rank - 1] ??= []).push(r);
        sessions.set(r.exercise, list);
      });
      const prev = new Map([...sessions].map(([k, v]) => [k, v[0] ?? []]));
      return { today: group(today), prev, sessions, done, finished: w.some((x) => x.label !== WALK_LABEL) };
    },
    [dayParam, date],
  );

  const [entries, setEntries] = useState<Record<string, Entry[]>>({});
  const saved = useRef<Record<string, string>>({});
  const initialized = useRef(false);
  useEffect(() => {
    if (!data || !day || initialized.current) return;
    initialized.current = true;
    const init: Record<string, Entry[]> = {};
    day.exercises.forEach((e) => {
      const k = exKey(e.name);
      const rows = data.today.get(k) ?? [];
      init[k] = Array.from({ length: e.sets ?? 0 }, (_, i) => {
        const r = rows.find((x) => x.set_index === i);
        const entry = { weight: fmtNum(r?.weight), reps: r?.reps ?? '' };
        saved.current[`${k}:${i}`] = sig(entry);
        return entry;
      });
    });
    setEntries(init);
  }, [data, day]);

  if (!day) {
    return (
      <Screen>
        <Empty icon="alert-circle-outline" text="Treino não encontrado." />
      </Screen>
    );
  }
  if (!data) return <Screen>{null}</Screen>;

  const doneCount = day.exercises.filter((e) => data.done.has(exKey(e.name))).length;

  const askToFinish = (justDone: string) => {
    if (data.finished) return;
    const pending = day.exercises.filter((x) => exKey(x.name) !== justDone && !data.done.has(exKey(x.name)));
    if (pending.length > 0) return;
    Alert.alert('Treino completo! 🎉', 'Todos os exercícios estão feitos. Concluir o treino e somar na sequência?', [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Concluir', onPress: () => finish() },
    ]);
  };

  const toggleDone = async (e: Exercise) => {
    const k = exKey(e.name);
    if (readOnly) return;
    const marking = !data.done.has(k);
    await write((db) => setExerciseDone(db, profile.id, date, k, marking));
    if (marking) askToFinish(k);
  };

  const update = (k: string, i: number, field: keyof Entry, value: string) =>
    setEntries((prev) => {
      const list = [...(prev[k] ?? [])];
      list[i] = { ...list[i], [field]: value };
      return { ...prev, [k]: list };
    });

  const save = (e: Exercise, i: number, entry: Entry = entries[exKey(e.name)]?.[i], rest = true) => {
    const k = exKey(e.name);
    if (!entry || readOnly) return;
    const id = `${k}:${i}`;
    const before = saved.current[id];
    const changed = before !== sig(entry);
    saved.current[id] = sig(entry);
    if (!changed) return;
    const weight = parseNum(entry.weight);
    const reps = entry.reps.trim() || null;
    const setFinished = rest && isSetFinished(before, entry);
    if (setFinished && !timer.running) timer.start();
    const completes = setFinished && i === (e.sets ?? 0) - 1 && !data.done.has(k);
    return write(async (db) => {
      await upsertSet(db, profile.id, k, date, i, weight, reps);
      if (completes) await setExerciseDone(db, profile.id, date, k, true);
    }).then(() => {
      if (completes) askToFinish(k);
    });
  };

  const repeatLast = (e: Exercise) => {
    const k = exKey(e.name);
    const prev = data.prev.get(k) ?? [];
    const list = (entries[k] ?? []).map((x, i) => {
      const p = prev.find((r) => r.set_index === i) ?? prev[prev.length - 1];
      return { weight: fmtNum(p?.weight), reps: x.reps || (p?.reps ?? '') };
    });
    setEntries((all) => ({ ...all, [k]: list }));
    list.forEach((entry, i) => save(e, i, entry, false));
  };

  const applyLoad = (e: Exercise, weight: number) => {
    const k = exKey(e.name);
    const list = (entries[k] ?? []).map((x) => ({ ...x, weight: fmtNum(weight) }));
    setEntries((all) => ({ ...all, [k]: list }));
    list.forEach((entry, i) => save(e, i, entry, false));
  };

  const finish = async () => {
    if (readOnly) return;
    const concluding = !data.finished;
    await write((db) => setWorkoutDone(db, profile.id, date, day.label, day.title, concluding));
    if (!concluding) return;
    await celebrate(db, profile.id, profile.plan).catch(() => {});
    router.back();
  };

  const total = day.exercises.length;
  const allDone = data.finished || (total > 0 && doneCount === total);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: day.label }} />
      <Screen>
        <Card style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: colors.muted }}>
                {day.label.toUpperCase()}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
                {day.title ? capitalize(day.title) : day.label}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: allDone ? colors.accent : colors.primary }}>
                {doneCount}/{total}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>exercícios</Text>
            </View>
          </Row>
          <ProgressBar value={total > 0 ? doneCount / total : 0} color={allDone ? colors.accent : colors.primary} />
          {readOnly && (
            <Row style={{ gap: 6, alignItems: 'flex-start' }}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
              <Text style={{ fontSize: 13, color: colors.muted, flexShrink: 1 }}>
                <Text style={{ fontWeight: '700' }}>{capitalize(fmtLong(date))}</Text>
                {data.finished ? '' : ' · não registrado'}. Dias que já passaram ficam só para ver: dá para marcar treinos apenas no dia.
              </Text>
            </Row>
          )}
          {data.finished && (
            <Row style={{ gap: 6 }}>
              <Ionicons name="checkmark-done-circle" size={18} color={colors.accent} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>{readOnly ? `Treino concluído em ${fmtShort(date)}` : 'Treino concluído hoje'}</Text>
            </Row>
          )}
        </Card>

        {day.exercises.map((e, idx) => {
          const k = exKey(e.name);
          const prev = data.prev.get(k) ?? [];
          const done = data.done.has(k);
          const typed = (entries[k] ?? []).some((x) => x.weight.trim());
          const sug = !typed && !done && !readOnly ? suggestIncrease(e, data.sessions.get(k) ?? []) : null;
          const lastMax = prev.length ? Math.max(...prev.map((p) => p.weight ?? 0)) : 0;
          const rows = entries[k] ?? [];
          const timed = /\bs$/.test(e.reps ?? '');
          return (
            <Card key={e.id} style={[{ gap: 12 }, done && { borderColor: colors.accent, borderWidth: 1.5 }]}>
              <Row style={{ gap: 12, alignItems: 'flex-start' }}>
                <Pressable
                  onPress={() => toggleDone(e)}
                  disabled={readOnly}
                  hitSlop={8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={`Marcar ${e.name} como feito`}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? colors.accent : colors.primarySoft,
                  }}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={20} color={colors.onAccent} />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary }}>{idx + 1}</Text>
                  )}
                </Pressable>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: done ? colors.muted : colors.text }}>{e.name}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {e.sets !== undefined ? (
                      <Tag icon="repeat" label={`${e.sets} × ${e.reps ?? ''}`} />
                    ) : e.note ? (
                      <Tag icon="time-outline" label={e.note} />
                    ) : null}
                    {e.load && <Tag icon="barbell-outline" label={lastMax > 0 ? `último ${fmtNum(lastMax)} kg` : 'anote a carga'} />}
                  </View>
                </View>
                {e.load && (
                  <Pressable
                    hitSlop={10}
                    style={{ padding: 6 }}
                    accessibilityLabel={`Evolução de ${e.name}`}
                    onPress={() => router.push({ pathname: '/exercise/[name]', params: { name: k, label: e.name } })}
                  >
                    <Ionicons name="stats-chart" size={18} color={colors.muted} />
                  </Pressable>
                )}
              </Row>

              {sug && (
                <View style={st.suggestion}>
                  <Ionicons name="trending-up" size={20} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.accent }}>Hora de subir a carga?</Text>
                    <Text style={s.small}>
                      Você completou {e.sets} × {e.reps} com {fmtNum(sug.from)} kg nos {sug.sessions} últimos treinos. Tente{' '}
                      {fmtNum(sug.to)} kg.
                    </Text>
                  </View>
                  <Button small variant="secondary" label={`${fmtNum(sug.to)} kg`} onPress={() => applyLoad(e, sug.to)} />
                </View>
              )}

              {rows.length > 0 && (
                <View style={{ gap: 8 }}>
                  {prev.length > 0 && !readOnly && (
                    <Row style={st.lastBox}>
                      <Ionicons name="time-outline" size={14} color={colors.muted} />
                      <Text style={[s.small, { flex: 1 }]} numberOfLines={1}>
                        {fmtShort(prev[0].date)}: {prev.map((p) => fmtNum(p.weight)).join(' / ')} kg
                      </Text>
                      <Pressable onPress={() => repeatLast(e)} hitSlop={8}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Repetir</Text>
                      </Pressable>
                    </Row>
                  )}
                  <Row style={{ gap: 8 }}>
                    <Text numberOfLines={1} style={[st.colHead, { width: SET_COL, textAlign: 'center' }]}>
                      SÉRIE
                    </Text>
                    {e.load && (
                      <Text numberOfLines={1} style={[st.colHead, { flex: 1 }]}>
                        CARGA
                      </Text>
                    )}
                    <Text numberOfLines={1} style={[st.colHead, { flex: 1 }]}>
                      {timed ? 'TEMPO' : 'REPETIÇÕES'}
                    </Text>
                  </Row>
                  {rows.map((entry, i) => {
                    const filled = !!(entry.weight.trim() || entry.reps.trim());
                    return (
                      <Row key={i} style={{ gap: 8 }}>
                        <View style={{ width: SET_COL, alignItems: 'center' }}>
                          <View style={[st.setBadge, filled && { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: filled ? colors.accent : colors.muted }}>{i + 1}</Text>
                          </View>
                        </View>
                        {e.load && (
                          <View style={st.inputWrap}>
                            <TextInput
                              style={st.input}
                              value={entry.weight}
                              onChangeText={(v) => update(k, i, 'weight', v)}
                              onEndEditing={() => save(e, i)}
                              onBlur={WEB ? () => save(e, i) : undefined}
                              keyboardType="decimal-pad"
                              editable={!readOnly}
                              placeholder={readOnly ? '–' : fmtNum((prev.find((p) => p.set_index === i) ?? prev[prev.length - 1])?.weight) || '0'}
                              placeholderTextColor={colors.muted}
                              selectTextOnFocus
                            />
                            <Text style={s.small}>kg</Text>
                          </View>
                        )}
                        <View style={st.inputWrap}>
                          <TextInput
                            style={st.input}
                            value={entry.reps}
                            onChangeText={(v) => update(k, i, 'reps', v)}
                            onEndEditing={() => save(e, i)}
                            onBlur={WEB ? () => save(e, i) : undefined}
                            keyboardType={/^\d+$/.test(e.reps ?? '') ? 'number-pad' : 'default'}
                            editable={!readOnly}
                            placeholder={readOnly ? '–' : (e.reps?.split(' ')[0] ?? '')}
                            placeholderTextColor={colors.muted}
                            selectTextOnFocus
                          />
                          <Text style={s.small}>{timed ? 's' : 'reps'}</Text>
                        </View>
                      </Row>
                    );
                  })}
                </View>
              )}
            </Card>
          );
        })}

        {!readOnly && (
          <Button
            label={data.finished ? 'Treino concluído · desfazer' : 'Concluir treino'}
            variant={data.finished ? 'ghost' : 'primary'}
            icon={data.finished ? 'refresh-outline' : 'checkmark-done-outline'}
            onPress={finish}
            style={{ marginTop: 8 }}
          />
        )}
      </Screen>
      {!data.finished && !readOnly && <RestBar timer={timer} />}
      <RestFinished timer={timer} />
    </KeyboardAvoidingView>
  );
}

function Tag({ icon, label }: { icon: IconName; label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.bg,
        borderRadius: radius.pill,
        paddingHorizontal: 9,
        paddingVertical: 3,
      }}
    >
      <Ionicons name={icon} size={12} color={colors.muted} />
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{label}</Text>
    </View>
  );
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const SET_COL = 44;
const WEB = Platform.OS === 'web';


const sig = (e: Entry) => `${e.weight.trim()}|${e.reps.trim()}`;

const sessionStyles = (colors: Palette) => ({
  suggestion: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 10,
  },
  input: { flex: 1, minWidth: 0, paddingVertical: 8, fontSize: 16, color: colors.text },
  lastBox: {
    gap: 6,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  colHead: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.5, color: colors.muted },
  setBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
});
