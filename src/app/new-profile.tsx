import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { PartEditor, type EditMode } from '@/components/PartEditor';
import { Welcome } from '@/components/Welcome';
import { Body, Button, Card, Field, Row, Screen, parseNum } from '@/components/ui';
import { parseHeightCm } from '@/lib/format';
import { useTheme } from '@/components/ThemeProvider';
import { addMeasurement, createProfile, listProfiles } from '@/db/queries';
import { Alert } from '@/lib/alert';
import { todayKey } from '@/lib/dates';
import { fromDietDraft, fromWorkoutDraft, toDietDraft, toWorkoutDraft } from '@/lib/planForm';
import { emptyPlan } from '@/lib/types';
import { stampTreino } from '@/lib/workout';
import { useApp } from '@/store/useApp';
import { linkAndUpload, useCloud } from '@/lib/cloud';

const STEPS = ['Você', 'Treino', 'Dieta'];

export default function NewProfile() {
  const db = useSQLiteContext();
  const switchTo = useApp((s) => s.switchTo);
  const hasProfile = useApp((s) => s.profile !== null);
  const { inicio } = useLocalSearchParams<{ inicio?: string }>();
  const [welcome, setWelcome] = useState(inicio !== 'cadastro');
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [workout, setWorkout] = useState(() => toWorkoutDraft(emptyPlan()));
  const [diet, setDiet] = useState(() => toDietDraft(emptyPlan(), '2'));
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<EditMode>('form');

  if (hasProfile && !busy) return <Redirect href="/" />;

  const alreadyHasProfile = async () => {
    if ((await listProfiles(db)).length === 0) return false;
    router.replace('/');
    return true;
  };

  const next = () => {
    if (step === 0 && !name.trim()) return Alert.alert('Nome', 'Digite seu nome para continuar.');
    setStep(step + 1);
  };

  async function finish() {
    setBusy(true);
    try {
      if (await alreadyHasProfile()) return;
      const base = { ...emptyPlan(), ...fromWorkoutDraft(workout), ...fromDietDraft(diet) };
      const plan = base.days.length > 0 ? stampTreino(base, todayKey()) : base;
      const id = await createProfile(db, name.trim(), parseHeightCm(height), plan);
      const kg = parseNum(weight);
      if (kg !== null && kg > 0) await addMeasurement(db, id, todayKey(), kg, null);
      await switchTo(db, id);
      const signedIn = !!useCloud.getState().userId;
      if (signedIn) await linkAndUpload(db, id).catch(() => {});
      router.dismissTo('/');
      if (!signedIn)
        Alert.alert(
          'Salvar na nuvem? ☁️',
          'Entrando com seu e-mail, seus dados ficam guardados e voltam se você trocar de celular ou usar em outro aparelho. Sem senha: só um código no e-mail.',
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Salvar com meu e-mail', onPress: () => router.push({ pathname: '/cloud-login', params: { origem: 'perfil' } }) },
          ],
        );
    } catch (e) {
      Alert.alert('Não foi possível criar o perfil', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const workoutEmpty = workout.days.length === 0;
  const dietEmpty = diet.meals.length === 0;
  const title = ['Sobre você', 'Seu treino', 'Sua dieta'][step];

  if (welcome) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Welcome
          onStart={() => setWelcome(false)}
          onCloud={() => router.push({ pathname: '/cloud-login', params: { origem: 'boas-vindas' } })}
          busy={busy}
        />
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: true, headerBackVisible: false, title }} />
      <Screen key={step}>
        <Steps current={step} />

        {step === 0 && (
          <>
            <Card>
              <Field label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" autoFocus />
              <Row>
                <Field
                  flex
                  label="Altura (cm)"
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  placeholder="Ex.: 165"
                />
                <Field
                  flex
                  label="Peso (kg)"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="Ex.: 62,5"
                />
              </Row>
              <Body muted style={{ fontSize: 12 }}>
                Altura e peso são opcionais. Com os dois, o app mostra o IMC e a evolução do peso.
              </Body>
            </Card>
            <Row>
              <Button variant="ghost" label="Voltar" icon="arrow-back" onPress={() => setWelcome(true)} style={{ flex: 1 }} />
              <Button label="Continuar" icon="arrow-forward" onPress={next} style={{ flex: 2 }} />
            </Row>
          </>
        )}

        {step > 0 && (
          <>
            <Body muted>
              {step === 1
                ? 'Monte seu treino item por item ou cole o texto dele. Dá para pular e montar depois, no Perfil.'
                : 'Coloque suas metas e refeições, item por item ou colando o texto. Também dá para pular e preencher depois, no Perfil.'}
            </Body>
            <PartEditor
              part={step === 1 ? 'treino' : 'dieta'}
              workout={workout}
              onWorkout={setWorkout}
              diet={diet}
              onDiet={setDiet}
              initialMode={mode}
              onModeChange={setMode}
              fillOther
            />
          </>
        )}

        {step > 0 && (
          <Row>
            <Button variant="ghost" label="Voltar" icon="arrow-back" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />
            {step === 1 ? (
              <Button
                label={workoutEmpty ? 'Pular' : 'Continuar'}
                icon="arrow-forward"
                onPress={next}
                style={{ flex: 2 }}
              />
            ) : (
              <Button
                label={dietEmpty ? 'Pular e concluir' : 'Concluir'}
                icon="checkmark"
                onPress={finish}
                disabled={busy}
                style={{ flex: 2 }}
              />
            )}
          </Row>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Steps({ current }: { current: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ gap: 6 }}>
        {STEPS.map((label, i) => (
          <View
            key={label}
            style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= current ? colors.primary : colors.border }}
          />
        ))}
      </Row>
      <Body muted style={{ fontSize: 12 }}>
        Etapa {current + 1} de {STEPS.length} · {STEPS[current]}
      </Body>
    </View>
  );
}
