import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert } from '@/lib/alert';
import { fetchCloudBackup, restoreFromCloud, signOut, uploadBackup, useCloud } from '@/lib/cloud';
import { isLinked } from '@/lib/cloudLogic';
import { useApp, useProfile } from '@/store/useApp';
import { Body, Button, Card, Row, Subtitle } from './ui';
import { useTheme } from './ThemeProvider';

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return today ? `hoje às ${time}` : `${d.toLocaleDateString('pt-BR')} às ${time}`;
};

export function CloudCard() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const profile = useProfile();
  const switchTo = useApp((s) => s.switchTo);
  const { ready, userId, email, link, status, savedAt, conflictAt, error } = useCloud();
  const [busy, setBusy] = useState(false);

  if (!ready) return null;

  const linked = isLinked(link, userId, profile.id);
  const open = () => router.push({ pathname: '/cloud-login', params: { origem: 'perfil' } });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Ops', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const leave = () =>
    Alert.alert('Sair da conta?', 'Este aparelho para de salvar na nuvem. Seus dados continuam aqui e na nuvem.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut(db) },
    ]);

  const useCloudData = () =>
    Alert.alert('Usar os dados da nuvem?', 'Os dados deste aparelho serão trocados pelos que estão salvos na nuvem.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Usar os da nuvem',
        onPress: () =>
          run(async () => {
            const cloud = await fetchCloudBackup();
            if (!cloud) throw new Error('Não há dados na nuvem para essa conta.');
            const id = await restoreFromCloud(db, cloud, profile.id);
            await switchTo(db, id);
          }),
      },
    ]);

  const keepThisDevice = () =>
    Alert.alert('Enviar os deste aparelho?', 'Os dados salvos na nuvem pelo outro aparelho serão substituídos pelos daqui.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Substituir a nuvem', style: 'destructive', onPress: () => run(() => uploadBackup(db, profile.id, true)) },
    ]);

  if (!userId || !linked) {
    return (
      <Card>
        <Row style={{ gap: 8 }}>
          <Ionicons name="cloud-outline" size={22} color={colors.primary} />
          <Subtitle>Nuvem</Subtitle>
        </Row>
        <Body muted style={{ fontSize: 13 }}>
          Salve seus dados na nuvem para não perder nada ao trocar de celular e para usar em outro aparelho. Sem senha: só um código
          no seu e-mail.
        </Body>
        <Button label={userId ? `Salvar na conta ${email}` : 'Entrar com meu e-mail'} icon="cloud-upload-outline" onPress={open} />
        {userId && <Button small variant="ghost" label="Usar outra conta" onPress={() => signOut(db).then(open)} />}
      </Card>
    );
  }

  if (status === 'conflict') {
    return (
      <Card style={{ borderColor: colors.warn, borderWidth: 1.5 }}>
        <Row style={{ gap: 8 }}>
          <Ionicons name="alert-circle-outline" size={22} color={colors.warn} />
          <Subtitle>Nuvem</Subtitle>
        </Row>
        <Body style={{ fontWeight: '600' }}>{email}</Body>
        <Body style={{ fontSize: 14 }}>
          Outro aparelho salvou dados mais novos na nuvem{conflictAt ? ` (${fmtTime(conflictAt)})` : ''}. Para não perder nada, este
          aparelho parou de enviar até você escolher qual manter.
        </Body>
        <Button label="Usar os da nuvem" icon="cloud-download-outline" onPress={useCloudData} disabled={busy} />
        <Button variant="ghost" label="Enviar os deste aparelho" icon="cloud-upload-outline" onPress={keepThisDevice} disabled={busy} />
      </Card>
    );
  }

  const line =
    status === 'saving'
      ? 'Salvando…'
      : status === 'error'
        ? (error ?? 'Não foi possível salvar. Tento de novo na próxima mudança.')
        : savedAt
          ? `Salvo ${fmtTime(savedAt)}`
          : 'Conectado. As próximas mudanças são salvas sozinhas.';

  return (
    <Card>
      <Row style={{ gap: 8 }}>
        <Ionicons name="cloud-done-outline" size={22} color={status === 'error' ? colors.warn : colors.accent} />
        <Subtitle>Nuvem</Subtitle>
      </Row>
      <Body style={{ fontWeight: '600' }}>{email}</Body>
      <Body muted style={{ fontSize: 13, color: status === 'error' ? colors.warn : colors.muted }}>
        {line}
      </Body>
      <Row>
        <Button
          small
          variant="secondary"
          label="Salvar agora"
          icon="sync-outline"
          onPress={() => uploadBackup(db, profile.id, false, true)}
          disabled={status === 'saving'}
          style={{ flex: 1 }}
        />
        <Button small variant="ghost" label="Sair" icon="log-out-outline" onPress={leave} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}
