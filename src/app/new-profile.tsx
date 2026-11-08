import { Stack, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { PartEditor, type EditMode } from '@/components/PartEditor';
import { Welcome } from '@/components/Welcome';
import { Body, Button, Card, Field, Row, Screen, parseNum } from '@/components/ui';
import { parseHeightCm } from '@/lib/format';
import { useTheme } from '@/components/ThemeProvider';
import { addMeasurement, createProfile } from '@/db/queries';
import { Alert } from '@/lib/alert';
import { parseJsonFile, restoreBackup } from '@/lib/backup';
import { todayKey } from '@/lib/dates';
import { pickTextFile } from '@/lib/files';
import { fromDietDraft, fromWorkoutDraft, toDietDraft, toWorkoutDraft } from '@/lib/planForm';
import { emptyPlan } from '@/lib/types';
import { stampTreino } from '@/lib/workout';
import { useApp } from '@/store/useApp';

const STEPS = ['Você', 'Treino', 'Dieta'];

export default function NewProfile() {
  const db = useSQLiteContext();
  const switchTo = useApp((s) => s.switchTo);
  const [welcome, setWelcome] = useState(true);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [workout, setWorkout] = useState(() => toWorkoutDraft(emptyPlan()));
  const [diet, setDiet] = useState(() => toDietDraft(emptyPlan(), '2'));
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<EditMode>('form');

  const next = () => {
    if (step === 0 && !name.trim()) return Alert.alert('Nome', 'Digite seu nome para continuar.');
    setStep(step + 1);
  };

  async function finish() {
    setBusy(true);
    try {
      const base = { ...emptyPlan(), ...fromWorkoutDraft(workout), ...fromDietDraft(diet) };
      const plan = base.days.length > 0 ? stampTreino(base, todayKey()) : base;
      const id = await createProfile(db, name.trim(), parseHeightCm(height), plan);
      const kg = parseNum(weight);
      if (kg !== null && kg > 0) await addMeasurement(db, id, todayKey(), kg, null);
      await switchTo(db, id);
      router.dismissTo('/');
    } catch (e) {
      Alert.alert('Não foi possível criar o perfil', (e as Error).message);
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
          : await createProfile(
              db,
              name.trim() || 'Meu perfil',
              parseHeightCm(height),
              parsed.plan.treinoSince ? parsed.plan : stampTreino(parsed.plan, todayKey()),
            );
      await switchTo(db, id);
      router.dismissTo('/');
    } catch (e) {
      Alert.alert('Não foi possível abrir o arquivo', (e as Error).message);
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
        <Welcome onStart={() => setWelcome(false)} onRestore={restore} busy={busy} />
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
