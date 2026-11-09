import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { lilac } from './theme';

export function DatabaseError({ onRetry }: { onRetry: () => void }) {
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  const web = Platform.OS === 'web';
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14, backgroundColor: lilac.bg }}>
      <Text style={{ fontSize: 40 }}>🐾</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: lilac.text, textAlign: 'center' }}>Não foi possível abrir seus dados</Text>
      <Text style={{ fontSize: 15, color: lilac.muted, textAlign: 'center', lineHeight: 22 }}>
        {web
          ? 'O MeowFit provavelmente está aberto em outra aba ou janela. Feche as outras e toque em “Tentar de novo”. Seus dados continuam salvos.'
          : 'Feche o app e abra de novo. Seus dados continuam salvos.'}
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({
          backgroundColor: lilac.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 14,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ color: lilac.onPrimary, fontWeight: '700', fontSize: 16 }}>Tentar de novo</Text>
      </Pressable>
    </View>
  );
}
