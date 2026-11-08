import { useState } from 'react';
import { Keyboard, View } from 'react-native';
import { deleteMeasurement, getMeasurements, updateMeasurement } from '@/db/queries';
import { Alert } from '@/lib/alert';
import { fmtShort } from '@/lib/dates';
import { useData, useWrite } from '@/store/useApp';
import { LineChart } from './LineChart';
import { Body, Button, Card, Field, IconButton, Row, Subtitle, fmtNum, parseNum } from './ui';
import { useTheme } from './ThemeProvider';

type Measure = { id: number; date: string; weight_kg: number | null; waist_cm: number | null };

export function MeasuresSection() {
  const { colors } = useTheme();
  const write = useWrite();
  const [measures] = useData((db, pid) => getMeasurements(db, pid));
  const [editing, setEditing] = useState<number | null>(null);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');

  if (!measures || measures.length === 0) return null;

  const weights = measures.filter((m) => m.weight_kg !== null);
  const waists = measures.filter((m) => m.waist_cm !== null);

  const startEdit = (m: Measure) => {
    setEditing(m.id);
    setWeight(fmtNum(m.weight_kg));
    setWaist(fmtNum(m.waist_cm));
  };

  const save = async (id: number) => {
    const w = parseNum(weight);
    const c = parseNum(waist);
    if (w === null && c === null) return;
    Keyboard.dismiss();
    await write((db) => updateMeasurement(db, id, w, c));
    setEditing(null);
  };

  const remove = (m: Measure, label: string) =>
    Alert.alert('Apagar medida?', label, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          if (editing === m.id) setEditing(null);
          write((db) => deleteMeasurement(db, m.id));
        },
      },
    ]);

  return (
    <>
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

      <Card>
        <Subtitle>Registros</Subtitle>
        {[...measures].reverse().map((m) => {
          const label = `${fmtShort(m.date)} · ${m.weight_kg !== null ? `${fmtNum(m.weight_kg)} kg` : '—'} · ${
            m.waist_cm !== null ? `${fmtNum(m.waist_cm)} cm` : '—'
          }`;
          if (editing === m.id) {
            const filled = parseNum(weight) !== null || parseNum(waist) !== null;
            return (
              <View key={m.id} style={{ gap: 8, paddingVertical: 4 }}>
                <Body style={{ fontWeight: '700', color: colors.primary }}>{fmtShort(m.date)}</Body>
                <Row>
                  <Field flex label="Peso (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" autoFocus />
                  <Field flex label="Cintura (cm)" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" />
                </Row>
                <Row>
                  <Button small variant="ghost" label="Cancelar" onPress={() => setEditing(null)} style={{ flex: 1 }} />
                  <Button small label="Salvar" icon="checkmark" onPress={() => save(m.id)} disabled={!filled} style={{ flex: 1 }} />
                </Row>
              </View>
            );
          }
          return (
            <Row key={m.id} style={{ justifyContent: 'space-between', paddingVertical: 2 }}>
              <View style={{ flex: 1 }}>
                <Body>{label}</Body>
              </View>
              <IconButton icon="create-outline" label={`Editar ${label}`} onPress={() => startEdit(m)} />
              <IconButton icon="trash-outline" label={`Apagar ${label}`} onPress={() => remove(m, label)} />
            </Row>
          );
        })}
      </Card>
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
