import { examplePlan } from '@/data/examplePlan';
import {
  dietWarnings,
  emptyExercise,
  fromDietDraft,
  fromWorkoutDraft,
  rotatingDay,
  toDietDraft,
  toWorkoutDraft,
  weekdayDay,
  workoutWarnings,
} from '@/lib/planForm';
import { parsePlanText } from '@/lib/planText';
import { emptyPlan } from '@/lib/types';
import { fullPlan } from '@/test/fullPlan';

const strip = (days: ReturnType<typeof fromWorkoutDraft>['days']) =>
  days.map((d) => ({ ...d, exercises: d.exercises.map(({ id, ...e }) => e) }));

test('the example plan is short and generic', () => {
  const p = examplePlan();
  expect(p.days.map((d) => d.weekday)).toEqual([1, 3, 5]);
  expect(p.meals.length).toBe(4);
  expect(p.targets).toEqual({ waterL: 2 });
});

test('workout round-trips through the form', () => {
  const plan = fullPlan();
  const back = fromWorkoutDraft(toWorkoutDraft(plan));
  expect(strip(back.days)).toEqual(strip(plan.days));
  expect(back.habits).toEqual(plan.habits);
});

test('diet round-trips through the form', () => {
  const plan = fullPlan();
  expect(fromDietDraft(toDietDraft(plan))).toEqual({ meals: plan.meals, rules: plan.rules, targets: plan.targets });
});

test('days are kept in week order with rotating days last', () => {
  const draft = toWorkoutDraft(emptyPlan());
  const fri = weekdayDay(5);
  const sun = weekdayDay(0);
  const mon = weekdayDay(1);
  const a = rotatingDay([]);
  for (const d of [fri, sun, a, mon]) d.exercises[0].name = 'Supino';
  draft.days = [fri, sun, a, mon];
  expect(fromWorkoutDraft(draft).days.map((d) => d.label)).toEqual(['Segunda', 'Sexta', 'Domingo', 'Treino A']);
  expect(rotatingDay([a]).label).toBe('Treino B');
});

test('exercises: sets make a target, no sets make a note, blanks are dropped', () => {
  const day = weekdayDay(2);
  day.exercises = [
    { ...emptyExercise(), name: 'Leg press', sets: '3', reps: '12', load: true },
    { ...emptyExercise(), name: 'Esteira', reps: '20 min', load: true },
    { ...emptyExercise(), name: 'Alongamento' },
    { ...emptyExercise(), name: '   ', sets: '3' },
  ];
  const empty = weekdayDay(4);
  const draft = { days: [day, empty], habits: [{ key: 'h', text: ' ' }] };
  const out = fromWorkoutDraft(draft);
  expect(out.days).toHaveLength(1);
  expect(out.days[0].exercises.map(({ id, ...e }) => e)).toEqual([
    { name: 'Leg press', sets: 3, reps: '12', load: true },
    { name: 'Esteira', note: '20 min' },
    { name: 'Alongamento' },
  ]);
  expect(out.habits).toEqual([]);
  expect(workoutWarnings(draft)).toEqual(['Quinta está sem exercícios e não será salvo.']);
});

test('diet targets accept a single value and swapped ranges', () => {
  const draft = toDietDraft(emptyPlan(), '2');
  expect(draft.water).toBe('2');
  draft.kcalMin = '1800';
  draft.kcalMax = '1600';
  draft.proteinMin = '100';
  draft.water = '2,5';
  draft.meals = [
    { key: 'a', name: 'café', time: ' 7:30 ', options: [{ key: 'o', text: 'ovos ' }, { key: 'p', text: '' }] },
    { key: 'b', name: 'Lanche', time: '', options: [{ key: 'q', text: '' }] },
  ];
  expect(fromDietDraft(draft)).toEqual({
    meals: [{ name: 'Café', time: '7:30', options: ['ovos'] }],
    rules: [],
    targets: { kcalMin: 1600, kcalMax: 1800, proteinMin: 100, proteinMax: 100, waterL: 2.5 },
  });
  expect(dietWarnings(draft)).toEqual(['Lanche está sem opções e não será salva.']);
});

test('rotating plans keep their labels', () => {
  const { plan } = parsePlanText('Treino A: peito\nSupino: 3 x 10\nTreino B\nRemada: 3 x 10');
  const back = fromWorkoutDraft(toWorkoutDraft(plan));
  expect(back.days.map((d) => [d.label, d.weekday, d.title])).toEqual([
    ['Treino A', null, 'peito'],
    ['Treino B', null, ''],
  ]);
});
