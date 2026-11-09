import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/components/ThemeProvider';
import { Body, Button, Card, Field, Row, Screen, Subtitle } from '@/components/ui';
import { Alert } from '@/lib/alert';
import { fetchCloudBackup, linkAndUpload, restoreFromCloud, sendCode, verifyCode, type CloudBackup } from '@/lib/cloud';
import { CODE_MAX, decideLink, validCode, validEmail } from '@/lib/cloudLogic';
import { listProfiles } from '@/db/queries';
import { parseJsonFile, restoreBackup } from '@/lib/backup';
import { pickTextFile } from '@/lib/files';
import { useApp } from '@/store/useApp';

const RESEND_SECONDS = 60;

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function CloudLogin() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const switchTo = useApp((s) => s.switchTo);
  const { origem } = useLocalSearchParams<{ origem?: string }>();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'empty'>('email');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

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

  const askCode = () =>
    run(async () => {
      if (!validEmail(email)) throw new Error('Digite um e-mail válido.');
      Keyboard.dismiss();
      await sendCode(email);
      setStep('code');
      setCooldown(RESEND_SECONDS);
    });

  const finishHome = () => router.dismissTo('/');

  const restore = async (cloud: CloudBackup, replacePid: number | null) => {
    const id = await restoreFromCloud(db, cloud, replacePid);
    await switchTo(db, id);
    finishHome();
    Alert.alert('Dados recuperados! 🐾', 'Seus dados da nuvem já estão neste aparelho.');
  };

  const upload = async (pid: number) => {
    await linkAndUpload(db, pid);
    router.back();
    Alert.alert('Salvo na nuvem ☁️', 'A partir de agora, suas mudanças são salvas na nuvem sozinhas.');
  };

  const startSignup = () => router.replace({ pathname: '/new-profile', params: { inicio: 'cadastro' } });

  const restoreFile = () =>
    run(async () => {
      const file = await pickTextFile();
      if (!file) return;
      const parsed = parseJsonFile(file.text);
      if (parsed.kind !== 'backup')
        throw new Error('Esse arquivo tem só um plano de treino ou dieta. Faça seu cadastro e importe o plano depois, no Perfil.');
      if ((await listProfiles(db)).length > 0) return finishHome();
      const id = await restoreBackup(db, parsed.backup, parsed.plan);
      await switchTo(db, id);
      await linkAndUpload(db, id);
      finishHome();
      Alert.alert('Dados recuperados! 🐾', 'Seu backup foi restaurado e já está salvo na nuvem.');
    });

  const confirm = () =>
    run(async () => {
      if (!validCode(code)) throw new Error('Digite o código que chegou no seu e-mail.');
      Keyboard.dismiss();
      await verifyCode(email, code);
      const cloud = await fetchCloudBackup();
      const profile = useApp.getState().profile;
      const decision = decideLink({ hasLocal: !!profile, hasCloud: !!cloud });
      const account = email.trim().toLowerCase();

      if (decision === 'restore') return restore(cloud!, null);

      if (decision === 'signup') {
        setStep('empty');
        return;
      }

      if (decision === 'upload') {
        Alert.alert('Salvar na nuvem?', `Os dados de "${profile!.name}" serão guardados na conta ${account}.`, [
          { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
          { text: 'Salvar', onPress: () => run(() => upload(profile!.id)) },
        ]);
        return;
      }

      Alert.alert(
        'Esta conta já tem dados',
        `Na nuvem: "${cloud!.profileName || 'perfil'}", salvo em ${fmtWhen(cloud!.updatedAt)}.\nNeste aparelho: "${profile!.name}".\n\nQual você quer manter?`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
          { text: 'Usar os da nuvem', onPress: () => run(() => restore(cloud!, profile!.id)) },
          {
            text: 'Enviar os deste aparelho',
            style: 'destructive',
            onPress: () =>
              Alert.alert('Substituir a nuvem?', 'Os dados salvos na nuvem serão trocados pelos deste aparelho.', [
                { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
                { text: 'Substituir', style: 'destructive', onPress: () => run(() => upload(profile!.id)) },
              ]),
          },
        ],
      );
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Card>
          <Row style={{ gap: 10 }}>
            <Ionicons name="cloud-outline" size={26} color={colors.primary} />
            <Subtitle>{step === 'email' ? 'Entrar com seu e-mail' : step === 'code' ? 'Digite o código' : 'Conta pronta ✨'}</Subtitle>
          </Row>
          {step === 'empty' ? (
            <>
              <Body muted>
                Ainda não há dados salvos na nuvem para {email.trim().toLowerCase()}. Crie seu cadastro ou restaure um arquivo de
                backup: os dois já ficam salvos na nuvem.
              </Body>
              <Button label="Criar meu cadastro" icon="paw" onPress={startSignup} disabled={busy} />
              <Button variant="ghost" label="Restaurar de um arquivo de backup" icon="folder-open-outline" onPress={restoreFile} disabled={busy} />
            </>
          ) : step === 'email' ? (
            <>
              <Body muted>
                {origem === 'boas-vindas'
                  ? 'Se você já salvou seus dados na nuvem, eles voltam para este aparelho. Sem senha: enviamos um código para o seu e-mail.'
                  : 'Seus dados ficam guardados na nuvem e voltam se você trocar de aparelho. Sem senha: enviamos um código para o seu e-mail.'}
              </Body>
              <Field
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                placeholder="voce@email.com"
                autoFocus
                onSubmitEditing={askCode}
              />
              <Button label="Enviar código" icon="mail-outline" onPress={askCode} disabled={busy || !validEmail(email)} />
            </>
          ) : (
            <>
              <Body muted>Enviamos um código para {email.trim().toLowerCase()}. Ele vale por 1 hora; confira também o spam.</Body>
              <Field
                label="Código"
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, CODE_MAX))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                placeholder="Código"
                autoFocus
                maxLength={CODE_MAX}
                onSubmitEditing={confirm}
                style={{ fontSize: 24, letterSpacing: 6, textAlign: 'center' }}
              />
              <Button label="Entrar" icon="log-in-outline" onPress={confirm} disabled={busy || !validCode(code)} />
              <Row>
                <Button small variant="ghost" label="Trocar e-mail" onPress={() => setStep('email')} disabled={busy} style={{ flex: 1 }} />
                <Button
                  small
                  variant="ghost"
                  label={cooldown > 0 ? `Reenviar em ${cooldown} s` : 'Reenviar código'}
                  onPress={askCode}
                  disabled={busy || cooldown > 0}
                  style={{ flex: 1 }}
                />
              </Row>
            </>
          )}
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
