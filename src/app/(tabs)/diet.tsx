import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { radius } from '@/components/theme';
import { Body, Button, Card, Empty, ProgressBar, Row, Screen, Subtitle } from '@/components/ui';
import { WaterCard } from '@/components/WaterCard';
import { getFirstMealDate, getMealDaysBetween, getMealLogs, getMealNotes, setMeal, setMealNote } from '@/db/queries';
import { todayKey, toKey, weekDays } from '@/lib/dates';
import { dailyAdherence, weeklyAdherence } from '@/lib/diet';
import type { Targets } from '@/lib/types';
import { useData, useProfile, useWrite } from '@/store/useApp';
import { useTheme } from '@/components/ThemeProvider';

const range = (a?: number, b?: number) => (a === undefined ? '—' : b !== undefined && b !== a ? `${a}–${b}` : `${a}`);

export default function Diet() {
  const { colors } = useTheme();
  const profile = useProfile();
  const { meals, rules, targets } = profile.plan;
  const write = useWrite();
  const date = todayKey();
  const days = weekDays();

  const [data] = useData(
    async (db, pid) => {
      const [logs, notes, week, firstLog] = await Promise.all([
        getMealLogs(db, pid, date),
        getMealNotes(db, pid, date),
        getMealDaysBetween(db, pid, toKey(days[0]), date),
        getFirstMealDate(db, pid),
      ]);
      return { logs, notes, week, firstLog, now: new Date() };
    },
    [date],
  );

  const db = useSQLiteContext();
  const saveNote = (meal: string, note: string) => setMealNote(db, profile.id, date, meal, note).catch(() => {});

  const choose = (meal: string, option: number) => {
    const current = data?.logs.get(meal);
    return write((db) => setMeal(db, profile.id, date, meal, current === option ? null : option));
  };

  const day = data ? dailyAdherence(meals, data.logs, data.now) : { onPlan: 0, expected: 0 };
  const dayRatio = day.expected > 0 ? day.onPlan / day.expected : 0;
  const week = data
    ? weeklyAdherence({
        meals,
        todayLogs: data.logs,
        onPlanThisWeek: data.week.reduce((n, d) => n + d.onPlan, 0),
        weekStart: toKey(days[0]),
        firstLog: data.firstLog,
        today: date,
        now: data.now,
      })
    : { onPlan: 0, expected: 0 };
  const weekRatio = week.expected > 0 ? week.onPlan / week.expected : 0;

  return (
    <Screen>
      <TargetsCard targets={targets} />
      <WaterCard />

      {meals.length === 0 ? (
        <Empty icon="restaurant-outline" text="Seu perfil ainda não tem dieta. Cole o cardápio do nutricionista ou abra um arquivo.">
          <Button small variant="secondary" label="Importar dieta" icon="download-outline" onPress={() => router.push({ pathname: '/import', params: { parte: 'dieta' } })} />
        </Empty>
      ) : (
        <>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Subtitle>Hoje</Subtitle>
              <Body muted>
                {day.onPlan} de {day.expected} no plano
              </Body>
            </Row>
            <ProgressBar value={dayRatio} color={day.expected === 0 || dayRatio >= 0.8 ? colors.accent : colors.warn} />
            <Body muted style={{ fontSize: 13 }}>
              {day.expected === 0
                ? 'Nenhuma refeição até agora. Elas entram na conta quando chega o horário.'
                : 'Conta as refeições cujo horário já passou.'}
              {week.expected > 0 ? ` Semana: ${Math.round(weekRatio * 100)}% (meta ~80%).` : ''}
            </Body>
            <Button small variant="secondary" icon="calendar-outline" label="Ver histórico da dieta" onPress={() => router.push('/diet-history')} />
          </Card>

          {meals.map((m, mi) => {
            const chosen = data?.logs.get(m.name);
            return (
              <Card key={mi}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    {m.time ? <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>{m.time}</Text> : null}
                    <Subtitle>{m.name}</Subtitle>
                  </View>
                  {chosen !== undefined && <Ionicons name="checkmark-circle" size={22} color={chosen >= 0 ? colors.accent : colors.warn} />}
                </Row>
                {m.options.map((o, i) => (
                  <Option key={i} label={`Opção ${i + 1}`} text={o} active={chosen === i} onPress={() => choose(m.name, i)} />
                ))}
                <Option label="Outra coisa" active={chosen === -1} onPress={() => choose(m.name, -1)} warn />
                {chosen === -1 && (
                  <OtherNote initial={data?.notes.get(m.name) ?? ''} onSave={(text) => saveNote(m.name, text)} />
                )}
              </Card>
            );
          })}
        </>
      )}

      {rules.length > 0 && (
        <Card>
          <Subtitle>Regras simples</Subtitle>
          {rules.map((r, i) => (
            <Row key={i} style={{ alignItems: 'flex-start' }}>
              <Text style={{ color: colors.primary, fontSize: 15, lineHeight: 21 }}>•</Text>
              <Body style={{ flex: 1 }}>{r}</Body>
            </Row>
          ))}
        </Card>
      )}
      <Row>
        <Button
          small
          variant="ghost"
          label="Importar dieta"
          icon="download-outline"
          onPress={() => router.push({ pathname: '/import', params: { parte: 'dieta' } })}
          style={{ flex: 1 }}
        />
        <Button
          small
          variant="ghost"
          label="Editar dieta"
          icon="create-outline"
          onPress={() => router.push({ pathname: '/import', params: { parte: 'dieta', modo: 'editar' } })}
          style={{ flex: 1 }}
        />
      </Row>
    </Screen>
  );
}

