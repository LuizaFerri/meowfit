import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { streakLabel, streakMessage, type Streak } from '@/lib/streak';
import { Body, Card, Row } from './ui';
import { useTheme } from './ThemeProvider';

export function StreakCard({ streak, walked = false }: { streak: Streak; walked?: boolean }) {
  const { colors } = useTheme();
  const lit = streak.state === 'feito' || (streak.state === 'descanso' && streak.count > 0);
  const atRisk = streak.state === 'risco' || streak.state === 'zerada';
  const flameColor = atRisk ? colors.muted : colors.primary;

  return (
    <Card style={{ paddingVertical: 12 }}>
      <Row style={{ alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: atRisk ? colors.border : colors.primarySoft,
          }}
        >
          <Ionicons name={lit ? 'flame' : 'flame-outline'} size={30} color={flameColor} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Row style={{ alignItems: 'baseline', gap: 6 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: atRisk ? colors.muted : colors.text }}>{streak.count}</Text>
            <Body style={{ fontWeight: '700', flexShrink: 1 }}>{streakLabel(streak)}</Body>
          </Row>
          <Body muted style={{ fontSize: 13 }}>
            {walked && streak.state === 'feito' ? 'Caminhada de hoje feita! Sequência garantida.' : streakMessage(streak)}
          </Body>
        </View>
      </Row>
      {streak.best > streak.count && (
        <Body muted style={{ fontSize: 12, textAlign: 'right' }}>
          Recorde: {streak.best} {streak.best === 1 ? streak.unit.slice(0, -1) : streak.unit}
        </Body>
      )}
    </Card>
  );
}
