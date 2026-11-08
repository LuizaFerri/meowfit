import { useState } from 'react';
import { Pressable } from 'react-native';
import { Alert } from '@/lib/alert';
import { BmiCard } from '@/components/BmiCard';
import { LineChart } from '@/components/LineChart';
import { Body, Button, Card, Check, Field, Row, Screen, Subtitle, fmtNum, parseNum } from '@/components/ui';
import {
  addMeasurement,
  deleteMeasurement,
  getHabitChecks,
  getMeasurements,
  getWorkouts,
  setHabit,
} from '@/db/queries';
import { daysSince, fmtShort, todayKey, toKey, weekDays, weekStartKey } from '@/lib/dates';
import { dayName } from '@/lib/workout';
import { useData, useProfile, useWrite } from '@/store/useApp';
import { useTheme } from '@/components/ThemeProvider';

export default function Progress() {
  const { colors } = useTheme();
  const profile = useProfile();
  const { plan } = profile;
  const write = useWrite();
  const days = weekDays();
  const week = weekStartKey();
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');

  const [data] = useData(
    async (db, pid) => {
      const [workouts, habits, measures] = await Promise.all([
        getWorkouts(db, pid, toKey(days[0]), toKey(days[6])),
        getHabitChecks(db, pid, week),
        getMeasurements(db, pid),
      ]);
      return { workouts, habits, measures };
    },
    [week],
  );

  if (!data) return <Screen>{null}</Screen>;

  const doneLabels = new Set(data.workouts.map((w) => w.label));
  const habitsDone = plan.habits.filter((h) => data.habits.has(h)).length;
  const weights = data.measures.filter((m) => m.weight_kg !== null);
  const waists = data.measures.filter((m) => m.waist_cm !== null);
  const last = data.measures[data.measures.length - 1];
  const lastWeight = weights.length ? weights[weights.length - 1].weight_kg : null;

  const saveMeasure = async () => {
    const w = parseNum(weight);
    const c = parseNum(waist);
    if (w === null && c === null) return Alert.alert('Medidas', 'Preencha o peso ou a cintura.');
    await write((db) => addMeasurement(db, profile.id, todayKey(), w, c));
    setWeight('');
    setWaist('');
  };

  const removeMeasure = (id: number, label: string) =>
    Alert.alert('Apagar medida?', label, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => write((db) => deleteMeasurement(db, id)) },
    ]);

  return (
    <Screen>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Subtitle>Treinos da semana</Subtitle>
          <Body muted>
            {fmtShort(toKey(days[0]))}–{fmtShort(toKey(days[6]))}
          </Body>
        </Row>
        {plan.days.map((d, i) => (
          <Check key={i} checked={doneLabels.has(d.label)} label={dayName(d)} onPress={() => {}} />
        ))}
        <Body muted style={{ fontSize: 13 }}>
          Marcado automaticamente ao concluir o treino. Regra das duas faltas: pode faltar um treino, nunca dois seguidos.
        </Body>
      </Card>

      {plan.habits.length > 0 && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Subtitle>Hábitos da semana</Subtitle>
            <Body muted>
              {habitsDone}/{plan.habits.length}
            </Body>
          </Row>
          {plan.habits.map((h, hi) => (
            <Check
              key={hi}
              checked={data.habits.has(h)}
              label={h}
              onPress={() => write((db) => setHabit(db, profile.id, week, h, !data.habits.has(h)))}
            />
          ))}
          <Body muted style={{ fontSize: 13 }}>
            Recomeça toda segunda-feira.
          </Body>
        </Card>
      )}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Subtitle>Medidas</Subtitle>
          {last && <Body muted>última há {daysSince(last.date)} dias</Body>}
        </Row>
        <Body muted style={{ fontSize: 13 }}>
          A cada 2 semanas, mesmo dia e horário. A balança sozinha engana, a cintura mostra a barriga mudando.
        </Body>
        <Row>
          <Field
            flex
            label="Peso (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder={fmtNum(weights[weights.length - 1]?.weight_kg) || '63'}
          />
          <Field
            flex
            label="Cintura (cm)"
            value={waist}
            onChangeText={setWaist}
            keyboardType="decimal-pad"
            placeholder={fmtNum(waists[waists.length - 1]?.waist_cm) || '75'}
          />
        </Row>
        <Button label="Salvar medidas" icon="save-outline" onPress={saveMeasure} />
      </Card>

      {weights.length > 0 && <BmiCard weightKg={lastWeight} heightCm={profile.height_cm} />}

      {weights.length > 0 && (
        <Card>
          <Subtitle>Peso</Subtitle>
          <LineChart data={weights.map((m) => ({ label: fmtShort(m.date), value: m.weight_kg! }))} unit=" kg" />
          <Delta values={weights.map((m) => m.weight_kg!)} unit="kg" />
        </Card>
      )}

      {waists.length > 0 && (
        <Card>
          <Subtitle>Cintura</Subtitle>
          <LineChart data={waists.map((m) => ({ label: fmtShort(m.date), value: m.waist_cm! }))} unit=" cm" color={colors.accent} />
          <Delta values={waists.map((m) => m.waist_cm!)} unit="cm" />
        </Card>
      )}

      {data.measures.length > 0 && (
        <Card>
          <Subtitle>Registros</Subtitle>
          {[...data.measures].reverse().map((m) => {
            const label = `${fmtShort(m.date)} · ${m.weight_kg !== null ? `${fmtNum(m.weight_kg)} kg` : '—'} · ${
              m.waist_cm !== null ? `${fmtNum(m.waist_cm)} cm` : '—'
            }`;
            return (
              <Pressable key={m.id} onLongPress={() => removeMeasure(m.id, label)} style={{ paddingVertical: 4 }}>
                <Body>{label}</Body>
              </Pressable>
            );
          })}
          <Body muted style={{ fontSize: 12 }}>
            Segure um registro para apagar.
          </Body>
        </Card>
      )}
    </Screen>
  );
}

function Delta({ values, unit }: { values: number[]; unit: string }) {
  const { colors } = useTheme();
  if (values.length < 2) return null;
  const d = values[values.length - 1] - values[0];
  const down = d < 0;
  return (
    <Body style={{ color: down ? colors.accent : colors.muted, fontWeight: '600' }}>
      {d === 0 ? 'Sem mudança' : `${down ? '−' : '+'}${fmtNum(Math.abs(d))} ${unit}`} desde o primeiro registro
    </Body>
  );
}
