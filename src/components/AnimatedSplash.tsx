import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/store/useApp';

export const SPLASH_LILAC = '#EFDFFC';

const FRAMES = [
  require('../../assets/splash/frame0.png'),
  require('../../assets/splash/frame1.png'),
  require('../../assets/splash/frame2.png'),
  require('../../assets/splash/frame3.png'),
  require('../../assets/splash/frame4.png'),
  require('../../assets/splash/frame5.png'),
];
const HOLD_MS = 220;
const CROSSFADE_MS = 150;
const LOGO_HOLD_MS = 600;
const FADE_MS = 380;
const SIZE = Math.min(320, Dimensions.get('window').width - 32);

export function AnimatedSplash() {
  const loaded = useApp((s) => s.loaded);
  const [done, setDone] = useState(false);
  const [finished, setFinished] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));
  const [pop] = useState(() => new Animated.Value(0));
  const [step] = useState(() => new Animated.Value(0));

  const revealed = useRef(false);

  const reveal = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    SplashScreen.hide();
    const frames = FRAMES.slice(1).map((_, i) =>
      Animated.sequence([
        Animated.delay(HOLD_MS),
        Animated.timing(step, { toValue: i + 1, duration: CROSSFADE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    Animated.sequence([
      Animated.timing(pop, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      ...frames,
      Animated.delay(LOGO_HOLD_MS),
    ]).start(({ finished: ok }) => ok && setFinished(true));
  }, [pop, step]);

  useEffect(() => {
    const fallback = setTimeout(reveal, 600);
    return () => clearTimeout(fallback);
  }, [reveal]);

  useEffect(() => {
    if (!loaded || !finished) return;
    Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => setDone(true));
  }, [loaded, finished, opacity]);

  if (done) return null;

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap, { opacity }]}>
      <Animated.View style={{ alignItems: 'center', gap: 6, opacity: pop, transform: [{ scale }] }}>
        <View style={{ width: SIZE, height: SIZE }} accessible accessibilityLabel="Os gatos do MeowFit se alongando">
          {FRAMES.map((src, i) => (
            <Animated.Image
              key={i}
              source={src}
              onLoad={i === 0 ? reveal : undefined}
              style={[
                StyleSheet.absoluteFill,
                { width: SIZE, height: SIZE },
                i > 0 && { opacity: step.interpolate({ inputRange: [i - 1, i], outputRange: [0, 1], extrapolate: 'clamp' }) },
              ]}
            />
          ))}
        </View>
        <Text style={{ fontSize: 15, color: '#76658F' }}>Alongando as patinhas…</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', backgroundColor: SPLASH_LILAC, zIndex: 1000, elevation: 1000 },
});
