import { router } from 'expo-router';
import { fmtHeightM } from '@/lib/format';
import { Text, View } from 'react-native';
import { BMI_LEVELS, bmi, classifyBmi, healthyRange, type BmiLevel } from '@/lib/bmi';
import { radius, type Palette } from './theme';
import { Body, Button, Card, Row, Subtitle, fmtNum } from './ui';
import { useTheme } from './ThemeProvider';

const levelColors = (c: Palette): Record<BmiLevel, string> => ({
  under: c.info,
  normal: c.accent,
  over: c.warn,
  obese1: c.danger,
  obese2: c.danger,
  obese3: c.danger,
});

const SCALE_MIN = 15;
const SCALE_MAX = 40;
const ZONES: { from: number; to: number; level: BmiLevel }[] = [
  { from: SCALE_MIN, to: 18.5, level: 'under' },
  { from: 18.5, to: 25, level: 'normal' },
  { from: 25, to: 30, level: 'over' },
  { from: 30, to: SCALE_MAX, level: 'obese1' },
];
const TICKS = [18.5, 25, 30];
const pos = (v: number) => (Math.min(SCALE_MAX, Math.max(SCALE_MIN, v)) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN);

export function BmiCard({ weightKg, heightCm }: { weightKg: number | null; heightCm: number | null }) {
  const { colors } = useTheme();
  const LEVEL_COLOR = levelColors(colors);
  if (!heightCm) {
    return (
      <Card>
        <Subtitle>IMC</Subtitle>
        <Body muted>Adicione sua altura no Perfil para ver o IMC e a faixa de peso saudável.</Body>
        <Button small variant="secondary" label="Ir para o Perfil" onPress={() => router.navigate('/profile')} />
      </Card>
    );
  }
  if (weightKg === null) {
    return (
      <Card>
        <Subtitle>IMC</Subtitle>
        <Body muted>Adicione seu peso em Dados, no Perfil, para ver o IMC e a faixa de peso saudável.</Body>
        <Button small variant="secondary" label="Registrar peso" onPress={() => router.navigate('/profile')} />
      </Card>
    );
  }

  const value = bmi(weightKg, heightCm);
  const level = classifyBmi(value);
  const color = LEVEL_COLOR[level.level];
  const [low, high] = healthyRange(heightCm);
  const toHealthy = weightKg > high ? weightKg - high : weightKg < low ? low - weightKg : 0;

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Subtitle>IMC</Subtitle>
        <View style={{ backgroundColor: color, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Text style={{ color: colors.card, fontWeight: '700', fontSize: 13 }}>{level.label}</Text>
        </View>
      </Row>

      <Row style={{ alignItems: 'baseline' }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color }}>{fmtNum(value)}</Text>
        <Body muted>
          {fmtNum(weightKg)} kg · {fmtHeightM(heightCm)}
        </Body>
      </Row>

      <View style={{ marginTop: 4 }}>
        <View style={{ flexDirection: 'row', height: 10, borderRadius: radius.pill, overflow: 'hidden' }}>
          {ZONES.map((z) => (
            <View key={z.from} style={{ flex: z.to - z.from, backgroundColor: LEVEL_COLOR[z.level], opacity: 0.85 }} />
          ))}
        </View>
        <View
          style={{
            position: 'absolute',
            left: `${pos(value) * 100}%`,
            top: -4,
            width: 4,
            height: 18,
            marginLeft: -2,
            borderRadius: 2,
            backgroundColor: colors.text,
            borderWidth: 1,
            borderColor: colors.card,
          }}
        />
        <View style={{ height: 16, marginTop: 4 }}>
          {TICKS.map((t) => (
            <Text
              key={t}
              style={{ position: 'absolute', left: `${pos(t) * 100}%`, marginLeft: -12, width: 24, textAlign: 'center', fontSize: 11, color: colors.muted }}
            >
              {fmtNum(t)}
            </Text>
          ))}
        </View>
      </View>

      <Body>
        Peso saudável para {fmtHeightM(heightCm)}: <Text style={{ fontWeight: '700' }}>{fmtNum(low)} a {fmtNum(high)} kg</Text>
      </Body>
      {toHealthy > 0 && (
        <Body muted style={{ fontSize: 14 }}>
          {weightKg > high
            ? `${fmtNum(toHealthy)} kg acima da faixa saudável.`
            : `${fmtNum(toHealthy)} kg abaixo da faixa saudável.`}
        </Body>
      )}

      <View style={{ gap: 2, marginTop: 4 }}>
        {BMI_LEVELS.map((l) => (
          <Row key={l.level} style={{ gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LEVEL_COLOR[l.level] }} />
            <Text
              style={{
                flex: 1,
                fontSize: 13,
                color: l.level === level.level ? colors.text : colors.muted,
                fontWeight: l.level === level.level ? '700' : '400',
              }}
            >
              {l.label}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>
              {l.min === 0 ? `até ${fmtNum(l.max)}` : l.max === Infinity ? `${fmtNum(l.min)} ou mais` : `${fmtNum(l.min)} a ${fmtNum(l.max - 0.1)}`}
            </Text>
          </Row>
        ))}
      </View>

      <Body muted style={{ fontSize: 12, marginTop: 4 }}>
        O IMC não diferencia músculo de gordura. A medida da cintura completa a avaliação.
      </Body>
    </Card>
  );
}
