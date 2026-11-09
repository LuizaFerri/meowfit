import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert } from '@/lib/alert';
import { Body, Button, Card, Chip, Row, Screen, Subtitle } from '@/components/ui';
import { deleteProfile, listProfiles, resetWorkoutHistory } from '@/db/queries';
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
import { ProfileInfoCard } from '@/components/ProfileInfoCard';
import { CloudCard } from '@/components/CloudCard';
import { deleteCloudBackup, signOut, useCloud } from '@/lib/cloud';

export default function ProfileTab() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const profile = useProfile();
  const switchTo = useApp((s) => s.switchTo);
  const loadActive = useApp((s) => s.loadActive);
  const [profiles] = useData((db) => listProfiles(db));
  const { plan } = profile;

  const run = (fn: () => Promise<unknown>) => async () => {
    try {
      await fn();
    } catch (e) {
      Alert.alert('Ops', (e as Error).message);
    }
  };

  const exportPart = (part: Part) =>
    run(() => shareJson(`${part}-${safeFileName(profile.name)}.json`, makePlanFile(plan, part)));
  const exportBackup = run(async () =>
    shareJson(`backup-${safeFileName(profile.name)}-${todayKey()}.json`, await makeBackup(db, profile.id)),
  );

  const wipe = (alsoCloud: boolean) =>
    run(async () => {
      if (alsoCloud) await deleteCloudBackup();
      if (useCloud.getState().link || alsoCloud) await signOut(db);
      await deleteProfile(db, profile.id);
      const next = (profiles ?? []).find((p) => p.id !== profile.id);
      await switchTo(db, next?.id ?? null);
    })();

  const remove = () => {
    const linked = !!useCloud.getState().link && !!useCloud.getState().userId;
    if (!linked)
      return Alert.alert(
        'Apagar meus dados?',
        'Apaga treino, dieta, cargas, medidas e todo o histórico deste celular, e o app volta para o cadastro inicial. Se quiser guardar, exporte um backup antes.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Apagar tudo', style: 'destructive', onPress: () => wipe(false) },
        ],
      );
    Alert.alert(
      'Apagar meus dados?',
      'Este aparelho está conectado à nuvem. Quer apagar só deste aparelho (a cópia na nuvem continua e volta quando você entrar de novo) ou também da nuvem?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar só deste aparelho', onPress: () => wipe(false) },
        {
          text: 'Apagar também da nuvem',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Apagar também da nuvem?', 'A cópia salva na nuvem será apagada e não poderá ser recuperada.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Apagar tudo', style: 'destructive', onPress: () => wipe(true) },
            ]),
        },
      ],
    );
  };

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

      <ProfileInfoCard />

      <CloudCard />

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
          Além da nuvem, você pode exportar um arquivo de backup (pro Drive, WhatsApp…) para guardar uma cópia ou levar a outro
          aparelho.
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
        MeowFit · dados neste aparelho e, se conectado, na nuvem
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
