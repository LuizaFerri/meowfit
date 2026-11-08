import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, Text, View } from 'react-native';
import type { AlertButton } from 'react-native';
import { closeDialog, useDialogs } from '@/lib/alert';
import { radius } from './theme';
import { useTheme } from './ThemeProvider';

export function DialogHost() {
  const { colors } = useTheme();
  const current = useDialogs((s) => s.queue[0]);

  if (!current) return null;

  const cancel = current.buttons.find((b) => b.style === 'cancel');
  const destructive = current.buttons.some((b) => b.style === 'destructive');
  const dismiss = () => {
    if (cancel) closeDialog(current.id, cancel);
    else if (current.buttons.length === 1) closeDialog(current.id, current.buttons[0]);
  };
  const ordered = [...current.buttons].sort((a, b) => Number(b.style === 'cancel') - Number(a.style === 'cancel'));
  const inRow = ordered.length === 2;

  const look = (b: AlertButton) =>
    b.style === 'cancel'
      ? { bg: 'transparent', fg: colors.text, border: colors.border }
      : b.style === 'destructive'
        ? { bg: colors.danger, fg: colors.onPrimary, border: colors.danger }
        : { bg: colors.primary, fg: colors.onPrimary, border: colors.primary };

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <Pressable
        onPress={dismiss}
        style={{ flex: 1, backgroundColor: 'rgba(12, 6, 24, 0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <Pressable
          onPress={() => {}}
          accessibilityRole="alert"
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: destructive ? colors.warnSoft : colors.primarySoft,
              }}
            >
              <Ionicons
                name={destructive ? 'warning-outline' : cancel ? 'help-outline' : 'paw'}
                size={20}
                color={destructive ? colors.danger : colors.primary}
              />
            </View>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>{current.title}</Text>
          </View>
          {current.message ? <Text style={{ fontSize: 15, lineHeight: 21, color: colors.muted }}>{current.message}</Text> : null}
          <View style={{ flexDirection: inRow ? 'row' : 'column', gap: 8, marginTop: 8 }}>
            {ordered.map((b, i) => {
              const v = look(b);
              return (
                <Pressable
                  key={`${b.text}-${i}`}
                  accessibilityRole="button"
                  onPress={() => closeDialog(current.id, b)}
                  style={({ pressed }) => ({
                    flex: inRow ? 1 : undefined,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: v.border,
                    backgroundColor: v.bg,
                    alignItems: 'center',
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: v.fg }}>{b.text ?? 'OK'}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
