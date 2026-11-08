import Ionicons from '@expo/vector-icons/Ionicons';
import { addDays } from 'date-fns';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Text, View } from 'react-native';
import { Body, Button, Card, Chip, ProgressBar, Row, Screen, Subtitle, Title } from '@/components/ui';
import { HeaderBanner } from '@/components/HeaderBanner';
import { space } from '@/components/theme';
import { WaterCard } from '@/components/WaterCard';
import {
  exKey,
  getDoneExercises,
  getFirstWorkoutDate,
  getLastWorkout,
  getMealLogs,
  getMeasurements,
  getWorkouts,
  savePlan,
} from '@/db/queries';
import { daysSince, fmtLong, todayKey, toKey, weekDays } from '@/lib/dates';
import {
  dayName,
  missedStreak,
  pickToday,
  shouldSuggestChange,
  stampTreino,
  trainingWeekdays,
} from '@/lib/workout';
import { useApp, useData, useProfile } from '@/store/useApp';
import { useTheme } from '@/components/ThemeProvider';

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const DOW = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export default function Today() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const loadActive = useApp((st) => st.loadActive);
  const profile = useProfile();
  const plan = profile.plan;
  const date = todayKey();
  const days = weekDays();

  const [info] = useData(
    async (db, pid) => {
      const [last, done, week, meals, measures, recent, firstWorkout] = await Promise.all([
        getLastWorkout(db, pid),
        getDoneExercises(db, pid, date),
        getWorkouts(db, pid, toKey(days[0]), toKey(days[6])),
        getMealLogs(db, pid, date),
        getMeasurements(db, pid),
        getWorkouts(db, pid, toKey(addDays(new Date(), -60)), date),
        getFirstWorkoutDate(db, pid),
      ]);
      const lastLabel = last?.date === date ? null : (last?.label ?? null);
      return {
        lastLabel,
        done,
        week,
        meals,
        lastMeasure: measures[measures.length - 1] ?? null,
        recentDates: new Set(recent.map((w) => w.date)),
        firstWorkout,
      };
    },
    [date],
  );

  if (!info) return <Screen>{null}</Screen>;

  const doneToday = info.week.find((w) => w.date === date);
  const todayIdx = doneToday
    ? plan.days.findIndex((d) => d.label === doneToday.label)
    : pickToday(plan, info.lastLabel);
  const day = todayIdx !== null && todayIdx >= 0 ? plan.days[todayIdx] : null;
  const doneCount = day ? day.exercises.filter((e) => info.done.has(exKey(e.name))).length : 0;
  const weekDates = new Set(info.week.map((w) => w.date));
  const planned = plan.days.filter((d) => d.weekday !== null).length || plan.days.length;
  const mealsOnPlan = [...info.meals.values()].filter((o) => o >= 0).length;
  const measureAge = info.lastMeasure ? daysSince(info.lastMeasure.date) : null;
  const trainingDays = trainingWeekdays(plan);
  const isTrainingDay = trainingDays.has(new Date().getDay());
  const missed =
    plan.days.length > 0 && isTrainingDay && !doneToday
      ? missedStreak({ trainingDays, doneDates: info.recentDates, today: new Date(), since: info.firstWorkout })
      : 0;
  const changeWeeks = shouldSuggestChange(plan, info.firstWorkout, date);

  const updatePlan = async (next: typeof plan) => {
    await savePlan(db, profile.id, next);
    await loadActive(db);
  };

  return (
    <Screen>
      <View style={{ marginHorizontal: -space.lg, marginTop: -space.lg }}>
        <HeaderBanner name={profile.name} subtitle={capitalize(fmtLong(date))} />
      </View>

      {missed > 0 && (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Ionicons name="alert-circle" size={22} color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Body style={{ fontWeight: '700' }}>
                {missed === 1 ? 'Hoje não pode faltar' : `${missed} faltas seguidas`}
              </Body>
              <Body style={{ fontSize: 14 }}>
                {missed === 1
                  ? 'Você faltou no último dia de treino. Regra das duas faltas: pode faltar um dia, nunca dois seguidos.'
                  : 'Volte hoje, nem que seja o mínimo viável: só os 3 primeiros exercícios, uns 30 minutos.'}
              </Body>
            </View>
          </Row>
        </Card>
      )}

      {changeWeeks !== null && (
        <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Ionicons name="swap-horizontal" size={22} color={colors.accent} />
            <View style={{ flex: 1, gap: 2 }}>
              <Body style={{ fontWeight: '700' }}>Hora de trocar o treino</Body>
              <Body style={{ fontSize: 14 }}>
                Você está com o mesmo treino há {changeWeeks} semanas. Trocar a cada 8 a 10 semanas ajuda a continuar evoluindo.
              </Body>
            </View>
          </Row>
          <Button
            small
            label="Importar treino novo"
            icon="download-outline"
            onPress={() => router.push({ pathname: '/import', params: { parte: 'treino' } })}
          />
          <Row>
            <Button
              small
              variant="ghost"
              label="Lembrar em 2 semanas"
              onPress={() => updatePlan({ ...plan, treinoSnooze: toKey(addDays(new Date(), 14)) })}
              style={{ flex: 1 }}
            />
            <Button small variant="ghost" label="Já troquei" onPress={() => updatePlan(stampTreino(plan, date))} style={{ flex: 1 }} />
          </Row>
        </Card>
      )}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Subtitle>Treino de hoje</Subtitle>
          {doneToday && <Chip label="Concluído ✓" active />}
        </Row>
        {plan.days.length === 0 ? (
          <>
            <Body muted>Seu perfil ainda não tem treino.</Body>
            <Button label="Importar treino" icon="download-outline" onPress={() => router.push('/import')} />
          </>
        ) : day ? (
          <>
            <Body style={{ fontWeight: '600' }}>{dayName(day)}</Body>
            <Body muted>
              {doneCount} de {day.exercises.length} exercícios
            </Body>
            <ProgressBar value={doneCount / day.exercises.length} />
            <Button
              style={{ marginTop: 6 }}
              label={doneToday ? 'Ver treino' : doneCount > 0 ? 'Continuar treino' : 'Começar treino'}
              icon="barbell-outline"
              onPress={() => router.push(`/workout/${todayIdx}`)}
            />
          </>
        ) : (
          <>
            <Body muted>Dia de descanso. Uma caminhada leve de 30-40 min conta!</Body>
            <Body muted>Quer treinar mesmo assim?</Body>
            <Row style={{ flexWrap: 'wrap' }}>
              {plan.days.map((d, i) => (
                <Chip key={i} label={d.label} onPress={() => router.push(`/workout/${i}`)} />
              ))}
            </Row>
          </>
        )}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Subtitle>Semana</Subtitle>
          <Body muted>
            {info.week.length} de {planned} treinos
          </Body>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
          {days.map((d, i) => {
            const key = toKey(d);
            const done = weekDates.has(key);
            const isToday = key === date;
            return (
              <View key={key} style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, color: isToday ? colors.primary : colors.muted, fontWeight: isToday ? '700' : '400' }}>
                  {DOW[i]}
                </Text>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? colors.accent : colors.bg,
                    borderWidth: isToday ? 2 : 1,
                    borderColor: isToday ? colors.primary : colors.border,
                  }}
                >
                  {done ? <Ionicons name="checkmark" size={18} color={colors.onAccent} /> : <Text style={{ color: colors.muted }}>{d.getDate()}</Text>}
                </View>
              </View>
            );
          })}
        </Row>
      </Card>

      <WaterCard />

      {plan.meals.length > 0 && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Subtitle>Refeições</Subtitle>
            <Body muted>
              {mealsOnPlan} de {plan.meals.length} no plano
            </Body>
          </Row>
          <ProgressBar value={mealsOnPlan / plan.meals.length} color={colors.primary} />
          <Button small variant="ghost" label="Registrar refeições" onPress={() => router.navigate('/diet')} />
        </Card>
      )}

      {(measureAge === null || measureAge >= 14) && (
        <Card style={{ backgroundColor: colors.warnSoft, borderColor: colors.warnSoft }}>
          <Row>
            <Ionicons name="resize-outline" size={20} color={colors.warn} />
            <Body style={{ flex: 1 }}>
              {measureAge === null
                ? 'Registre seu peso e cintura para acompanhar a evolução.'
                : `Faz ${measureAge} dias desde a última medida. Hora de pesar e medir a cintura!`}
            </Body>
          </Row>
          <Button small variant="ghost" label="Registrar medidas" onPress={() => router.navigate('/progress')} />
        </Card>
      )}
    </Screen>
  );
}
