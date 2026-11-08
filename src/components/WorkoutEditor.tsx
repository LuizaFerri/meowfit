import { Pressable, Text, View } from 'react-native';
import { Alert } from '@/lib/alert';
import {
  WEEK_LETTERS,
  WEEK_ORDER,
  emptyExercise,
  newKey,
  rotatingDay,
  sortDays,
  weekdayDay,
  type DayDraft,
  type ExerciseDraft,
  type WorkoutDraft,
} from '@/lib/planForm';
import { WEEKDAY_LABELS } from '@/lib/planText';
import { Body, Button, Card, Check, Field, IconButton, Row, Subtitle } from './ui';
import { useTheme } from './ThemeProvider';

type Props = { value: WorkoutDraft; onChange: (next: WorkoutDraft) => void };

const move = <T,>(list: T[], from: number, to: number) => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export function WorkoutEditor({ value, onChange }: Props) {
  const { colors } = useTheme();
  const setDays = (days: DayDraft[]) => onChange({ ...value, days: sortDays(days) });
  const setDay = (key: string, patch: Partial<DayDraft>) =>
    onChange({ ...value, days: value.days.map((d) => (d.key === key ? { ...d, ...patch } : d)) });

  const removeDay = (day: DayDraft) => {
    const drop = () => setDays(value.days.filter((d) => d.key !== day.key));
    if (!day.exercises.some((e) => e.name.trim())) return drop();
    Alert.alert(`Tirar ${day.label}?`, 'Os exercícios deste dia saem do plano. O histórico de cargas continua salvo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tirar', style: 'destructive', onPress: drop },
    ]);
  };

  const toggleWeekday = (wd: number) => {
    const existing = value.days.find((d) => d.weekday === wd);
    if (existing) removeDay(existing);
    else setDays([...value.days, weekdayDay(wd)]);
  };

  const habits = value.habits;
  const setHabits = (next: typeof habits) => onChange({ ...value, habits: next });

  return (
    <>
      <Card>
        <Subtitle>Dias de treino</Subtitle>
        <Body muted style={{ fontSize: 13 }}>
          Toque nos dias da semana em que você treina.
        </Body>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
          {WEEK_ORDER.map((wd) => {
            const on = value.days.some((d) => d.weekday === wd);
            return (
              <Pressable
                key={wd}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={WEEKDAY_LABELS[wd]}
                onPress={() => toggleWeekday(wd)}
                style={{
                  flex: 1,
                  maxWidth: 44,
                  aspectRatio: 1,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: on ? colors.primary : colors.border,
                  backgroundColor: on ? colors.primary : 'transparent',
                }}
              >
                <Text style={{ fontWeight: '700', color: on ? colors.onPrimary : colors.muted }}>{WEEK_LETTERS[wd]}</Text>
              </Pressable>
            );
          })}
        </View>
        <Button
          small
          variant="ghost"
          icon="repeat-outline"
          label="Treino sem dia fixo (A, B, C…)"
          onPress={() => setDays([...value.days, rotatingDay(value.days)])}
        />
        <Body muted style={{ fontSize: 12 }}>
          Sem dia fixo, o app sugere o próximo treino da sequência a cada dia.
        </Body>
      </Card>

      {value.days.map((day) => (
        <DayCard key={day.key} day={day} onChange={(patch) => setDay(day.key, patch)} onRemove={() => removeDay(day)} />
      ))}

      <Card>
        <Subtitle>Hábitos da semana (opcional)</Subtitle>
        <Body muted style={{ fontSize: 13 }}>
          Viram um checklist semanal na aba Progresso. Ex.: “Dormi 7 h ou mais”.
        </Body>
        {habits.map((h, i) => (
          <Row key={h.key}>
            <Field
              flex
              value={h.text}
              onChangeText={(text) => setHabits(habits.map((x) => (x.key === h.key ? { ...x, text } : x)))}
              placeholder={`Hábito ${i + 1}`}
            />
            <IconButton icon="close" label="Remover hábito" onPress={() => setHabits(habits.filter((x) => x.key !== h.key))} />
          </Row>
        ))}
        <Button
          small
          variant="secondary"
          icon="add"
          label="Hábito"
          onPress={() => setHabits([...habits, { key: newKey(), text: '' }])}
        />
      </Card>
    </>
  );
}

function DayCard({ day, onChange, onRemove }: { day: DayDraft; onChange: (p: Partial<DayDraft>) => void; onRemove: () => void }) {
  const { colors } = useTheme();
  const setEx = (key: string, patch: Partial<ExerciseDraft>) =>
    onChange({ exercises: day.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)) });

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Subtitle>{day.label}</Subtitle>
        <IconButton icon="trash-outline" label={`Tirar ${day.label}`} onPress={onRemove} />
      </Row>
      <Field
        label="Nome do treino (opcional)"
        value={day.title}
        onChangeText={(title) => onChange({ title })}
        placeholder="Ex.: pernas, superiores, corpo todo"
      />
      {day.exercises.map((e, i) => (
        <View key={e.key} style={{ gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
          <Row>
            <Field
              flex
              value={e.name}
              onChangeText={(name) => setEx(e.key, { name })}
              placeholder={`Exercício ${i + 1}`}
            />
            <IconButton
              icon="arrow-up"
              label="Subir"
              disabled={i === 0}
              onPress={() => onChange({ exercises: move(day.exercises, i, i - 1) })}
            />
            <IconButton
              icon="arrow-down"
              label="Descer"
              disabled={i === day.exercises.length - 1}
              onPress={() => onChange({ exercises: move(day.exercises, i, i + 1) })}
            />
            <IconButton
              icon="close"
              label="Remover exercício"
              onPress={() => onChange({ exercises: day.exercises.filter((x) => x.key !== e.key) })}
            />
          </Row>
          <Row>
            <View style={{ width: 84 }}>
              <Field
                label="Séries"
                value={e.sets}
                onChangeText={(sets) => setEx(e.key, { sets: sets.replace(/\D/g, '') })}
                keyboardType="number-pad"
                placeholder="3"
              />
            </View>
            <Field
              flex
              label={e.sets ? 'Repetições' : 'Repetições ou tempo'}
              value={e.reps}
              onChangeText={(reps) => setEx(e.key, { reps })}
              placeholder={e.sets ? '12' : 'Ex.: 20 min'}
            />
          </Row>
          {e.sets ? (
            <Check checked={e.load} onPress={() => setEx(e.key, { load: !e.load })} label="Anotar a carga (kg)" />
          ) : null}
        </View>
      ))}
      <Button
        small
        variant="secondary"
        icon="add"
        label="Exercício"
        onPress={() => onChange({ exercises: [...day.exercises, emptyExercise()] })}
      />
    </Card>
  );
}