function TargetsCard({ targets: t }: { targets: Targets }) {
  const { colors } = useTheme();
  if (t.kcalMin === undefined && t.proteinMin === undefined) return null;
  return (
    <Row>
      <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
        <Body muted style={{ fontSize: 12 }}>
          Calorias/dia
        </Body>
        <Body style={{ fontWeight: '700', fontSize: 18 }}>{range(t.kcalMin, t.kcalMax)}</Body>
        <Body muted style={{ fontSize: 12 }}>
          kcal
        </Body>
      </Card>
      <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
        <Body muted style={{ fontSize: 12 }}>
          Proteína/dia
        </Body>
        <Body style={{ fontWeight: '700', fontSize: 18 }}>{range(t.proteinMin, t.proteinMax)}</Body>
        <Body muted style={{ fontSize: 12 }}>
          gramas
        </Body>
      </Card>
    </Row>
  );
}

function Option({
  label,
  text,
  active,
  onPress,
  warn,
}: {
  label: string;
  text?: string;
  active: boolean;
  onPress: () => void;
  warn?: boolean;
}) {
  const { colors } = useTheme();
  const tint = warn ? colors.warn : colors.accent;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 10,
        padding: 10,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: active ? tint : colors.border,
        backgroundColor: active ? (warn ? colors.warnSoft : colors.accentSoft) : colors.inputBg,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: active ? tint : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        {active && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tint }} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: active ? tint : colors.muted }}>{label}</Text>
        {text ? <Body>{text}</Body> : null}
      </View>
    </Pressable>
  );
}

function OtherNote({ initial, onSave }: { initial: string; onSave: (text: string) => Promise<unknown> }) {
  const { colors, s } = useTheme();
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [justSaved, setJustSaved] = useState(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    setText(initial);
    setSaved(initial);
  }, [initial]);

  useEffect(() => {
    if (!justSaved) return;
    const id = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(id);
  }, [justSaved]);

  const dirty = text.trim() !== saved.trim();

  const save = async () => {
    input.current?.blur();
    Keyboard.dismiss();
    if (!dirty) return;
    const value = text.trim();
    setSaved(value);
    setText(value);
    await onSave(value);
    setJustSaved(true);
  };

  return (
    <View style={{ gap: 8 }}>
      <TextInput
        ref={input}
        value={text}
        onChangeText={(v) => {
          setText(v);
          setJustSaved(false);
        }}
        onEndEditing={save}
        onBlur={Platform.OS === 'web' ? save : undefined}
        placeholder="O que você comeu?"
        placeholderTextColor={colors.muted}
        multiline
        maxLength={200}
        textAlignVertical="top"
        style={[s.input, { minHeight: 56, fontSize: 15, borderColor: colors.warn }]}
      />
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: justSaved ? colors.accent : colors.muted }}>
          {justSaved ? 'Salvo ✓' : dirty ? 'Não salvo' : saved ? 'Anotado' : ''}
        </Text>
        <Button small label="Salvar" icon="checkmark" onPress={save} disabled={!dirty} />
      </Row>
    </View>
  );
}
