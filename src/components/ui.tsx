import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { space } from './theme';
import { useTheme } from './ThemeProvider';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { s } = useTheme();
  if (!scroll) return <View style={[s.screen, s.screenPad]}>{children}</View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.screenPad} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Loading() {
  const { s, colors } = useTheme();
  return (
    <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { s } = useTheme();
  return <View style={[s.card, style]}>{children}</View>;
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { s } = useTheme();
  return <Text style={[s.title, style]}>{children}</Text>;
}

export function Subtitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { s } = useTheme();
  return <Text style={[s.subtitle, style]}>{children}</Text>;
}

export function Body({
  children,
  style,
  muted,
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
  numberOfLines?: number;
}) {
  const { s, colors } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[s.body, muted && { color: colors.muted }, style]}>
      {children}
    </Text>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { s } = useTheme();
  return <View style={[s.row, style]}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, small, style }: ButtonProps) {
  const { s, colors } = useTheme();
  const v = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
    ghost: { bg: 'transparent', fg: colors.text, border: colors.border },
    danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        small && s.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={small ? 16 : 18} color={v.fg} />}
      <Text style={[s.buttonText, small && { fontSize: 14 }, { color: v.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Check({
  checked,
  onPress,
  label,
  sub,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
  sub?: string;
}) {
  const { s, colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [s.check, pressed && { opacity: 0.7 }]}
    >
      <View style={[s.box, checked && s.boxOn]}>{checked && <Ionicons name="checkmark" size={16} color={colors.onAccent} />}</View>
      <View style={{ flex: 1 }}>
        <Text style={[s.body, checked && s.done]}>{label}</Text>
        {sub ? <Text style={s.small}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

export function Field({ label, style, flex, ...props }: TextInputProps & { label?: string; flex?: boolean }) {
  const { s, colors } = useTheme();
  return (
    <View style={[{ gap: 4 }, flex && { flex: 1, minWidth: 0 }]}>
      {label ? <Text style={s.small}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={[s.input, style]} {...props} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { s } = useTheme();
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipOn]}>
      <Text style={[s.chipText, active && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const { s, colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: color ?? colors.accent }]} />
    </View>
  );
}

export function Empty({ icon, text, children }: { icon: IconName; text: string; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
      <Ionicons name={icon} size={32} color={colors.muted} />
      <Body muted style={{ textAlign: 'center' }}>
        {text}
      </Body>
      {children}
    </Card>
  );
}

export { fmtNum, parseNum } from '@/lib/format';

export { useTheme } from './ThemeProvider';

export function IconButton({
  icon,
  onPress,
  label,
  disabled,
  color,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  disabled?: boolean;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({ padding: 6, opacity: disabled ? 0.3 : pressed ? 0.6 : 1 })}
    >
      <Ionicons name={icon} size={20} color={color ?? colors.muted} />
    </Pressable>
  );
}
