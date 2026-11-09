import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { addMeasurement, getMeasurements, updateMeasurement, updateProfile } from '@/db/queries';
import { Alert } from '@/lib/alert';
import { todayKey } from '@/lib/dates';
import { fmtHeightM, parseHeightCm } from '@/lib/format';
import { measurementToSave } from '@/lib/measures';
import { useApp, useData, useProfile } from '@/store/useApp';
import { Button, Card, Field, Row, Subtitle, fmtNum } from './ui';
import { useTheme } from './ThemeProvider';

export function ProfileInfoCard() {
  const db = useSQLiteContext();
  const profile = useProfile();
  const loadActive = useApp((s) => s.loadActive);
  const [measures] = useData((db, pid) => getMeasurements(db, pid));
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [touched, setTouched] = useState(false);

  const list = measures ?? [];
  const lastWeight = [...list].reverse().find((m) => m.weight_kg !== null)?.weight_kg ?? null;
  const lastWaist = [...list].reverse().find((m) => m.waist_cm !== null)?.waist_cm ?? null;

  const open = () => {
    setName(profile.name);
    setHeight(fmtNum(profile.height_cm));
    setWeight(fmtNum(lastWeight));
    setWaist(fmtNum(lastWaist));
    setTouched(false);
    setEditing(true);
  };

  const save = async () => {
    try {
      if (!name.trim()) throw new Error('O nome não pode ficar vazio.');
      Keyboard.dismiss();
      const measure = measurementToSave({ weight, waist, touched });
      await updateProfile(db, profile.id, name.trim(), parseHeightCm(height));
      if (measure) {
        const today = list.find((m) => m.date === todayKey());
        if (today) await updateMeasurement(db, today.id, measure.weight ?? today.weight_kg, measure.waist ?? today.waist_cm);
        else await addMeasurement(db, profile.id, todayKey(), measure.weight, measure.waist);
      }
      await loadActive(db);
      setEditing(false);
    } catch (e) {
      Alert.alert('Ops', (e as Error).message);
    }
  };

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Subtitle>Dados</Subtitle>
        {!editing && <Button small variant="ghost" icon="create-outline" label="Editar" onPress={open} />}
      </Row>
      {editing ? (
        <>
          <Field label="Nome" value={name} onChangeText={setName} autoFocus />
          <Row>
            <Field flex label="Altura (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="Ex.: 165" />
            <Field flex label="Peso (kg)" value={weight} onChangeText={(v) => (setWeight(v), setTouched(true))} keyboardType="decimal-pad" placeholder="Ex.: 63" />
            <Field flex label="Cintura (cm)" value={waist} onChangeText={(v) => (setWaist(v), setTouched(true))} keyboardType="decimal-pad" placeholder="Ex.: 75" />
          </Row>
          <Row style={{ marginTop: 4 }}>
            <Button small variant="ghost" label="Cancelar" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            <Button small label="Salvar" icon="checkmark" onPress={save} style={{ flex: 1 }} />
          </Row>
        </>
      ) : (
        <View style={{ gap: 2 }}>
          <InfoRow label="Nome" value={profile.name} />
          <InfoRow label="Altura" value={profile.height_cm ? fmtHeightM(profile.height_cm) : 'Não informada'} muted={!profile.height_cm} />
          <InfoRow label="Peso" value={lastWeight !== null ? `${fmtNum(lastWeight)} kg` : 'Não informado'} muted={lastWeight === null} />
          <InfoRow label="Cintura" value={lastWaist !== null ? `${fmtNum(lastWaist)} cm` : 'Não informada'} muted={lastWaist === null} />
        </View>
      )}
    </Card>
  );
}

function InfoRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  const { colors } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ fontSize: 14, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: muted ? '400' : '600', color: muted ? colors.muted : colors.text }}>{value}</Text>
    </Row>
  );
}
