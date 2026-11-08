import { View } from 'react-native';
import { emptyMeal, newKey, type DietDraft, type MealDraft, type TextDraft } from '@/lib/planForm';
import { Body, Button, Card, Field, IconButton, Row, Subtitle } from './ui';
import { useTheme } from './ThemeProvider';

type Props = { value: DietDraft; onChange: (next: DietDraft) => void };

export function DietEditor({ value, onChange }: Props) {
  const set = (patch: Partial<DietDraft>) => onChange({ ...value, ...patch });
  const setMeal = (key: string, patch: Partial<MealDraft>) =>
    set({ meals: value.meals.map((m) => (m.key === key ? { ...m, ...patch } : m)) });

  return (
    <>
      <Card>
        <Subtitle>Metas do dia</Subtitle>
        <Field
          label="Água (litros)"
          value={value.water}
          onChangeText={(water) => set({ water })}
          keyboardType="decimal-pad"
          placeholder="2"
        />
        <Row>
          <Field
            flex
            label="Calorias (mín.)"
            value={value.kcalMin}
            onChangeText={(kcalMin) => set({ kcalMin })}
            keyboardType="number-pad"
            placeholder="1600"
          />
          <Field
            flex
            label="Calorias (máx.)"
            value={value.kcalMax}
            onChangeText={(kcalMax) => set({ kcalMax })}
            keyboardType="number-pad"
            placeholder="1800"
          />
        </Row>
        <Row>
          <Field
            flex
            label="Proteína em g (mín.)"
            value={value.proteinMin}
            onChangeText={(proteinMin) => set({ proteinMin })}
            keyboardType="number-pad"
            placeholder="100"
          />
          <Field
            flex
            label="Proteína em g (máx.)"
            value={value.proteinMax}
            onChangeText={(proteinMax) => set({ proteinMax })}
            keyboardType="number-pad"
            placeholder="120"
          />
        </Row>
        <Body muted style={{ fontSize: 12 }}>
          Calorias e proteína são opcionais. Se tiver um valor só, preencha apenas o mínimo.
        </Body>
      </Card>

      {value.meals.map((m, i) => (
        <MealCard
          key={m.key}
          meal={m}
          index={i}
          onChange={(patch) => setMeal(m.key, patch)}
          onRemove={() => set({ meals: value.meals.filter((x) => x.key !== m.key) })}
        />
      ))}

      <Button variant="secondary" icon="add" label="Refeição" onPress={() => set({ meals: [...value.meals, emptyMeal()] })} />

      <Card>
        <Subtitle>Regras e dicas (opcional)</Subtitle>
        <Body muted style={{ fontSize: 13 }}>
          Aparecem na aba Dieta como lembretes. Ex.: “Proteína em toda refeição”.
        </Body>
        <TextList items={value.rules} onChange={(rules) => set({ rules })} placeholder="Regra" />
      </Card>
    </>
  );
}

function MealCard({
  meal,
  index,
  onChange,
  onRemove,
}: {
  meal: MealDraft;
  index: number;
  onChange: (p: Partial<MealDraft>) => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Card>
      <Row style={{ alignItems: 'flex-end' }}>
        <View style={{ width: 84 }}>
          <Field label="Horário" value={meal.time} onChangeText={(time) => onChange({ time })} placeholder="7:30" />
        </View>
        <Field
          flex
          label={`Refeição ${index + 1}`}
          value={meal.name}
          onChangeText={(name) => onChange({ name })}
          placeholder="Ex.: Café da manhã"
        />
        <IconButton icon="trash-outline" label="Remover refeição" onPress={onRemove} />
      </Row>
      <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
        <Body muted style={{ fontSize: 13 }}>
          O que você come nessa refeição: um alimento por linha, com a quantidade (ex.: “Batata cozida: 120 g”). Se o
          nutricionista deu alternativas, crie uma opção para cada.
        </Body>
        <TextList items={meal.options} onChange={(options) => onChange({ options })} placeholder="Opção" addLabel="Opção" multiline />
      </View>
    </Card>
  );
}

function TextList({
  items,
  onChange,
  placeholder,
  addLabel,
  multiline = false,
}: {
  items: TextDraft[];
  onChange: (next: TextDraft[]) => void;
  placeholder: string;
  addLabel?: string;
  multiline?: boolean;
}) {
  return (
    <>
      {items.map((t, i) => (
        <Row key={t.key}>
          <Field
            flex
            value={t.text}
            onChangeText={(text) => onChange(items.map((x) => (x.key === t.key ? { ...x, text } : x)))}
            placeholder={multiline ? `${placeholder} ${i + 1}\nUm alimento por linha` : `${placeholder} ${i + 1}`}
            multiline={multiline}
            style={multiline ? { minHeight: 24 + 24 * Math.max(2, t.text.split('\n').length + 1), textAlignVertical: 'top' } : undefined}
          />
          <IconButton icon="close" label="Remover" onPress={() => onChange(items.filter((x) => x.key !== t.key))} />
        </Row>
      ))}
      <Button
        small
        variant="secondary"
        icon="add"
        label={addLabel ?? placeholder}
        onPress={() => onChange([...items, { key: newKey(), text: '' }])}
      />
    </>
  );
}
