import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/store/useApp';
import { useTheme } from './ThemeProvider';

export const SPLASH_LILAC = '#EFDFFC';
const MIN_VISIBLE_MS = 2200;
const FADE_MS = 380;
const GIF_SOURCE_SIZE = 508;
const GIF_WIDTH = Math.min(340, Dimensions.get('window').width - 32);
const CROP_TOP = Math.round((GIF_WIDTH * 92) / GIF_SOURCE_SIZE);
const CROP_HEIGHT = Math.round((GIF_WIDTH * (440 - 92)) / GIF_SOURCE_SIZE);

export function AnimatedSplash() {
  const { colors, isDark } = useTheme();
  const loaded = useApp((s) => s.loaded);
  const [done, setDone] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));
  const [pop] = useState(() => new Animated.Value(0));

  const revealed = useRef(false);

  const reveal = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    SplashScreen.hide();
    Animated.timing(pop, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
  }, [pop]);

  useEffect(() => {
    const fallback = setTimeout(reveal, 600);
    const min = setTimeout(() => setMinTimePassed(true), MIN_VISIBLE_MS);
    return () => {
      clearTimeout(fallback);
      clearTimeout(min);
    };
  }, [reveal]);

  useEffect(() => {
    if (!loaded || !minTimePassed) return;
    Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => setDone(true));
  }, [loaded, minTimePassed, opacity]);

  if (done) return null;

  const bg = isDark ? colors.bg : SPLASH_LILAC;
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap, { backgroundColor: bg, opacity }]}>
      <Animated.View style={{ alignItems: 'center', gap: 14, opacity: pop, transform: [{ scale }] }}>
        <View style={{ width: GIF_WIDTH, height: CROP_HEIGHT, overflow: 'hidden', borderRadius: isDark ? 28 : 0, backgroundColor: SPLASH_LILAC }}>
          <Image
            source={require('../../assets/splash-cats.gif')}
            style={{ position: 'absolute', top: -CROP_TOP, width: GIF_WIDTH, height: GIF_WIDTH }}
            contentFit="contain"
            autoplay
            onLoad={reveal}
            accessibilityLabel="Os gatos do MeowFit se alongando"
          />
        </View>
        <Text style={{ fontSize: 30, fontWeight: '800', color: isDark ? colors.text : '#3B1A5E' }}>MeowFit</Text>
        <Text style={{ fontSize: 15, color: isDark ? colors.muted : '#76658F' }}>Alongando as patinhas…</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
});
