import * as Clipboard from 'expo-clipboard';
import { useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { examplePlan } from '@/data/examplePlan';
import { TEXT_HELP } from '@/lib/planHelp';
import {
  dietWarnings,
  fromDietDraft,
  fromWorkoutDraft,
  toDietDraft,
  toWorkoutDraft,
  workoutWarnings,
  type DietDraft,
  type WorkoutDraft,
} from '@/lib/planForm';
import { ignoredIn, parsePlanText, planToText, type Part } from '@/lib/planText';
import { emptyPlan } from '@/lib/types';
import { radius } from './theme';
import { DietEditor } from './DietEditor';
import { WorkoutEditor } from './WorkoutEditor';
import { Body, Button, Card, Chip, Row, Subtitle, type IconName } from './ui';
import { useTheme } from './ThemeProvider';

export type EditMode = 'form' | 'text';

type Props = {
  part: Part;
  workout: WorkoutDraft;
  onWorkout: (d: WorkoutDraft) => void;
  diet: DietDraft;
  onDiet: (d: DietDraft) => void;
  initialMode?: EditMode;
  onModeChange?: (m: EditMode) => void;
  fillOther?: boolean;
};

export function PartEditor({ part, workout, onWorkout, diet, onDiet, initialMode = 'form', onModeChange, fillOther }: Props) {
  const { colors, s } = useTheme();
  const [mode, setMode] = useState<EditMode>(initialMode);
  const draftText = () =>
    planToText({ ...emptyPlan(), ...(part === 'treino' ? fromWorkoutDraft(workout) : fromDietDraft(diet)) }, part);
  const [text, setText] = useState(() => (initialMode === 'text' ? draftText() : ''));
  const [lineWarnings, setLineWarnings] = useState<{ line: number; text: string }[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [hasOther, setHasOther] = useState(false);
  const otherFromText = useRef(false);
  const otherPart: Part = part === 'treino' ? 'dieta' : 'treino';

  const isEmpty = part === 'treino' ? workout.days.length === 0 : diet.meals.length === 0;

  const applyText = (value: string) => {
    setText(value);
    const result = parsePlanText(value, 'Meu plano', part);
    setLineWarnings(result.warnings);
    if (part === 'treino') onWorkout(toWorkoutDraft(result.plan));
    else onDiet(toDietDraft(result.plan, diet.water));
    const other = ignoredIn(result, part).length > 0;
    setHasOther(other);
    const otherEmpty = otherPart === 'treino' ? workout.days.length === 0 : diet.meals.length === 0;
    if (fillOther && other && (otherEmpty || otherFromText.current)) {
      const rest = parsePlanText(value, 'Meu plano', otherPart).plan;
      if (otherPart === 'treino') onWorkout(toWorkoutDraft(rest));
      else onDiet(toDietDraft(rest, diet.water));
      otherFromText.current = true;
    }
  };

  const switchTo = (next: EditMode) => {
    if (next === mode) return;
    if (next === 'text') {
      setText(draftText());
      setLineWarnings([]);
      setHasOther(false);
    }
    setMode(next);
    onModeChange?.(next);
  };

  const fillExample = () => {
    const sample = examplePlan();
    if (mode === 'text') return applyText(planToText(sample, part));
    if (part === 'treino') onWorkout(toWorkoutDraft(sample));
    else onDiet(toDietDraft(sample));
  };

  const formWarnings = mode === 'form' ? (part === 'treino' ? workoutWarnings(workout) : dietWarnings(diet)) : [];

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ModeButton icon="list-outline" label="Item por item" active={mode === 'form'} onPress={() => switchTo('form')} />
        <ModeButton icon="clipboard-outline" label="Colar texto" active={mode === 'text'} onPress={() => switchTo('text')} />
      </View>

      {isEmpty && (
        <Button small variant="ghost" icon="sparkles-outline" label="Começar com um exemplo" onPress={fillExample} />
      )}

      {mode === 'form' &&
        (part === 'treino' ? <WorkoutEditor value={workout} onChange={onWorkout} /> : <DietEditor value={diet} onChange={onDiet} />)}

      {mode === 'text' && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Subtitle>{part === 'treino' ? 'Treino em texto' : 'Dieta em texto'}</Subtitle>
            <Chip label={showHelp ? 'Fechar ajuda' : 'Como escrever?'} onPress={() => setShowHelp(!showHelp)} />
          </Row>
          {showHelp && (
            <Body muted style={{ fontSize: 13 }}>
              {TEXT_HELP[part]}
            </Body>
          )}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 10,
              borderRadius: radius.sm,
              backgroundColor: isEmpty ? colors.bg : colors.primarySoft,
            }}
          >
            <Ionicons name={isEmpty ? 'document-text-outline' : 'checkmark-circle'} size={18} color={isEmpty ? colors.muted : colors.primary} />
            <Text style={{ flex: 1, fontSize: 13, color: isEmpty ? colors.muted : colors.text }}>
              {isEmpty
                ? 'Nada reconhecido ainda.'
                : part === 'treino'
                  ? `Reconhecido: ${workout.days.length} ${workout.days.length === 1 ? 'dia' : 'dias'} e ${workout.days.reduce((n, d) => n + d.exercises.length, 0)} exercícios. Toque em “Item por item” para conferir.`
                  : `Reconhecido: ${diet.meals.length} ${diet.meals.length === 1 ? 'refeição' : 'refeições'}. Toque em “Item por item” para conferir.`}
            </Text>
          </View>
          {hasOther && (
            <Body muted style={{ fontSize: 12 }}>
              {part === 'treino'
                ? fillOther
                  ? 'O texto também tem a dieta. Aqui entram só treinos e hábitos; a dieta já vai aparecer preenchida na próxima etapa.'
                  : 'O texto também tem a dieta. Aqui entram só treinos e hábitos; a dieta não muda.'
                : fillOther
                  ? 'O texto também tem o treino. Aqui entram só refeições, metas e regras; o treino colado também foi aproveitado.'
                  : 'O texto também tem o treino. Aqui entram só refeições, metas e regras; o treino não muda.'}
            </Body>
          )}
          <TextInput
            multiline
            value={text}
            onChangeText={applyText}
            placeholder={
              part === 'treino'
                ? 'Segunda: pernas\nLeg press: 3 x 12, carga ___ kg\nPrancha: 3 x 30 s\n…'
                : 'Café da manhã: ovos | iogurte com aveia\nAlmoço: frango e arroz\nágua: 2\n…'
            }
            placeholderTextColor={colors.muted}
            textAlignVertical="top"
            autoCorrect={false}
            style={[s.input, { minHeight: 220, maxHeight: 420, fontSize: 14, borderRadius: radius.sm }]}
          />
          <Button
            small
            variant="ghost"
            icon="clipboard-outline"
            label="Colar do celular"
            onPress={async () => applyText(await Clipboard.getStringAsync())}
          />
        </Card>
      )}

      {(formWarnings.length > 0 || (mode === 'text' && lineWarnings.length > 0)) && (
        <Card style={{ backgroundColor: colors.warnSoft, borderColor: colors.warnSoft }}>
          {formWarnings.map((w) => (
            <Body key={w} style={{ fontSize: 13 }}>
              {w}
            </Body>
          ))}
          {mode === 'text' &&
            lineWarnings.map((w) => (
              <Body key={w.line} style={{ fontSize: 13 }}>
                Linha {w.line} ignorada: {w.text}
              </Body>
            ))}
        </Card>
      )}
    </>
  );
}

function ModeButton({ icon, label, active, onPress }: { icon: IconName; label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primarySoft : 'transparent',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Ionicons name={icon} size={18} color={active ? colors.primary : colors.muted} />
      <Text style={{ fontWeight: '700', color: active ? colors.primary : colors.muted, fontSize: Platform.OS === 'web' ? 14 : 15 }}>
        {label}
      </Text>
    </Pressable>
  );
}
