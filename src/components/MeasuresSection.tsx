import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { addMeasurement, deleteMeasurement, getMeasurements } from '@/db/queries';
import { Alert } from '@/lib/alert';
import { daysSince, fmtShort, todayKey } from '@/lib/dates';
import { useData, useProfile, useWrite } from '@/store/useApp';
import { LineChart } from './LineChart';
import { Body, Button, Card, Field, Row, Subtitle, fmtNum, parseNum } from './ui';
import { useTheme } from './ThemeProvider';

export function MeasuresSection() {
  const { colors } = useTheme();
  const profile = useProfile();
  const write = useWrite();
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [measures] = useData((db, pid) => getMeasurements(db, pid));

  if (!measures) return null;

  const weights = measures.filter((m) => m.weight_kg !== null);
  const waists = measures.filter((m) => m.waist_cm !== null);
  const last = measures[measures.length - 1];
  const lastWeight = weights[weights.length - 1]?.weight_kg ?? null;
  const lastWaist = waists[waists.length - 1]?.waist_cm ?? null;
  const filled = parseNum(weight) !== null || parseNum(waist) !== null;

  const save = async () => {
    const w = parseNum(weight);
    const c = parseNum(waist);
    if (w === null && c === null) return;
    await write((db) => addMeasurement(db, profile.id, todayKey(), w, c));
    setWeight('');
    setWaist('');
    setJustSaved(true);
  };

  const edit = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setJustSaved(false);
  };

  const remove = (id: number, label: string) =>
    Alert.alert('Apagar medida?', label, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => write((db) => deleteMeasurement(db, id)) },
    ]);

  return (
    <>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Subtitle>Medidas</Subtitle>
          {last && <Body muted>última há {daysSince(last.date)} dias</Body>}
        </Row>
        {(lastWeight !== null || lastWaist !== null) && (
          <Body>
            Último registro: <Body style={{ fontWeight: '700' }}>{lastWeight !== null ? `${fmtNum(lastWeight)} kg` : '—'}</Body>
            {' · '}
            <Body style={{ fontWeight: '700' }}>{lastWaist !== null ? `${fmtNum(lastWaist)} cm` : '—'}</Body>
          </Body>
        )}
        <Body muted style={{ fontSize: 13 }}>
          A cada 2 semanas, mesmo dia e horário. A balança sozinha engana, a cintura mostra a barriga mudando.
        </Body>
        <Row>
          <Field flex label="Peso (kg)" value={weight} onChangeText={edit(setWeight)} keyboardType="decimal-pad" placeholder="Ex.: 63" />
          <Field flex label="Cintura (cm)" value={waist} onChangeText={edit(setWaist)} keyboardType="decimal-pad" placeholder="Ex.: 75" />
        </Row>
        {justSaved ? (
          <Row style={{ justifyContent: 'center', gap: 6, paddingVertical: 6 }}>
            <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
            <Body style={{ color: colors.accent, fontWeight: '700' }}>Medidas salvas</Body>
          </Row>
        ) : (
          <Button label="Salvar medidas" icon="save-outline" onPress={save} disabled={!filled} />
        )}
      </Card>

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

      {measures.length > 0 && (
        <Card>
          <Subtitle>Registros</Subtitle>
          {[...measures].reverse().map((m) => {
            const label = `${fmtShort(m.date)} · ${m.weight_kg !== null ? `${fmtNum(m.weight_kg)} kg` : '—'} · ${
              m.waist_cm !== null ? `${fmtNum(m.waist_cm)} cm` : '—'
            }`;
            return (
              <Pressable key={m.id} onLongPress={() => remove(m.id, label)} style={{ paddingVertical: 4 }}>
                <Body>{label}</Body>
              </Pressable>
            );
          })}
          <Body muted style={{ fontSize: 12 }}>
            Segure um registro para apagar.
          </Body>
        </Card>
      )}
    </>
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
