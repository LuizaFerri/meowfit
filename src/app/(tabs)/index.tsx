import Ionicons from '@expo/vector-icons/Ionicons';
import { addDays } from 'date-fns';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, Text, View } from 'react-native';
import { Body, Button, Card, Chip, ProgressBar, Row, Screen, Subtitle } from '@/components/ui';
import { HeaderBanner } from '@/components/HeaderBanner';
import { space } from '@/components/theme';
import { WaterCard } from '@/components/WaterCard';
import { StreakCard } from '@/components/StreakCard';
import { computeStreak } from '@/lib/streak';
import {
  exKey,
  getDoneExercises,
  getFirstWorkoutDate,
  getLastWorkout,
  getMealLogs,
  getMeasurements,
  getSchedule,
  getWorkoutDates,
  getWorkouts,
  savePlan,
  setWorkoutDone,
} from '@/db/queries';
import { celebrate } from '@/lib/celebrate';
import { daysSince, fmtLong, todayKey, toKey, weekDays } from '@/lib/dates';
import { WALK_LABEL, dayName, pickToday, shouldSuggestChange, stampTreino } from '@/lib/workout';
import { useApp, useData, useProfile, useWrite } from '@/store/useApp';
import { useTheme } from '@/components/ThemeProvider';

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const DOW = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export default function Today() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const loadActive = useApp((st) => st.loadActive);
  const write = useWrite();
  const profile = useProfile();
  const plan = profile.plan;
  const date = todayKey();
  const days = weekDays();

  const [info] = useData(
    async (db, pid) => {
      const [last, done, week, meals, measures, firstWorkout, allDates, schedule] = await Promise.all([
        getLastWorkout(db, pid),
        getDoneExercises(db, pid, date),
        getWorkouts(db, pid, toKey(days[0]), toKey(days[6])),
        getMealLogs(db, pid, date),
        getMeasurements(db, pid),
        getFirstWorkoutDate(db, pid),
        getWorkoutDates(db, pid),
        getSchedule(db, pid),
      ]);
      const lastLabel = last?.date === date ? null : (last?.label ?? null);
      return {
        lastLabel,
        done,
        week,
        meals,
        lastMeasure: measures[measures.length - 1] ?? null,
        firstWorkout,
        allDates,
        schedule,
      };
    },
    [date],
  );

  if (!info) return <Screen>{null}</Screen>;

  const doneToday = info.week.find((w) => w.date === date && w.label !== WALK_LABEL);
  const walkedToday = info.week.some((w) => w.date === date && w.label === WALK_LABEL);
  const todayIdx = doneToday
    ? plan.days.findIndex((d) => d.label === doneToday.label)
    : pickToday(plan, info.lastLabel);
  const day = todayIdx !== null && todayIdx >= 0 ? plan.days[todayIdx] : null;
  const doneCount = day ? day.exercises.filter((e) => info.done.has(exKey(e.name))).length : 0;
  const weekDates = new Set(info.week.map((w) => w.date));
  const planned = plan.days.filter((d) => d.weekday !== null).length || plan.days.length;
  const mealsOnPlan = [...info.meals.values()].filter((o) => o >= 0).length;
  const measureAge = info.lastMeasure ? daysSince(info.lastMeasure.date) : null;
  const changeWeeks = shouldSuggestChange(plan, info.firstWorkout, date);
  const streak = computeStreak(plan, info.allDates, new Date(), info.schedule);
  const workoutsThisWeek = info.week.filter((w) => w.label !== WALK_LABEL).length;

  const workoutIndexFor = (d: Date, key: string, isToday: boolean): number | null => {
    const doneRow = info.week.find((w) => w.date === key);
    const doneIdx = doneRow ? plan.days.findIndex((p) => p.label === doneRow.label) : -1;
    if (doneIdx >= 0) return doneIdx;
    if (isToday && todayIdx !== null && todayIdx >= 0) return todayIdx;
    const byWeekday = plan.days.findIndex((p) => p.weekday === d.getDay());
    return byWeekday >= 0 ? byWeekday : null;
  };

  const toggleWalk = async () => {
    await write((db) => setWorkoutDone(db, profile.id, date, WALK_LABEL, '', !walkedToday));
    if (!walkedToday) await celebrate(db, profile.id, plan);
  };

  const updatePlan = async (next: typeof plan) => {
    await savePlan(db, profile.id, next);
    await loadActive(db);
  };

  return (
    <Screen>
      <View style={{ marginHorizontal: -space.lg, marginTop: -space.lg }}>
        <HeaderBanner name={profile.name} subtitle={capitalize(fmtLong(date))} />
      </View>

      {streak && <StreakCard streak={streak} walked={walkedToday && !doneToday} />}

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
            label="Montar treino novo"
            icon="create-outline"
            onPress={() => router.push({ pathname: '/edit-plan', params: { parte: 'treino', novo: '1' } })}
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
            <Button label="Montar treino" icon="create-outline" onPress={() => router.push({ pathname: '/edit-plan', params: { parte: 'treino' } })} />
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
            <Body muted>Dia de descanso. Uma caminhada leve de 30-40 min também conta na sequência!</Body>
            {walkedToday ? (
              <Row style={{ justifyContent: 'space-between' }}>
                <Chip label="Caminhada ✓" active />
                <Button small variant="ghost" label="Desfazer" icon="refresh-outline" onPress={toggleWalk} />
              </Row>
            ) : (
              <Button small label="Fiz uma caminhada" icon="walk-outline" onPress={toggleWalk} />
            )}
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
            {workoutsThisWeek} de {planned} treinos
          </Body>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
          {days.map((d, i) => {
            const key = toKey(d);
            const done = weekDates.has(key);
            const isToday = key === date;
            const idx = workoutIndexFor(d, key, isToday);
            return (
              <Pressable
                key={key}
                disabled={idx === null}
                onPress={() =>
                  idx !== null &&
                  router.push(key < date ? { pathname: '/workout/[day]', params: { day: String(idx), data: key } } : `/workout/${idx}`)
                }
                accessibilityRole="button"
                accessibilityLabel={idx !== null ? `Abrir o treino de ${plan.days[idx].label}` : undefined}
                style={({ pressed }) => ({ alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 })}
              >
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
                  {done ? (
                    <Ionicons name="checkmark" size={18} color={colors.onAccent} />
                  ) : (
                    <Text style={{ color: idx !== null ? colors.text : colors.muted, fontWeight: idx !== null ? '600' : '400' }}>
                      {d.getDate()}
                    </Text>
                  )}
                </View>
              </Pressable>
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
          <Button small variant="ghost" label="Registrar medidas" onPress={() => router.navigate('/profile')} />
        </Card>
      )}
    </Screen>
  );
}
