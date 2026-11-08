import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Alert } from '@/lib/alert';
import { Body, Button, Card, Chip, Field, Row, Screen, Subtitle, fmtNum } from '@/components/ui';
import { deleteProfile, listProfiles, resetWorkoutHistory, updateProfile } from '@/db/queries';
import { makeBackup, makePlanFile } from '@/lib/backup';
import type { Part } from '@/lib/planText';
import { todayKey } from '@/lib/dates';
import { safeFileName, shareJson } from '@/lib/files';
import { useApp, useData, useProfile } from '@/store/useApp';
import { ThemePicker } from '@/components/ThemePicker';
import { WorkoutReminderCard } from '@/components/WorkoutReminderCard';
import { MeasuresSection } from '@/components/MeasuresSection';
import { WaterGoalCard } from '@/components/WaterGoalCard';
import { useTheme } from '@/components/ThemeProvider';
import { fmtHeightM, parseHeightCm } from '@/lib/format';

export default function ProfileTab() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const profile = useProfile();
  const switchTo = useApp((s) => s.switchTo);
  const loadActive = useApp((s) => s.loadActive);
  const [profiles] = useData((db) => listProfiles(db));
  const [name, setName] = useState(profile.name);
  const [height, setHeight] = useState(fmtNum(profile.height_cm));
  const { plan } = profile;

  const [editing, setEditing] = useState(false);
  const [seen, setSeen] = useState({ id: profile.id, name: profile.name, height: profile.height_cm });
  if (seen.id !== profile.id || seen.name !== profile.name || seen.height !== profile.height_cm) {
    setSeen({ id: profile.id, name: profile.name, height: profile.height_cm });
    setName(profile.name);
    setHeight(fmtNum(profile.height_cm));
    if (seen.id !== profile.id) setEditing(false);
  }

  const dirty = name.trim() !== profile.name || parseHeightCm(height) !== profile.height_cm;

  const run = (fn: () => Promise<unknown>) => async () => {
    try {
      await fn();
    } catch (e) {
      Alert.alert('Ops', (e as Error).message);
    }
  };

  const cancelEdit = () => {
    setName(profile.name);
    setHeight(fmtNum(profile.height_cm));
    setEditing(false);
  };

  const saveInfo = run(async () => {
    if (!name.trim()) throw new Error('O nome não pode ficar vazio.');
    await updateProfile(db, profile.id, name.trim(), parseHeightCm(height));
    await loadActive(db);
    setEditing(false);
  });

  const exportPart = (part: Part) =>
    run(() => shareJson(`${part}-${safeFileName(profile.name)}.json`, makePlanFile(plan, part)));
  const exportBackup = run(async () =>
    shareJson(`backup-${safeFileName(profile.name)}-${todayKey()}.json`, await makeBackup(db, profile.id)),
  );

  const remove = () =>
    Alert.alert(
      'Apagar meus dados?',
      'Apaga treino, dieta, cargas, medidas e todo o histórico deste celular, e o app volta para o cadastro inicial. Se quiser guardar, exporte um backup antes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: run(async () => {
            await deleteProfile(db, profile.id);
            const next = (profiles ?? []).find((p) => p.id !== profile.id);
            await switchTo(db, next?.id ?? null);
          }),
        },
      ],
    );

  const resetWorkouts = () =>
    Alert.alert(
      'Zerar treinos?',
      'Apaga a sequência, o recorde, os treinos concluídos e as cargas anotadas. Seu treino, sua dieta, água, refeições e medidas continuam.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Zerar',
          style: 'destructive',
          onPress: run(async () => {
            await resetWorkoutHistory(db, profile.id);
            await loadActive(db);
            Alert.alert('Tudo zerado! 🐾', 'Sua sequência começa do zero no próximo treino.');
          }),
        },
      ],
    );

  const exercises = plan.days.reduce((n, d) => n + d.exercises.length, 0);

  return (
    <Screen>
      {(profiles ?? []).length > 1 && (
        <Card>
          <Subtitle>Perfis neste celular</Subtitle>
          <Row style={{ flexWrap: 'wrap' }}>
            {(profiles ?? []).map((p) => (
              <Chip key={p.id} label={p.name} active={p.id === profile.id} onPress={() => switchTo(db, p.id)} />
            ))}
          </Row>
        </Card>
      )}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Subtitle>Dados</Subtitle>
          {!editing && <Button small variant="ghost" icon="create-outline" label="Editar" onPress={() => setEditing(true)} />}
        </Row>
        {editing ? (
          <>
            <Row>
              <Field flex label="Nome" value={name} onChangeText={setName} autoFocus />
              <Field flex label="Altura (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
            </Row>
            <Row style={{ marginTop: 4 }}>
              <Button small variant="ghost" label="Cancelar" onPress={cancelEdit} style={{ flex: 1 }} />
              <Button small label="Salvar" icon="checkmark" onPress={saveInfo} disabled={!dirty} style={{ flex: 1 }} />
            </Row>
          </>
        ) : (
          <View style={{ gap: 2 }}>
            <InfoRow label="Nome" value={profile.name} />
            <InfoRow
              label="Altura"
              value={profile.height_cm ? fmtHeightM(profile.height_cm) : 'Não informada'}
              muted={!profile.height_cm}
            />
          </View>
        )}
      </Card>

      <MeasuresSection />

      <PartCard
        part="treino"
        title="Treino"
        summary={`${plan.days.length} dias · ${exercises} exercícios · ${plan.habits.length} hábitos`}
        onShare={exportPart('treino')}
      />

      <PartCard
        part="dieta"
        title="Dieta"
        summary={`${plan.meals.length} refeições · ${plan.rules.length} regras${
          plan.targets.kcalMin !== undefined ? ` · ${plan.targets.kcalMin}–${plan.targets.kcalMax} kcal` : ''
        }`}
        onShare={exportPart('dieta')}
      />

      <WaterGoalCard />

      <ThemePicker />

      <WorkoutReminderCard />

      <Card>
        <Subtitle>Backup</Subtitle>
        <Body muted style={{ fontSize: 13 }}>
          Os dados ficam só neste celular. Exporte um backup de vez em quando (pro Drive, WhatsApp…) para não perder nada ao trocar
          de aparelho.
        </Body>
        <Button variant="secondary" label="Exportar backup completo" icon="cloud-upload-outline" onPress={exportBackup} />
        <Button
          variant="ghost"
          label="Restaurar backup"
          icon="folder-open-outline"
          onPress={() => router.push({ pathname: '/import', params: { modo: 'arquivo' } })}
        />
      </Card>

      <Button variant="ghost" label="Zerar treinos e sequência" icon="refresh-outline" onPress={resetWorkouts} />
      <Button variant="danger" label="Apagar meus dados" icon="trash-outline" onPress={remove} />
      <Body muted style={{ textAlign: 'center', fontSize: 12, color: colors.muted }}>
        MeowFit · dados salvos só neste celular
      </Body>
    </Screen>
  );
}

function PartCard({ part, title, summary, onShare }: { part: Part; title: string; summary: string; onShare: () => void }) {
  return (
    <Card>
      <Subtitle>{title}</Subtitle>
      <Body muted>{summary}</Body>
      <Button
        small
        label={`Editar ${title.toLowerCase()}`}
        icon="create-outline"
        onPress={() => router.push({ pathname: '/edit-plan', params: { parte: part } })}
      />
      <Row>
        <Button
          small
          variant="ghost"
          label="Colar texto"
          icon="clipboard-outline"
          onPress={() => router.push({ pathname: '/edit-plan', params: { parte: part, modo: 'texto' } })}
          style={{ flex: 1 }}
        />
        <Button small variant="ghost" label="Enviar" icon="share-outline" onPress={onShare} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}

function InfoRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  const { colors } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ fontSize: 14, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '600', color: muted ? colors.muted : colors.text }}>{value}</Text>
    </Row>
  );
}
