import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';
import { dark, lilac, radius, type Palette, type ThemeMode } from './theme';
import { useTheme } from './ThemeProvider';
import { Card, Chip, Row, Subtitle } from './ui';

function Preview({ p, label, active, onPress }: { p: Palette; label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={{
        flex: 1,
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: active ? colors.primary : colors.border,
        overflow: 'hidden',
      }}
    >
      <View style={{ backgroundColor: p.bg, padding: 10, gap: 6 }}>
        <View style={{ backgroundColor: p.card, borderRadius: 8, padding: 8, gap: 5, borderWidth: 1, borderColor: p.border }}>
          <View style={{ height: 6, width: '60%', borderRadius: 3, backgroundColor: p.text }} />
          <View style={{ height: 5, width: '85%', borderRadius: 3, backgroundColor: p.muted }} />
          <View style={{ height: 6, borderRadius: 3, backgroundColor: p.border }}>
            <View style={{ height: 6, width: '55%', borderRadius: 3, backgroundColor: p.accent }} />
          </View>
        </View>
        <View style={{ height: 18, borderRadius: 6, backgroundColor: p.primary }} />
      </View>
      <Row style={{ justifyContent: 'center', paddingVertical: 8, backgroundColor: colors.card }}>
        {active && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
        <Text style={{ color: colors.text, fontWeight: active ? '700' : '400' }}>{label}</Text>
      </Row>
    </Pressable>
  );
}

export function ThemePicker() {
  const { mode, setMode, isDark } = useTheme();
  const pick = (m: ThemeMode) => () => setMode(m);
  return (
    <Card>
      <Subtitle>Aparência</Subtitle>
      <Row style={{ alignItems: 'stretch', gap: 12 }}>
        <Preview p={lilac} label="Lilás" active={mode === 'lilas' || (mode === 'sistema' && !isDark)} onPress={pick('lilas')} />
        <Preview p={dark} label="Escuro" active={mode === 'escuro' || (mode === 'sistema' && isDark)} onPress={pick('escuro')} />
      </Row>
      <Row>
        <Chip label="Seguir o tema do celular" active={mode === 'sistema'} onPress={pick('sistema')} />
      </Row>
    </Card>
  );
}
