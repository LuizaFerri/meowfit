import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PartEditor } from '@/components/PartEditor';
import { space } from '@/components/theme';
import { useTheme } from '@/components/ThemeProvider';
import { Button, Screen } from '@/components/ui';
import { savePlan } from '@/db/queries';
import { Alert } from '@/lib/alert';
import { todayKey } from '@/lib/dates';
import { fromDietDraft, fromWorkoutDraft, toDietDraft, toWorkoutDraft } from '@/lib/planForm';
import type { Part } from '@/lib/planText';
import { stampTreino } from '@/lib/workout';
import { useApp, useProfile } from '@/store/useApp';

export default function EditPlan() {
  const params = useLocalSearchParams<{ parte?: Part; novo?: string; modo?: 'texto' }>();
  const part: Part = params.parte === 'dieta' ? 'dieta' : 'treino';
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const loadActive = useApp((s) => s.loadActive);
  const [workout, setWorkout] = useState(() => toWorkoutDraft(profile.plan));
  const [diet, setDiet] = useState(() => toDietDraft(profile.plan));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const next = { ...profile.plan, ...(part === 'treino' ? fromWorkoutDraft(workout) : fromDietDraft(diet)) };
      const started = part === 'treino' && next.days.length > 0 && (params.novo === '1' || profile.plan.days.length === 0);
      await savePlan(db, profile.id, started ? stampTreino(next, todayKey()) : next);
      await loadActive(db);
      router.back();
    } catch (e) {
      Alert.alert('Não foi possível salvar', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: part === 'treino' ? 'Editar treino' : 'Editar dieta' }} />
      <Screen>
        <PartEditor
          part={part}
          workout={workout}
          onWorkout={setWorkout}
          diet={diet}
          onDiet={setDiet}
          initialMode={params.modo === 'texto' ? 'text' : 'form'}
        />
        <Button
          variant="ghost"
          icon="folder-open-outline"
          label="Abrir arquivo recebido"
          onPress={() => router.replace({ pathname: '/import', params: { parte: part } })}
        />
      </Screen>
      <View
        style={{
          paddingHorizontal: space.lg,
          paddingTop: 10,
          paddingBottom: 10 + insets.bottom,
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button label={part === 'treino' ? 'Salvar treino' : 'Salvar dieta'} icon="checkmark" onPress={save} disabled={busy} />
      </View>
    </KeyboardAvoidingView>
  );
}
