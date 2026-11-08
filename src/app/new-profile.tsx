import { Stack, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert } from '@/lib/alert';
import { Body, Button, Card, Field, Screen, Subtitle, Title, parseNum } from '@/components/ui';
import { createProfile } from '@/db/queries';
import { samplePlan } from '@/data/samplePlan';
import { parseJsonFile, restoreBackup } from '@/lib/backup';
import { pickTextFile } from '@/lib/files';
import { emptyPlan } from '@/lib/types';
import { todayKey } from '@/lib/dates';
import { stampTreino } from '@/lib/workout';
import { useApp } from '@/store/useApp';

type Start = 'sample' | 'empty';

export default function NewProfile() {
  const db = useSQLiteContext();
  const hasProfile = useApp((s) => !!s.profile);
  const switchTo = useApp((s) => s.switchTo);
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(start: Start) {
    if (!name.trim()) return Alert.alert('Nome', 'Digite um nome para o perfil.');
    setBusy(true);
    try {
      const plan = start === 'sample' ? stampTreino(samplePlan(), todayKey()) : emptyPlan();
      const id = await createProfile(db, name.trim(), parseNum(height), plan);
      await switchTo(db, id);
      router.dismissTo('/');
      if (start === 'empty') router.push('/import');
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    try {
      const file = await pickTextFile();
      if (!file) return;
      const parsed = parseJsonFile(file.text);
      setBusy(true);
      const id =
        parsed.kind === 'backup'
          ? await restoreBackup(db, parsed.backup, parsed.plan)
          : await createProfile(db, name.trim() || 'Perfil importado', parseNum(height), parsed.plan.treinoSince ? parsed.plan : stampTreino(parsed.plan, todayKey()));
      await switchTo(db, id);
      router.dismissTo('/');
    } catch (e) {
      Alert.alert('Não foi possível importar', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerBackVisible: hasProfile, title: hasProfile ? 'Novo perfil' : 'Boas-vindas ao MeowFit' }} />
      {!hasProfile && (
        <Body muted>
          Acompanhe treino, cargas, dieta e medidas. Tudo fica salvo só neste celular. Cada pessoa pode ter o seu perfil.
        </Body>
      )}
      <Card>
        <Title style={{ fontSize: 18 }}>Seu perfil</Title>
        <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Luiza" autoFocus />
        <Field
          label="Altura (cm, opcional)"
          value={height}
          onChangeText={setHeight}
          keyboardType="decimal-pad"
          placeholder="160"
        />
      </Card>

      <Card>
        <Subtitle>Como começar?</Subtitle>
        <Button label="Usar o plano de exemplo" icon="sparkles-outline" disabled={busy} onPress={() => create('sample')} />
        <Body muted style={{ fontSize: 13 }}>
          Treino de 5 dias, hábitos e cardápio do plano em PDF. Dá pra editar depois.
        </Body>
        <Button
          variant="secondary"
          label="Importar meu treino"
          icon="clipboard-outline"
          disabled={busy}
          onPress={() => create('empty')}
        />
        <Body muted style={{ fontSize: 13 }}>
          Cola o texto do treino (ex.: “Leg press: 3 x 12”) ou escolhe um arquivo.
        </Body>
        <Button variant="ghost" label="Restaurar backup (.json)" icon="folder-open-outline" disabled={busy} onPress={restore} />
      </Card>
    </Screen>
  );
}
