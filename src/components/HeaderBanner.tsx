import { Image, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from './ThemeProvider';

const ART_RATIO = 3;

const VARIANTS = {
  light: {
    art: require('../../assets/header.jpg'),
    top: '#F0E3FE',
    ink: '#3B1A5E',
    inkSoft: '#76658F',
    accent: '#8B5CD6',
  },
  dark: {
    art: require('../../assets/header-dark.jpg'),
    top: '#1A0D26',
    ink: '#F1EAFB',
    inkSoft: '#B5A8CC',
    accent: '#B48CF2',
  },
};

function Sparks({ color, flip }: { color: string; flip?: boolean }) {
  return (
    <Svg width={14} height={22} viewBox="0 0 14 22" style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Line x1={4} y1={2} x2={11} y2={7} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={1} y1={11} x2={10} y2={11} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={4} y1={20} x2={11} y2={15} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function HeaderBanner({ name, subtitle }: { name: string; subtitle: string }) {
  const top = useSafeAreaInsets().top;
  const { isDark } = useTheme();
  const v = isDark ? VARIANTS.dark : VARIANTS.light;
  return (
    <View style={{ backgroundColor: v.top, paddingTop: top + 24 }}>
      <View style={{ width: '100%', aspectRatio: ART_RATIO }}>
        <Image source={v.art} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View
          style={{
            position: 'absolute',
            left: '36%',
            right: '4%',
            top: 0,
            bottom: '22%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' }}>
            <Sparks color={v.accent} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
              style={{ flexShrink: 1, fontSize: 30, fontWeight: '800', color: v.ink }}
              accessibilityRole="header"
            >
              Olá, {name}!
            </Text>
            <Sparks color={v.accent} flip />
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 16, color: v.inkSoft, marginTop: 2 }}>
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}
