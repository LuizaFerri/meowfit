import { BmiCard } from '@/components/BmiCard';
import { Body, Card, Check, Row, Screen, Subtitle } from '@/components/ui';
import { getHabitChecks, getMeasurements, getWorkouts, setHabit } from '@/db/queries';
import { fmtShort, toKey, weekDays, weekStartKey } from '@/lib/dates';
import { dayName } from '@/lib/workout';
import { useData, useProfile, useWrite } from '@/store/useApp';

export default function Progress() {
  const profile = useProfile();
  const { plan } = profile;
  const write = useWrite();
  const days = weekDays();
  const week = weekStartKey();

  const [data] = useData(
    async (db, pid) => {
      const [workouts, habits, measures] = await Promise.all([
        getWorkouts(db, pid, toKey(days[0]), toKey(days[6])),
        getHabitChecks(db, pid, week),
        getMeasurements(db, pid),
      ]);
      return { workouts, habits, measures };
    },
    [week],
  );

  if (!data) return <Screen>{null}</Screen>;

  const doneLabels = new Set(data.workouts.map((w) => w.label));
  const habitsDone = plan.habits.filter((h) => data.habits.has(h)).length;
  const weights = data.measures.filter((m) => m.weight_kg !== null);
  const lastWeight = weights.length ? weights[weights.length - 1].weight_kg : null;

  return (
    <Screen>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Subtitle>Treinos da semana</Subtitle>
          <Body muted>
            {fmtShort(toKey(days[0]))}–{fmtShort(toKey(days[6]))}
          </Body>
        </Row>
        {plan.days.map((d, i) => (
          <Check key={i} checked={doneLabels.has(d.label)} label={dayName(d)} onPress={() => {}} />
        ))}
        <Body muted style={{ fontSize: 13 }}>
          Marcado automaticamente ao concluir o treino. Regra das duas faltas: pode faltar um treino, nunca dois seguidos.
        </Body>
      </Card>

      {plan.habits.length > 0 && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Subtitle>Hábitos da semana</Subtitle>
            <Body muted>
              {habitsDone}/{plan.habits.length}
            </Body>
          </Row>
          {plan.habits.map((h, hi) => (
            <Check
              key={hi}
              checked={data.habits.has(h)}
              label={h}
              onPress={() => write((db) => setHabit(db, profile.id, week, h, !data.habits.has(h)))}
            />
          ))}
          <Body muted style={{ fontSize: 13 }}>
            Recomeça toda segunda-feira.
          </Body>
        </Card>
      )}

      <BmiCard weightKg={lastWeight} heightCm={profile.height_cm} />
    </Screen>
  );
}
