import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconName } from '@/components/ui';
import { useApp } from '@/store/useApp';
import { useTheme } from '@/components/ThemeProvider';

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={icon} color={color as string} size={size} />,
});

export default function TabsLayout() {
  const { colors } = useTheme();
  const bottom = useSafeAreaInsets().bottom;
  const profile = useApp((s) => s.profile);
  if (!profile) return <Redirect href="/new-profile" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 60 + bottom + 8,
          paddingTop: 6,
          paddingBottom: bottom + 8,
        },
        tabBarLabelStyle: { fontSize: 12, marginTop: 2 },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ ...tab('Hoje', 'today-outline'), headerShown: false }} />
      <Tabs.Screen name="workout" options={tab('Treino', 'barbell-outline')} />
      <Tabs.Screen name="diet" options={tab('Dieta', 'restaurant-outline')} />
      <Tabs.Screen name="progress" options={tab('Progresso', 'trending-up-outline')} />
      <Tabs.Screen name="profile" options={tab('Perfil', 'person-circle-outline')} />
    </Tabs>
  );
}
