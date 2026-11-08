import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius } from './theme';
import { Button, type IconName } from './ui';
import { useTheme } from './ThemeProvider';

const LOGO_RING = '#7E1DBE';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'barbell-outline', title: 'Treino do dia', text: 'Séries, cargas e a evolução de cada exercício.' },
  { icon: 'restaurant-outline', title: 'Dieta sem planilha', text: 'Marque o que comeu em cada refeição.' },
  { icon: 'water-outline', title: 'Água em dia', text: 'Copos registrados e lembretes ao longo do dia.' },
  { icon: 'trending-up-outline', title: 'Seu progresso', text: 'Peso, cintura e checklist da semana.' },
];

export function Welcome({ onStart, onRestore, busy }: { onStart: () => void; onRestore: () => void; busy?: boolean }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 32,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        gap: 24,
      }}
    >
      <View style={{ alignItems: 'center', gap: 18 }}>
        <View
          style={{
            width: 230,
            height: 230,
            borderRadius: 115,
            backgroundColor: LOGO_RING,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={isDark ? require('../../assets/logo-dark.png') : require('../../assets/logo-lilas.png')}
            style={{ width: 206, height: 206 }}
            accessibilityLabel="MeowFit"
          />
        </View>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
            Boas-vindas ao MeowFit
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 22, color: colors.muted, textAlign: 'center' }}>
            Treino, dieta e medidas num lugar só, com dois gatinhos torcendo por você.
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          gap: 14,
        }}
      >
        {FEATURES.map((f) => (
          <View key={f.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={f.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{f.title}</Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>{f.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ gap: 10 }}>
        <Button label="Criar meu cadastro" icon="paw" onPress={onStart} disabled={busy} />
        <Button variant="ghost" label="Já tenho um backup" icon="folder-open-outline" onPress={onRestore} disabled={busy} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
          <Text style={{ fontSize: 12, color: colors.muted }}>Seus dados ficam só neste celular.</Text>
        </View>
      </View>
    </ScrollView>
  );
}
