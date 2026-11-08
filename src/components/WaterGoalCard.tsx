import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { savePlan } from '@/db/queries';
import { useApp, useProfile } from '@/store/useApp';
import { Body, Button, Card, Chip, Field, Row, Subtitle, fmtNum, parseNum } from './ui';

const GOALS = [1.5, 2, 2.5, 3, 3.5, 4];

export function WaterGoalCard() {
  const db = useSQLiteContext();
  const profile = useProfile();
  const loadActive = useApp((s) => s.loadActive);
  const current = profile.plan.targets.waterL ?? 2;
  const [custom, setCustom] = useState('');

  const save = async (waterL: number) => {
    await savePlan(db, profile.id, { ...profile.plan, targets: { ...profile.plan.targets, waterL } });
    await loadActive(db);
    setCustom('');
  };

  const typed = parseNum(custom);
  const validTyped = typed !== null && typed > 0 && typed <= 10;

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Subtitle>Meta de água</Subtitle>
        <Body style={{ fontWeight: '700' }}>{fmtNum(current)} L por dia</Body>
      </Row>
      <Row style={{ flexWrap: 'wrap' }}>
        {GOALS.map((g) => (
          <Chip key={g} label={`${fmtNum(g)} L`} active={current === g} onPress={() => save(g)} />
        ))}
      </Row>
      <Row style={{ alignItems: 'flex-end' }}>
        <Field flex label="Outro valor (litros)" value={custom} onChangeText={setCustom} keyboardType="decimal-pad" placeholder="Ex.: 2,8" />
        <Button small label="Salvar" icon="checkmark" disabled={!validTyped} onPress={() => validTyped && save(typed)} />
      </Row>
    </Card>
  );
}
