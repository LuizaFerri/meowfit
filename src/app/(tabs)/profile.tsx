import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Alert } from '@/lib/alert';
import { Body, Button, Card, Chip, Field, Row, Screen, Subtitle, fmtNum, parseNum } from '@/components/ui';
import { deleteProfile, listProfiles, savePlan, updateProfile } from '@/db/queries';
import { samplePlan } from '@/data/samplePlan';
import { makeBackup, makePlanFile } from '@/lib/backup';
import { PART_SECTIONS, pickSections, type Part } from '@/lib/planText';
import { todayKey } from '@/lib/dates';
import { safeFileName, shareJson } from '@/lib/files';
import { stampTreino } from '@/lib/workout';
import { useApp, useData, useProfile } from '@/store/useApp';
import { ThemePicker } from '@/components/ThemePicker';
import { useTheme } from '@/components/ThemeProvider';

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

  useEffect(() => {
    setName(profile.name);
    setHeight(fmtNum(profile.height_cm));
  }, [profile.id, profile.name, profile.height_cm]);

  const dirty = name.trim() !== profile.name || parseNum(height) !== profile.height_cm;

  const run = (fn: () => Promise<unknown>) => async () => {
    try {
      await fn();
    } catch (e) {
      Alert.alert('Ops', (e as Error).message);
    }
  };

  const [editing, setEditing] = useState(false);

  useEffect(() => setEditing(false), [profile.id]);

  const cancelEdit = () => {
    setName(profile.name);
    setHeight(fmtNum(profile.height_cm));
    setEditing(false);
  };

  const saveInfo = run(async () => {
    if (!name.trim()) throw new Error('O nome não pode ficar vazio.');
    await updateProfile(db, profile.id, name.trim(), parseNum(height));
    await loadActive(db);
    setEditing(false);
  });

  const exportPart = (part: Part) =>
    run(() => shareJson(`${part}-${safeFileName(profile.name)}.json`, makePlanFile(plan, part)));
  const exportBackup = run(async () =>
    shareJson(`backup-${safeFileName(profile.name)}-${todayKey()}.json`, await makeBackup(db, profile.id)),
  );

  const resetSample = (part: Part) =>
    Alert.alert(
      `Usar ${part} de exemplo?`,
      part === 'treino'
        ? 'Os treinos e hábitos atuais serão substituídos. O histórico de cargas fica.'
        : 'O cardápio, as metas e as regras atuais serão substituídos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Substituir',
          onPress: run(async () => {
            const next = pickSections(plan, samplePlan(), PART_SECTIONS[part]);
            await savePlan(db, profile.id, part === 'treino' ? stampTreino(next, todayKey()) : next);
            await loadActive(db);
          }),
        },
      ],
    );

  const remove = () =>
    Alert.alert(
      `Excluir ${profile.name}?`,
      'Apaga o perfil e todo o histórico dele deste celular. Exporte um backup antes se quiser guardar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: run(async () => {
            await deleteProfile(db, profile.id);
            const next = (profiles ?? []).find((p) => p.id !== profile.id);
            await switchTo(db, next?.id ?? null);
          }),
        },
      ],
    );

  const exercises = plan.days.reduce((n, d) => n + d.exercises.length, 0);

  return (
    <Screen>
      <Card>
        <Subtitle>Perfis neste celular</Subtitle>
        <Row style={{ flexWrap: 'wrap' }}>
          {(profiles ?? []).map((p) => (
            <Chip key={p.id} label={p.name} active={p.id === profile.id} onPress={() => switchTo(db, p.id)} />
          ))}
          <Chip label="+ Novo" onPress={() => router.push('/new-profile')} />
        </Row>
      </Card>

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
              value={profile.height_cm ? `${fmtNum(profile.height_cm / 100)} m` : 'Não informada'}
              muted={!profile.height_cm}
            />
          </View>
        )}
      </Card>

      <PartCard
        part="treino"
        title="Treino"
        summary={`${plan.days.length} dias · ${exercises} exercícios · ${plan.habits.length} hábitos`}
        onShare={exportPart('treino')}
        onSample={() => resetSample('treino')}
      />

      <PartCard
        part="dieta"
        title="Dieta"
        summary={`${plan.meals.length} refeições · ${plan.rules.length} regras${
          plan.targets.kcalMin !== undefined ? ` · ${plan.targets.kcalMin}–${plan.targets.kcalMax} kcal` : ''
        }`}
        onShare={exportPart('dieta')}
        onSample={() => resetSample('dieta')}
      />

      <ThemePicker />

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

      <Button variant="danger" label={`Excluir perfil ${profile.name}`} icon="trash-outline" onPress={remove} />
      <Body muted style={{ textAlign: 'center', fontSize: 12, color: colors.muted }}>
        MeowFit · dados salvos só neste celular
      </Body>
    </Screen>
  );
}

function PartCard({
  part,
  title,
  summary,
  onShare,
  onSample,
}: {
  part: Part;
  title: string;
  summary: string;
  onShare: () => void;
  onSample: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Card>
      <Subtitle>{title}</Subtitle>
      <Body muted>{summary}</Body>
      <Row>
        <Button
          small
          label="Importar"
          icon="download-outline"
          onPress={() => router.push({ pathname: '/import', params: { parte: part } })}
          style={{ flex: 1 }}
        />
        <Button
          small
          variant="secondary"
          label="Editar"
          icon="create-outline"
          onPress={() => router.push({ pathname: '/import', params: { parte: part, modo: 'editar' } })}
          style={{ flex: 1 }}
        />
      </Row>
      <Row>
        <Button small variant="ghost" label="Compartilhar" icon="share-outline" onPress={onShare} style={{ flex: 1 }} />
        <Button small variant="ghost" label="Exemplo" icon="sparkles-outline" onPress={onSample} style={{ flex: 1 }} />
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
