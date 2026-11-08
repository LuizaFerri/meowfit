import { StyleSheet } from 'react-native';
import { radius, space, type Palette } from './theme';

export function makeStyles(c: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    screenPad: { padding: space.lg, gap: space.md, paddingBottom: 48 },
    card: {
      backgroundColor: c.card,
      borderRadius: radius.lg,
      padding: space.lg,
      gap: space.sm,
      borderWidth: 1,
      borderColor: c.border,
    },
    title: { fontSize: 22, fontWeight: '700', color: c.text },
    subtitle: { fontSize: 17, fontWeight: '600', color: c.text },
    body: { fontSize: 15, color: c.text, lineHeight: 21 },
    small: { fontSize: 13, color: c.muted },
    row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: radius.md,
      borderWidth: 1,
      minHeight: 46,
    },
    buttonSmall: { paddingVertical: 6, paddingHorizontal: 10, minHeight: 36 },
    buttonText: { fontSize: 16, fontWeight: '600' },
    check: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 8, minHeight: 44 },
    box: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxOn: { backgroundColor: c.accent, borderColor: c.accent },
    done: { color: c.muted, textDecorationLine: 'line-through' },
    input: {
      minWidth: 0,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBg,
    },
    chipOn: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 14, color: c.text },
    chipTextOn: { color: c.onPrimary, fontWeight: '600' },
    track: { height: 8, backgroundColor: c.border, borderRadius: radius.pill, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: radius.pill },
    mono: { fontFamily: 'monospace', backgroundColor: c.bg, padding: 8, borderRadius: radius.sm },
  });
}

export type Styles = ReturnType<typeof makeStyles>;
